import { formatAmountCompact } from "@/domain/shared/format";
import type { MonthBucket } from "@/domain/deal/deal";

/** Dependency-free SVG bar chart of sales volume per month, with deal counts under each label. */
export function MonthlyBarChart({ buckets }: { buckets: readonly MonthBucket[] }) {
  const width = 560;
  const height = 220;
  const padding = { top: 24, right: 8, bottom: 44, left: 8 };
  const innerHeight = height - padding.top - padding.bottom;
  const slot = (width - padding.left - padding.right) / Math.max(buckets.length, 1);
  const max = Math.max(...buckets.map((bucket) => bucket.volume), 1);

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Volume des ventes par mois" className="h-auto w-full">
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} className="stroke-outline-variant" />
        {buckets.map((bucket, index) => {
          const barHeight = bucket.volume === 0 ? 2 : (bucket.volume / max) * innerHeight;
          const x = padding.left + index * slot + slot * 0.2;
          const barWidth = slot * 0.6;
          const y = height - padding.bottom - barHeight;
          const isLast = index === buckets.length - 1;
          return (
            <g key={bucket.key}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} className={isLast ? "fill-primary-container" : "fill-primary-fixed-dim"} />
              {bucket.volume > 0 && (
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="fill-on-surface text-[11px] font-semibold">
                  {formatAmountCompact(bucket.volume)}
                </text>
              )}
              <text x={x + barWidth / 2} y={height - padding.bottom + 16} textAnchor="middle" className="fill-on-surface-variant text-[11px]">
                {bucket.label}
              </text>
              <text x={x + barWidth / 2} y={height - padding.bottom + 31} textAnchor="middle" className="fill-outline text-[10px]">
                {bucket.count} vente{bucket.count > 1 ? "s" : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
