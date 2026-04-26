import type { Metrics } from "@/lib/ml-sim";
import { useEffect, useState } from "react";

const VERDICT_STYLE: Record<Metrics["verdict"], { label: string; symbol: string }> = {
  underfit: { label: "UNDERFITTING", symbol: "▽" },
  good: { label: "OPTIMAL FIT", symbol: "◆" },
  overfit: { label: "OVERFITTING", symbol: "△" },
};

function useTyped(text: string, speed = 12) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
}

export function InsightsPanel({ metrics }: { metrics: Metrics | null }) {
  const insight = useTyped(metrics?.insight ?? "Awaiting first experiment. Configure parameters in the control bay and initiate training to receive analysis.");

  if (!metrics) {
    return (
      <div className="space-y-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">// system standby</div>
        <p className="font-mono text-sm leading-relaxed text-muted-foreground terminal-cursor">{insight}</p>
      </div>
    );
  }

  const v = VERDICT_STYLE[metrics.verdict];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-2xl text-glow">{v.symbol}</span>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Verdict</div>
          <div className="font-mono text-sm tracking-[0.18em] text-glow">{v.label}</div>
        </div>
      </div>

      <div className="border-l-2 border-foreground/60 pl-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">// AI analysis</div>
        <p className="font-mono text-[13px] leading-relaxed terminal-cursor">{insight}</p>
      </div>

      <div className="space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">// learn the concepts</div>
        <ConceptCard
          title="Underfitting"
          body="Model too simple to capture patterns. Both train and test scores are low."
          active={metrics.verdict === "underfit"}
        />
        <ConceptCard
          title="Good Fit"
          body="Model captures real structure without memorizing noise. Train ≈ test."
          active={metrics.verdict === "good"}
        />
        <ConceptCard
          title="Overfitting"
          body="Model memorizes training data. Train high, test drops. Add regularization."
          active={metrics.verdict === "overfit"}
        />
      </div>
    </div>
  );
}

function ConceptCard({ title, body, active }: { title: string; body: string; active: boolean }) {
  return (
    <div className={`border px-3 py-2 transition-colors ${active ? "border-foreground bg-foreground/5 glow-border" : "border-panel-border opacity-70"}`}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs tracking-widest">{title.toUpperCase()}</div>
        {active && <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-foreground" />}
      </div>
      <p className="font-mono text-[11px] leading-snug text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
