export function ResidentialScene({ width, height }: { width: number; height: number }) {
  const groundY = height - 40;
  const skyH = groundY;

  return (
    <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="res-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#eff6ff" />
        </linearGradient>
        <linearGradient id="res-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width={width} height={skyH} fill="url(#res-sky)" />

      {/* Clouds */}
      <g style={{ animation: 'env-cloud 30s linear infinite' }}>
        <ellipse cx={120} cy={50} rx={45} ry={18} fill="white" opacity="0.85" />
        <ellipse cx={148} cy={40} rx={32} ry={22} fill="white" opacity="0.9" />
        <ellipse cx={96}  cy={48} rx={28} ry={16} fill="white" opacity="0.8" />
      </g>
      <g style={{ animation: 'env-cloud 45s linear infinite', animationDelay: '-20s' }}>
        <ellipse cx={width - 160} cy={70} rx={50} ry={20} fill="white" opacity="0.7" />
        <ellipse cx={width - 130} cy={58} rx={35} ry={24} fill="white" opacity="0.75" />
      </g>

      {/* House Structure — far left */}
      <rect x={30} y={groundY - 120} width={110} height={120} fill="#d1d5db" stroke="#9ca3af" strokeWidth="1" />
      {/* Roof */}
      <polygon points={`25,${groundY - 120} 145,${groundY - 120} 85,${groundY - 170}`} fill="#b45309" stroke="#92400e" strokeWidth="1" />
      {/* Roof ridge line */}
      <line x1={85} y1={groundY - 170} x2={85} y2={groundY - 120} stroke="#92400e" strokeWidth="0.5" opacity="0.5" />
      {/* Windows */}
      <rect x={45}  y={groundY - 100} width={28} height={22} fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" rx="1" />
      <rect x={100} y={groundY - 100} width={28} height={22} fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" rx="1" />
      <line x1={59}  y1={groundY - 100} x2={59}  y2={groundY - 78} stroke="#93c5fd" strokeWidth="0.8" />
      <line x1={45}  y1={groundY - 89} x2={73}  y2={groundY - 89} stroke="#93c5fd" strokeWidth="0.8" />
      <line x1={114} y1={groundY - 100} x2={114} y2={groundY - 78} stroke="#93c5fd" strokeWidth="0.8" />
      <line x1={100} y1={groundY - 89}  x2={128} y2={groundY - 89} stroke="#93c5fd" strokeWidth="0.8" />
      {/* Door */}
      <rect x={70} y={groundY - 50} width={22} height={50} fill="#92400e" rx="2" />

      {/* Floor framing annotation */}
      <line x1={30} y1={groundY - 60} x2={140} y2={groundY - 60} stroke="#6366f1" strokeWidth="1.5" opacity="0.4" strokeDasharray="4 3" />
      <text x={85} y={groundY - 64} fill="#6366f1" fontSize="6" textAnchor="middle" opacity="0.5" fontFamily="monospace">FLOOR BEAM</text>

      {/* House Structure — right side */}
      <rect x={width - 160} y={groundY - 130} width={130} height={130} fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" />
      <polygon points={`${width - 168},${groundY - 130} ${width - 22},${groundY - 130} ${width - 95},${groundY - 185}`} fill="#d97706" stroke="#b45309" strokeWidth="1" />
      {/* Windows right house */}
      <rect x={width - 148} y={groundY - 110} width={30} height={24} fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" rx="1" />
      <rect x={width - 105} y={groundY - 110} width={30} height={24} fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" rx="1" />
      {/* Door right house */}
      <rect x={width - 110} y={groundY - 55} width={22} height={55} fill="#7c3aed" rx="2" />

      {/* Trees */}
      <g style={{ animation: 'env-sway 4s ease-in-out infinite', transformOrigin: `${width / 2 - 60}px ${groundY}px` }}>
        <rect x={width / 2 - 63} y={groundY - 75} width={6} height={75} fill="#78350f" />
        <ellipse cx={width / 2 - 60} cy={groundY - 90} rx={22} ry={28} fill="#16a34a" />
        <ellipse cx={width / 2 - 60} cy={groundY - 105} rx={16} ry={20} fill="#15803d" />
      </g>
      <g style={{ animation: 'env-sway 5s ease-in-out infinite', animationDelay: '-2s', transformOrigin: `${width / 2 + 60}px ${groundY}px` }}>
        <rect x={width / 2 + 57} y={groundY - 60} width={6} height={60} fill="#78350f" />
        <ellipse cx={width / 2 + 60} cy={groundY - 75} rx={18} ry={22} fill="#22c55e" />
        <ellipse cx={width / 2 + 60} cy={groundY - 88} rx={13} ry={17} fill="#16a34a" />
      </g>

      {/* Flying bird */}
      <g style={{ animation: 'env-bird 12s linear infinite', animationDelay: '-4s' }}>
        <path d={`M${width / 2 - 20},${70} Q${width / 2 - 13},${64} ${width / 2 - 6},${70}`} stroke="#374151" strokeWidth="1.2" fill="none" />
        <path d={`M${width / 2 - 6},${70} Q${width / 2 + 1},${64} ${width / 2 + 8},${70}`} stroke="#374151" strokeWidth="1.2" fill="none" />
      </g>

      {/* Ground */}
      <rect x={0} y={groundY} width={width} height={40} fill="url(#res-ground)" />

      {/* Path */}
      <rect x={width / 2 - 18} y={groundY} width={36} height={40} fill="#d1d5db" opacity="0.7" />
    </svg>
  );
}
