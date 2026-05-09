import type { Metrics, DatasetMeta } from "@/lib/ml-sim";
import type { ConfigState } from "./Controls";
import { MODELS, DATASETS } from "@/lib/ml-sim";

export interface SavedExperiment {
  id: string;
  cfg: ConfigState;
  metrics: Metrics;
  dataset: DatasetMeta;
}

export function ComparisonBar({ saved, onClear, onRemove }: { saved: SavedExperiment[]; onClear: () => void; onRemove: (id: string) => void }) {
  if (saved.length === 0) {
    return (
      <div className="font-mono text-[11px] text-muted-foreground">
        No experiments saved. Run a model and press <span className="text-foreground">SAVE</span> to add up to 3 experiments here for side-by-side comparison.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{saved.length} / 3 saved</div>
        <button onClick={onClear} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">Clear all</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {saved.map((s, i) => {
          const v = s.metrics.verdict;
          return (
            <div key={s.id} className="border border-panel-border p-3 corner-frame bg-card/40">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">EXP·{String(i + 1).padStart(2, "0")}</div>
                <button onClick={() => onRemove(s.id)} className="font-mono text-[10px] text-muted-foreground hover:text-foreground">×</button>
              </div>
              <div className="font-mono text-xs">{MODELS[s.cfg.model].name}</div>
              <div className="font-mono text-[10px] text-muted-foreground mb-2">{s.dataset?.name ?? DATASETS[s.cfg.dataset]?.name ?? "Unknown dataset"}</div>
              <div className="grid grid-cols-2 gap-2">
                <Mini label="Train" value={(s.metrics.trainAcc * 100).toFixed(1) + "%"} />
                <Mini label="Test" value={(s.metrics.testAcc * 100).toFixed(1) + "%"} />
                <Mini label="F1" value={s.metrics.f1.toFixed(3)} />
                <Mini label="Gap" value={((s.metrics.trainAcc - s.metrics.testAcc) * 100).toFixed(1) + "%"} />
              </div>
              <div className={`mt-2 font-mono text-[10px] uppercase tracking-widest text-center py-1 border ${v === "good" ? "border-foreground" : "border-panel-border"}`}>
                {v === "good" ? "◆ optimal" : v === "overfit" ? "△ overfit" : "▽ underfit"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-panel-border px-2 py-1">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-mono text-sm tabular-nums">{value}</div>
    </div>
  );
}
