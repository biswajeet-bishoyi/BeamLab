import type { StructuralModel, PointLoad } from '../model/types';
import type { Force, Moment } from '../units/brands';
import { toForce, toMoment } from '../units/brands';
import { computeInternalForces, type InternalForcePoint } from './internalForces';

export interface ReactionResult {
  supportId: string;
  fy: Force;   // Vertical reaction (positive = upward)
  mz: Moment;  // Moment reaction (positive = counter-clockwise)
}

export interface AnalysisResult {
  reactions: ReactionResult[];
  internalForces: InternalForcePoint[];
}

export type ModelingError = { code: string; message: string };
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Basic Phase 2 Solver.
 * Solves exactly statically determinate beams (simply supported or cantilever)
 * with vertical Point Loads only.
 */
export function solveDeterminateReactions(model: StructuralModel): Result<AnalysisResult, ModelingError> {
  const { supports, loads } = model;
  
  // Phase 2 constraint: Only Point Loads are supported for this basic solver
  const pointLoads = loads.filter((l): l is PointLoad => l.type === 'point');
  if (pointLoads.length !== loads.length) {
    return { ok: false, error: { code: 'UNSUPPORTED_LOAD', message: 'Only point loads are supported in this basic solver.' } };
  }

  // Calculate total downward force and moments about x = 0
  let totalForceY = 0;
  let totalMomentAbout0 = 0;

  for (const load of pointLoads) {
    totalForceY += load.magnitude; // magnitude is negative for downward
    totalMomentAbout0 += (load.magnitude * load.position); // negative * positive = negative (clockwise) moment
  }

  // 1. Cantilever (1 fixed support)
  const fixedSupports = supports.filter(s => s.type === 'fixed');
  if (supports.length === 1 && fixedSupports.length === 1) {
    const s = fixedSupports[0];
    if (!s) return { ok: false, error: { code: 'UNKNOWN', message: 'Support not found' } }; // TypeScript narrowing help
    
    // Eq: sum(Fy) = 0 => Ry + totalForceY = 0 => Ry = -totalForceY
    const Ry = -totalForceY;
    
    // Eq: sum(M) about support = 0 => Mz + sum(load * (load.x - s.x)) = 0
    let Mz_reaction = 0;
    for (const load of pointLoads) {
      Mz_reaction -= load.magnitude * (load.position - s.position);
    }
    
    const reactionsResult: ReactionResult[] = [{ supportId: s.id, fy: toForce(Ry), mz: toMoment(Mz_reaction) }];
    const internalForces = computeInternalForces(model, reactionsResult);
    
    return {
      ok: true,
      value: {
        reactions: reactionsResult,
        internalForces
      }
    };
  }

  // 2. Simply Supported (2 vertical supports, e.g., pin and roller)
  if (supports.length === 2 && fixedSupports.length === 0) {
    const [s1, s2] = supports;
    if (!s1 || !s2) return { ok: false, error: { code: 'UNKNOWN', message: 'Supports not found' } };

    // Prevent divide by zero if supports are at same location
    const dx = s2.position - s1.position;
    if (Math.abs(dx) < 1e-6) {
      return { ok: false, error: { code: 'UNSTABLE', message: 'Supports cannot be at the same location.' } };
    }

    // Sum of moments about s1 = 0
    // sum(M_s1) = 0 = R2y * (s2.x - s1.x) + sum(load.Fy * (load.x - s1.x))
    let loadsMomentAboutS1 = 0;
    for (const load of pointLoads) {
      loadsMomentAboutS1 += load.magnitude * (load.position - s1.position);
    }
    
    const R2y = -loadsMomentAboutS1 / dx;
    const R1y = -totalForceY - R2y;

    const reactionsResult: ReactionResult[] = [
      { supportId: s1.id, fy: toForce(R1y), mz: toMoment(0) },
      { supportId: s2.id, fy: toForce(R2y), mz: toMoment(0) }
    ];
    const internalForces = computeInternalForces(model, reactionsResult);

    return {
      ok: true,
      value: {
        reactions: reactionsResult,
        internalForces
      }
    };
  }

  return { ok: false, error: { code: 'UNSUPPORTED_CONFIGURATION', message: 'Beam must be simply supported (2 supports) or cantilever (1 fixed support).' } };
}
