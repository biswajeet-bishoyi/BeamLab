import { motion } from 'framer-motion';
import { useStore } from '../store';
import { 
  MousePointer2, 
  Hand,
  ArrowDownToLine, 
  FoldHorizontal, 
  TriangleRight
} from 'lucide-react';
import { toLength, toForce, toForcePerLength } from '@beamworks/core-engine/units/brands';

export function LeftToolbox() {
  const dispatchCommand = useStore(state => state.dispatchCommand);
  const selectObject = useStore(state => state.selectObject);
  
  const handleAddSupport = () => {
    const id = `s-${Date.now()}`;
    dispatchCommand({
      type: 'ADD_SUPPORT',
      timestamp: Date.now(),
      payload: { support: { id, position: toLength(0), type: 'pin' } }
    });
    selectObject(id);
  };

  const handleAddPointLoad = () => {
    const id = `l-${Date.now()}`;
    dispatchCommand({
      type: 'ADD_LOAD',
      timestamp: Date.now(),
      payload: {
        load: {
          id,
          type: 'point',
          position: toLength(5),
          magnitude: toForce(50)
        }
      }
    });
    selectObject(id);
  };

  const handleAddUDL = () => {
    const id = `l-${Date.now()}`;
    dispatchCommand({
      type: 'ADD_LOAD',
      timestamp: Date.now(),
      payload: {
        load: {
          id,
          type: 'distributed',
          startPosition: toLength(0),
          endPosition: toLength(5),
          magnitude: toForcePerLength(10)
        }
      }
    });
    selectObject(id);
  };

  return (
    <motion.div 
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="absolute left-4 top-24 bottom-16 w-14 glass-panel rounded-2xl flex flex-col items-center py-4 gap-2 border border-slate-200 dark:border-slate-800 z-40 shadow-xl"
    >
      <ToolButton icon={<MousePointer2 size={20} />} tooltip="Select (V)" active />
      <ToolButton icon={<Hand size={20} />} tooltip="Pan (H)" />
      
      <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
      
      <ToolButton 
        icon={<TriangleRight size={20} className="-rotate-90" />} 
        tooltip="Add Support (S)" 
        onClick={handleAddSupport} 
      />
      <ToolButton 
        icon={<ArrowDownToLine size={20} />} 
        tooltip="Point Load (P)" 
        onClick={handleAddPointLoad} 
      />
      <ToolButton 
        icon={<FoldHorizontal size={20} />} 
        tooltip="Distributed Load (U)" 
        onClick={handleAddUDL} 
      />
    </motion.div>
  );
}

function ToolButton({ icon, tooltip, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-2.5 rounded-xl transition-all relative group flex items-center justify-center
        ${active 
          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-inner' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
    >
      {icon}
      
      {/* Tooltip */}
      <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
        {tooltip}
        {/* Tiny triangle */}
        <div className="absolute top-1/2 -left-1 -mt-1 border-4 border-transparent border-r-slate-900"></div>
      </div>
    </button>
  );
}
