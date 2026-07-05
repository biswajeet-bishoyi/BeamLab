import type { StructuralModel } from '@beamworks/core-engine/model/types';
import type { AnalysisResult } from '@beamworks/core-engine/solver/reactions';
import type { AIUserLevel } from '../../store';

export function buildModelContext(
  model: StructuralModel,
  analysisResult: AnalysisResult | null,
  userLevel: AIUserLevel | null
): string {
  const levelDesc: Record<AIUserLevel, string> = {
    beginner:     'a complete beginner with no engineering background',
    student:      'a structural engineering student in their 2nd or 3rd year',
    intermediate: 'a practicing engineer with a few years of experience',
    professional: 'a licensed structural engineer (PE/SE)',
    researcher:   'an academic researcher with deep theoretical knowledge',
  };

  const loads = model.loads.map((l: any) => {
    if (l.type === 'point') return `Point load of ${l.magnitude.toFixed(1)} N at x=${l.position.toFixed(2)} m`;
    if (l.type === 'distributed') return `UDL of ${l.magnitude.toFixed(1)} N/m from x=${l.startPosition?.toFixed(2) ?? 0} m to x=${l.endPosition?.toFixed(2) ?? model.span} m`;
    return `${l.type} load`;
  });

  const supports = model.supports.map(s =>
    `${s.type} support at x=${s.position.toFixed(2)} m`
  );

  let resultsContext = '';
  if (analysisResult) {
    const forces = analysisResult.internalForces;
    const maxShear = Math.max(...forces.map(f => Math.abs(f.v)));
    const maxMoment = Math.max(...forces.map(f => Math.abs(f.m)));
    const maxDeflection = Math.max(...forces.map(f => Math.abs(f.deflection)));
    const maxStress = Math.max(...forces.map(f => Math.abs(f.stress)));
    const deflectionRatio = maxDeflection > 0 ? Math.round(model.span / maxDeflection) : Infinity;
    resultsContext = `
ANALYSIS RESULTS (Already Computed):
- Max Shear Force: ${(maxShear / 1000).toFixed(2)} kN
- Max Bending Moment: ${(maxMoment / 1000).toFixed(2)} kN·m
- Max Deflection: ${(maxDeflection * 1000).toFixed(2)} mm (L/${deflectionRatio})
- Max Bending Stress: ${(maxStress / 1e6).toFixed(2)} MPa
- Reactions: ${analysisResult.reactions.map(r => `${r.supportId}: ${(r.fy / 1000).toFixed(2)} kN vertical`).join(', ')}
`;
  } else {
    resultsContext = `\nANALYSIS: Model is currently unstable or incomplete — no results computed.\n`;
  }

  return `You are Archie, an expert structural engineering AI companion built into Beam Analysis Studio.
You are talking to ${userLevel ? levelDesc[userLevel] : 'a user'}.

CURRENT MODEL:
- Span: ${model.span.toFixed(2)} m
- Supports: ${supports.length > 0 ? supports.join('; ') : 'None'}
- Loads: ${loads.length > 0 ? loads.join('; ') : 'None'}
- Material: ${model.material?.name ?? 'Not set'} (E = ${model.material ? (model.material.E / 1e9).toFixed(0) : '?'} GPa)
- Section: ${model.section?.name ?? 'Not set'} (I = ${model.section ? model.section.momentOfInertia.toExponential(2) : '?'} m⁴)
${resultsContext}
Respond like a helpful senior structural engineer: encouraging, precise, and conversational. Adapt your technical depth to the user level. Be concise but insightful. When you suggest model changes, format them as a JSON action block at the END of your response (after your explanation) using this exact format if applicable:

ACTION_BLOCK:{"actions":[{"type":"SET_SPAN","value":8},{"type":"ADD_SUPPORT","supportType":"pin","position":0},{"type":"ADD_SUPPORT","supportType":"roller","position":8},{"type":"ADD_LOAD","loadType":"point","position":4,"magnitude":-50000}]}

Only include ACTION_BLOCK if you are suggesting or building a model change. Leave it out for pure explanations.`;
}
