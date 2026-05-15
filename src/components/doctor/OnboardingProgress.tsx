import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/integrations/supabase/untyped";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Trophy } from "lucide-react";

const badgeColors: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-slate-200 text-slate-800",
  gold: "bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400",
};

const OnboardingProgress = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-progress", user?.id],
    queryFn: async () => {
      const { data, error } = await db.rpc("fn_doctor_onboarding_progress", { p_user_id: user!.id });
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  if (isLoading || !data || data.error) return null;
  if (data.progress_pct === 100) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-amber-500" /> Seu progresso</CardTitle>
          <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${badgeColors[data.badge] || badgeColors.starter}`}>{data.badge}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{data.completed} de {data.total} etapas</span>
            <span className="font-semibold">{data.progress_pct}%</span>
          </div>
          <Progress value={Number(data.progress_pct)} className="h-2" />
        </div>
        <ul className="grid grid-cols-2 gap-1.5 text-xs">
          {(data.steps || []).map((s: any) => (
            <li key={s.key} className={`flex items-center gap-1.5 ${s.done ? "text-emerald-700" : "text-muted-foreground"}`}>
              {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {s.label}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default OnboardingProgress;