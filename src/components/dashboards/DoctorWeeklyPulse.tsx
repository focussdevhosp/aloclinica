import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayPoint { day: string; label: string; count: number; completed: number }

interface Props {
  series: DayPoint[];
  loading?: boolean;
  onClick?: () => void;
}

const DoctorWeeklyPulse = memo(({ series, loading, onClick }: Props) => {
  const { total, avg, trend, max } = useMemo(() => {
    const total = series.reduce((s, d) => s + d.count, 0);
    const avg = series.length ? total / series.length : 0;
    const max = Math.max(1, ...series.map(d => d.count));
    const firstHalf = series.slice(0, 3).reduce((s, d) => s + d.count, 0);
    const lastHalf = series.slice(4).reduce((s, d) => s + d.count, 0);
    const trend = lastHalf - firstHalf;
    return { total, avg, trend, max };
  }, [series]);

  if (loading) {
    return <div className="h-[140px] rounded-2xl bg-muted/30 animate-pulse" />;
  }

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-emerald-600 dark:text-emerald-400"
    : trend < 0 ? "text-rose-600 dark:text-rose-400"
    : "text-muted-foreground";

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-border/30 bg-card p-4 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Últimos 7 dias</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold tabular-nums leading-none text-foreground">{total}</span>
            <span className="text-[11px] text-muted-foreground">consultas</span>
          </div>
        </div>
        <div className={cn("flex items-center gap-1 rounded-full bg-muted/40 px-2 py-1 text-[10.5px] font-bold", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          {trend > 0 ? `+${trend}` : trend}
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-1.5 h-[60px]">
        {series.map((d, i) => {
          const heightPct = (d.count / max) * 100;
          const completedPct = d.count > 0 ? (d.completed / d.count) * heightPct : 0;
          const isToday = i === series.length - 1;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="relative w-full flex-1 flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPct, d.count > 0 ? 8 : 4)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "w-full rounded-t-md relative overflow-hidden",
                    d.count === 0 ? "bg-muted/40" : isToday ? "bg-primary" : "bg-primary/30"
                  )}
                >
                  {d.count > 0 && completedPct > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-emerald-500"
                      style={{ height: `${(d.completed / d.count) * 100}%` }}
                    />
                  )}
                </motion.div>
              </div>
              <span className={cn(
                "text-[9px] font-bold tabular-nums",
                isToday ? "text-primary" : "text-muted-foreground"
              )}>{d.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>Média {avg.toFixed(1)}/dia</span>
        <span className="flex items-center gap-1.5">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Concluídas</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary" />Hoje</span>
        </span>
      </div>
    </motion.button>
  );
});

DoctorWeeklyPulse.displayName = "DoctorWeeklyPulse";
export default DoctorWeeklyPulse;