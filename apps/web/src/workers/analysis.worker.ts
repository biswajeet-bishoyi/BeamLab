import { solveMatrixMethod } from '@beamworks/core-engine/solver/matrixSolver';
import type { StructuralModel } from '@beamworks/core-engine/model/types';
import type { AnalysisResult, ModelingError } from '@beamworks/core-engine/solver/reactions';

export interface WorkerRequest {
  id: string;
  type: 'COMMIT' | 'PREVIEW';
  model: StructuralModel;
}

export interface WorkerResponse {
  id: string;
  type: 'COMMIT' | 'PREVIEW';
  result: AnalysisResult | null;
  error: ModelingError | null;
  metrics: {
    calculationTimeMs: number;
  };
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, type, model } = e.data;
  
  const start = performance.now();
  
  const result = solveMatrixMethod(model);
  
  const calculationTimeMs = performance.now() - start;

  const response: WorkerResponse = {
    id,
    type,
    result: result.ok ? result.value : null,
    error: result.ok ? null : result.error,
    metrics: {
      calculationTimeMs
    }
  };

  self.postMessage(response);
};
