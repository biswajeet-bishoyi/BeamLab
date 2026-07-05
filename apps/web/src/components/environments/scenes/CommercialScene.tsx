export function CommercialScene({ width, height }: { width: number; height: number }) {
  const groundY = height - 30;

  const buildingFloors = (x: number, floorH: number, floors: number, w: number, dark: string, light: string) => {
    const totalH = floorH * floors;
    const baseY = groundY - totalH;
    return (
      <g>
        <rect x={x} y={baseY} width={w} height={totalH} fill={dark} />
        {Array.from({ length: floors }).map((_, fi) =>
          Array.from({ length: Math.floor(w / 20) }).map((_, wi) => (
            <rect
              key={`${fi}-${wi}`}
              x={x + 4 + wi * 20}
              y={baseY + fi * floorH + 4}
              width={12}
              height={floorH - 8}
              fill={Math.random() > 0.3 ? light : dark}
              opacity={0.7 + Math.random() * 0.3}
            />
          ))
        )}
      </g>
    );
  };

  return (
    <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="com-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="50%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id="com-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>

      {/* Night sky */}
      <rect width={width} height={height} fill="url(#com-sky)" />

      {/* Stars */}
      {Array.from({ length: 30 }).map((_, i) => (
        <circle
          key={i}
          cx={(i * 137.5) % width}
          cy={(i * 73.1) % (height * 0.55)}
          r={i % 3 === 0 ? 1.5 : 0.8}
          fill="white"
          style={{ animation: `env-star ${2 + (i % 3)}s ease-in-out infinite`, animationDelay: `${-i * 0.3}s` }}
        />
      ))}

      {/* Background city silhouette */}
      <rect x={0}         y={groundY - 100} width={50}  height={100} fill="#1e1b4b" opacity="0.6" />
      <rect x={55}        y={groundY - 140} width={35}  height={140} fill="#1e1b4b" opacity="0.6" />
      <rect x={width - 90} y={groundY - 120} width={40} height={120} fill="#1e1b4b" opacity="0.6" />
      <rect x={width - 45} y={groundY - 90}  width={45} height={90}  fill="#1e1b4b" opacity="0.6" />

      {/* Main buildings — left cluster */}
      {buildingFloors(40, 22, 6, 80, '#1e3a5f', '#bfdbfe')}
      {buildingFloors(130, 22, 9, 60, '#1e3a5f', '#dbeafe')}

      {/* Main buildings — right cluster */}
      {buildingFloors(width - 200, 22, 8, 70, '#1c2e50', '#c7d2fe')}
      {buildingFloors(width - 120, 22, 5, 80, '#1c2e50', '#bfdbfe')}

      {/* Transfer beam annotation line (center building) */}
      <rect x={width / 2 - 80} y={groundY - 140} width={160} height={140} fill="#1a365d" opacity="0.9" />
      {/* Glazed curtain wall grid */}
      {Array.from({ length: 7 }).map((_, fi) =>
        Array.from({ length: 8 }).map((_, wi) => (
          <rect key={`${fi}-${wi}`} x={width / 2 - 80 + wi * 20 + 2} y={groundY - 140 + fi * 20 + 2} width={16} height={16}
            fill={fi === 2 && wi > 2 && wi < 6 ? '#fbbf24' : '#93c5fd'}
            opacity={fi === 2 && wi > 2 && wi < 6 ? 0.7 : 0.3}
          />
        ))
      )}

      {/* Transfer beam highlight */}
      <line x1={width / 2 - 80} y1={groundY - 85} x2={width / 2 + 80} y2={groundY - 85} stroke="#fbbf24" strokeWidth="2" opacity="0.5" strokeDasharray="6 3" />
      <text x={width / 2} y={groundY - 90} fill="#fbbf24" fontSize="7" textAnchor="middle" fontFamily="monospace" opacity="0.6">TRANSFER BEAM</text>

      {/* Ground / road */}
      <rect x={0} y={groundY} width={width} height={30} fill="url(#com-ground)" />

      {/* Road lane markings */}
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={i * (width / 9)} y={groundY + 14} width={width / 20} height={2} fill="#fbbf24" opacity="0.4" />
      ))}

      {/* Moving car */}
      <g style={{ animation: 'env-drive 18s linear infinite', animationDelay: '-6s' }}>
        <rect x={0} y={groundY + 8} width={32} height={10} fill="#f59e0b" rx="2" />
        <rect x={4} y={groundY + 6} width={18} height={5} fill="#fde68a" rx="1" />
      </g>
      <g style={{ animation: 'env-drive-left 24s linear infinite', animationDelay: '-12s' }}>
        <rect x={width - 32} y={groundY + 10} width={32} height={10} fill="#6366f1" rx="2" />
      </g>
    </svg>
  );
}
