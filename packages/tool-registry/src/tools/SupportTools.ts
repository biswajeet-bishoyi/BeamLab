import { BaseTool, UndoPayload } from '../interfaces/BaseTool';
import { z } from 'zod';

export const addSupportTool: BaseTool<{ beamId: string, position: number, type: 'pin' | 'roller' | 'fixed' }, { supportId: string }> = {
  metadata: { id: 'addSupport', name: 'Add Support', category: 'Engineering', description: 'Adds a boundary condition support', version: '1.0.0' },
  schemas: {
    input: z.object({ beamId: z.string(), position: z.number().min(0), type: z.enum(['pin', 'roller', 'fixed']) }),
    output: z.object({ supportId: z.string() })
  },
  security: { permissions: ['Student', 'Professional', 'Enterprise', 'Admin', 'Owner'], requiresApproval: false },
  history: { supportsUndo: true },
  events: { onSuccess: 'support.added' },
  dependencies: { services: [] },
  async execute(input) { return { supportId: `sup_${Date.now()}` }; },
  createUndoAction(input, output): UndoPayload {
    return { toolId: 'removeSupport', payload: { supportId: output.supportId } };
  }
};

export const removeSupportTool: BaseTool<{ supportId: string }, { success: boolean }> = {
  metadata: { id: 'removeSupport', name: 'Remove Support', category: 'Engineering', description: 'Removes a boundary condition support', version: '1.0.0' },
  schemas: {
    input: z.object({ supportId: z.string() }),
    output: z.object({ success: z.boolean() })
  },
  security: { permissions: ['Student', 'Professional', 'Enterprise', 'Admin', 'Owner'], requiresApproval: false },
  history: { supportsUndo: true },
  events: { onSuccess: 'support.removed' },
  dependencies: { services: [] },
  async execute(input) { return { success: true }; },
  createUndoAction(input, output): UndoPayload {
    return { toolId: 'addSupport', payload: { beamId: 'beam_mock', position: 0, type: 'pin' } }; // Mock restore
  }
};
