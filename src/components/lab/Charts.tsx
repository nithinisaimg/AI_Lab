// Lightweight SVG charts — strict monochrome.

interface LineProps {
  series: { name: string; data: number[]; dashed?: boolean }[];
  height?: number;
  yLabel?: string;
  xLabel?: string;
  yMin?: number;
  yMax?: number;
}

export function LineChart({ series, height = 220, yLabel, xLabel, yMin, yMax }: LineProps) {
  const W = 600, H = height, P = 32;
  const allVals = series.flatMap((s) => s.data);
  const minV = yMin ?? Math.min(...allVals);
  const maxV = yMax ?? Math.max(...allVals);
  const range = Math.max(0.001, maxV - minV);
  const len = Math.max(...series.map((s) => s.data.length));

  const x = (i: number) => P + (i / Math.max(1, len - 1)) * (W - P * 2);
  const y = (v: number) => H - P - ((v - minV) / range) * (H - P * 2);

  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x={P} y={P} width={W - P * 2} height={H - P * 2} fill="url(#grid)" />
      {/* Frame */}
      <rect x={P} y={P} width={W - P * 2} height={H - P * 2} fill="none" stroke="currentColor" strokeOpacity="0.25" />
      {/* Y grid lines + labels */}
      {grid.map((g, i) => {
        const v = minV + g * range;
        const yy = y(v);
        return (
          <g key={i}>
            <line x1={P} x2={W - P} y1={yy} y2={yy} stroke="currentColor" strokeOpacity="0.08" />
            <text x={P - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5" fontFamily="monospace">{v.toFixed(2)}</text>
          </g>
        );
      })}
      {/* Series */}
      {series.map((s, idx) => {
        const path = s.data.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
        const opacity = idx === 0 ? 1 : 0.7;
        return (
          <g key={s.name}>
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={idx === 0 ? 2 : 1.5}
              strokeDasharray={s.dashed ? "4 3" : undefined}
              strokeOpacity={opacity}
              style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.25))" }}
            />
          </g>
        );
      })}
      {/* Labels */}
      {yLabel && <text x={10} y={P - 8} fontSize="9" fill="currentColor" fillOpacity="0.6" fontFamily="monospace">{yLabel}</text>}
      {xLabel && <text x={W - P} y={H - 8} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.6" fontFamily="monospace">{xLabel}</text>}

      {/* Legend */}
      <g transform={`translate(${W - P - 140}, ${P + 6})`}>
        {series.map((s, i) => (
          <g key={s.name} transform={`translate(0, ${i * 14})`}>
            <line x1={0} x2={18} y1={6} y2={6} stroke="currentColor" strokeWidth={2} strokeDasharray={s.dashed ? "4 3" : undefined} />
            <text x={24} y={9} fontSize="9" fill="currentColor" fillOpacity="0.8" fontFamily="monospace">{s.name.toUpperCase()}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function ConfusionMatrix({ matrix }: { matrix: [[number, number], [number, number]] }) {
  const max = Math.max(...matrix.flat());
  const labels = [["TN", "FP"], ["FN", "TP"]];
  return (
    <div className="inline-grid grid-cols-[auto_repeat(2,1fr)] gap-1 font-mono text-xs">
      <div />
      <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">Pred 0</div>
      <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">Pred 1</div>
      {matrix.map((row, i) => (
        <>
          <div key={`l-${i}`} className="self-center text-[10px] uppercase tracking-widest text-muted-foreground pr-2">Actual {i}</div>
          {row.map((v, j) => {
            const intensity = max ? v / max : 0;
            return (
              <div
                key={`c-${i}-${j}`}
                className="aspect-square border border-panel-border grid place-items-center relative"
                style={{ background: `oklch(${0.18 + intensity * 0.65} 0 0)` }}
              >
                <div className="absolute top-1 left-1 text-[9px] text-muted-foreground/70">{labels[i][j]}</div>
                <div className={intensity > 0.5 ? "text-background font-semibold" : "text-foreground"}>{v}</div>
              </div>
            );
          })}
        </>
      ))}
    </div>
  );
}
