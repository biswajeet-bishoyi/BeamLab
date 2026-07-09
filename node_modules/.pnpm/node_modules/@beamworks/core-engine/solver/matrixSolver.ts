import type { StructuralModel, PointLoad, DistributedLoad } from '../model/types';
import type { ReactionResult, AnalysisResult, ModelingError } from './reactions';
import { toForce, toMoment } from '../units/brands';
import { solveLinearSystem, createZeros } from '../math/matrix';
import { computeInternalForces } from './internalForces';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function solveMatrixMethod(model: StructuralModel): Result<AnalysisResult, ModelingError> {
  const { span, loads, supports, material, section } = model;
  
  const E = material?.E ?? 200e9;
  const I = section?.momentOfInertia ?? 100e-6;
  
  // 1. Identify Nodes (Supports, Point Loads, and beam ends)
  const nodeX = new Set<number>();
  nodeX.add(0);
  nodeX.add(span);
  
  for (const support of supports) nodeX.add(support.position);
  
  const pointLoads = loads.filter((l): l is PointLoad => l.type === 'point');
  for (const load of pointLoads) nodeX.add(load.position);

  const distLoads = loads.filter((l): l is DistributedLoad => l.type === 'distributed');
  for (const load of distLoads) {
    nodeX.add(load.startPosition);
    nodeX.add(load.endPosition);
  }

  const nodes = Array.from(nodeX).sort((a, b) => a - b);
  const N = nodes.length;
  const numDOFs = N * 2; // v (vertical), theta (rotation) per node

  // 2. Assemble Global Stiffness Matrix K and Force Vector F
  const K = createZeros(numDOFs, numDOFs);
  const F = new Array(numDOFs).fill(0);

  // Build K by summing local element stiffness matrices
  for (let i = 0; i < N - 1; i++) {
    const L = nodes[i+1] - nodes[i];
    if (L <= 0) continue;

    const EI_L3 = (E * I) / (L * L * L);
    const k_local = [
      [ 12,        6 * L,      -12,       6 * L      ],
      [ 6 * L,     4 * L * L,  -6 * L,    2 * L * L  ],
      [-12,       -6 * L,       12,      -6 * L      ],
      [ 6 * L,     2 * L * L,  -6 * L,    4 * L * L  ]
    ];

    const dofs = [i*2, i*2 + 1, (i+1)*2, (i+1)*2 + 1];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        K[dofs[r]][dofs[c]] += EI_L3 * k_local[r][c];
      }
    }
  }

  // 3. Apply Point Loads to F
  for (const load of pointLoads) {
    const nodeIdx = nodes.findIndex(x => Math.abs(x - load.position) < 1e-6);
    if (nodeIdx !== -1) {
      F[nodeIdx * 2] += load.magnitude; // v-DOF (downward is negative)
    }
  }

  // 3.5 Apply Distributed Loads to F (Equivalent Nodal Forces)
  for (const load of distLoads) {
    for (let i = 0; i < N - 1; i++) {
      const xA = nodes[i];
      const xB = nodes[i+1];
      
      const overlapStart = Math.max(xA, load.startPosition);
      const overlapEnd = Math.min(xB, load.endPosition);
      
      if (overlapEnd > overlapStart) {
        const L = overlapEnd - overlapStart;
        const q = load.magnitude;
        
        F[i * 2] += (q * L) / 2;
        F[i * 2 + 1] += (q * L * L) / 12;
        F[(i + 1) * 2] += (q * L) / 2;
        F[(i + 1) * 2 + 1] -= (q * L * L) / 12;
      }
    }
  }

  // Save original unconstrained K and F to compute reactions later
  const K_orig = K.map(row => [...row]);
  const F_orig = [...F];

  // 4. Apply Boundary Conditions
  // For constrained DOFs, we zero out row and col, put 1 on diagonal, and 0 in F
  const constrainedDOFs = new Set<number>();
  
  for (const support of supports) {
    const nodeIdx = nodes.findIndex(x => Math.abs(x - support.position) < 1e-6);
    if (nodeIdx === -1) continue;
    
    // All supports constrain vertical displacement
    constrainedDOFs.add(nodeIdx * 2);
    
    if (support.type === 'fixed') {
      // Fixed also constrains rotation
      constrainedDOFs.add(nodeIdx * 2 + 1);
    }
  }

  // To prevent rigid body motion, check if stable
  let verticalConstraints = supports.length;
  if (verticalConstraints < 2 && !supports.some(s => s.type === 'fixed')) {
    return { ok: false, error: { code: 'UNSTABLE', message: 'Structure is unstable (requires at least 2 vertical supports or 1 fixed support)' } };
  }

  // Apply constraints
  for (const dof of constrainedDOFs) {
    for (let c = 0; c < numDOFs; c++) K[dof][c] = 0;
    for (let r = 0; r < numDOFs; r++) K[r][dof] = 0;
    K[dof][dof] = 1;
    F[dof] = 0;
  }

  // 5. Solve Kd = F
  let d: number[];
  try {
    d = solveLinearSystem(K, F);
  } catch (err) {
    return { ok: false, error: { code: 'SINGULAR_MATRIX', message: 'Unstable configuration (Singular Matrix).' } };
  }

  // 6. Compute Reactions: R = K_orig * d - F_orig
  const reactions: ReactionResult[] = [];
  
  for (const support of supports) {
    const nodeIdx = nodes.findIndex(x => Math.abs(x - support.position) < 1e-6);
    if (nodeIdx === -1) continue;

    // R_v
    let rv = 0;
    for (let c = 0; c < numDOFs; c++) rv += K_orig[nodeIdx * 2][c] * d[c];
    rv -= F_orig[nodeIdx * 2];

    // R_m
    let rm = 0;
    if (support.type === 'fixed') {
      for (let c = 0; c < numDOFs; c++) rm += K_orig[nodeIdx * 2 + 1][c] * d[c];
      rm -= F_orig[nodeIdx * 2 + 1];
    }

    reactions.push({
      supportId: support.id,
      fy: toForce(rv), // Positive means upward reaction
      mz: toMoment(rm)
    });
  }

  // Compute Internal Forces (Shear and Moment diagrams)
  const internalForces = computeInternalForces(model, reactions);

  return {
    ok: true,
    value: {
      reactions,
      internalForces
    }
  };
}
