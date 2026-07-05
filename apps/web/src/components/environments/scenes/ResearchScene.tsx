export function ResearchScene({ width, height }: { width: number; height: number }) {
  const floorY = height - 30;

  return (
    <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rs-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <pattern id="rs-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Clean white background */}
      <rect width={width} height={height} fill="url(#rs-bg)" />
      <rect width={width} height={height} fill="url(#rs-grid)" opacity="0.7" />

      {/* Lab bench left */}
      <rect x={20} y={floorY - 70} width={130} height={70} fill="#e2e8f0" rx="3" stroke="#cbd5e1" strokeWidth="1" />
      <rect x={20} y={floorY - 70} width={130} height={6} fill="#94a3b8" rx="2" />
      {/* Lab equipment on bench */}
      {/* Computer monitor */}
      <rect x={30} y={floorY - 65} width={45} height={32} fill="#1e293b" rx="2" />
      <rect x={33} y={floorY - 62} width={39} height={25} fill="#0ea5e9" opacity="0.7" />
      <rect x={50} y={floorY - 33} width={10} height={3} fill="#475569" />
      {/* Small graph on screen */}
      <polyline points={`35,${floorY - 48} 42,${floorY - 55} 52,${floorY - 50} 60,${floorY - 58} 70,${floorY - 52}`}
        stroke="#34d399" strokeWidth="1.5" fill="none" />

      {/* Specimen/model on bench */}
      <rect x={90} y={floorY - 60} width={50} height={8} fill="#64748b" rx="1" />
      {/* Support triangles */}
      <polygon points={`93,${floorY - 52} 100,${floorY - 52} 96,${floorY - 44}`} fill="#475569" />
      <polygon points={`133,${floorY - 52} 140,${floorY - 52} 136,${floorY - 44}`} fill="#475569" />

      {/* Lab bench right */}
      <rect x={width - 150} y={floorY - 70} width={130} height={70} fill="#e2e8f0" rx="3" stroke="#cbd5e1" strokeWidth="1" />
      <rect x={width - 150} y={floorY - 70} width={130} height={6} fill="#94a3b8" rx="2" />

      {/* Measurement instruments */}
      {/* Dial gauge */}
      <circle cx={width - 110} cy={floorY - 45} r={18} fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
      <circle cx={width - 110} cy={floorY - 45} r={14} fill="white" stroke="#94a3b8" strokeWidth="0.5" />
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        return (
          <line key={i}
            x1={width - 110 + Math.cos(angle) * 11}
            y1={floorY - 45 + Math.sin(angle) * 11}
            x2={width - 110 + Math.cos(angle) * 13}
            y2={floorY - 45 + Math.sin(angle) * 13}
            stroke="#475569" strokeWidth="1" />
        );
      })}
      <line x1={width - 110} y1={floorY - 45} x2={width - 110 + 8} y2={floorY - 52} stroke="#ef4444" strokeWidth="1.5" />

      {/* Note pad / data sheet */}
      <rect x={width - 78} y={floorY - 68} width={50} height={62} fill="white" stroke="#e2e8f0" strokeWidth="1" rx="1" />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <line key={i} x1={width - 74} y1={floorY - 60 + i * 9} x2={width - 34} y2={floorY - 60 + i * 9} stroke="#94a3b8" strokeWidth="0.8" />
      ))}
      <text x={width - 53} y={floorY - 64} fill="#64748b" fontSize="5" textAnchor="middle" fontFamily="monospace">DATA LOG</text>

      {/* Engineering equations floating */}
      <text x={width * 0.4} y={80} fill="#6366f1" fontSize="10" fontFamily="monospace" opacity="0.25">σ = M·y / I</text>
      <text x={width * 0.55} y={120} fill="#0ea5e9" fontSize="9" fontFamily="monospace" opacity="0.2">δ = PL³/48EI</text>
      <text x={width * 0.3} y={150} fill="#10b981" fontSize="8" fontFamily="monospace" opacity="0.18">V = dM/dx</text>
      <text x={width * 0.6} y={160} fill="#f59e0b" fontSize="8" fontFamily="monospace" opacity="0.18">EI·d²y/dx² = M(x)</text>

      {/* Ruler along bottom */}
      <rect x={width / 2 - 120} y={floorY - 12} width={240} height={8} fill="#e2e8f0" rx="2" stroke="#94a3b8" strokeWidth="0.5" />
      {Array.from({ length: 25 }).map((_, i) => (
        <line key={i}
          x1={width / 2 - 120 + i * 10}
          y1={floorY - 12}
          x2={width / 2 - 120 + i * 10}
          y2={i % 5 === 0 ? floorY - 7 : floorY - 9}
          stroke="#64748b" strokeWidth="0.8" />
      ))}

      {/* Floor */}
      <rect x={0} y={floorY} width={width} height={30} fill="#e2e8f0" />
      <line x1={0} y1={floorY} x2={width} y2={floorY} stroke="#cbd5e1" strokeWidth="1.5" />
    </svg>
  );
}
