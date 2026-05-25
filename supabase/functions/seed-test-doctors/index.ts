import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeEqual } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Seeding creates privileged accounts with known passwords. It is disabled
 * unless explicitly enabled via env AND a matching secret is presented.
 * NEVER set ALLOW_TEST_SEED=true in production.
 */
function seedDenied(secret: unknown): Response | null {
  if (Deno.env.get("ALLOW_TEST_SEED") !== "true") {
    return new Response(JSON.stringify({ error: "Seeding disabled" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!safeEqual(typeof secret === "string" ? secret : null, Deno.env.get("SEED_SECRET"))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

const FIRST_NAMES = [
  "Ana", "Carlos", "Mariana", "Rafael", "Juliana", "Bruno", "Camila", "Diego",
  "Patrícia", "Eduardo", "Fernanda", "Gustavo", "Helena", "Igor", "Larissa",
  "Marcelo", "Natália", "Otávio", "Priscila", "Renato", "Sabrina", "Thiago",
  "Vanessa", "William", "Yasmin", "Beatriz", "Felipe", "Gabriela", "Henrique",
  "Isabela", "João", "Karen", "Leonardo", "Mônica", "Nelson", "Olívia",
  "Paulo", "Renata", "Sérgio", "Tatiana",
];
const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Costa", "Pereira", "Almeida", "Lima",
  "Ribeiro", "Carvalho", "Gomes", "Martins", "Araújo", "Barbosa", "Rocha",
  "Dias", "Cardoso", "Teixeira", "Nascimento", "Moreira", "Mendes",
];

function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const denied = seedDenied(body.secret);
    if (denied) return denied;

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

    const perSpecialty: number = Math.max(1, Math.min(5, Number(body.per_specialty ?? 2)));
    const password: string = body.password ?? "Teste123!";

    const { data: specialties, error: specErr } = await sb
      .from("specialties").select("id,name,slug").eq("is_active", true).order("name");
    if (specErr) throw specErr;

    const { data: existing } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const existingMap = new Map((existing?.users ?? []).map((u: any) => [u.email, u]));

    const results: any[] = [];

    let i = 0;
    for (const spec of specialties ?? []) {
      for (let n = 1; n <= perSpecialty; n++) {
        const first = FIRST_NAMES[i % FIRST_NAMES.length];
        const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
        const email = `medico.${slugify(spec.slug)}.${n}@teste.com`;
        i++;

        let userId: string;
        const exists = existingMap.get(email);
        if (exists) {
          userId = (exists as any).id;
        } else {
          const { data: created, error: cErr } = await sb.auth.admin.createUser({
            email, password, email_confirm: true,
            user_metadata: { first_name: first, last_name: last },
          });
          if (cErr) { results.push({ email, status: "error", error: cErr.message }); continue; }
          userId = created.user!.id;
        }

        // profile
        await sb.from("profiles").upsert({
          user_id: userId, first_name: first, last_name: last,
          phone: "(11) 99999-0000", gender: i % 2 === 0 ? "F" : "M",
        }, { onConflict: "user_id" });

        // roles
        await sb.from("user_roles").upsert({ user_id: userId, role: "doctor" }, { onConflict: "user_id,role" });
        await sb.from("user_roles").upsert({ user_id: userId, role: "patient" }, { onConflict: "user_id,role" });

        // doctor_profile
        const displayName = `Dr${i % 2 === 0 ? "a." : "."} ${first} ${last}`;
        const crm = String(100000 + i);
        const dpData = {
          user_id: userId,
          crm, crm_state: "SP", crm_verified: true,
          crm_verified_at: new Date().toISOString(),
          display_name: displayName,
          bio: `Médic${i % 2 === 0 ? "a" : "o"} de teste em ${spec.name}.`,
          price: 120, return_price: 80, consultation_duration: 30,
          is_approved: true, is_active: true,
          kyc_status: "verified", kyc_verified_at: new Date().toISOString(),
          doctor_type: "telemedicina",
          slug: slugify(`${displayName}-${crm}`),
        };
        const { data: dpExisting } = await sb.from("doctor_profiles")
          .select("id").eq("user_id", userId).maybeSingle();
        let doctorId: string;
        if (dpExisting) {
          doctorId = (dpExisting as any).id;
          await sb.from("doctor_profiles").update(dpData).eq("id", doctorId);
        } else {
          const { data: ins, error: insErr } = await sb.from("doctor_profiles")
            .insert(dpData).select("id").single();
          if (insErr) { results.push({ email, status: "error", error: insErr.message }); continue; }
          doctorId = (ins as any).id;
        }

        // specialty link
        await sb.from("doctor_specialties").upsert(
          { doctor_id: doctorId, specialty_id: spec.id },
          { onConflict: "doctor_id,specialty_id" }
        );

        // availability: Mon-Fri 08:00-18:00
        const { data: existingSlots } = await sb.from("availability_slots")
          .select("id").eq("doctor_id", doctorId).limit(1);
        if (!existingSlots || existingSlots.length === 0) {
          const slots = [1, 2, 3, 4, 5].map((dow) => ({
            doctor_id: doctorId, day_of_week: dow,
            start_time: "08:00:00", end_time: "18:00:00", is_active: true,
          }));
          await sb.from("availability_slots").insert(slots);
        }

        results.push({ email, password, specialty: spec.name, doctor_id: doctorId, status: exists ? "updated" : "created" });
      }
    }

    return new Response(JSON.stringify({
      success: true, total: results.length, doctors: results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});