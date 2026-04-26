import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  children,
  className,
  actions,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn("glass-panel corner-frame relative", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-panel-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-foreground/80" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.28em]">{title}</h2>
            {subtitle && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// {subtitle}</span>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</label>
        {hint && <span className="font-mono text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
