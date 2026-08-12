"use client";

import { GraphRow } from "@/lib/git-engine";

interface DAGGraphCanvasProps {
  graphRows: GraphRow[];
}

const LANE_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"];

export function DAGGraphCanvas({ graphRows }: DAGGraphCanvasProps) {
  if (!graphRows.length) {
    return (
      <div className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-center text-xs text-slate-400 my-2">
        no commits yet &mdash; the history graph appears here
      </div>
    );
  }

  const ROW = 34;
  const PAD = 16;
  const LANE_W = 24;

  let maxLane = 0;
  graphRows.forEach((r) => {
    if (r.lane > maxLane) maxLane = r.lane;
  });

  const textX = PAD + (maxLane + 1) * LANE_W + 8;
  const pos: Record<string, { x: number; y: number }> = {};
  graphRows.forEach((r, i) => {
    pos[r.sha] = { x: PAD + r.lane * LANE_W, y: PAD + i * ROW };
  });

  const width = 640;
  const height = PAD * 2 + (graphRows.length - 1) * ROW;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-2 shadow-xs my-2 font-mono text-xs">
      <div className="text-[11px] font-sans font-semibold text-slate-500 dark:text-slate-400 mb-1 px-2 flex items-center justify-between">
        <span>Commit DAG History Graph</span>
        <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Live Visualizer</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="w-full">
        {/* Draw Edges */}
        {graphRows.map((r) => {
          const a = pos[r.sha];
          return r.parents.map((pSha) => {
            const b = pos[pSha];
            if (!b) return null;
            const color = LANE_COLORS[r.lane % LANE_COLORS.length];
            if (a.x === b.x) {
              return <line key={`${r.sha}-${pSha}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="1.8" />;
            }
            const midY = (a.y + b.y) / 2;
            return (
              <path
                key={`${r.sha}-${pSha}`}
                d={`M${a.x} ${a.y} C${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`}
                fill="none"
                stroke={color}
                strokeWidth="1.8"
              />
            );
          });
        })}

        {/* Draw Nodes & Labels */}
        {graphRows.map((r) => {
          const p = pos[r.sha];
          const color = LANE_COLORS[r.lane % LANE_COLORS.length];
          const isMerge = r.parents.length > 1;
          let currentX = textX;

          return (
            <g key={r.sha}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isMerge ? 6.5 : 5}
                fill={isMerge ? "#0F172A" : color}
                stroke={color}
                strokeWidth="2"
              />

              <text x={currentX} y={p.y + 4} fill="#64748B" fontSize="10">
                {r.sha}
              </text>

              {r.refs.map((ref) => {
                const isHead = ref.indexOf("HEAD") === 0;
                const isRemote = ref.indexOf("/") > -1 && !isHead;
                const pillColor = isHead ? "#6366F1" : isRemote ? "#94A3B8" : "#10B981";
                const pillWidth = ref.length * 6.1 + 10;
                const refX = currentX + 58;
                currentX += pillWidth + 5;

                return (
                  <g key={ref}>
                    <rect
                      x={refX}
                      y={p.y - 8}
                      width={pillWidth}
                      height="16"
                      rx="8"
                      fill="none"
                      stroke={pillColor}
                      strokeWidth="1"
                    />
                    <text x={refX + 5} y={p.y + 3.5} fill={pillColor} fontSize="9" fontWeight="bold">
                      {ref}
                    </text>
                  </g>
                );
              })}

              <text x={currentX + 60} y={p.y + 4} fill="currentColor" className="text-slate-900 dark:text-slate-100" fontSize="11">
                {r.msg.length > 36 ? r.msg.slice(0, 35) + "…" : r.msg}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
