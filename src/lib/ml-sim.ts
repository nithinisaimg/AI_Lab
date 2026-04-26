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
