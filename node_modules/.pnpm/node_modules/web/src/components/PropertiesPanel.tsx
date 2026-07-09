import { useStore } from '../store';
import { toLength, toForce, toForcePerLength } from '@beamworks/core-engine/units/brands';

export function PropertiesPanel() {
  const model = useStore(state => state.model);
  const selectedObjectId = useStore(state => state.selectedObjectId);
  const dispatchCommand = useStore(state => state.dispatchCommand);

  if (!selectedObjectId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="text-sm text-slate-500 dark:text-slate-400 italic mb-2">
          Select an object on the canvas to edit its properties, or configure global beam properties below.
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Material</label>
          <select 
            value={model.material?.id || ''}
            onChange={(e) => {
              const val = e.target.value;
              const materials = [
                { id: 'm1', name: 'Structural Steel (200 GPa)', E: 200e9, density: 7850 },
                { id: 'm2', name: 'Aluminum (69 GPa)', E: 69e9, density: 2700 },
                { id: 'm3', name: 'Timber (11 GPa)', E: 11e9, density: 600 },
                { id: 'm4', name: 'Concrete (30 GPa)', E: 30e9, density: 2400 }
              ];
              const mat = materials.find(m => m.id === val);
              if (mat) {
                dispatchCommand({ type: 'UPDATE_MATERIAL', timestamp: Date.now(), payload: { material: mat } });
              }
            }}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          >
            <option value="m1">Structural Steel (200 GPa)</option>
            <option value="m2">Aluminum (69 GPa)</option>
            <option value="m3">Timber (11 GPa)</option>
            <option value="m4">Concrete (30 GPa)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Cross Section</label>
          <select 
            value={model.section?.id || ''}
            onChange={(e) => {
              const val = e.target.value;
              const sections = [
                { id: 'sec1', name: 'W12x26 (I-Beam)', area: 0.0049, momentOfInertia: 8.5e-5, height: 0.31 },
                { id: 'sec2', name: 'W14x90 (I-Beam Heavy)', area: 0.0171, momentOfInertia: 4.16e-4, height: 0.356 },
                { id: 'sec3', name: '200x200 Timber (Square)', area: 0.04, momentOfInertia: 1.33e-4, height: 0.2 },
                { id: 'sec4', name: 'Standard Pipe (O.D. 100mm)', area: 0.002, momentOfInertia: 2.5e-6, height: 0.1 }
              ];
              const sec = sections.find(s => s.id === val);
              if (sec) {
                dispatchCommand({ type: 'UPDATE_SECTION', timestamp: Date.now(), payload: { section: sec } });
              }
            }}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          >
            <option value="sec1">W12x26 (I-Beam)</option>
            <option value="sec2">W14x90 (I-Beam Heavy)</option>
            <option value="sec3">200x200 Timber (Square)</option>
            <option value="sec4">Standard Pipe (O.D. 100mm)</option>
          </select>
        </div>
      </div>
    );
  }

  const support = model.supports.find(s => s.id === selectedObjectId);
  const load = model.loads.find(l => l.id === selectedObjectId);
  const obj = support || load;

  if (!obj) return <div>Object not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Type</div>
        <div className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md inline-block capitalize">
          {support ? `Support (${support.type})` : `Load (${load?.type})`}
        </div>
      </div>

      {obj.type !== 'distributed' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Position (m)</label>
          <input 
            type="number" 
            step="0.1" 
            value={obj.position || 0}
            onChange={(e) => {
              const val = toLength(parseFloat(e.target.value) || 0);
              if (support) {
                dispatchCommand({ type: 'MOVE_SUPPORT', timestamp: Date.now(), payload: { id: obj.id, newPosition: val } });
              } else if (load) {
                dispatchCommand({ type: 'MOVE_LOAD', timestamp: Date.now(), payload: { id: obj.id, newPosition: val } });
              }
            }}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      )}

      {load?.type === 'distributed' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Start Position (m)</label>
            <input 
              type="number" 
              step="0.1" 
              value={load.startPosition}
              onChange={(e) => {
                const val = toLength(parseFloat(e.target.value) || 0);
                dispatchCommand({ type: 'UPDATE_UDL_RANGE', timestamp: Date.now(), payload: { id: obj.id, startPosition: val, endPosition: load.endPosition } });
              }}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">End Position (m)</label>
            <input 
              type="number" 
              step="0.1" 
              value={load.endPosition}
              onChange={(e) => {
                const val = toLength(parseFloat(e.target.value) || 0);
                dispatchCommand({ type: 'UPDATE_UDL_RANGE', timestamp: Date.now(), payload: { id: obj.id, startPosition: load.startPosition, endPosition: val } });
              }}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      )}

      {load && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Magnitude ({load.type === 'distributed' ? 'kN/m' : 'kN'})</label>
          <input 
            type="number" 
            step="1" 
            value={Math.abs(load.magnitude / 1000)}
            onChange={(e) => {
              const isNegative = load.magnitude < 0;
              const val = (parseFloat(e.target.value) || 0) * 1000;
              const finalVal = isNegative ? -Math.abs(val) : Math.abs(val);
              const typedVal = load.type === 'distributed' ? toForcePerLength(finalVal) : toForce(finalVal);
              dispatchCommand({ type: 'UPDATE_LOAD_MAGNITUDE', timestamp: Date.now(), payload: { id: obj.id, newMagnitude: typedVal } });
            }}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      )}

      {support && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Support Type</label>
          <select 
            value={support.type}
            onChange={(e) => {
              // Delete and re-create to change type
              dispatchCommand({ type: 'REMOVE_OBJECT', timestamp: Date.now(), payload: { id: obj.id } });
              dispatchCommand({ type: 'ADD_SUPPORT', timestamp: Date.now(), payload: { support: { ...support, type: e.target.value as any } } });
              // It's possible the object loses selection since its id is re-added, but ID remains the same
            }}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="pin">Pin (Pinned)</option>
            <option value="roller">Roller</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
      )}
    </div>
  );
}
