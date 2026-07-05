export function ConstructionScene({ width, height }: { width: number; height: number }) {
  const groundY = height - 30;

  return (
    <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="60%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id="cs-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>

      {/* Morning sky */}
      <rect width={width} height={height} fill="url(#cs-sky)" />

      {/* Dust haze at horizon */}
      <rect x={0} y={groundY - 60} width={width} height={60} fill="#f97316" opacity="0.1" />

      {/* Incomplete building structure (left) */}
      {/* Concrete columns */}
      {[0.08, 0.2, 0.32].map((ratio, i) => (
        <g key={i}>
          <rect x={width * ratio - 8} y={groundY - 160} width={16} height={160} fill="#6b7280" />
          {/* Rebar sticking out */}
          <line x1={width * ratio - 3} y1={groundY - 160} x2={width * ratio - 3} y2={groundY - 180} stroke="#9ca3af" strokeWidth="2" />
          <line x1={width * ratio + 3} y1={groundY - 160} x2={width * ratio + 3} y2={groundY - 175} stroke="#9ca3af" strokeWidth="2" />
        </g>
      ))}
      {/* Partial floor slabs */}
      <rect x={width * 0.08 - 8} y={groundY - 90}  width={width * 0.24 + 16} height={14} fill="#9ca3af" />
      <rect x={width * 0.08 - 8} y={groundY - 160} width={width * 0.14}       height={14} fill="#6b7280" opacity="0.7" />

      {/* Scaffolding (right side) */}
      {[0.62, 0.72, 0.82, 0.92].map((ratio, i) => (
        <g key={i}>
          {/* Vertical tubes */}
          <line x1={width * ratio} y1={groundY - 160} x2={width * ratio} y2={groundY} stroke="#f59e0b" strokeWidth="3" />
          {/* Ledgers */}
          {[40, 80, 120, 160].map(h => (
            <line key={h} x1={width * 0.62} y1={groundY - h} x2={width * 0.92} y2={groundY - h} stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" />
          ))}
          {/* Diagonal braces */}
          <line x1={width * ratio} y1={groundY - 40} x2={width * (ratio + 0.1)} y2={groundY - 80} stroke="#f59e0b" strokeWidth="1" opacity="0.5" />
        </g>
      ))}

      {/* Tower crane */}
      {/* Mast */}
      <rect x={width * 0.47} y={groundY - 200} width={10} height={200} fill="#fbbf24" />
      {/* Jib (main arm) */}
      <line x1={width * 0.47 + 5} y1={groundY - 200} x2={width * 0.47 + 5 + 110} y2={groundY - 200} stroke="#fbbf24" strokeWidth="6" />
      {/* Counter jib */}
      <line x1={width * 0.47 + 5} y1={groundY - 200} x2={width * 0.47 + 5 - 50} y2={groundY - 200} stroke="#fbbf24" strokeWidth="5" />
      {/* Counter weight */}
      <rect x={width * 0.47 - 50} y={groundY - 208} width={30} height={14} fill="#374151" />

      {/* Crane trolley + hook */}
      <g style={{ animation: 'env-crane 8s ease-in-out infinite', transformOrigin: `${width * 0.47 + 5}px ${groundY - 200}px` }}>
        <rect x={width * 0.47 + 55} y={groundY - 205} width={12} height={8} fill="#374151" />
        <line x1={width * 0.47 + 61} y1={groundY - 197} x2={width * 0.47 + 61} y2={groundY - 155} stroke="#9ca3af" strokeWidth="1.5" />
        <path d={`M${width * 0.47 + 54},${groundY - 155} Q${width * 0.47 + 50},${groundY - 145} ${width * 0.47 + 61},${groundY - 145} Q${width * 0.47 + 72},${groundY - 145} ${width * 0.47 + 68},${groundY - 155}`}
          stroke="#fbbf24" strokeWidth="2.5" fill="none" />
        {/* Load block */}
        <rect x={width * 0.47 + 47} y={groundY - 143} width={28} height={18} fill="#6b7280" rx="2" />
      </g>

      {/* Ground / earth excavation */}
      <rect x={0} y={groundY} width={width} height={30} fill="url(#cs-ground)" />
      {/* Excavation pit */}
      <polygon points={`${width * 0.35},${groundY} ${width * 0.55},${groundY} ${width * 0.52},${groundY + 30} ${width * 0.38},${groundY + 30}`} fill="#78350f" />

      {/* Concrete mixer truck */}
      <g style={{ animation: 'env-drive-left 30s linear infinite', animationDelay: '-15s' }}>
        <rect x={width - 60} y={groundY - 24} width={60} height={22} fill="#374151" rx="3" />
        <rect x={width - 48} y={groundY - 36} width={28} height={14} fill="#4b5563" rx="2" />
        <circle cx={width - 50} cy={groundY - 2} r={7} fill="#1f2937" />
        <circle cx={width - 18} cy={groundY - 2} r={7} fill="#1f2937" />
        {/* Drum */}
        <ellipse cx={width - 30} cy={groundY - 28} rx={15} ry={12} fill="#f59e0b" opacity="0.7" />
      </g>

      {/* Dust particles */}
      {[0.3, 0.45, 0.55, 0.7].map((ratio, i) => (
        <circle key={i} cx={width * ratio} cy={groundY - 15} r={3}
          fill="#d97706" opacity="0.3"
          style={{ animation: `env-particle ${1.5 + i * 0.6}s ease-out infinite`, animationDelay: `${-i * 0.5}s` }}
        />
      ))}

      {/* Safety sign */}
      <rect x={width * 0.4 - 22} y={groundY - 55} width={44} height={24} fill="#fbbf24" rx="3" />
      <text x={width * 0.4} y={groundY - 40} fill="#1f2937" fontSize="7" textAnchor="middle" fontWeight="bold" fontFamily="monospace">⚠ ACTIVE SITE</text>
    </svg>
  );
}
