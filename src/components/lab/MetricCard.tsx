export function MetricCard({ label, value, suffix, hint }: { label: string; value: string | number; suffix?: string; hint?: string }) {
  return (
    <div className="border border-panel-border px-3 py-2.5 relative corner-frame bg-card/40 min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-0.5 min-w-0">
        <span className="font-mono text-xl md:text-[1.35rem] leading-none tabular-nums text-glow truncate">
          {value}
        </span>
        {suffix && (
          <span className="font-mono text-[11px] text-muted-foreground shrink-0">{suffix}</span>
        )}
      </div>
      {hint && <div className="font-mono text-[10px] text-muted-foreground/70 mt-0.5 truncate">{hint}</div>}
    </div>
  );
}
