import type { StructuralModel } from '@beamworks/core-engine/model/types';
import type { AnalysisResult } from '@beamworks/core-engine/solver/reactions';
import { downloadFile } from './downloadFile';

export async function exportEngineeringData(model: StructuralModel, result: AnalysisResult | null) {
  // 1. Export Model JSON
  const modelJson = JSON.stringify(model, null, 2);
  downloadFile(modelJson, 'beam_structural_data.json', 'application/json');

  // 2. Export Reactions CSV if available
  if (result) {
    const csvRows = ['Support ID,Vertical Force (N),Moment (N-m)'];
    result.reactions.forEach(r => {
      csvRows.push(`${r.supportId},${r.fy},${r.mz}`);
    });
    
    // Add sheer/moment maxes
    const forces = result.internalForces;
    const maxShear = Math.max(...forces.map(p => Math.abs(p.v)));
    const maxMoment = Math.max(...forces.map(p => Math.abs(p.m)));
    
    csvRows.push('');
    csvRows.push('Maximums');
    csvRows.push(`Max Shear Force (N),${maxShear}`);
    csvRows.push(`Max Bending Moment (N-m),${maxMoment}`);

    const csvContent = csvRows.join('\n');
    downloadFile(csvContent, 'beam_analysis_results.csv', 'text/csv');
  }
}
