// Lightweight ML "simulator" — produces realistic-looking metrics & curves
// based on capacity and regularization, illustrating under/over-fitting.

export type DatasetId = string;
export type ModelId = "linear" | "logistic" | "tree" | "forest" | "nn";
export type LossId = "mse" | "bce" | "cce";
export type RegId = "none" | "l1" | "l2" | "elastic" | "dropout";

export interface DatasetMeta {
  id: DatasetId;
  name: string;
  task: "regression" | "binary";
  samples: number;
  features: number;
  targetName: string;
  description: string;
  uploaded?: boolean;
}

export const DATASETS: Record<DatasetId, DatasetMeta> = {
  student: {
    id: "student",
    name: "Student Performance",
    task: "regression",
    samples: 395,
    features: 13,
    targetName: "final_grade",
    description: "Predict student final grade from demographics and study habits.",
  },
  "breast-cancer": {
    id: "breast-cancer",
    name: "Breast Cancer Wisconsin",
    task: "binary",
    samples: 569,
    features: 30,
    targetName: "diagnosis",
    description: "Binary classification of tumor samples as malignant or benign.",
  },
};

export interface ModelMeta {
  id: ModelId;
  name: string;
  capacityLabel: string;
  capacityMin: number;
  capacityMax: number;
  capacityDefault: number;
  supports: { regression: boolean; binary: boolean };
  hasNeurons?: boolean;
  hasLayers?: boolean;
}

export const MODELS: Record<ModelId, ModelMeta> = {
  linear: { id: "linear", name: "Linear Regression", capacityLabel: "Polynomial degree", capacityMin: 1, capacityMax: 12, capacityDefault: 2, supports: { regression: true, binary: false } },
  logistic: { id: "logistic", name: "Logistic Regression", capacityLabel: "Polynomial degree", capacityMin: 1, capacityMax: 10, capacityDefault: 2, supports: { regression: false, binary: true } },
  tree: { id: "tree", name: "Decision Tree", capacityLabel: "Tree depth", capacityMin: 1, capacityMax: 20, capacityDefault: 5, supports: { regression: true, binary: true } },
  forest: { id: "forest", name: "Random Forest", capacityLabel: "Number of estimators", capacityMin: 5, capacityMax: 300, capacityDefault: 50, supports: { regression: true, binary: true } },
  nn: { id: "nn", name: "Neural Network", capacityLabel: "Neurons per layer", capacityMin: 4, capacityMax: 256, capacityDefault: 32, supports: { regression: true, binary: true }, hasNeurons: true, hasLayers: true },
};

export interface RunConfig {
  dataset: DatasetId;
  model: ModelId;
  loss: LossId;
  capacity: number;
  layers?: number;
  regularization: RegId;
  regStrength: number; // 0..1
  dropout?: number; // 0..0.8
  epochs: number;
}

export interface Metrics {
  trainAcc: number;
  testAcc: number;
  precision: number;
  recall: number;
  f1: number;
  confusion: [[number, number], [number, number]] | null;
  trainLoss: number[];
  testLoss: number[];
  trainCurve: number[];
  testCurve: number[];
  verdict: "underfit" | "good" | "overfit";
  insight: string;
}

function clamp(x: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, x)); }

// Heuristic: capacity vs ideal. Too low → underfit. Too high w/ low reg → overfit.
export function simulate(cfg: RunConfig): Metrics {
  const ds = DATASETS[cfg.dataset];
  const m = MODELS[cfg.model];
  // Normalize capacity 0..1
  const capN = (cfg.capacity - m.capacityMin) / (m.capacityMax - m.capacityMin);
  // Effective complexity (NN multiplied by layers)
  const layers = cfg.layers ?? 1;
  const complexity = clamp(capN * (m.id === "nn" ? Math.sqrt(layers) : 1), 0, 1.4);

  // Regularization "tames" complexity for test gap
  const regEffect =
    cfg.regularization === "none" ? 0 :
    cfg.regularization === "dropout" ? (cfg.dropout ?? 0.2) * 1.2 :
    cfg.regStrength * (cfg.regularization === "elastic" ? 1.0 : 0.9);

  // Train accuracy increases with complexity, capped.
  const baseTrain = ds.task === "binary" ? 0.62 : 0.55;
  const trainAcc = clamp(baseTrain + 0.40 * Math.pow(complexity, 0.6) - 0.05 * regEffect, 0.4, 0.995);

  // Generalization gap grows with complexity, shrinks with reg.
  const overfitGap = clamp(Math.max(0, complexity - 0.45) * 0.55 - regEffect * 0.5, 0, 0.45);
  // Under-capacity penalty
  const underPenalty = clamp((0.35 - complexity) * 0.6, 0, 0.25);
  const testAcc = clamp(trainAcc - overfitGap - underPenalty, 0.3, 0.99);

  // Determine verdict
  const gap = trainAcc - testAcc;
  let verdict: Metrics["verdict"] = "good";
  let insight = "";
  if (testAcc < 0.65 && trainAcc < 0.75) {
    verdict = "underfit";
    insight = "The model is underfitting — both training and test scores are low. The model lacks capacity to capture patterns. Try increasing capacity or reducing regularization.";
  } else if (gap > 0.12) {
    verdict = "overfit";
    insight = "The model is overfitting — training score is high but test score drops sharply. Reduce capacity, add regularization, or use more data to improve generalization.";
  } else {
    verdict = "good";
    insight = "Good fit detected. Training and test performance are close and both reasonably high. The model generalizes well to unseen data.";
  }

  // Loss curves
  const trainLoss: number[] = [];
  const testLoss: number[] = [];
  const startLoss = ds.task === "binary" ? 0.69 : 1.0;
  const finalTrainLoss = (1 - trainAcc) * startLoss * 1.4;
  const finalTestLoss = (1 - testAcc) * startLoss * 1.4 + (verdict === "overfit" ? 0.05 : 0);
  for (let i = 0; i < cfg.epochs; i++) {
    const t = i / Math.max(1, cfg.epochs - 1);
    const tr = startLoss * Math.exp(-3.0 * t) + finalTrainLoss + (Math.random() - 0.5) * 0.02;
    let te = startLoss * Math.exp(-2.4 * t) + finalTestLoss + (Math.random() - 0.5) * 0.03;
    if (verdict === "overfit" && t > 0.5) {
      te += (t - 0.5) * 0.6 * overfitGap;
    }
    trainLoss.push(Math.max(0.01, tr));
    testLoss.push(Math.max(0.01, te));
  }

  // Performance curves (accuracy/R²) over capacity sweep — for visualization
  const trainCurve: number[] = [];
  const testCurve: number[] = [];
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const c = i / (steps - 1);
    const cmplx = clamp(c * (m.id === "nn" ? Math.sqrt(layers) : 1), 0, 1.4);
    const tr = clamp(baseTrain + 0.40 * Math.pow(cmplx, 0.6) - 0.05 * regEffect, 0.4, 0.995);
    const og = clamp(Math.max(0, cmplx - 0.45) * 0.55 - regEffect * 0.5, 0, 0.45);
    const up = clamp((0.35 - cmplx) * 0.6, 0, 0.25);
    const te = clamp(tr - og - up, 0.3, 0.99);
    trainCurve.push(tr);
    testCurve.push(te);
  }

  // Classification metrics
  let precision = 0, recall = 0, f1 = 0;
  let confusion: Metrics["confusion"] = null;
  if (ds.task === "binary") {
    const total = Math.floor(ds.samples * 0.2);
    const positives = Math.floor(total * 0.45);
    const negatives = total - positives;
    const tp = Math.round(positives * testAcc);
    const fn = positives - tp;
    const tn = Math.round(negatives * (testAcc - 0.02));
    const fp = Math.max(0, negatives - tn);
    precision = tp / Math.max(1, tp + fp);
    recall = tp / Math.max(1, tp + fn);
    f1 = (2 * precision * recall) / Math.max(0.0001, precision + recall);
    confusion = [[tn, fp], [fn, tp]];
  } else {
    // For regression, repurpose precision/recall as R² and MAE-ish proxies
    precision = testAcc; // R²
    recall = clamp(1 - (1 - testAcc) * 1.2, 0, 1);
    f1 = (precision + recall) / 2;
  }

  return { trainAcc, testAcc, precision, recall, f1, confusion, trainLoss, testLoss, trainCurve, testCurve, verdict, insight };
}

// =====================================================================
// Dataset upload + recommendation engine
// =====================================================================

export interface ParsedDataset {
  meta: DatasetMeta;
  headers: string[];
  preview: string[][]; // first ~5 rows
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  // simple CSV splitter — supports quoted fields with commas
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' ) { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = split(lines[0]);
  const rows = lines.slice(1).map(split);
  return { headers, rows };
}

function inferTask(targetValues: string[]): "regression" | "binary" {
  const unique = new Set(targetValues.map((v) => v.toLowerCase()));
  if (unique.size <= 2) return "binary";
  // numeric with many distinct values → regression
  const nums = targetValues.map(Number).filter((n) => !Number.isNaN(n));
  if (nums.length / Math.max(1, targetValues.length) > 0.8 && unique.size > 10) return "regression";
  return unique.size <= 5 ? "binary" : "regression";
}

export function parseUploadedCSV(filename: string, text: string): ParsedDataset {
  const { headers, rows } = parseCSV(text);
  if (headers.length < 2 || rows.length === 0) {
    throw new Error("Dataset must have a header row and at least one data row.");
  }
  const targetName = headers[headers.length - 1];
  const targetValues = rows.map((r) => r[headers.length - 1] ?? "").filter(Boolean);
  const task = inferTask(targetValues);

  const id = `upload:${Date.now()}`;
  const cleanName = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");

  const meta: DatasetMeta = {
    id,
    name: cleanName || "Uploaded Dataset",
    task,
    samples: rows.length,
    features: headers.length - 1,
    targetName,
    description: `User-uploaded dataset. Target column "${targetName}" detected as ${task} task.`,
    uploaded: true,
  };

  return { meta, headers, preview: rows.slice(0, 5) };
}

// Recommended config based on dataset task + size
export interface Recommendation {
  model: ModelId;
  loss: LossId;
  regularization: RegId;
  regStrength: number;
  dropout: number;
  epochs: number;
  capacity: number;
  layers: number;
  rationale: string;
}

export function recommendFor(meta: DatasetMeta): Recommendation {
  const isBinary = meta.task === "binary";
  const big = meta.samples > 1000;
  const wide = meta.features > 20;
  const small = meta.samples < 500;

  // Pick a model that genuinely fits the dataset profile.
  // - Wide + many samples → Neural Network
  // - Wide binary classification → Random Forest (robust on tabular)
  // - Small regression → Linear Regression (low variance)
  // - Small binary → Logistic Regression
  // - Otherwise → Decision Tree / Forest
  let model: ModelId;
  if (big && wide) model = "nn";
  else if (wide) model = "forest";
  else if (small && isBinary) model = "logistic";
  else if (small && !isBinary) model = "linear";
  else model = "tree";

  const m = MODELS[model];

  const capacity =
    model === "forest" ? Math.min(120, Math.max(40, Math.round(meta.samples / 8))) :
    model === "nn" ? Math.min(64, Math.max(16, Math.round(meta.features * 2))) :
    model === "tree" ? Math.min(8, Math.max(4, Math.round(Math.log2(meta.samples)))) :
    model === "linear" ? 2 :
    model === "logistic" ? 2 :
    m.capacityDefault;

  const layers = model === "nn" ? (big ? 3 : 2) : 1;

  const loss: LossId = isBinary ? "bce" : "mse";

  // Pick regularization based on model + size
  let regularization: RegId;
  if (model === "nn") regularization = "dropout";
  else if (model === "tree" || model === "forest") regularization = "none";
  else regularization = small ? "l2" : "elastic";

  const regStrength = small ? 0.3 : 0.15;
  const dropout = small ? 0.4 : 0.25;

  const epochs =
    model === "nn" ? (big ? 120 : 80) :
    model === "forest" ? 50 :
    model === "tree" ? 40 :
    60;

  const rationale =
    `${m.name} → best fit for ${meta.task} with ${meta.samples} samples, ${meta.features} features. ` +
    `Loss=${loss.toUpperCase()}, regularization=${regularization === "none" ? "none (tree-based)" : regularization.toUpperCase()}, epochs=${epochs}. ` +
    `${small ? "Small dataset → simpler model + stronger regularization." : big ? "Large dataset → higher-capacity model." : "Balanced configuration."}`;

  return { model, loss, regularization, regStrength, dropout, epochs, capacity, layers, rationale };
}
