/**
 * BeamLab Sprint B4.4 — Plastic Hinge & Pushover Analysis Engine
 * Non-Linear Static Pushover Analysis conforming to ASCE 41-17 & FEMA 356:
 * 1. Lumped plastic hinges with FEMA 356 force-deformation backbone curves (Points A, B, C, D, E)
 * 2. ASCE 41-17 acceptance criteria: Immediate Occupancy (IO), Life Safety (LS), Collapse Prevention (CP)
 * 3. Incremental displacement-controlled lateral pushover stepping
 * 4. Exact tangent flexibility formulation incorporating end plastic hinges
 * 5. Capacity curve bilinearization, ductility factor mu, overstrength factor Omega, and energy dissipation
 */

import { solveLinearSystem, createZeros } from '../math/matrix';
import {
  SpaceFrameSolver3D,
  type SpaceFrameModel3D,
  type Node3D,
  type Element3D,
  type NodalLoad3D,
  type NodeDisplacement3D,
  type NodeReaction3D,
  type ElementInternalForces3D,
} from './SpaceFrameSolver3D';

export type PlasticHingeState =
  | 'ELASTIC'
  | 'YIELD'
  | 'IMMEDIATE_OCCUPANCY'
  | 'LIFE_SAFETY'
  | 'COLLAPSE_PREVENTION'
  | 'RESIDUAL';

export interface PlasticHingeDefinition {
  yieldMomentZ: number; // [N*m] Plastic moment capacity Mp about local z
  yieldMomentY?: number; // [N*m] Plastic moment capacity Mp about local y
  yieldAxial?: number; // [N] Axial yield capacity Py = Fy * A
  strainHardeningRatio?: number; // default 0.02 (2% strain hardening slope)
  thetaYield?: number; // [rad] yield rotation (default My*L / (6*E*I))
  plasticRotations?: {
    a?: number; // [rad] plastic rotation to peak capacity (default 9 * theta_y)
    b?: number; // [rad] plastic rotation to residual strength (default 11 * theta_y)
    c?: number; // residual strength fraction (default 0.20)
  };
  acceptanceCriteria?: {
    thetaIO?: number; // [rad] Immediate Occupancy (default 1 * theta_y)
    thetaLS?: number; // [rad] Life Safety (default 6 * theta_y)
    thetaCP?: number; // [rad] Collapse Prevention (default 9 * theta_y)
  };
}

export interface ElementHingeAssignment {
  elementId: string;
  startHinge?: PlasticHingeDefinition;
  endHinge?: PlasticHingeDefinition;
}

export interface HingeStatusRecord {
  elementId: string;
  location: 'start' | 'end';
  state: PlasticHingeState;
  plasticRotation: number; // [rad]
  momentRatio: number; // |M| / Mp
  moment: number; // [N*m]
  capacity: number; // [N*m] current moment capacity
}

export interface PushoverStepResult {
  step: number;
  controlDisplacement: number; // [m] monitored displacement at control node
  baseShear: number; // [N] total lateral base shear reaction
  loadFactor: number; // accumulated load multiplier
  displacements: Map<string, NodeDisplacement3D>;
  reactions: Map<string, NodeReaction3D>;
  elementForces: Map<string, ElementInternalForces3D>;
  hingeStates: HingeStatusRecord[];
  hingeSummary: {
    elasticCount: number;
    yieldCount: number;
    ioCount: number;
    lsCount: number;
    cpCount: number;
    residualCount: number;
  };
}

export interface PushoverCapacityCurve {
  displacements: number[]; // [m]
  baseShears: number[]; // [N]
  bilinearization: {
    effectiveElasticStiffness: number; // Ke [N/m]
    effectiveYieldBaseShear: number; // Vy [N]
    effectiveYieldDisplacement: number; // Dy [m]
    maximumBaseShear: number; // Vmax [N]
    maximumDisplacement: number; // Dmax [m]
    ductilityFactor: number; // mu = Dmax / Dy
    overstrengthFactor: number; // Omega = Vmax / V_first_yield
    energyDissipated: number; // Area under pushover curve [J]
  };
}

export interface PushoverAnalysisResult3D {
  capacityCurve: PushoverCapacityCurve;
  steps: PushoverStepResult[];
  overallPerformanceLevel:
    | 'OPERATIONAL'
    | 'IMMEDIATE_OCCUPANCY'
    | 'LIFE_SAFETY'
    | 'COLLAPSE_PREVENTION'
    | 'COLLAPSE_RISK';
  firstYieldStep?: number;
  firstYieldBaseShear?: number;
  firstYieldDisplacement?: number;
  criticalHinge?: {
    elementId: string;
    location: 'start' | 'end';
    maxPlasticRotation: number;
    state: PlasticHingeState;
  };
  metrics: {
    totalSteps: number;
    converged: boolean;
    solveTimeMs: number;
  };
}

export interface PushoverOptions {
  controlNodeId: string;
  controlDirection: 'X' | 'Y' | 'Z';
  targetDisplacement: number; // [m]
  numberOfSteps?: number; // default 25
  tolerance?: number; // default 1e-4
  lateralLoadPattern?: 'UNIFORM' | 'TRIANGULAR' | 'MODAL' | 'CUSTOM';
  customLateralLoads?: NodalLoad3D[];
  hingeAssignments?: ElementHingeAssignment[];
  defaultYieldStrengthFy?: number; // [Pa] e.g. 355e6 for auto-generation
  includePDelta?: boolean;
}

interface ActiveHingeTracker {
  elementId: string;
  location: 'start' | 'end';
  def: PlasticHingeDefinition;
  plasticRotationZ: number;
  plasticRotationY: number;
  state: PlasticHingeState;
  currentCapacityZ: number;
  currentCapacityY: number;
  flexibilityZ: number; // 1 / k_t
  flexibilityY: number;
}

export class PushoverSolver3D {
  /**
   * Performs ASCE 41-17 / FEMA 356 Non-Linear Static Pushover Analysis on a 3D Space Frame.
   */
  public static solve(
    model: SpaceFrameModel3D,
    options: PushoverOptions,
  ): PushoverAnalysisResult3D {
    const startTime = performance.now();
    const {
      controlNodeId,
      controlDirection,
      targetDisplacement,
      numberOfSteps = 25,
      lateralLoadPattern = 'TRIANGULAR',
      customLateralLoads,
      hingeAssignments = [],
      defaultYieldStrengthFy = 355e6, // S355 default
      includePDelta = false,
    } = options;

    if (numberOfSteps <= 0) {
      throw new Error('Pushover analysis requires at least 1 step.');
    }
    if (Math.abs(targetDisplacement) < 1e-6) {
      throw new Error('Target displacement must be non-zero.');
    }

    const nodes = model.nodes;
    const elements = model.elements;
    const numNodes = nodes.length;
    const totalDOFs = numNodes * 6;

    const nodeIndexMap = new Map<string, number>();
    nodes.forEach((n, idx) => nodeIndexMap.set(n.id, idx));

    const controlNodeIdx = nodeIndexMap.get(controlNodeId);
    if (controlNodeIdx === undefined) {
      throw new Error(`Control node ${controlNodeId} not found in model.`);
    }

    const dirOffset = controlDirection === 'X' ? 0 : controlDirection === 'Y' ? 1 : 2;
    const controlDOF = controlNodeIdx * 6 + dirOffset;

    // Build or auto-assign plastic hinges
    const hingeTrackers = this.initializeHinges(
      elements,
      nodes,
      hingeAssignments,
      defaultYieldStrengthFy,
    );

    // Formulate lateral load distribution pattern F_lat
    const F_lat = this.buildLateralLoadPattern(
      nodes,
      elements,
      nodeIndexMap,
      controlDirection,
      lateralLoadPattern,
      customLateralLoads,
    );

    // Initial Gravity Step (if gravity loads exist)
    const initialGravityResults = this.solveInitialGravity(model);

    // Storage for incremental results
    const stepResults: PushoverStepResult[] = [];
    const displacementsHistory: number[] = [0];
    const baseShearsHistory: number[] = [0];

    // Cumulative state variables
    const cumulativeDisplacements = new Array(totalDOFs).fill(0);
    if (initialGravityResults) {
      for (const [nodeId, disp] of initialGravityResults.displacements) {
        const nIdx = nodeIndexMap.get(nodeId);
        if (nIdx !== undefined) {
          cumulativeDisplacements[nIdx * 6 + 0] = disp.dx;
          cumulativeDisplacements[nIdx * 6 + 1] = disp.dy;
          cumulativeDisplacements[nIdx * 6 + 2] = disp.dz;
          cumulativeDisplacements[nIdx * 6 + 3] = disp.rx;
          cumulativeDisplacements[nIdx * 6 + 4] = disp.ry;
          cumulativeDisplacements[nIdx * 6 + 5] = disp.rz;
        }
      }
    }

    const cumulativeElementForces = new Map<string, { f_local: number[] }>();
    for (const elem of elements) {
      cumulativeElementForces.set(elem.id, { f_local: new Array(12).fill(0) });
    }

    let cumulativeLoadFactor = 0;
    const stepDelta = targetDisplacement / numberOfSteps;
    let firstYieldStep: number | undefined;
    let firstYieldBaseShear: number | undefined;
    let firstYieldDisplacement: number | undefined;

    // Identify restrained boundary DOFs for base shear reaction integration
    const restrainedNodes = new Set<string>();
    for (const n of nodes) {
      if (n.restraints?.Tx || n.restraints?.Ty || n.restraints?.Tz) {
        restrainedNodes.add(n.id);
      }
    }

    // Step 0: Record initial zero state
    stepResults.push({
      step: 0,
      controlDisplacement: 0,
      baseShear: 0,
      loadFactor: 0,
      displacements: this.formatDisplacements(nodes, cumulativeDisplacements),
      reactions: new Map(),
      elementForces: new Map(),
      hingeStates: this.formatHingeStates(hingeTrackers),
      hingeSummary: {
        elasticCount: hingeTrackers.size,
        yieldCount: 0,
        ioCount: 0,
        lsCount: 0,
        cpCount: 0,
        residualCount: 0,
      },
    });

    // Main Pushover Incremental Loop
    for (let step = 1; step <= numberOfSteps; step++) {
      const currentTargetDisp = step * stepDelta;

      // 1. Assemble global tangent stiffness matrix K_t with current hinge flexibilities
      const { K, elementTransforms } = this.assembleTangentStiffness(
        nodes,
        elements,
        nodeIndexMap,
        hingeTrackers,
        includePDelta,
        cumulativeElementForces,
      );

      // 2. Impose boundary conditions
      const K_solver = K.map((row) => [...row]);
      const F_solver = [...F_lat];

      for (let i = 0; i < numNodes; i++) {
        const n = nodes[i]!;
        const base = i * 6;
        if (n.restraints?.Tx) this.applyRestraint(K_solver, F_solver, base + 0);
        if (n.restraints?.Ty) this.applyRestraint(K_solver, F_solver, base + 1);
        if (n.restraints?.Tz) this.applyRestraint(K_solver, F_solver, base + 2);
        if (n.restraints?.Rx) this.applyRestraint(K_solver, F_solver, base + 3);
        if (n.restraints?.Ry) this.applyRestraint(K_solver, F_solver, base + 4);
        if (n.restraints?.Rz) this.applyRestraint(K_solver, F_solver, base + 5);
      }

      // 3. Solve tangent displacement increment shape under reference lateral load
      let dU_unit: number[];
      try {
        dU_unit = solveLinearSystem(K_solver, F_solver);
      } catch (err) {
        // Tangent matrix is singular -> Mechanism formed!
        break;
      }

      const dDispCtrl = dU_unit[controlDOF];
      if (Math.abs(dDispCtrl) < 1e-12) {
        // Zero response in control DOF
        break;
      }

      // 4. Scale increment to reach current target displacement
      const deltaDispNeeded = currentTargetDisp - cumulativeDisplacements[controlDOF];
      const deltaLambda = deltaDispNeeded / dDispCtrl;

      cumulativeLoadFactor += deltaLambda;
      for (let i = 0; i < totalDOFs; i++) {
        cumulativeDisplacements[i] += deltaLambda * dU_unit[i];
      }

      // 5. Update element internal forces and assess hinge yielding
      let newlyYieldedThisStep = false;

      for (const elem of elements) {
        const et = elementTransforms.get(elem.id)!;
        const u_elem = et.dofs.map((dof) => deltaLambda * dU_unit[dof]);

        // Transform global displacement increment to local: du_local = T * du_global
        const du_local = new Array(12).fill(0);
        for (let i = 0; i < 12; i++) {
          for (let j = 0; j < 12; j++) {
            du_local[i] += et.T[i][j] * u_elem[j];
          }
        }

        // Tangent internal force increment: df_local = k_local * du_local
        const df_local = new Array(12).fill(0);
        for (let i = 0; i < 12; i++) {
          for (let j = 0; j < 12; j++) {
            df_local[i] += et.k_local[i][j] * du_local[j];
          }
        }

        // Accumulate member forces
        const elemForces = cumulativeElementForces.get(elem.id)!;
        for (let i = 0; i < 12; i++) {
          elemForces.f_local[i] += df_local[i];
        }

        // Member end moments (FEA local forces):
        // Node 1 (start): Mz1 = -f_local[5], My1 = -f_local[4]
        // Node 2 (end):   Mz2 =  f_local[11], My2 =  f_local[10]
        const Mz1 = Math.abs(-elemForces.f_local[5]);
        const My1 = Math.abs(-elemForces.f_local[4]);
        const Mz2 = Math.abs(elemForces.f_local[11]);
        const My2 = Math.abs(elemForces.f_local[10]);

        // Check start hinge
        const startTrackerKey = `${elem.id}_start`;
        const startTracker = hingeTrackers.get(startTrackerKey);
        if (startTracker) {
          const yielded = this.updateHingeState(
            startTracker,
            Mz1,
            My1,
            et.k_elastic_z,
            et.k_elastic_y,
          );
          if (yielded) newlyYieldedThisStep = true;
        }

        // Check end hinge
        const endTrackerKey = `${elem.id}_end`;
        const endTracker = hingeTrackers.get(endTrackerKey);
        if (endTracker) {
          const yielded = this.updateHingeState(
            endTracker,
            Mz2,
            My2,
            et.k_elastic_z,
            et.k_elastic_y,
          );
          if (yielded) newlyYieldedThisStep = true;
        }
      }

      // 6. Compute reactions and base shear
      const stepDisplacements = this.formatDisplacements(nodes, cumulativeDisplacements);
      const stepReactions = this.computeReactions(
        nodes,
        elements,
        elementTransforms,
        cumulativeElementForces,
        restrainedNodes,
      );

      // Base shear: sum of reactions opposing lateral force at restrained nodes
      let reactionBaseShear = 0;
      for (const r of stepReactions.values()) {
        const val = controlDirection === 'X' ? r.Fx : controlDirection === 'Y' ? r.Fy : r.Fz;
        reactionBaseShear -= val;
      }

      // Applied lateral base shear:
      let appliedBaseShear = 0;
      for (let i = 0; i < numNodes; i++) {
        const dof = i * 6 + dirOffset;
        appliedBaseShear += cumulativeLoadFactor * F_lat[dof];
      }

      const baseShear = Math.abs(reactionBaseShear) > 1e-3 ? Math.abs(reactionBaseShear) : appliedBaseShear;

      // Check first yield
      if (newlyYieldedThisStep && firstYieldStep === undefined) {
        firstYieldStep = step;
        firstYieldBaseShear = baseShear;
        firstYieldDisplacement = currentTargetDisp;
      }

      displacementsHistory.push(currentTargetDisp);
      baseShearsHistory.push(baseShear);

      // 7. Recover full element internal actions & reactions for output
      const stepElementForces = this.formatElementForces(
        elements,
        nodes,
        nodeIndexMap,
        cumulativeElementForces,
      );

      const hingeStateList = this.formatHingeStates(hingeTrackers);
      const summary = this.summarizeHinges(hingeTrackers);

      stepResults.push({
        step,
        controlDisplacement: currentTargetDisp,
        baseShear,
        loadFactor: cumulativeLoadFactor,
        displacements: stepDisplacements,
        reactions: stepReactions,
        elementForces: stepElementForces,
        hingeStates: hingeStateList,
        hingeSummary: summary,
      });
    }

    // Capacity Curve Bilinearization
    const bilinearization = this.bilinearizeCapacityCurve(
      displacementsHistory,
      baseShearsHistory,
      firstYieldBaseShear,
    );

    // Overall structure performance level at target displacement
    const lastStep = stepResults[stepResults.length - 1]!;
    const overallPerformanceLevel = this.determineOverallPerformance(
      lastStep.hingeSummary,
    );

    // Find critical governing hinge
    let criticalHinge: PushoverAnalysisResult3D['criticalHinge'];
    let maxRot = -1;
    for (const tracker of hingeTrackers.values()) {
      const rot = Math.max(tracker.plasticRotationZ, tracker.plasticRotationY);
      if (rot > maxRot) {
        maxRot = rot;
        criticalHinge = {
          elementId: tracker.elementId,
          location: tracker.location,
          maxPlasticRotation: rot,
          state: tracker.state,
        };
      }
    }

    const solveTimeMs = performance.now() - startTime;

    return {
      capacityCurve: {
        displacements: displacementsHistory,
        baseShears: baseShearsHistory,
        bilinearization,
      },
      steps: stepResults,
      overallPerformanceLevel,
      firstYieldStep,
      firstYieldBaseShear,
      firstYieldDisplacement,
      criticalHinge,
      metrics: {
        totalSteps: stepResults.length - 1,
        converged: stepResults.length > 1,
        solveTimeMs: Number(solveTimeMs.toFixed(2)),
      },
    };
  }

  /**
   * Initializes or automatically populates lumped plastic hinges at element ends.
   */
  private static initializeHinges(
    elements: Element3D[],
    nodes: Node3D[],
    hingeAssignments: ElementHingeAssignment[],
    defaultFy: number,
  ): Map<string, ActiveHingeTracker> {
    const trackerMap = new Map<string, ActiveHingeTracker>();
    const assignmentMap = new Map<string, ElementHingeAssignment>();
    for (const a of hingeAssignments) {
      assignmentMap.set(a.elementId, a);
    }

    const nodeMap = new Map<string, Node3D>();
    for (const n of nodes) nodeMap.set(n.id, n);

    for (const elem of elements) {
      const n1 = nodeMap.get(elem.startNodeId);
      const n2 = nodeMap.get(elem.endNodeId);
      if (!n1 || !n2) continue;

      const L = Math.hypot(n2.x - n1.x, n2.y - n1.y, n2.z - n1.z);
      const E = elem.material.E;
      const Izz = elem.section.Izz;
      const Iyy = elem.section.Iyy;

      const assignment = assignmentMap.get(elem.id);

      // Start Hinge
      const startDef =
        assignment?.startHinge ??
        this.createDefaultHingeDef(elem, L, E, Izz, Iyy, defaultFy);
      trackerMap.set(`${elem.id}_start`, {
        elementId: elem.id,
        location: 'start',
        def: startDef,
        plasticRotationZ: 0,
        plasticRotationY: 0,
        state: 'ELASTIC',
        currentCapacityZ: startDef.yieldMomentZ,
        currentCapacityY: startDef.yieldMomentY ?? startDef.yieldMomentZ,
        flexibilityZ: 0,
        flexibilityY: 0,
      });

      // End Hinge
      const endDef =
        assignment?.endHinge ??
        this.createDefaultHingeDef(elem, L, E, Izz, Iyy, defaultFy);
      trackerMap.set(`${elem.id}_end`, {
        elementId: elem.id,
        location: 'end',
        def: endDef,
        plasticRotationZ: 0,
        plasticRotationY: 0,
        state: 'ELASTIC',
        currentCapacityZ: endDef.yieldMomentZ,
        currentCapacityY: endDef.yieldMomentY ?? endDef.yieldMomentZ,
        flexibilityZ: 0,
        flexibilityY: 0,
      });
    }

    return trackerMap;
  }

  private static createDefaultHingeDef(
    elem: Element3D,
    L: number,
    E: number,
    Izz: number,
    Iyy: number,
    Fy: number,
  ): PlasticHingeDefinition {
    // Plastic section modulus estimation (shape factor ~1.15 for I-beams)
    const Zz = (elem.section as any).Zz ?? (Izz / 0.15) * 1.15; // fallback estimate
    const Zy = (elem.section as any).Zy ?? (Iyy / 0.10) * 1.15;
    const Mpz = Fy * Zz;
    const Mpy = Fy * Zy;

    // Yield rotation theta_y = My*L / (6*E*I)
    const thetaYield = (Mpz * L) / (6 * E * Izz);

    return {
      yieldMomentZ: Mpz,
      yieldMomentY: Mpy,
      yieldAxial: Fy * elem.section.area,
      strainHardeningRatio: 0.02,
      thetaYield,
      plasticRotations: {
        a: 9.0 * thetaYield,
        b: 11.0 * thetaYield,
        c: 0.2,
      },
      acceptanceCriteria: {
        thetaIO: 1.0 * thetaYield,
        thetaLS: 6.0 * thetaYield,
        thetaCP: 9.0 * thetaYield,
      },
    };
  }

  /**
   * Builds the lateral reference load vector F_lat according to the selected pattern.
   */
  private static buildLateralLoadPattern(
    nodes: Node3D[],
    _elements: Element3D[],
    nodeIndexMap: Map<string, number>,
    controlDirection: 'X' | 'Y' | 'Z',
    pattern: 'UNIFORM' | 'TRIANGULAR' | 'MODAL' | 'CUSTOM',
    customLoads?: NodalLoad3D[],
  ): number[] {
    const totalDOFs = nodes.length * 6;
    const F_lat = new Array(totalDOFs).fill(0);
    const dirOffset = controlDirection === 'X' ? 0 : controlDirection === 'Y' ? 1 : 2;

    if (pattern === 'CUSTOM' && customLoads) {
      for (const cl of customLoads) {
        const nIdx = nodeIndexMap.get(cl.nodeId);
        if (nIdx !== undefined) {
          if (cl.Fx) F_lat[nIdx * 6 + 0] += cl.Fx;
          if (cl.Fy) F_lat[nIdx * 6 + 1] += cl.Fy;
          if (cl.Fz) F_lat[nIdx * 6 + 2] += cl.Fz;
          if (cl.Mx) F_lat[nIdx * 6 + 3] += cl.Mx;
          if (cl.My) F_lat[nIdx * 6 + 4] += cl.My;
          if (cl.Mz) F_lat[nIdx * 6 + 5] += cl.Mz;
        }
      }
      return F_lat;
    }

    // Determine vertical coordinate range (Z is elevation)
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const n of nodes) {
      if (n.z < minZ) minZ = n.z;
      if (n.z > maxZ) maxZ = n.z;
    }
    const height = Math.max(maxZ - minZ, 1.0);

    for (const n of nodes) {
      const nIdx = nodeIndexMap.get(n.id)!;
      // Skip nodes restrained in the direction of pushover
      const isRestrainedInDir =
        (controlDirection === 'X' && n.restraints?.Tx) ||
        (controlDirection === 'Y' && n.restraints?.Ty) ||
        (controlDirection === 'Z' && n.restraints?.Tz);
      if (isRestrainedInDir) continue;

      let weight = 1.0;
      if (pattern === 'TRIANGULAR') {
        weight = Math.max((n.z - minZ) / height, 0.05);
      }
      F_lat[nIdx * 6 + dirOffset] = weight * 1000; // 1 kN base reference
    }

    return F_lat;
  }

  /**
   * Solves initial gravity condition elastically if nodal or element loads exist.
   */
  private static solveInitialGravity(model: SpaceFrameModel3D) {
    const hasLoads =
      (model.nodalLoads && model.nodalLoads.length > 0) ||
      (model.elementLoads && model.elementLoads.length > 0);

    if (!hasLoads) return null;

    try {
      return SpaceFrameSolver3D.solve(model);
    } catch {
      return null;
    }
  }

  /**
   * Assembles the 3D space frame tangent stiffness matrix with exact hinge rotational flexibilities.
   */
  private static assembleTangentStiffness(
    nodes: Node3D[],
    elements: Element3D[],
    nodeIndexMap: Map<string, number>,
    hingeTrackers: Map<string, ActiveHingeTracker>,
    includePDelta: boolean,
    cumulativeElementForces: Map<string, { f_local: number[] }>,
  ) {
    const totalDOFs = nodes.length * 6;
    const K = createZeros(totalDOFs, totalDOFs);
    const elementTransforms = new Map<
      string,
      {
        T: number[][];
        k_local: number[][];
        dofs: number[];
        L: number;
        k_elastic_z: number;
        k_elastic_y: number;
      }
    >();

    for (const elem of elements) {
      const n1Idx = nodeIndexMap.get(elem.startNodeId)!;
      const n2Idx = nodeIndexMap.get(elem.endNodeId)!;
      const node1 = nodes[n1Idx]!;
      const node2 = nodes[n2Idx]!;

      const dx = node2.x - node1.x;
      const dy = node2.y - node1.y;
      const dz = node2.z - node1.z;
      const L = Math.hypot(dx, dy, dz);

      const E = elem.material.E;
      const nu = elem.material.nu ?? 0.3;
      const G = elem.material.G ?? E / (2 * (1 + nu));
      const Izz = elem.section.Izz;
      const Iyy = elem.section.Iyy;

      const k_elastic_z = (4 * E * Izz) / L;
      const k_elastic_y = (4 * E * Iyy) / L;

      // Fetch hinge flexibilities for start and end
      const startTracker = hingeTrackers.get(`${elem.id}_start`);
      const endTracker = hingeTrackers.get(`${elem.id}_end`);

      const fh1_z = startTracker ? startTracker.flexibilityZ : 0;
      const fh2_z = endTracker ? endTracker.flexibilityZ : 0;

      const fh1_y = startTracker ? startTracker.flexibilityY : 0;
      const fh2_y = endTracker ? endTracker.flexibilityY : 0;

      // Build local tangent stiffness incorporating plastic hinge flexibilities
      const k_local = this.buildHingedLocalStiffnessMatrix(
        elem,
        L,
        E,
        G,
        fh1_z,
        fh2_z,
        fh1_y,
        fh2_y,
      );

      // Geometric non-linear stiffness K_g(P) if enabled
      if (includePDelta) {
        const elemForces = cumulativeElementForces.get(elem.id);
        const P = elemForces ? -elemForces.f_local[0] : 0; // axial force
        if (Math.abs(P) > 1) {
          const kg = this.buildGeometricStiffness(P, L);
          for (let i = 0; i < 12; i++) {
            for (let j = 0; j < 12; j++) {
              k_local[i][j] += kg[i][j];
            }
          }
        }
      }

      // 12x12 Transformation matrix
      const T = (SpaceFrameSolver3D as any).buildTransformationMatrix(
        node1,
        node2,
        L,
        elem.rollAngleDeg ?? 0,
        elem.localYVector,
      );

      // Global element stiffness: K_elem = T^T * k_local * T
      const K_elem = createZeros(12, 12);
      for (let i = 0; i < 12; i++) {
        for (let j = 0; j < 12; j++) {
          let sum = 0;
          for (let m = 0; m < 12; m++) {
            for (let n = 0; n < 12; n++) {
              sum += T[m][i] * k_local[m][n] * T[n][j];
            }
          }
          K_elem[i][j] = sum;
        }
      }

      // DOFs
      const dofs = [
        n1Idx * 6 + 0, n1Idx * 6 + 1, n1Idx * 6 + 2, n1Idx * 6 + 3, n1Idx * 6 + 4, n1Idx * 6 + 5,
        n2Idx * 6 + 0, n2Idx * 6 + 1, n2Idx * 6 + 2, n2Idx * 6 + 3, n2Idx * 6 + 4, n2Idx * 6 + 5,
      ];

      // Assemble into global K
      for (let i = 0; i < 12; i++) {
        const row = dofs[i];
        for (let j = 0; j < 12; j++) {
          const col = dofs[j];
          K[row][col] += K_elem[i][j];
        }
      }

      elementTransforms.set(elem.id, {
        T,
        k_local,
        dofs,
        L,
        k_elastic_z,
        k_elastic_y,
      });
    }

    return { K, elementTransforms };
  }

  /**
   * Constructs 12x12 local element stiffness matrix using the exact flexibility formulation
   * with end plastic hinge rotational springs.
   */
  private static buildHingedLocalStiffnessMatrix(
    elem: Element3D,
    L: number,
    E: number,
    G: number,
    fh1_z: number,
    fh2_z: number,
    fh1_y: number,
    fh2_y: number,
  ): number[][] {
    const k = createZeros(12, 12);
    const A = elem.section.area;
    const Izz = elem.section.Izz;
    const Iyy = elem.section.Iyy;
    const J = elem.section.J;

    // 1. Axial stiffness
    const EA_L = (E * A) / L;
    k[0][0] = EA_L;
    k[0][6] = -EA_L;
    k[6][0] = -EA_L;
    k[6][6] = EA_L;

    // 2. Torsional stiffness
    const GJ_L = (G * J) / L;
    k[3][3] = GJ_L;
    k[3][9] = -GJ_L;
    k[9][3] = -GJ_L;
    k[9][9] = GJ_L;

    // 3. Local Z Bending (DOFs 1, 5, 7, 11) via flexibility inversion
    // Elastic flexibility + hinge rotational flexibilities
    const f11_z = L / (3 * E * Izz) + fh1_z;
    const f22_z = L / (3 * E * Izz) + fh2_z;
    const f12_z = -L / (6 * E * Izz);
    const det_z = f11_z * f22_z - f12_z * f12_z;

    const kz_55 = f22_z / det_z;
    const kz_511 = -f12_z / det_z;
    const kz_115 = kz_511;
    const kz_1111 = f11_z / det_z;

    // Shear terms from equilibrium
    const vy1_z = (kz_55 + kz_115) / L;
    const vy2_z = (kz_511 + kz_1111) / L;
    const ky1_z = (vy1_z + vy2_z) / L;

    k[1][1] = ky1_z;
    k[1][5] = vy1_z;
    k[1][7] = -ky1_z;
    k[1][11] = vy2_z;

    k[5][1] = vy1_z;
    k[5][5] = kz_55;
    k[5][7] = -vy1_z;
    k[5][11] = kz_511;

    k[7][1] = -ky1_z;
    k[7][5] = -vy1_z;
    k[7][7] = ky1_z;
    k[7][11] = -vy2_z;

    k[11][1] = vy2_z;
    k[11][5] = kz_115;
    k[11][7] = -vy2_z;
    k[11][11] = kz_1111;

    // 4. Local Y Bending (DOFs 2, 4, 8, 10) via flexibility inversion
    const f11_y = L / (3 * E * Iyy) + fh1_y;
    const f22_y = L / (3 * E * Iyy) + fh2_y;
    const f12_y = -L / (6 * E * Iyy);
    const det_y = f11_y * f22_y - f12_y * f12_y;

    const ky_44 = f22_y / det_y;
    const ky_410 = -f12_y / det_y;
    const ky_104 = ky_410;
    const ky_1010 = f11_y / det_y;

    const vz1_y = (ky_44 + ky_104) / L;
    const vz2_y = (ky_410 + ky_1010) / L;
    const kz1_y = (vz1_y + vz2_y) / L;

    k[2][2] = kz1_y;
    k[2][4] = -vz1_y;
    k[2][8] = -kz1_y;
    k[2][10] = -vz2_y;

    k[4][2] = -vz1_y;
    k[4][4] = ky_44;
    k[4][8] = vz1_y;
    k[4][10] = ky_410;

    k[8][2] = -kz1_y;
    k[8][4] = vz1_y;
    k[8][8] = kz1_y;
    k[8][10] = vz2_y;

    k[10][2] = -vz2_y;
    k[10][4] = ky_410;
    k[10][8] = vz2_y;
    k[10][10] = ky_1010;

    return k;
  }

  /**
   * Standard 12-DOF geometric stiffness matrix for axial thrust P.
   */
  private static buildGeometricStiffness(P: number, L: number): number[][] {
    const kg = createZeros(12, 12);
    const c1 = (6 * P) / (5 * L);
    const c2 = P / 10;
    const c3 = (2 * P * L) / 15;
    const c4 = -(P * L) / 30;

    // Lateral Y shear and Z rotation
    kg[1][1] = c1;
    kg[1][5] = c2;
    kg[1][7] = -c1;
    kg[1][11] = c2;
    kg[5][1] = c2;
    kg[5][5] = c3;
    kg[5][7] = -c2;
    kg[5][11] = c4;
    kg[7][1] = -c1;
    kg[7][5] = -c2;
    kg[7][7] = c1;
    kg[7][11] = -c2;
    kg[11][1] = c2;
    kg[11][5] = c4;
    kg[11][7] = -c2;
    kg[11][11] = c3;

    // Lateral Z shear and Y rotation
    kg[2][2] = c1;
    kg[2][4] = -c2;
    kg[2][8] = -c1;
    kg[2][10] = -c2;
    kg[4][2] = -c2;
    kg[4][4] = c3;
    kg[4][8] = c2;
    kg[4][10] = c4;
    kg[8][2] = -c1;
    kg[8][4] = c2;
    kg[8][8] = c1;
    kg[8][10] = c2;
    kg[10][2] = -c2;
    kg[10][4] = c4;
    kg[10][8] = c2;
    kg[10][10] = c3;

    return kg;
  }

  /**
   * Updates active plastic hinge state based on internal moment demand and backbone model.
   * Returns true if hinge transitioned into plastic regime.
   */
  private static updateHingeState(
    tracker: ActiveHingeTracker,
    Mz: number,
    My: number,
    k_elastic_z: number,
    k_elastic_y: number,
  ): boolean {
    const def = tracker.def;
    const alpha = def.strainHardeningRatio ?? 0.02;
    let newlyYielded = false;

    // Evaluate Local Z Bending Hinge
    const Mpz = def.yieldMomentZ;
    if (Mz >= Mpz) {
      if (tracker.state === 'ELASTIC') {
        newlyYielded = true;
      }
      const excessM = Mz - tracker.currentCapacityZ;
      if (excessM > 0) {
        const dTheta = excessM / (k_elastic_z * (1 - alpha));
        tracker.plasticRotationZ += dTheta;
      }

      // Update current moment capacity according to FEMA 356 backbone curve
      const theta_y = def.thetaYield ?? Mpz / k_elastic_z;
      const a = def.plasticRotations?.a ?? 9 * theta_y;
      const b = def.plasticRotations?.b ?? 11 * theta_y;
      const c = def.plasticRotations?.c ?? 0.2;

      const rot = tracker.plasticRotationZ;
      if (rot <= a) {
        // Strain hardening branch B -> C
        tracker.currentCapacityZ = Mpz * (1.0 + alpha * (rot / Math.max(theta_y, 1e-6)));
        tracker.flexibilityZ = 1.0 / (alpha * k_elastic_z);
      } else if (rot <= b) {
        // Post-peak softening drop C -> D
        const frac = (rot - a) / Math.max(b - a, 1e-6);
        tracker.currentCapacityZ = Mpz * ((1.0 + alpha * (a / theta_y)) * (1 - frac) + c * frac);
        tracker.flexibilityZ = 50.0 / k_elastic_z; // Softened tangent
      } else {
        // Residual plateau D -> E
        tracker.currentCapacityZ = c * Mpz;
        tracker.flexibilityZ = 200.0 / k_elastic_z;
      }
    }

    // Evaluate Local Y Bending Hinge
    const Mpy = def.yieldMomentY ?? def.yieldMomentZ;
    if (My >= Mpy) {
      if (tracker.state === 'ELASTIC') {
        newlyYielded = true;
      }
      const excessM = My - tracker.currentCapacityY;
      if (excessM > 0) {
        const dTheta = excessM / (k_elastic_y * (1 - alpha));
        tracker.plasticRotationY += dTheta;
      }

      const theta_y = def.thetaYield ?? Mpy / k_elastic_y;
      const a = def.plasticRotations?.a ?? 9 * theta_y;
      const b = def.plasticRotations?.b ?? 11 * theta_y;
      const c = def.plasticRotations?.c ?? 0.2;

      const rot = tracker.plasticRotationY;
      if (rot <= a) {
        tracker.currentCapacityY = Mpy * (1.0 + alpha * (rot / Math.max(theta_y, 1e-6)));
        tracker.flexibilityY = 1.0 / (alpha * k_elastic_y);
      } else if (rot <= b) {
        const frac = (rot - a) / Math.max(b - a, 1e-6);
        tracker.currentCapacityY = Mpy * ((1.0 + alpha * (a / theta_y)) * (1 - frac) + c * frac);
        tracker.flexibilityY = 50.0 / k_elastic_y;
      } else {
        tracker.currentCapacityY = c * Mpy;
        tracker.flexibilityY = 200.0 / k_elastic_y;
      }
    }

    // Update ASCE 41-17 Performance State based on governing plastic rotation
    const govRot = Math.max(tracker.plasticRotationZ, tracker.plasticRotationY);
    const thetaIO = def.acceptanceCriteria?.thetaIO ?? 1.0 * (def.thetaYield ?? 0.002);
    const thetaLS = def.acceptanceCriteria?.thetaLS ?? 6.0 * (def.thetaYield ?? 0.002);
    const thetaCP = def.acceptanceCriteria?.thetaCP ?? 9.0 * (def.thetaYield ?? 0.002);
    const bRot = def.plasticRotations?.b ?? 11.0 * (def.thetaYield ?? 0.002);

    if (govRot <= 0) {
      tracker.state = 'ELASTIC';
    } else if (govRot <= thetaIO) {
      tracker.state = 'YIELD';
    } else if (govRot <= thetaLS) {
      tracker.state = 'IMMEDIATE_OCCUPANCY';
    } else if (govRot <= thetaCP) {
      tracker.state = 'LIFE_SAFETY';
    } else if (govRot <= bRot) {
      tracker.state = 'COLLAPSE_PREVENTION';
    } else {
      tracker.state = 'RESIDUAL';
    }

    return newlyYielded;
  }

  private static applyRestraint(K: number[][], F: number[], dof: number) {
    for (let j = 0; j < K.length; j++) {
      K[dof][j] = 0;
    }
    K[dof][dof] = 1.0;
    F[dof] = 0.0;
  }

  /**
   * Bilinearizes the Pushover Capacity Curve according to ASCE 41-17 Section 7.4.3.2.4.
   */
  private static bilinearizeCapacityCurve(
    displacements: number[],
    baseShears: number[],
    firstYieldBaseShear?: number,
  ): PushoverCapacityCurve['bilinearization'] {
    const n = displacements.length;
    if (n < 2) {
      return {
        effectiveElasticStiffness: 0,
        effectiveYieldBaseShear: 0,
        effectiveYieldDisplacement: 0,
        maximumBaseShear: 0,
        maximumDisplacement: 0,
        ductilityFactor: 1.0,
        overstrengthFactor: 1.0,
        energyDissipated: 0,
      };
    }

    const Dmax = displacements[n - 1]!;
    let Vmax = 0;
    for (const v of baseShears) {
      if (v > Vmax) Vmax = v;
    }

    // Trapezoidal integration of actual capacity curve area E_actual
    let energyDissipated = 0;
    for (let i = 1; i < n; i++) {
      const dD = displacements[i]! - displacements[i - 1]!;
      const avgV = (baseShears[i]! + baseShears[i - 1]!) / 2;
      energyDissipated += avgV * dD;
    }

    // Effective initial stiffness Ke evaluated at 0.6 * Vmax
    const V_06 = 0.6 * Vmax;
    let Ke = 0;
    for (let i = 1; i < n; i++) {
      if (baseShears[i]! >= V_06) {
        Ke = baseShears[i]! / Math.max(displacements[i]!, 1e-7);
        break;
      }
    }
    if (Ke <= 0) {
      Ke = baseShears[1]! / Math.max(displacements[1]!, 1e-7);
    }

    // Equal energy bilinearization for effective yield point (Vy, Dy):
    // E_bilinear = 0.5 * Vy * Dy + Vy * (Dmax - Dy) = Vy * Dmax - 0.5 * Vy^2 / Ke = energyDissipated
    // Quadratic equation: (0.5 / Ke) * Vy^2 - Dmax * Vy + energyDissipated = 0
    let Vy = Vmax;
    const a_coef = 0.5 / Ke;
    const b_coef = -Dmax;
    const c_coef = energyDissipated;
    const disc = b_coef * b_coef - 4 * a_coef * c_coef;

    if (disc >= 0 && a_coef > 0) {
      const root1 = (-b_coef - Math.sqrt(disc)) / (2 * a_coef);
      if (root1 > 0 && root1 <= Vmax * 1.25) {
        Vy = root1;
      } else {
        const root2 = (-b_coef + Math.sqrt(disc)) / (2 * a_coef);
        if (root2 > 0 && root2 <= Vmax * 1.25) Vy = root2;
      }
    }

    const Dy = Vy / Math.max(Ke, 1e-7);
    const ductilityFactor = Math.max(Dmax / Math.max(Dy, 1e-6), 1.0);
    const baseFirstYield = firstYieldBaseShear && firstYieldBaseShear > 0 ? firstYieldBaseShear : Vy;
    const overstrengthFactor = Math.max(Vmax / baseFirstYield, 1.0);

    return {
      effectiveElasticStiffness: Number(Ke.toFixed(2)),
      effectiveYieldBaseShear: Number(Vy.toFixed(2)),
      effectiveYieldDisplacement: Number(Dy.toFixed(4)),
      maximumBaseShear: Number(Vmax.toFixed(2)),
      maximumDisplacement: Number(Dmax.toFixed(4)),
      ductilityFactor: Number(ductilityFactor.toFixed(2)),
      overstrengthFactor: Number(overstrengthFactor.toFixed(2)),
      energyDissipated: Number(energyDissipated.toFixed(2)),
    };
  }

  private static formatDisplacements(
    nodes: Node3D[],
    U: number[],
  ): Map<string, NodeDisplacement3D> {
    const map = new Map<string, NodeDisplacement3D>();
    for (let i = 0; i < nodes.length; i++) {
      const base = i * 6;
      map.set(nodes[i]!.id, {
        nodeId: nodes[i]!.id,
        dx: U[base + 0],
        dy: U[base + 1],
        dz: U[base + 2],
        rx: U[base + 3],
        ry: U[base + 4],
        rz: U[base + 5],
      });
    }
    return map;
  }

  private static computeReactions(
    nodes: Node3D[],
    elements: Element3D[],
    elementTransforms: Map<string, any>,
    cumulativeElementForces: Map<string, { f_local: number[] }>,
    restrainedNodes: Set<string>,
  ): Map<string, NodeReaction3D> {
    const reactions = new Map<string, NodeReaction3D>();
    const nodeReactions = new Map<string, { Fx: number; Fy: number; Fz: number; Mx: number; My: number; Mz: number }>();

    for (const n of nodes) {
      if (restrainedNodes.has(n.id)) {
        nodeReactions.set(n.id, { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 });
      }
    }

    // Sum internal end forces connected to restrained nodes
    for (const elem of elements) {
      const et = elementTransforms.get(elem.id);
      const elemForces = cumulativeElementForces.get(elem.id);
      if (!et || !elemForces) continue;

      const f_local = elemForces.f_local;

      // Transform local forces to global: f_global = T^T * f_local
      const f_global = new Array(12).fill(0);
      for (let i = 0; i < 12; i++) {
        for (let j = 0; j < 12; j++) {
          f_global[i] += et.T[j][i] * f_local[j];
        }
      }

      if (restrainedNodes.has(elem.startNodeId)) {
        const r = nodeReactions.get(elem.startNodeId)!;
        r.Fx += f_global[0];
        r.Fy += f_global[1];
        r.Fz += f_global[2];
        r.Mx += f_global[3];
        r.My += f_global[4];
        r.Mz += f_global[5];
      }

      if (restrainedNodes.has(elem.endNodeId)) {
        const r = nodeReactions.get(elem.endNodeId)!;
        r.Fx += f_global[6];
        r.Fy += f_global[7];
        r.Fz += f_global[8];
        r.Mx += f_global[9];
        r.My += f_global[10];
        r.Mz += f_global[11];
      }
    }

    for (const [nodeId, r] of nodeReactions) {
      reactions.set(nodeId, {
        nodeId,
        Fx: r.Fx,
        Fy: r.Fy,
        Fz: r.Fz,
        Mx: r.Mx,
        My: r.My,
        Mz: r.Mz,
      });
    }

    return reactions;
  }

  private static formatElementForces(
    elements: Element3D[],
    nodes: Node3D[],
    nodeIndexMap: Map<string, number>,
    cumulativeElementForces: Map<string, { f_local: number[] }>,
  ): Map<string, ElementInternalForces3D> {
    const results = new Map<string, ElementInternalForces3D>();

    for (const elem of elements) {
      const n1 = nodes[nodeIndexMap.get(elem.startNodeId)!]!;
      const n2 = nodes[nodeIndexMap.get(elem.endNodeId)!]!;
      const L = Math.hypot(n2.x - n1.x, n2.y - n1.y, n2.z - n1.z);

      const f_local = cumulativeElementForces.get(elem.id)!.f_local;

      const N1 = -f_local[0];
      const Vy1 = f_local[1];
      const Vz1 = f_local[2];
      const T1 = -f_local[3];
      const My1 = -f_local[4];
      const Mz1 = -f_local[5];

      const N2 = f_local[6];
      const Vy2 = -f_local[7];
      const Vz2 = -f_local[8];
      const T2 = f_local[9];
      const My2 = f_local[10];
      const Mz2 = f_local[11];

      results.set(elem.id, {
        elementId: elem.id,
        length: L,
        startForces: { N: N1, Vy: Vy1, Vz: Vz1, T: T1, My: My1, Mz: Mz1 },
        endForces: { N: N2, Vy: Vy2, Vz: Vz2, T: T2, My: My2, Mz: Mz2 },
        stations: [],
      });
    }

    return results;
  }

  private static formatHingeStates(
    trackers: Map<string, ActiveHingeTracker>,
  ): HingeStatusRecord[] {
    const list: HingeStatusRecord[] = [];
    for (const t of trackers.values()) {
      const rot = Math.max(t.plasticRotationZ, t.plasticRotationY);
      const cap = Math.max(t.currentCapacityZ, t.currentCapacityY);
      const baseCap = Math.max(t.def.yieldMomentZ, t.def.yieldMomentY ?? t.def.yieldMomentZ);
      list.push({
        elementId: t.elementId,
        location: t.location,
        state: t.state,
        plasticRotation: Number(rot.toFixed(6)),
        momentRatio: Number((cap / Math.max(baseCap, 1e-6)).toFixed(3)),
        moment: Number(cap.toFixed(2)),
        capacity: Number(baseCap.toFixed(2)),
      });
    }
    return list;
  }

  private static summarizeHinges(trackers: Map<string, ActiveHingeTracker>) {
    let elasticCount = 0;
    let yieldCount = 0;
    let ioCount = 0;
    let lsCount = 0;
    let cpCount = 0;
    let residualCount = 0;

    for (const t of trackers.values()) {
      switch (t.state) {
        case 'ELASTIC':
          elasticCount++;
          break;
        case 'YIELD':
          yieldCount++;
          break;
        case 'IMMEDIATE_OCCUPANCY':
          ioCount++;
          break;
        case 'LIFE_SAFETY':
          lsCount++;
          break;
        case 'COLLAPSE_PREVENTION':
          cpCount++;
          break;
        case 'RESIDUAL':
          residualCount++;
          break;
      }
    }

    return {
      elasticCount,
      yieldCount,
      ioCount,
      lsCount,
      cpCount,
      residualCount,
    };
  }

  private static determineOverallPerformance(
    summary: PushoverStepResult['hingeSummary'],
  ): PushoverAnalysisResult3D['overallPerformanceLevel'] {
    if (summary.residualCount > 0) return 'COLLAPSE_RISK';
    if (summary.cpCount > 0) return 'COLLAPSE_PREVENTION';
    if (summary.lsCount > 0) return 'LIFE_SAFETY';
    if (summary.ioCount > 0 || summary.yieldCount > 0) return 'IMMEDIATE_OCCUPANCY';
    return 'OPERATIONAL';
  }
}
