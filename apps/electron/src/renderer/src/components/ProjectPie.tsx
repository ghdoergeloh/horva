import { FormattedMinutes } from "~/components/FormattedMinutes.js";

interface Slice {
  projectId: number | null;
  projectName: string;
  projectColor: string;
  totalMinutes: number;
}

interface ProjectPieProps {
  data: Slice[];
  size?: number;
}

function buildPaths(
  slices: Slice[],
  total: number,
  r: number,
  cx: number,
  cy: number,
) {
  let angle = -Math.PI / 2; // start at top
  return slices.map((slice) => {
    const pct = slice.totalMinutes / total;
    const sweep = pct * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const d = `M ${String(cx)} ${String(cy)} L ${String(x1)} ${String(y1)} A ${String(r)} ${String(r)} 0 ${String(largeArc)} 1 ${String(x2)} ${String(y2)} Z`;
    return { ...slice, d };
  });
}

export function ProjectPie({ data, size = 200 }: ProjectPieProps) {
  const total = data.reduce((sum, s) => sum + s.totalMinutes, 0);
  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        Keine Daten
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.85;

  // Single slice: arc path degenerates — render a circle instead
  const isSingleSlice = data.length === 1;
  const paths = isSingleSlice ? [] : buildPaths(data, total, r, cx, cy);

  return (
    <div className="flex items-start gap-6">
      <svg width={size} height={size} className="flex-shrink-0">
        {isSingleSlice ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={data[0]!.projectColor}
            stroke="white"
            strokeWidth={2}
          />
        ) : (
          paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill={p.projectColor}
              stroke="white"
              strokeWidth={2}
            />
          ))
        )}
      </svg>
      <div className="flex-1 space-y-2 pt-2">
        {data.map((slice) => (
          <div
            key={slice.projectId ?? "no_task"}
            className="flex items-center gap-2"
          >
            <div
              className="h-3 w-3 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: slice.projectColor }}
            />
            <span className="flex-1 text-sm text-gray-700">
              {slice.projectName}
            </span>
            <span className="text-sm font-medium text-gray-900">
              <FormattedMinutes minutes={slice.totalMinutes} />
            </span>
            <span className="text-xs text-gray-400">
              {Math.round((slice.totalMinutes / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
