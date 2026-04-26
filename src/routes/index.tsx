import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Navbar } from "@/components/lab/Navbar";
import { Panel } from "@/components/lab/Panel";
import { ControlsPanel, type ConfigState } from "@/components/lab/Controls";
import { LineChart, ConfusionMatrix } from "@/components/lab/Charts";
import { MetricCard } from "@/components/lab/MetricCard";
import { InsightsPanel } from "@/components/lab/Insights";
import { ComparisonBar, type SavedExperiment } from "@/components/lab/ComparisonBar";
import { DATASETS, MODELS, simulate, parseUploadedCSV, recommendFor, type DatasetMeta, type Metrics, type DatasetId } from "@/lib/ml-sim";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Creating Labs · ML Console" },
      { name: "description", content: "A futuristic AI laboratory for exploring loss functions, model capacity, and regularization in machine learning." },
      { property: "og:title", content: "Creating Labs · ML Console" },
      { property: "og:description", content: "Interactive monochrome ML console: explore underfitting, overfitting and generalization on real datasets." },
    ],
  }),
  component: Lab,
});

const DEFAULT_CFG: ConfigState = {
  dataset: "student",
  model: "linear",
  loss: "mse",
  capacity: 2,
  layers: 2,
  regularization: "none",
  regStrength: 0.1,
  dropout: 0.2,
  epochs: 60,
};

function Lab() {
  const [cfg, setCfg] = useState<ConfigState>(DEFAULT_CFG);
  const [training, setTraining] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [saved, setSaved] = useState<SavedExperiment[]>([]);
  const [progress, setProgress] = useState(0);

  const ds = DATASETS[cfg.dataset];
  const model = MODELS[cfg.model];
  const status: "idle" | "training" | "ready" = training ? "training" : metrics ? "ready" : "idle";

  const handleTrain = () => {
    setTraining(true);
    setProgress(0);
    const total = 900;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / total);
      setProgress(p);
      if (p < 1) requestAnimationFrame(tick);
      else {
        setMetrics(simulate(cfg));
        setTraining(false);
      }
    };
    requestAnimationFrame(tick);
  };

  const handleSave = () => {
    if (!metrics) return;
    if (saved.length >= 3) return;
    setSaved((s) => [...s, { id: crypto.randomUUID(), cfg: { ...cfg }, metrics }]);
  };

  const sweep = useMemo(() => {
    return metrics ? [
      { name: "Train", data: metrics.trainCurve },
      { name: "Test", data: metrics.testCurve, dashed: true },
    ] : [];
  }, [metrics]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar status={status} />

      {/* Sub status bar */}
      <div className="border-b border-panel-border bg-background/60">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 md:px-6 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>SYS://lab/{cfg.dataset}/{cfg.model}</span>
          <span>· loss={cfg.loss}</span>
          <span>· cap={cfg.capacity}</span>
          <span>· reg={cfg.regularization}</span>
          <span>· epochs={cfg.epochs}</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="h-1 w-24 bg-muted relative overflow-hidden">
              <span className="absolute inset-y-0 left-0 bg-foreground transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
            </span>
            <span>{(progress * 100).toFixed(0)}%</span>
          </span>
        </div>
      </div>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_340px] gap-4 p-4 md:p-6">
        {/* LEFT — Controls */}
        <aside className="space-y-4">
          <Panel title="Control Bay" subtitle="parameters">
            <ControlsPanel cfg={cfg} onChange={setCfg} onTrain={handleTrain} onSave={handleSave} training={training} />
          </Panel>
        </aside>

        {/* CENTER — Outputs */}
        <section className="space-y-4 min-w-0">
          <Panel title="Performance Telemetry" subtitle="train · test">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4">
              <MetricCard label={ds.task === "binary" ? "Train Acc" : "Train R²"} value={metrics ? (metrics.trainAcc * 100).toFixed(1) : "—"} suffix={metrics ? "%" : ""} />
              <MetricCard label={ds.task === "binary" ? "Test Acc" : "Test R²"} value={metrics ? (metrics.testAcc * 100).toFixed(1) : "—"} suffix={metrics ? "%" : ""} />
              <MetricCard label="Precision" value={metrics ? metrics.precision.toFixed(3) : "—"} />
              <MetricCard label="Recall" value={metrics ? metrics.recall.toFixed(3) : "—"} />
              <MetricCard label="F1 Score" value={metrics ? metrics.f1.toFixed(3) : "—"} />
            </div>
            <div className="scanline border border-panel-border p-2 bg-background/40">
              {metrics ? (
                <LineChart
                  series={[
                    { name: "Train Loss", data: metrics.trainLoss },
                    { name: "Test Loss", data: metrics.testLoss, dashed: true },
                  ]}
                  yLabel="LOSS"
                  xLabel="EPOCH →"
                  yMin={0}
                />
              ) : (
                <EmptyChart label="Loss curves will appear after training" />
              )}
            </div>
          </Panel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel title="Capacity Sweep" subtitle="train vs test">
              <div className="scanline border border-panel-border p-2 bg-background/40">
                {metrics ? (
                  <LineChart
                    series={sweep}
                    yLabel={ds.task === "binary" ? "ACCURACY" : "R²"}
                    xLabel={`${model.capacityLabel.toUpperCase()} →`}
                    yMin={0.3}
                    yMax={1}
                    height={180}
                  />
                ) : (
                  <EmptyChart label="Run a model to see the bias-variance curve" />
                )}
              </div>
              {metrics && (
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                  // The gap between train and test reveals overfitting risk.
                </div>
              )}
            </Panel>

            <Panel title={ds.task === "binary" ? "Confusion Matrix" : "Fit Diagnosis"} subtitle="20% test split">
              {metrics && metrics.confusion ? (
                <div className="flex flex-col items-center gap-3">
                  <ConfusionMatrix matrix={metrics.confusion} />
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <Stat label="TP" value={metrics.confusion[1][1]} />
                    <Stat label="FP" value={metrics.confusion[0][1]} />
                    <Stat label="FN" value={metrics.confusion[1][0]} />
                  </div>
                </div>
              ) : metrics ? (
                <RegressionDiagnosis metrics={metrics} />
              ) : (
                <div className="h-40 grid place-items-center font-mono text-xs text-muted-foreground">// awaiting data stream</div>
              )}
            </Panel>
          </div>

          <Panel title="Comparison Mode" subtitle="up to 3 experiments">
            <ComparisonBar
              saved={saved}
              onClear={() => setSaved([])}
              onRemove={(id) => setSaved((s) => s.filter((x) => x.id !== id))}
            />
          </Panel>
        </section>

        {/* RIGHT — Insights */}
        <aside className="space-y-4">
          <Panel title="AI Tutor" subtitle="interpretation">
            <InsightsPanel metrics={metrics} />
          </Panel>

          <Panel title="Dataset Brief">
            <div className="font-mono text-[11px] space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">NAME</span><span>{ds.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TASK</span><span className="uppercase">{ds.task}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SAMPLES</span><span className="tabular-nums">{ds.samples}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">FEATURES</span><span className="tabular-nums">{ds.features}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TARGET</span><span>{ds.targetName}</span></div>
              <p className="text-muted-foreground pt-2 leading-relaxed">{ds.description}</p>
            </div>
          </Panel>
        </aside>
      </main>

      <footer className="border-t border-panel-border px-4 md:px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex items-center justify-between">
        <span>creating labs © ml.console</span>
        <span>simulated training · educational prototype</span>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-panel-border p-2 text-center">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-mono text-lg tabular-nums">{value}</div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-44 grid place-items-center font-mono text-xs text-muted-foreground">// {label}</div>
  );
}

function RegressionDiagnosis({ metrics }: { metrics: Metrics }) {
  const gap = (metrics.trainAcc - metrics.testAcc) * 100;
  return (
    <div className="space-y-3 font-mono text-[11px]">
      <div className="flex justify-between"><span className="text-muted-foreground">TRAIN R²</span><span>{(metrics.trainAcc * 100).toFixed(1)}%</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">TEST R²</span><span>{(metrics.testAcc * 100).toFixed(1)}%</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">GENERALIZATION GAP</span><span>{gap.toFixed(1)}%</span></div>
      <div className="h-2 bg-muted relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-foreground" style={{ width: `${metrics.testAcc * 100}%` }} />
      </div>
      <p className="text-muted-foreground leading-relaxed pt-2">
        For regression tasks, the diagnosis compares train and test R². A large gap indicates overfitting; uniformly low values indicate underfitting.
      </p>
    </div>
  );
}
