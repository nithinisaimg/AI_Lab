export function MetricCard({ label, value, suffix, hint }: { label: string; value: string | number; suffix?: string; hint?: string }) {
  return (
    <div className="border border-panel-border p-3 relative corner-frame bg-card/40">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-2xl tabular-nums text-glow">{value}</span>
        {suffix && <span className="font-mono text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <div className="font-mono text-[10px] text-muted-foreground/70 mt-0.5">{hint}</div>}
    </div>
  );
}
