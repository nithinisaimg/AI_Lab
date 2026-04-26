import { DATASETS, MODELS, type DatasetId, type LossId, type ModelId, type RegId } from "@/lib/ml-sim";
import { Field } from "./Panel";
import { cn } from "@/lib/utils";

interface ConfigState {
  dataset: DatasetId;
  model: ModelId;
  loss: LossId;
  capacity: number;
  layers: number;
  regularization: RegId;
  regStrength: number;
  dropout: number;
  epochs: number;
}

export function ControlsPanel({
  cfg,
  onChange,
  onTrain,
  onSave,
  training,
}: {
  cfg: ConfigState;
  onChange: (next: ConfigState) => void;
  onTrain: () => void;
  onSave: () => void;
  training: boolean;
}) {
  const ds = DATASETS[cfg.dataset];
  const model = MODELS[cfg.model];

  const lossOptions: { id: LossId; label: string; allowed: boolean }[] = [
    { id: "mse", label: "MSE", allowed: ds.task === "regression" },
    { id: "bce", label: "Binary Cross-Entropy", allowed: ds.task === "binary" },
    { id: "cce", label: "Categorical Cross-Entropy", allowed: false },
  ];

  const setModel = (id: ModelId) => {
    const m = MODELS[id];
    const supported = ds.task === "regression" ? m.supports.regression : m.supports.binary;
    if (!supported) return;
    onChange({ ...cfg, model: id, capacity: m.capacityDefault, loss: ds.task === "regression" ? "mse" : "bce" });
  };

  const setDataset = (id: DatasetId) => {
    const newDs = DATASETS[id];
    const m = MODELS[cfg.model];
    const supported = newDs.task === "regression" ? m.supports.regression : m.supports.binary;
    onChange({
      ...cfg,
      dataset: id,
      model: supported ? cfg.model : (newDs.task === "regression" ? "linear" : "logistic"),
      loss: newDs.task === "regression" ? "mse" : "bce",
    });
  };

  return (
    <div className="space-y-5">
      {/* Dataset */}
      <Field label="Dataset · Source">
        <div className="grid grid-cols-1 gap-1.5">
          {(Object.keys(DATASETS) as DatasetId[]).map((id) => {
            const d = DATASETS[id];
            const active = cfg.dataset === id;
            return (
              <button
                key={id}
                onClick={() => setDataset(id)}
                className={cn(
                  "group text-left border border-panel-border px-3 py-2 transition-colors font-mono",
                  active ? "bg-foreground text-background border-foreground" : "hover:border-foreground/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-wider">{d.name}</span>
                  <span className="text-[9px] uppercase tracking-widest opacity-70">{d.task}</span>
                </div>
                <div className={cn("text-[10px] mt-0.5", active ? "text-background/70" : "text-muted-foreground")}>
                  n={d.samples} · features={d.features}
                </div>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Model */}
      <Field label="Model · Architecture">
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(MODELS) as ModelId[]).map((id) => {
            const m = MODELS[id];
            const supported = ds.task === "regression" ? m.supports.regression : m.supports.binary;
            const active = cfg.model === id;
            return (
              <button
                key={id}
                disabled={!supported}
                onClick={() => setModel(id)}
                className={cn(
                  "border border-panel-border px-2.5 py-2 font-mono text-[11px] tracking-wider transition-colors text-left",
                  active && "bg-foreground text-background border-foreground",
                  !supported && "opacity-30 cursor-not-allowed",
                  !active && supported && "hover:border-foreground/60"
                )}
              >
                {m.name}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Loss */}
      <Field label="Loss Function">
        <div className="grid grid-cols-3 gap-1.5">
          {lossOptions.map((l) => (
            <button
              key={l.id}
              disabled={!l.allowed}
              onClick={() => onChange({ ...cfg, loss: l.id })}
              className={cn(
                "border border-panel-border px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest",
                cfg.loss === l.id && "bg-foreground text-background border-foreground",
                !l.allowed && "opacity-30 cursor-not-allowed"
              )}
              title={l.label}
            >
              {l.id}
            </button>
          ))}
        </div>
      </Field>

      {/* Capacity */}
      <Field label={`Capacity · ${model.capacityLabel}`} hint={`${cfg.capacity}`}>
        <input
          type="range"
          min={model.capacityMin}
          max={model.capacityMax}
          value={cfg.capacity}
          onChange={(e) => onChange({ ...cfg, capacity: Number(e.target.value) })}
          className="w-full accent-foreground"
        />
        <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
          <span>{model.capacityMin}</span><span>{model.capacityMax}</span>
        </div>
      </Field>

      {model.hasLayers && (
        <Field label="Hidden Layers" hint={`${cfg.layers}`}>
          <input
            type="range" min={1} max={6} value={cfg.layers}
            onChange={(e) => onChange({ ...cfg, layers: Number(e.target.value) })}
            className="w-full accent-foreground"
          />
        </Field>
      )}

      {/* Regularization */}
      <Field label="Regularization">
        <div className="grid grid-cols-5 gap-1">
          {(["none", "l1", "l2", "elastic", "dropout"] as RegId[]).map((r) => {
            const allowed = r !== "dropout" || cfg.model === "nn";
            return (
              <button
                key={r}
                disabled={!allowed}
                onClick={() => onChange({ ...cfg, regularization: r })}
                className={cn(
                  "border border-panel-border py-1.5 font-mono text-[10px] uppercase tracking-widest",
                  cfg.regularization === r && "bg-foreground text-background border-foreground",
                  !allowed && "opacity-30 cursor-not-allowed"
                )}
              >
                {r === "none" ? "off" : r === "elastic" ? "EN" : r}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground mt-1">
          {cfg.regularization === "l1" && "L1 (Lasso) — encourages sparse weights."}
          {cfg.regularization === "l2" && "L2 (Ridge) — penalizes large weights."}
          {cfg.regularization === "elastic" && "Elastic Net — combines L1 + L2."}
          {cfg.regularization === "dropout" && "Dropout — randomly disables neurons."}
          {cfg.regularization === "none" && "No regularization applied."}
        </div>
      </Field>

      {cfg.regularization !== "none" && cfg.regularization !== "dropout" && (
        <Field label="Reg. Strength (λ)" hint={cfg.regStrength.toFixed(2)}>
          <input type="range" min={0} max={1} step={0.01} value={cfg.regStrength}
            onChange={(e) => onChange({ ...cfg, regStrength: Number(e.target.value) })}
            className="w-full accent-foreground" />
        </Field>
      )}

      {cfg.regularization === "dropout" && (
        <Field label="Dropout Rate" hint={cfg.dropout.toFixed(2)}>
          <input type="range" min={0} max={0.8} step={0.05} value={cfg.dropout}
            onChange={(e) => onChange({ ...cfg, dropout: Number(e.target.value) })}
            className="w-full accent-foreground" />
        </Field>
      )}

      <Field label="Epochs" hint={`${cfg.epochs}`}>
        <input type="range" min={10} max={200} step={5} value={cfg.epochs}
          onChange={(e) => onChange({ ...cfg, epochs: Number(e.target.value) })}
          className="w-full accent-foreground" />
      </Field>

      <div className="grid grid-cols-3 gap-2 pt-2">
        <button
          onClick={onTrain}
          disabled={training}
          className={cn(
            "col-span-2 relative overflow-hidden border border-foreground bg-foreground text-background font-mono text-xs uppercase tracking-[0.25em] py-2.5 hover:bg-foreground/90 transition-colors disabled:opacity-60",
            training && "sweep-line"
          )}
        >
          {training ? "▶ Running" : "▶ Train Model"}
        </button>
        <button
          onClick={onSave}
          className="border border-panel-border font-mono text-[11px] uppercase tracking-widest hover:border-foreground/60"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export type { ConfigState };
