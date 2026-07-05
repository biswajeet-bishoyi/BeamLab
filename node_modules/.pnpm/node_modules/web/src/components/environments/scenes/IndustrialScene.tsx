export function IndustrialScene({ width, height }: { width: number; height: number }) {
  const floorY = height - 30;
  const roofY = 30;
  const colH = floorY - roofY;

  return (
    <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ind-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        <linearGradient id="ind-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#ind-bg)" />

      {/* Corrugated roof panels */}
      {Array.from({ length: Math.ceil(width / 50) }).map((_, i) => (
        <rect key={i} x={i * 50} y={roofY} width={48} height={16} fill={i % 2 === 0 ? '#374151' : '#4b5563'} />
      ))}
      {/* Roof truss chord */}
      <line x1={0} y1={roofY + 16} x2={width} y2={roofY + 16} stroke="#6b7280" strokeWidth="3" />

      {/* Skylights */}
      {[0.2, 0.5, 0.8].map((ratio, i) => (
        <g key={i}>
          <rect x={width * ratio - 25} y={roofY} width={50} height={16} fill="#bfdbfe" opacity="0.3" />
          <rect x={width * ratio - 25} y={roofY} width={50} height={16} fill="none" stroke="#93c5fd" strokeWidth="1" opacity="0.5" />
          {/* Light shaft */}
          <polygon
            points={`${width * ratio - 25},${roofY + 16} ${width * ratio + 25},${roofY + 16} ${width * ratio + 40},${floorY - 10} ${width * ratio - 40},${floorY - 10}`}
            fill="#dbeafe"
            opacity="0.05"
          />
        </g>
      ))}

      {/* Steel columns */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const cx = Math.round(width * ratio);
        return (
          <g key={i}>
            <rect x={cx - 6} y={roofY + 16} width={12} height={colH - 16} fill="#4b5563" />
            {/* Column base plate */}
            <rect x={cx - 12} y={floorY - 8} width={24} height={8} fill="#374151" />
          </g>
        );
      })}

      {/* Overhead crane rail (this is where the beam lives) */}
      <line x1={0} y1={roofY + 80} x2={width} y2={roofY + 80} stroke="#6b7280" strokeWidth="4" opacity="0.5" />
      {/* Crane runway beam annotation */}
      <text x={width / 2} y={roofY + 77} fill="#fbbf24" fontSize="7" textAnchor="middle" opacity="0.6" fontFamily="monospace">CRANE RUNWAY BEAM</text>

      {/* Crane hook */}
      <g style={{ animation: 'env-hook 5s ease-in-out infinite', transformOrigin: `${width / 2}px ${roofY + 85}px` }}>
        <line x1={width / 2} y1={roofY + 85} x2={width / 2} y2={roofY + 135} stroke="#9ca3af" strokeWidth="2" />
        <path d={`M${width / 2 - 8},${roofY + 135} Q${width / 2 - 12},${roofY + 148} ${width / 2},${roofY + 148} Q${width / 2 + 12},${roofY + 148} ${width / 2 + 8},${roofY + 135}`} stroke="#fbbf24" strokeWidth="2.5" fill="none" />
        <rect x={width / 2 - 20} y={roofY + 150} width={40} height={22} rx="3" fill="#374151" stroke="#6b7280" strokeWidth="1.5" />
      </g>

      {/* Warning lights on columns */}
      {[0.25, 0.75].map((ratio, i) => (
        <g key={i}>
          <circle cx={width * ratio} cy={roofY + 30} r={5} fill="#ef4444" style={{ animation: `env-pulse-light ${1.5 + i * 0.3}s ease-in-out infinite` }} />
        </g>
      ))}

      {/* Floor */}
      <rect x={0} y={floorY} width={width} height={30} fill="url(#ind-floor)" />
      {/* Floor markings */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={width * i / 5} y1={floorY} x2={width * i / 5} y2={floorY + 5} stroke="#6b7280" strokeWidth="1" opacity="0.4" />
      ))}

      {/* Safety stripes on floor */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={i * (width / 7)} y={floorY} width={width / 14} height={6} fill="#fbbf24" opacity="0.3" />
      ))}

      {/* Dust particles */}
      {[0.3, 0.6, 0.15, 0.85].map((ratio, i) => (
        <circle
          key={i}
          cx={width * ratio}
          cy={floorY - 20}
          r={2}
          fill="#9ca3af"
          opacity="0.4"
          style={{ animation: `env-particle ${2 + i * 0.8}s ease-out infinite`, animationDelay: `${-i * 0.7}s` }}
        />
      ))}
    </svg>
  );
}
