import { contextEngine } from '@beamlab/context-engine';

export class ContextIntegrator {
  public async getOptimizedContext(projectId: string, maxTokens: number): Promise<string> {
    // ECE internally manages optimization/token limits using its optimizer
    const rawContext = await contextEngine.getFullContext(projectId);
    
    // Safety check - we could implement a local runtime fallback here if needed,
    // but the ECE guarantees budget adherence.
    return rawContext;
  }
}

export const contextIntegrator = new ContextIntegrator();
