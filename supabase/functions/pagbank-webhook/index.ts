 import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   const supabase = createClient(
     Deno.env.get("SUPABASE_URL")!,
     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
   );
 
   try {
     const body = await req.json();
     console.info("[PagBank Webhook] Received:", JSON.stringify(body));
 
     // PagBank webhooks usually contain an "id" (order id) and "status"
     const orderId = body.id;
     const status = body.status; // PAID, DECLINED, CANCELED, etc.
     const externalRef = body.reference_id || ""; // We'll use this for appointmentId/renewalId
 
     if (!orderId) {
       return new Response(JSON.stringify({ received: true, message: "No order ID" }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Map PagBank statuses to internal statuses
     const statusMap: Record<string, string> = {
       "PAID": "approved",
       "DECLINED": "refused",
       "CANCELED": "cancelled",
       "WAITING": "pending",
       "IN_ANALYSIS": "analyzing",
     };
 
     const newPaymentStatus = statusMap[status] || "pending";
 
     // ─── Handle urgent care queue payments ───
     if (externalRef.startsWith("queue_") && newPaymentStatus === "approved") {
       const queueId = externalRef.replace("queue_", "");
       await supabase.from("on_demand_queue")
         .update({ status: "waiting", payment_id: orderId })
         .eq("id", queueId)
         .eq("status", "pending_payment");
     }
 
     // ─── Handle appointment payment events ───
     // Assuming externalRef is the appointment ID if it doesn't have a prefix
     const isSpecial = externalRef.includes("_");
     if (!isSpecial && externalRef) {
       const updateData: any = { payment_status: newPaymentStatus };
       if (newPaymentStatus === "approved") {
         updateData.payment_confirmed_at = new Date().toISOString();
         updateData.status = "confirmed";
       }
 
       await supabase.from("appointments")
         .update(updateData)
         .eq("id", externalRef);
     }
 
     // Activity log
     await supabase.from("activity_logs").insert({
       action: `pagbank_webhook_${status?.toLowerCase()}`,
       entity_type: "payment",
       entity_id: orderId,
       details: body,
     });
 
     return new Response(JSON.stringify({ success: true }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("[PagBank Webhook] Error:", error);
     return new Response(JSON.stringify({ error: error.message }), {
       status: 200, // Always return 200 to PagBank to avoid retries on logic errors
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });