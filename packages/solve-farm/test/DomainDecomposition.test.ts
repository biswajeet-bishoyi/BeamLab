import { describe, it, expect } from 'vitest';
import { DomainDecompositionEngine } from '../src/decomposition/DomainDecomposition';

describe('DomainDecompositionEngine', () => {
  it('condenses subdomain stiffness to interface boundary via Schur complement', () => {
    // 2 Interior DOFs, 2 Boundary DOFs
    const K_II = [
      [20, -5],
      [-5, 20],
    ];
    const K_IB = [
      [-10, 0],
      [0, -10],
    ];
    const K_BB = [
      [15, -2],
      [-2, 15],
    ];

    const f_I = [100, 100];
    const f_B = [50, 50];

    const res = DomainDecompositionEngine.computeSchurComplement({
      K_II,
      K_IB,
      K_BB,
      f_I,
      f_B,
    });

    expect(res.schurMatrix).toHaveLength(2);
    expect(res.schurMatrix[0]).toHaveLength(2);
    expect(res.condensedForce).toHaveLength(2);

    // Schur complement matrix must remain symmetric
    expect(res.schurMatrix[0]?.[1]).toBeCloseTo(res.schurMatrix[1]?.[0] ?? 0, 4);

    // Mock interface solution u_B
    const u_B = [2.5, 2.5];
    const u_I = DomainDecompositionEngine.backSubstituteInterior({
      K_II,
      K_IB,
      f_I,
      u_B,
    });

    expect(u_I).toHaveLength(2);
    expect(u_I[0]).toBeGreaterThan(0);
    expect(u_I[0]).toBeCloseTo(u_I[1] ?? 0, 4); // symmetric response
  });
});
