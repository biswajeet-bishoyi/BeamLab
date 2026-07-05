export function BridgeScene({ width, height }: { width: number; height: number }) {
  const groundY = height - 30;
  const pierH = 130;
  const deckY = groundY - pierH;
  const riverTop = groundY - 55;
  const riverH = 55;

  return (
    <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="br-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="60%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
        <linearGradient id="br-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#075985" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
        <linearGradient id="br-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width={width} height={height} fill="url(#br-sky)" />

      {/* Distant mountains */}
      <polygon points={`0,${groundY - 80} 90,${groundY - 160} 180,${groundY - 80}`} fill="#0c4a6e" opacity="0.4" />
      <polygon points={`${width - 180},${groundY - 80} ${width - 90},${groundY - 175} ${width},${groundY - 80}`} fill="#0c4a6e" opacity="0.4" />
      <polygon points={`50,${groundY - 80} 160,${groundY - 145} 280,${groundY - 80}`} fill="#0f5179" opacity="0.3" />

      {/* Clouds */}
      <g style={{ animation: 'env-cloud 40s linear infinite' }}>
        <ellipse cx={200} cy={45} rx={55} ry={18} fill="white" opacity="0.5" />
        <ellipse cx={235} cy={33} rx={38} ry={22} fill="white" opacity="0.55" />
      </g>
      <g style={{ animation: 'env-cloud 55s linear infinite', animationDelay: '-25s' }}>
        <ellipse cx={width - 200} cy={60} rx={48} ry={16} fill="white" opacity="0.4" />
        <ellipse cx={width - 168} cy={48} rx={33} ry={20} fill="white" opacity="0.45" />
      </g>

      {/* Embankment / terrain on both sides */}
      <polygon points={`0,${groundY - 80} 0,${groundY} 210,${groundY} 210,${riverTop}`} fill="url(#br-hill)" />
      <polygon points={`${width},${groundY - 80} ${width},${groundY} ${width - 210},${groundY} ${width - 210},${riverTop}`} fill="url(#br-hill)" />

      {/* River */}
      <rect x={0} y={riverTop} width={width} height={riverH + 30} fill="url(#br-water)" />
      {/* Water shimmer lines */}
      {[0, 1, 2, 3].map(i => (
        <ellipse
          key={i}
          cx={width * (0.2 + i * 0.18)}
          cy={riverTop + 20 + i * 10}
          rx={35} ry={4}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1"
          opacity="0.3"
          style={{ animation: `env-water ${3 + i * 0.7}s ease-in-out infinite`, animationDelay: `${-i * 0.9}s` }}
        />
      ))}

      {/* Piers */}
      {[0.25, 0.75].map((ratio, i) => {
        const px = width * ratio;
        return (
          <g key={i}>
            <rect x={px - 14} y={deckY + 8} width={28} height={pierH - 8} fill="#374151" />
            <rect x={px - 18} y={deckY + 4} width={36} height={14} fill="#4b5563" />
            {/* Footing */}
            <rect x={px - 24} y={groundY - 20} width={48} height={20} fill="#1f2937" />
          </g>
        );
      })}

      {/* Bridge approach road on embankment */}
      <rect x={0}         y={deckY + 4} width={width * 0.25 - 14} height={12} fill="#4b5563" />
      <rect x={width * 0.75 + 14} y={deckY + 4} width={width * 0.25} height={12} fill="#4b5563" />

      {/* Guardrails */}
      {[-1, 1].map(side => {
        const railY = deckY + (side === -1 ? 0 : 16);
        return (
          <line key={side} x1={0} y1={railY} x2={width} y2={railY} stroke="#6b7280" strokeWidth="2" opacity="0.6" />
        );
      })}
      {/* Rail posts */}
      {Array.from({ length: Math.floor(width / 40) }).map((_, i) => (
        <line key={i} x1={i * 40 + 20} y1={deckY} x2={i * 40 + 20} y2={deckY + 18} stroke="#6b7280" strokeWidth="1.5" opacity="0.5" />
      ))}

      {/* Moving vehicles */}
      <g style={{ animation: 'env-drive 14s linear infinite' }}>
        <rect x={0} y={deckY + 3} width={28} height={8} fill="#ef4444" rx="2" />
        <rect x={3} y={deckY + 2} width={16} height={4} fill="#fca5a5" rx="1" />
      </g>
      <g style={{ animation: 'env-drive 22s linear infinite', animationDelay: '-10s' }}>
        <rect x={0} y={deckY + 3} width={22} height={7} fill="#3b82f6" rx="2" />
      </g>
      <g style={{ animation: 'env-drive-left 18s linear infinite', animationDelay: '-8s' }}>
        <rect x={width - 28} y={deckY + 7} width={28} height={7} fill="#f59e0b" rx="2" />
      </g>
    </svg>
  );
}
