export function BlueprintScene({ width, height }: { width: number; height: number }) {
  const gridSpacing = 40;

  return (
    <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="bp-grid" width={gridSpacing} height={gridSpacing} patternUnits="userSpaceOnUse">
          <path d={`M ${gridSpacing} 0 L 0 0 0 ${gridSpacing}`} fill="none" stroke="#1e40af" strokeWidth="0.5" opacity="0.5" />
        </pattern>
        <pattern id="bp-grid-major" width={gridSpacing * 5} height={gridSpacing * 5} patternUnits="userSpaceOnUse">
          <rect width={gridSpacing * 5} height={gridSpacing * 5} fill="url(#bp-grid)" />
          <path d={`M ${gridSpacing * 5} 0 L 0 0 0 ${gridSpacing * 5}`} fill="none" stroke="#1e40af" strokeWidth="1.5" opacity="0.4" />
        </pattern>
      </defs>

      {/* Blueprint background */}
      <rect width={width} height={height} fill="#0f2a5c" />
      <rect width={width} height={height} fill="url(#bp-grid-major)" />

      {/* Title block bottom right */}
      <rect x={width - 240} y={height - 80} width={230} height={70} fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
      <line x1={width - 240} y1={height - 55} x2={width - 10} y2={height - 55} stroke="#3b82f6" strokeWidth="0.5" opacity="0.5" />
      <text x={width - 125} y={height - 65} fill="#60a5fa" fontSize="8" textAnchor="middle" opacity="0.7" fontFamily="monospace">BEAM ANALYSIS STUDIO</text>
      <text x={width - 125} y={height - 42} fill="#93c5fd" fontSize="6" textAnchor="middle" opacity="0.6" fontFamily="monospace">STRUCTURAL ANALYSIS DRAWING</text>
      <text x={width - 125} y={height - 28} fill="#93c5fd" fontSize="5" textAnchor="middle" opacity="0.5" fontFamily="monospace">SCALE 1:100 | UNITS: kN, m</text>
      <text x={width - 125} y={height - 16} fill="#93c5fd" fontSize="5" textAnchor="middle" opacity="0.5" fontFamily="monospace">REV. A | STRUCTURAL ENG.</text>

      {/* Dimension annotation lines top */}
      <line x1={60} y1={20} x2={width - 60} y2={20} stroke="#3b82f6" strokeWidth="0.8" opacity="0.5" />
      <line x1={60} y1={15} x2={60} y2={25} stroke="#3b82f6" strokeWidth="0.8" opacity="0.5" />
      <line x1={width - 60} y1={15} x2={width - 60} y2={25} stroke="#3b82f6" strokeWidth="0.8" opacity="0.5" />
      <text x={width / 2} y={16} fill="#93c5fd" fontSize="7" textAnchor="middle" opacity="0.6" fontFamily="monospace">SPAN</text>

      {/* Border */}
      <rect x={5} y={5} width={width - 10} height={height - 10} fill="none" stroke="#1d4ed8" strokeWidth="2" opacity="0.3" />
      <rect x={12} y={12} width={width - 24} height={height - 24} fill="none" stroke="#1d4ed8" strokeWidth="0.5" opacity="0.2" />
    </svg>
  );
}
