interface LoadingSpinnerProps {
  size?: number;
  label?: string;
}

export function LoadingSpinner({ size = 48, label }: LoadingSpinnerProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.33;
  const strokeW = size * 0.075;
  const uid = `spinner-${String(size)}`;

  // Static progress arc (270° sweep, same as icon)
  const startDeg = 220;
  const endDeg = 140;
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const arcX1 = cx + r * Math.cos(startRad);
  const arcY1 = cy + r * Math.sin(startRad);
  const arcX2 = cx + r * Math.cos(endRad);
  const arcY2 = cy + r * Math.sin(endRad);

  // Minute hand tip (for spin animation origin = center)
  const minRad = (330 * Math.PI) / 180;
  const minLen = r * 0.76;
  const mx = cx + minLen * Math.cos(minRad);
  const my = cy + minLen * Math.sin(minRad);

  // Hour hand tip
  const hourRad = (240 * Math.PI) / 180;
  const hourLen = r * 0.58;
  const hx = cx + hourLen * Math.cos(hourRad);
  const hy = cy + hourLen * Math.sin(hourRad);

  // Arc tip dot position
  const tipX = arcX2;
  const tipY = arcY2;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id={`${uid}-bg`}
            x1="0"
            y1="0"
            x2={size}
            y2={size}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="50%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
          <linearGradient
            id={`${uid}-arc`}
            x1="0"
            y1="0"
            x2={size}
            y2={size}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <radialGradient id={`${uid}-hand`} cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#e0e7ff" />
            <stop offset="100%" stopColor="#a5b4fc" />
          </radialGradient>
          <radialGradient id={`${uid}-center`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#e0e7ff" />
            <stop offset="100%" stopColor="#818cf8" />
          </radialGradient>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>

          {/* Spinning animation style */}
          <style>{`
            @keyframes tt-spin-minute {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes tt-spin-hour {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes tt-pulse-arc {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.55; }
            }
            @keyframes tt-pulse-tip {
              0%, 100% { r: ${String(size * 0.055)}; opacity: 1; }
              50%       { r: ${String(size * 0.085)}; opacity: 0.6; }
            }
            .tt-minute-hand {
              transform-origin: ${String(cx)}px ${String(cy)}px;
              animation: tt-spin-minute 2s linear infinite;
            }
            .tt-hour-hand {
              transform-origin: ${String(cx)}px ${String(cy)}px;
              animation: tt-spin-hour 14s linear infinite;
            }
            .tt-arc {
              animation: tt-pulse-arc 2s ease-in-out infinite;
            }
            .tt-tip-glow {
              transform-origin: ${String(tipX)}px ${String(tipY)}px;
              animation: tt-pulse-arc 2s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* Rounded background */}
        <rect
          width={size}
          height={size}
          rx={size * 0.22}
          fill={`url(#${uid}-bg)`}
        />

        {/* Subtle inner glow */}
        <ellipse
          cx={cx * 0.8}
          cy={cy * 0.6}
          rx={size * 0.3}
          ry={size * 0.22}
          fill="#6366f1"
          fillOpacity={0.18}
        />

        {/* Track ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#4338ca"
          strokeOpacity={0.45}
          strokeWidth={strokeW}
          fill="none"
        />

        {/* Progress arc — pulses */}
        <path
          className="tt-arc"
          d={`M ${arcX1} ${arcY1} A ${r} ${r} 0 1 1 ${arcX2} ${arcY2}`}
          stroke={`url(#${uid}-arc)`}
          strokeWidth={strokeW}
          strokeLinecap="round"
          fill="none"
        />

        {/* Hour hand — slow rotation */}
        <line
          className="tt-hour-hand"
          x1={cx}
          y1={cy}
          x2={hx}
          y2={hy}
          stroke={`url(#${uid}-hand)`}
          strokeWidth={size * 0.065}
          strokeLinecap="round"
        />

        {/* Minute hand — fast rotation */}
        <line
          className="tt-minute-hand"
          x1={cx}
          y1={cy}
          x2={mx}
          y2={my}
          stroke={`url(#${uid}-hand)`}
          strokeWidth={size * 0.048}
          strokeLinecap="round"
        />

        {/* Center hub */}
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.072}
          fill="#1e1b4b"
          fillOpacity={0.8}
        />
        <circle cx={cx} cy={cy} r={size * 0.052} fill={`url(#${uid}-center)`} />

        {/* Arc tip glow — pulses */}
        <circle
          className="tt-tip-glow"
          cx={tipX}
          cy={tipY}
          r={size * 0.075}
          fill={`url(#${uid}-glow)`}
        />
        <circle cx={tipX} cy={tipY} r={size * 0.055} fill="#7dd3fc" />
        <circle
          cx={tipX}
          cy={tipY}
          r={size * 0.03}
          fill="#ffffff"
          fillOpacity={0.9}
        />
      </svg>

      {label !== undefined && label !== "" && (
        <p className="text-xs text-gray-400">{label}</p>
      )}
    </div>
  );
}
