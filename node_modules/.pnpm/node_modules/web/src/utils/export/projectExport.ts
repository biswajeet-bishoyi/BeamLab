import type { StructuralModel } from '@beamworks/core-engine/model/types';
import { downloadFile } from './downloadFile';

export async function exportBeamProject(model: StructuralModel) {
  // A .beam file is essentially a JSON envelope that could contain metadata,
  // version info, and the raw model.
  const packageData = {
    version: '1.0.0',
    type: 'BeamLabProject',
    timestamp: new Date().toISOString(),
    model: model
  };

  const fileContent = JSON.stringify(packageData, null, 2);
  downloadFile(fileContent, 'my_project.beam', 'application/json');
}
