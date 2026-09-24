interface AppIconProps {
  size?: number;
  className?: string;
}

export function AppIcon({ size = 32, className }: AppIconProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.33;
  const strokeW = size * 0.075;

  // Track ring slightly larger than arc
  const trackR = r;

  // Progress arc: 270° sweep from ~220° to ~140° (clock angles)
  // Start: 220° from 3 o'clock = top-left quadrant
  // End: 140° from 3 o'clock = bottom-left quadrant
  const startDeg = 220;
  const endDeg = 140;
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;

  const arcX1 = cx + r * Math.cos(startRad);
  const arcY1 = cy + r * Math.sin(startRad);
  const arcX2 = cx + r * Math.cos(endRad);
  const arcY2 = cy + r * Math.sin(endRad);

  // Arc tip (glow dot)
  const tipX = arcX2;
  const tipY = arcY2;

  // Hour hand: 10 o'clock = 300° clockwise from 12 = -120° from 3 o'clock = 240° standard
  const hourRad = (240 * Math.PI) / 180;
  const hourLen = r * 0.58;
  const hx = cx + hourLen * Math.cos(hourRad);
  const hy = cy + hourLen * Math.sin(hourRad);

  // Minute hand: 2 o'clock = 60° clockwise from 12 = -30° from 3 o'clock = 330° standard...
  // Actually: 2 o'clock = 60° from 12 clockwise = 60° - 90° = -30° from 3 = 330° standard
  const minRad = (330 * Math.PI) / 180;
  const minLen = r * 0.76;
  const mx = cx + minLen * Math.cos(minRad);
  const my = cy + minLen * Math.sin(minRad);

  const uid = `icon-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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
      </defs>

      {/* Rounded background */}
      <rect
        width={size}
        height={size}
        rx={size * 0.22}
        fill={`url(#${uid}-bg)`}
      />

      {/* Inner glow */}
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
        r={trackR}
        stroke="#4338ca"
        strokeOpacity={0.45}
        strokeWidth={strokeW}
        fill="none"
      />

      {/* Progress arc (270°, large arc flag = 1) */}
      <path
        d={`M ${arcX1} ${arcY1} A ${r} ${r} 0 1 1 ${arcX2} ${arcY2}`}
        stroke={`url(#${uid}-arc)`}
        strokeWidth={strokeW}
        strokeLinecap="round"
        fill="none"
      />

      {/* Hour hand */}
      <line
        x1={cx}
        y1={cy}
        x2={hx}
        y2={hy}
        stroke={`url(#${uid}-hand)`}
        strokeWidth={size * 0.065}
        strokeLinecap="round"
      />

      {/* Minute hand */}
      <line
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

      {/* Arc tip dot */}
      <circle cx={tipX} cy={tipY} r={size * 0.055} fill="#7dd3fc" />
      <circle
        cx={tipX}
        cy={tipY}
        r={size * 0.03}
        fill="#ffffff"
        fillOpacity={0.9}
      />
    </svg>
  );
}
