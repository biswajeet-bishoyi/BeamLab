import { motion, useMotionValue } from 'framer-motion';
import { useRef, useEffect } from 'react';

interface GlyphProps {
  x: number;
  y: number;
  isSelected: boolean;
  onSelect: () => void;
  onPositionPreview?: (newX: number) => void;
  onPositionCommit?: (newX: number) => void;
  scale: number;
  span: number;
}

export function SupportGlyph({ x, y, isSelected, onSelect, onPositionPreview, onPositionCommit, scale, span }: GlyphProps) {
  const initialX = useRef(x);
  const dragX = useMotionValue(0);

  useEffect(() => {
    dragX.set(0);
  }, [x, dragX]);

  return (
    <g transform={`translate(${x}, ${y})`}>
      <motion.g 
        drag="x"
        style={{ x: dragX, cursor: 'grab' }}
        dragMomentum={false}
        onDragStart={() => {
          initialX.current = x;
        }}
        onDrag={(_e, info) => {
          if (!onPositionPreview) return;
          const deltaX = info.offset.x;
          const newPos = Math.max(0, Math.min(span, (initialX.current + deltaX - 40) / scale)); // 40 is margin
          onPositionPreview(newPos);
        }}
        onDragEnd={(_e, info) => {
          if (!onPositionCommit) return;
          const deltaX = info.offset.x;
          const newPos = Math.max(0, Math.min(span, (initialX.current + deltaX - 40) / scale));
          onPositionCommit(newPos);
        }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        whileHover={{ scale: 1.1, y: 2 }}
        whileTap={{ scale: 0.95, cursor: 'grabbing' }}
      >
      <polygon 
        points="0,0 -16,28 16,28" 
        fill={isSelected ? '#3B82F6' : '#cbd5e1'} 
        stroke={isSelected ? '#2563EB' : '#94a3b8'} 
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <line 
        x1="-24" y1="28" x2="24" y2="28" 
        stroke={isSelected ? '#2563EB' : '#94a3b8'} 
        strokeWidth="6" 
        strokeLinecap="round"
      />
      </motion.g>
    </g>
  );
}

export function LoadGlyph({ x, y, isSelected, onSelect, onPositionPreview, onPositionCommit, scale, span }: GlyphProps) {
  const initialX = useRef(x);
  const dragX = useMotionValue(0);

  useEffect(() => {
    dragX.set(0);
  }, [x, dragX]);

  return (
    <g transform={`translate(${x}, ${y})`}>
      <motion.g 
        drag="x"
        style={{ x: dragX, cursor: 'grab' }}
        dragMomentum={false}
        onDragStart={() => {
          initialX.current = x;
        }}
        onDrag={(_e, info) => {
          if (!onPositionPreview) return;
          const deltaX = info.offset.x;
          const newPos = Math.max(0, Math.min(span, (initialX.current + deltaX - 40) / scale));
          onPositionPreview(newPos);
        }}
        onDragEnd={(_e, info) => {
          if (!onPositionCommit) return;
          const deltaX = info.offset.x;
          const newPos = Math.max(0, Math.min(span, (initialX.current + deltaX - 40) / scale));
          onPositionCommit(newPos);
        }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        whileHover={{ scale: 1.1, y: -6 }}
        whileTap={{ scale: 0.95, cursor: 'grabbing' }}
      >
      <line 
        x1="0" y1="-70" x2="0" y2="-12" 
        stroke={isSelected ? '#FBBF24' : '#EF4444'} 
        strokeWidth="6" 
        strokeLinecap="round"
      />
      <polygon 
        points="-8,-20 8,-20 0,-4" 
        fill={isSelected ? '#FBBF24' : '#EF4444'} 
        strokeLinejoin="round"
      />
      </motion.g>
    </g>
  );
}

interface DistributedLoadGlyphProps {
  startX: number;
  endX: number;
  y: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function DistributedLoadGlyph({ startX, endX, y, isSelected, onSelect }: DistributedLoadGlyphProps) {
  const width = endX - startX;
  const numArrows = Math.max(2, Math.floor(width / 24));
  const arrowSpacing = width / (numArrows - 1);
  
  return (
    <g transform={`translate(${startX}, ${y})`}>
      <motion.g 
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        style={{ cursor: 'pointer' }}
        whileHover={{ y: -4 }}
      >
      <rect 
        x="0" 
        y="-50" 
        width={width} 
        height="50" 
        fill={isSelected ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.1)'} 
        stroke={isSelected ? '#FBBF24' : '#EF4444'} 
        strokeWidth="3" 
        rx="4" 
      />
      {Array.from({ length: numArrows }).map((_, i) => (
        <g key={i} transform={`translate(${i * arrowSpacing}, 0)`}>
          <line 
            x1="0" y1="-50" x2="0" y2="-10" 
            stroke={isSelected ? '#FBBF24' : '#EF4444'} 
            strokeWidth="2" 
          />
          <polygon 
            points="-5,-16 5,-16 0,-6" 
            fill={isSelected ? '#FBBF24' : '#EF4444'} 
            strokeLinejoin="round"
          />
        </g>
      ))}
      </motion.g>
    </g>
  );
}
