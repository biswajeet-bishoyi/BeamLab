import type { Force, Moment } from '../units/brands';
import type { StructuralModel, PointLoad, DistributedLoad } from '../model/types';
import type { ReactionResult } from './reactions';
import { toForce, toMoment } from '../units/brands';

export interface InternalForcePoint {
  x: number; // Position in meters
  v: Force;  // Shear force
  m: Moment; // Bending moment
  stress: number; // Pa
  deflection: number; // m
}

/**
 * Computes shear force and bending moment along the beam.
 * Samples at `numSamples` points, plus exactly at every discontinuity (support or load).
 */
export function computeInternalForces(
  model: StructuralModel,
  reactions: ReactionResult[],
  numSamples: number = 100
): InternalForcePoint[] {
  const { span, loads, supports, material, section } = model;
  const pointLoads = loads.filter((l): l is PointLoad => l.type === 'point');
  const distLoads = loads.filter((l): l is DistributedLoad => l.type === 'distributed');

  const E = material?.E || 200e9;
  const I = section?.momentOfInertia || 100e-6;
  const y_max = section ? section.height / 2 : 0.15;

  // Collect all critical x coordinates to ensure we capture peaks perfectly
  const criticalX = new Set<number>();
  criticalX.add(0);
  criticalX.add(span);
  
  for (const support of supports) criticalX.add(support.position);
  for (const load of pointLoads) criticalX.add(load.position);
  for (const load of distLoads) {
    criticalX.add(load.startPosition);
    criticalX.add(load.endPosition);
  }

  // Generate uniformly spaced sample points
  const step = span / numSamples;
  for (let i = 0; i <= numSamples; i++) {
    criticalX.add(i * step);
  }

  // Also add x-epsilon and x+epsilon around discontinuities to draw sharp vertical steps in SFD
  const epsilon = 1e-6;
  const criticalPoints = [
    0, span, 
    ...supports.map(s => s.position), 
    ...pointLoads.map(l => l.position),
    ...distLoads.map(l => l.startPosition),
    ...distLoads.map(l => l.endPosition)
  ];
  for (const cx of criticalPoints) {
    if (cx > 0) criticalX.add(cx - epsilon);
    if (cx < span) criticalX.add(cx + epsilon);
  }

  // Sort x coordinates
  const xCoords = Array.from(criticalX).sort((a, b) => a - b);

  const results: InternalForcePoint[] = [];

  for (const x of xCoords) {
    let v = 0;
    let m = 0;

    // Sum effects from the left of x
    // 1. Reactions
    for (const r of reactions) {
      const support = supports.find(s => s.id === r.supportId);
      if (support && support.position <= x) {
        v += r.fy; // Upward positive
        m += r.fy * (x - support.position);
        if (r.mz) {
          m += r.mz; // Concentrated moment reaction
        }
      }
    }

    // 2. Applied Point Loads
    for (const load of pointLoads) {
      if (load.position <= x) {
        v += load.magnitude; // Downward negative
        m += load.magnitude * (x - load.position);
      }
    }

    // 3. Applied Distributed Loads
    for (const load of distLoads) {
      if (load.startPosition < x) {
        const activeEnd = Math.min(x, load.endPosition);
        const activeLength = activeEnd - load.startPosition;
        if (activeLength > 0) {
          const totalForce = load.magnitude * activeLength;
          const centroidX = load.startPosition + activeLength / 2;
          
          v += totalForce;
          m += totalForce * (x - centroidX);
        }
      }
    }

    const currentM = toMoment(m);
    results.push({
      x,
      v: toForce(v),
      m: currentM,
      stress: (currentM * y_max) / I,
      deflection: 0, // Placeholder for Phase 5 integration
    });
  }

  // Double integrate M/EI to find deflection
  // v''(x) = M(x) / EI
  // Using simple trapezoidal integration
  const EI = E * I;
  const thetas = new Array(results.length).fill(0);
  const deflections = new Array(results.length).fill(0);
  
  // First integration: theta(x) = int(M/EI dx) + C1
  let currentTheta = 0;
  for (let i = 1; i < results.length; i++) {
    const dx = results[i].x - results[i-1].x;
    const avgM = (results[i].m + results[i-1].m) / 2;
    currentTheta += (avgM / EI) * dx;
    thetas[i] = currentTheta;
  }
  
  // Second integration: v(x) = int(theta dx) + C2
  let currentV = 0;
  for (let i = 1; i < results.length; i++) {
    const dx = results[i].x - results[i-1].x;
    const avgTheta = (thetas[i] + thetas[i-1]) / 2;
    currentV += avgTheta * dx;
    deflections[i] = currentV;
  }

  // Boundary Conditions to find C1 and C2
  // We need two constraints where v = 0.
  // Find indices of first two supports.
  let supportIndices: number[] = [];
  for (const support of supports) {
    const idx = results.findIndex(p => Math.abs(p.x - support.position) < 1e-6);
    if (idx !== -1) supportIndices.push(idx);
  }

  if (supportIndices.length >= 2) {
    const iA = supportIndices[0];
    const iB = supportIndices[1];
    const xA = results[iA].x;
    const xB = results[iB].x;
    const vA_uncorrected = deflections[iA];
    const vB_uncorrected = deflections[iB];
    
    // We know v(xA) = 0 => C1*xA + C2 + vA_unc = 0
    // We know v(xB) = 0 => C1*xB + C2 + vB_unc = 0
    // => C1*(xB - xA) = vA_unc - vB_unc
    const C1 = (vA_uncorrected - vB_uncorrected) / (xB - xA);
    const C2 = -vA_uncorrected - C1 * xA;
    
    for (let i = 0; i < results.length; i++) {
      results[i].deflection = deflections[i] + C1 * results[i].x + C2;
    }
  } else if (supports.length === 1 && supports[0].type === 'fixed') {
    const iFixed = results.findIndex(p => Math.abs(p.x - supports[0].position) < 1e-6);
    if (iFixed !== -1) {
      const xA = results[iFixed].x;
      const thetaA_uncorrected = thetas[iFixed];
      const vA_uncorrected = deflections[iFixed];
      
      const C1 = -thetaA_uncorrected;
      const C2 = -vA_uncorrected - C1 * xA;
      
      for (let i = 0; i < results.length; i++) {
        results[i].deflection = deflections[i] + C1 * results[i].x + C2;
      }
    }
  }

  return results;
}
