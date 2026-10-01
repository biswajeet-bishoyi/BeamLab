/**
 * BeamLab Sprint B5.1 — Goal Decomposition Engine
 * Parses natural language and structured engineering goals, decomposes them
 * into Directed Acyclic Graph (DAG) task execution pipelines, validates dependency
 * topologies, and assigns specialized engineering agents.
 */

import { ExecutionPlan, type PlanStep, type ApprovalRequirement } from '@beamlab/planning-engine';

export type EngineeringIntentType =
  | 'WEIGHT_OPTIMIZATION'
  | 'CODE_COMPLIANCE'
  | 'SECOND_ORDER_ANALYSIS'
  | 'PUSHOVER_ASSESSMENT'
  | 'LOAD_GENERATION'
  | 'CALCULATION_REPORT'
  | 'FULL_DESIGN_WORKFLOW';

export interface DecomposedGoalSpec {
  intentType: EngineeringIntentType;
  designCode: 'EUROCODE_3' | 'AISC_360_16' | 'IS_800' | 'ASCE_7';
  targetElements?: string[];
  parameters: Record<string, any>;
  requiresApproval: boolean;
}

export class GoalDecompositionEngine {
  /**
   * Decomposes an engineering objective string into a structured DecomposedGoalSpec.
   */
  public static parseIntent(objectiveText: string): DecomposedGoalSpec {
    const text = objectiveText.toLowerCase();

    // Determine Design Code
    let designCode: DecomposedGoalSpec['designCode'] = 'EUROCODE_3';
    if (text.includes('aisc') || text.includes('asce 7') || text.includes('american') || text.includes('us code')) {
      designCode = 'AISC_360_16';
    } else if (text.includes('is 800') || text.includes('indian')) {
      designCode = 'IS_800';
    }

    // Determine Intent Type
    let intentType: EngineeringIntentType = 'FULL_DESIGN_WORKFLOW';
    let requiresApproval = false;

    if (text.includes('optimize') || text.includes('weight') || text.includes('sizing') || text.includes('cost')) {
      intentType = 'WEIGHT_OPTIMIZATION';
      requiresApproval = true; // Section modifications require engineer sign-off
    } else if (text.includes('pushover') || text.includes('capacity curve') || text.includes('ductility') || text.includes('asce 41')) {
      intentType = 'PUSHOVER_ASSESSMENT';
    } else if (text.includes('p-delta') || text.includes('second order') || text.includes('dam') || text.includes('stability')) {
      intentType = 'SECOND_ORDER_ANALYSIS';
    } else if (text.includes('compliance') || text.includes('code check') || text.includes('utilization') || text.includes('audit')) {
      intentType = 'CODE_COMPLIANCE';
    } else if (text.includes('wind') || text.includes('seismic') || text.includes('load combination') || text.includes('elf')) {
      intentType = 'LOAD_GENERATION';
    } else if (text.includes('report') || text.includes('calculation note') || text.includes('pdf') || text.includes('stamp')) {
      intentType = 'CALCULATION_REPORT';
    }

    return {
      intentType,
      designCode,
      parameters: {
        rawPrompt: objectiveText,
      },
      requiresApproval,
    };
  }

  /**
   * Synthesizes an ExecutionPlan with ordered steps and explicit dependencies.
   */
  public static decompose(spec: DecomposedGoalSpec, sessionId: string): ExecutionPlan {
    const steps: PlanStep[] = [];
    const approvals: ApprovalRequirement[] = [];
    const requiredAgents = new Set<string>();

    // Step 1: Model Extraction (common prerequisite)
    const stepExtract: PlanStep = {
      id: 'step_extract_model',
      action: 'EXTRACT_CANONICAL_MODEL',
      arguments: {},
      dependencies: [],
      explanation: 'Extract 3D spatial space frame geometry, section assignments, and boundary restraints.',
    };
    steps.push(stepExtract);
    requiredAgents.add('StructuralAnalysisAgent');

    // Step 2: Load Generation / Combinations
    const stepLoads: PlanStep = {
      id: 'step_generate_loads',
      action: 'GENERATE_LOAD_COMBINATIONS',
      arguments: { designCode: spec.designCode },
      dependencies: ['step_extract_model'],
      explanation: `Generate ULS and SLS factored load combinations in accordance with ${spec.designCode}.`,
    };
    steps.push(stepLoads);
    requiredAgents.add('StructuralAnalysisAgent');

    switch (spec.intentType) {
      case 'WEIGHT_OPTIMIZATION': {
        const stepAnalyze: PlanStep = {
          id: 'step_solve_analysis',
          action: 'SOLVE_SPACE_FRAME',
          arguments: { method: 'FIRST_ORDER' },
          dependencies: ['step_generate_loads'],
          explanation: 'Compute 3D internal axial forces, shears, and moments across all load combinations.',
        };
        const stepCompliance: PlanStep = {
          id: 'step_audit_compliance',
          action: 'AUDIT_CODE_COMPLIANCE',
          arguments: { designCode: spec.designCode },
          dependencies: ['step_solve_analysis'],
          explanation: `Calculate member utilization ratios (UC) and check clause limits under ${spec.designCode}.`,
        };
        const stepOptimize: PlanStep = {
          id: 'step_optimize_sections',
          action: 'OPTIMIZE_CROSS_SECTIONS',
          arguments: { designCode: spec.designCode, target: 'MINIMIZE_WEIGHT', maxUtilization: 0.95 },
          dependencies: ['step_audit_compliance'],
          explanation: 'Iteratively select lighter standard catalog profiles meeting strength and drift criteria.',
        };
        const stepApprove: PlanStep = {
          id: 'step_request_approval',
          action: 'REQUEST_APPROVAL_GATE',
          arguments: { actionName: 'APPLY_OPTIMIZED_SECTIONS' },
          dependencies: ['step_optimize_sections'],
          explanation: 'Require engineer confirmation before writing optimized sections to canonical model.',
        };
        const stepReport: PlanStep = {
          id: 'step_generate_report',
          action: 'GENERATE_CALCULATION_NOTE',
          arguments: { designCode: spec.designCode },
          dependencies: ['step_request_approval'],
          explanation: 'Produce engineering calculation note detailing original vs optimized section schedule.',
        };

        steps.push(stepAnalyze, stepCompliance, stepOptimize, stepApprove, stepReport);
        requiredAgents.add('OptimizationAgent');
        requiredAgents.add('CodeComplianceAgent');
        requiredAgents.add('ReportAgent');

        approvals.push({
          id: 'app_section_changes',
          type: 'DESIGN_MODIFICATION',
          priority: 'high',
          reason: 'Automated structural section replacement requires professional engineer sign-off.',
        });
        break;
      }

      case 'PUSHOVER_ASSESSMENT': {
        const stepPushover: PlanStep = {
          id: 'step_solve_pushover',
          action: 'SOLVE_PUSHOVER_3D',
          arguments: {
            controlDirection: 'X',
            numberOfSteps: 25,
            backbone: 'FEMA_356',
            acceptanceCriteria: 'ASCE_41_17',
          },
          dependencies: ['step_generate_loads'],
          explanation: 'Perform displacement-controlled incremental pushover with lumped plastic hinge tracking.',
        };
        const stepPushoverReport: PlanStep = {
          id: 'step_generate_report',
          action: 'GENERATE_CALCULATION_NOTE',
          arguments: { includeCapacityCurve: true, includeDuctility: true },
          dependencies: ['step_solve_pushover'],
          explanation: 'Compile ASCE 41-17 capacity curve, bilinearization summary, and performance states.',
        };

        steps.push(stepPushover, stepPushoverReport);
        requiredAgents.add('ReportAgent');
        break;
      }

      case 'SECOND_ORDER_ANALYSIS': {
        const stepPDelta: PlanStep = {
          id: 'step_solve_pdelta',
          action: 'SOLVE_PDELTA_3D',
          arguments: { damStiffnessReduction: true, maxIterations: 20 },
          dependencies: ['step_generate_loads'],
          explanation: 'Compute second-order P-Delta effects, sway amplification B2, and AISC stability index theta.',
        };
        const stepReport: PlanStep = {
          id: 'step_generate_report',
          action: 'GENERATE_CALCULATION_NOTE',
          arguments: { includeStabilityDiagnostics: true },
          dependencies: ['step_solve_pdelta'],
          explanation: 'Summarize second-order sway amplification and column critical axial ratios.',
        };

        steps.push(stepPDelta, stepReport);
        requiredAgents.add('ReportAgent');
        break;
      }

      case 'CODE_COMPLIANCE':
      default: {
        const stepAnalyze: PlanStep = {
          id: 'step_solve_analysis',
          action: 'SOLVE_SPACE_FRAME',
          arguments: { method: 'FIRST_ORDER' },
          dependencies: ['step_generate_loads'],
          explanation: 'Execute linear static 12-DOF space frame direct stiffness analysis.',
        };
        const stepCompliance: PlanStep = {
          id: 'step_audit_compliance',
          action: 'AUDIT_CODE_COMPLIANCE',
          arguments: { designCode: spec.designCode },
          dependencies: ['step_solve_analysis'],
          explanation: `Perform clause-by-clause limit state verification under ${spec.designCode}.`,
        };
        const stepReport: PlanStep = {
          id: 'step_generate_report',
          action: 'GENERATE_CALCULATION_NOTE',
          arguments: { designCode: spec.designCode },
          dependencies: ['step_audit_compliance'],
          explanation: 'Generate compliance audit report highlighting critical governing members.',
        };

        steps.push(stepAnalyze, stepCompliance, stepReport);
        requiredAgents.add('CodeComplianceAgent');
        requiredAgents.add('ReportAgent');
        break;
      }
    }

    // Validate Topological Consistency
    this.validateDAG(steps);

    return new ExecutionPlan({
      planId: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      requestId: `req_${Date.now()}`,
      sessionId,
      userIntent: spec.intentType,
      strategy: 'DAG_DECOMPOSITION',
      orderedSteps: steps,
      requiredContext: ['canonicalModel', 'designCode'],
      requiredTools: ['SpaceFrameSolver3D', 'CodeComplianceChecker', 'SectionOptimizer'],
      requiredSkills: ['structural_analysis', 'code_checking', 'section_optimization'],
      requiredAgents: Array.from(requiredAgents),
      dependencies: [],
      constraints: [],
      estimatedDurationMs: steps.length * 150,
      estimatedTokenCost: 0,
      estimatedComputeCost: steps.length * 0.01,
      requiredApprovals: approvals,
      metadata: {
        spec,
        createdAt: Date.now(),
      },
      version: '1.0.0',
    });
  }

  /**
   * Verifies that the task steps form a valid, cycle-free Directed Acyclic Graph (DAG).
   */
  private static validateDAG(steps: PlanStep[]) {
    const stepIds = new Set(steps.map((s) => s.id));

    // Check all dependencies exist
    for (const s of steps) {
      for (const dep of s.dependencies) {
        if (!stepIds.has(dep)) {
          throw new Error(`Plan step "${s.id}" references non-existent dependency "${dep}".`);
        }
      }
    }

    // Topological cycle check (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const s of steps) {
      inDegree.set(s.id, s.dependencies.length);
      adj.set(s.id, []);
    }

    for (const s of steps) {
      for (const dep of s.dependencies) {
        adj.get(dep)!.push(s.id);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    let visitedCount = 0;
    while (queue.length > 0) {
      const u = queue.shift()!;
      visitedCount++;

      for (const v of adj.get(u)!) {
        const newDeg = inDegree.get(v)! - 1;
        inDegree.set(v, newDeg);
        if (newDeg === 0) queue.push(v);
      }
    }

    if (visitedCount !== steps.length) {
      throw new Error('Cyclic dependency detected in decomposed task DAG.');
    }
  }
}
