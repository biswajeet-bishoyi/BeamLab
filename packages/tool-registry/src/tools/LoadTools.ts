import { BaseTool, UndoPayload } from '../interfaces/BaseTool';
import { z } from 'zod';

export const applyPointLoadTool: BaseTool<{ beamId: string, magnitude: number, position: number, angle: number }, { loadId: string }> = {
  metadata: { id: 'applyPointLoad', name: 'Apply Point Load', category: 'Engineering', description: 'Adds a concentrated force', version: '1.0.0' },
  schemas: {
    input: z.object({ beamId: z.string(), magnitude: z.number(), position: z.number().min(0), angle: z.number() }),
    output: z.object({ loadId: z.string() })
  },
  security: { permissions: ['Student', 'Professional', 'Enterprise', 'Admin', 'Owner'], requiresApproval: false },
  history: { supportsUndo: true },
  dependencies: { services: [] },
  async execute(input) { return { loadId: `load_${Date.now()}` }; },
  createUndoAction(input, output): UndoPayload {
    // Pseudo implementation for undoing load (needs removeLoad tool in full implementation)
    return { toolId: 'removeLoad', payload: { loadId: output.loadId } };
  }
};

export const applyDistributedLoadTool: BaseTool<{ beamId: string, startPos: number, endPos: number, startMag: number, endMag: number }, { loadId: string }> = {
  metadata: { id: 'applyDistributedLoad', name: 'Apply Distributed Load', category: 'Engineering', description: 'Adds a distributed force over a span', version: '1.0.0' },
  schemas: {
    input: z.object({ beamId: z.string(), startPos: z.number().min(0), endPos: z.number().min(0), startMag: z.number(), endMag: z.number() }),
    output: z.object({ loadId: z.string() })
  },
  security: { permissions: ['Student', 'Professional', 'Enterprise', 'Admin', 'Owner'], requiresApproval: false },
  history: { supportsUndo: true },
  dependencies: { services: [] },
  async execute(input) { return { loadId: `dload_${Date.now()}` }; },
  createUndoAction(input, output): UndoPayload {
    return { toolId: 'removeLoad', payload: { loadId: output.loadId } };
  }
};
