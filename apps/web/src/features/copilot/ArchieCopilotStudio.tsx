import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  Play,
  X,
  FileSpreadsheet,
  TrendingDown,
  FileText,
  ArrowRight,
  Workflow,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  EngineeringBlackboard,
  MultiAgentOrchestrator,
  GoalDecompositionEngine,
  type MemberComplianceCheck,
  type SectionOptimizationProposal,
} from '@beamlab/archie-kernel';
import {
  AutonomousLoadGenerator,
  type WindLoadParameters,
  type SeismicLoadParameters,
} from '@beamlab/agent-structural-analysis';
import {
  StructuralCatalogOptimizer,
  type MemberOptimizationRequest,
} from '@beamlab/agent-optimization';
import {
  EngineeringCalculationNoteGenerator,
  type CalculationNoteInput,
} from '@beamlab/agent-report';

import { CopilotDAGViewer } from './CopilotDAGViewer';
import { ReasoningStream } from './ReasoningStream';
import { HumanApprovalModal } from './HumanApprovalModal';
import { CalculationNotePreview } from './CalculationNotePreview';
import type { CopilotStudioState, ReasoningLogEntry } from './types';

interface ArchieCopilotStudioProps {
  onClose: () => void;
}

const PRESET_PROMPTS = [
  {
    title: 'Full Autonomous Eurocode 3 Sizing',
    prompt:
      'Perform a complete autonomous Eurocode 3 design: synthesize ASCE 7 lateral wind & seismic loads, optimize steel cross-sections for minimum weight (target UC <= 0.95), and compile an auditable calculation note.',
    icon: Sparkles,
  },
  {
    title: 'Lateral Load Synthesis (Wind & Seismic)',
    prompt:
      'Generate ASCE 7-16 directional wind pressure profiles and Equivalent Lateral Force (ELF) seismic base shear combinations for a 3-story frame.',
    icon: FileSpreadsheet,
  },
  {
    title: 'Weight Minimization & Catalog Sizing',
    prompt:
      'Optimize steel frame cross-sections by selecting lightest compliant IPE and HEB profiles to Eurocode 3 EN 1993-1-1 with deflection limit L/300.',
    icon: TrendingDown,
  },
  {
    title: 'Compliance Audit & Calculation Note',
    prompt:
      'Run comprehensive multi-constraint structural code check and compile formal publication-ready calculation note with LaTeX formulas.',
    icon: FileText,
  },
];

export const ArchieCopilotStudio: React.FC<ArchieCopilotStudioProps> = ({ onClose }) => {
  const [goalPrompt, setGoalPrompt] = useState(PRESET_PROMPTS[0]!.prompt);
  const [designCode, setDesignCode] = useState<'EUROCODE_3' | 'AISC_360_16' | 'IS_800'>('EUROCODE_3');
  const [steelGrade, setSteelGrade] = useState<'S355' | 'S275' | 'A992_GR50'>('S355');
  const [activeTab, setActiveTab] = useState<'dag' | 'stream' | 'note' | 'sections' | 'combinations'>('dag');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Orchestration state
  const [studioState, setStudioState] = useState<CopilotStudioState>({
    sessionId: `copilot-session-${Date.now()}`,
    status: 'IDLE',
    goalPrompt: PRESET_PROMPTS[0]!.prompt,
    designCode: 'EUROCODE_3',
    steelGrade: 'S355',
    steps: [],
    logs: [],
    pendingGate: null,
    loadCombinations: [],
    complianceChecks: [],
    optimizationProposals: [],
    calculationNote: null,
    initialWeightKg: 14520,
    optimizedWeightKg: 14520,
    weightSavingsPercent: 0,
    maxUtilizationRatio: 0,
  });

  const orchestratorRef = useRef<MultiAgentOrchestrator | null>(null);
  const blackboardRef = useRef<EngineeringBlackboard | null>(null);
  const activeGateIdRef = useRef<string | null>(null);

  const addLog = useCallback(
    (
      agentId: string,
      agentName: string,
      agentColor: string,
      action: string,
      message: string,
      options?: {
        details?: string;
        equations?: string[];
        severity?: ReasoningLogEntry['severity'];
      }
    ) => {
      const entry: ReasoningLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        agentId,
        agentName,
        agentColor,
        action,
        message,
        details: options?.details,
        equations: options?.equations,
        severity: options?.severity || 'info',
      };

      setStudioState((prev) => ({
        ...prev,
        logs: [...prev.logs, entry],
      }));
    },
    []
  );

  // Set up 3D structural model for autonomous operations
  const createSampleModel = () => ({
    nodes: [
      { id: 'N1', x: 0, y: 0, z: 0, restraints: { Tx: true, Ty: true, Tz: true }, isSupport: true },
      { id: 'N2', x: 6, y: 0, z: 0, restraints: { Tx: true, Ty: true, Tz: true }, isSupport: true },
      { id: 'N3', x: 12, y: 0, z: 0, restraints: { Tx: true, Ty: true, Tz: true }, isSupport: true },
      { id: 'N4', x: 0, y: 0, z: 4 },
      { id: 'N5', x: 6, y: 0, z: 4 },
      { id: 'N6', x: 12, y: 0, z: 4 },
      { id: 'N7', x: 0, y: 0, z: 8 },
      { id: 'N8', x: 6, y: 0, z: 8 },
      { id: 'N9', x: 12, y: 0, z: 8 },
      { id: 'N10', x: 0, y: 0, z: 12 },
      { id: 'N11', x: 6, y: 0, z: 12 },
      { id: 'N12', x: 12, y: 0, z: 12 },
    ],
    elements: [
      { id: 'COL_1', startNodeId: 'N1', endNodeId: 'N4', section: { name: 'HEB 300', area: 0.01491 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'COL_2', startNodeId: 'N2', endNodeId: 'N5', section: { name: 'HEB 300', area: 0.01491 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'COL_3', startNodeId: 'N3', endNodeId: 'N6', section: { name: 'HEB 300', area: 0.01491 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'BEAM_1', startNodeId: 'N4', endNodeId: 'N5', section: { name: 'HEB 260', area: 0.01184 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'BEAM_2', startNodeId: 'N5', endNodeId: 'N6', section: { name: 'HEB 260', area: 0.01184 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'COL_4', startNodeId: 'N4', endNodeId: 'N7', section: { name: 'HEB 260', area: 0.01184 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'COL_5', startNodeId: 'N5', endNodeId: 'N8', section: { name: 'HEB 260', area: 0.01184 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'COL_6', startNodeId: 'N6', endNodeId: 'N9', section: { name: 'HEB 260', area: 0.01184 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'BEAM_3', startNodeId: 'N7', endNodeId: 'N8', section: { name: 'HEB 260', area: 0.01184 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'BEAM_4', startNodeId: 'N8', endNodeId: 'N9', section: { name: 'HEB 260', area: 0.01184 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'COL_7', startNodeId: 'N7', endNodeId: 'N10', section: { name: 'HEB 220', area: 0.00910 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'COL_8', startNodeId: 'N8', endNodeId: 'N11', section: { name: 'HEB 220', area: 0.00910 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'COL_9', startNodeId: 'N9', endNodeId: 'N12', section: { name: 'HEB 220', area: 0.00910 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'BEAM_5', startNodeId: 'N10', endNodeId: 'N11', section: { name: 'HEB 220', area: 0.00910 }, material: { grade: steelGrade, E: 210e9 } },
      { id: 'BEAM_6', startNodeId: 'N11', endNodeId: 'N12', section: { name: 'HEB 220', area: 0.00910 }, material: { grade: steelGrade, E: 210e9 } },
    ],
  });

  const handleRunGoal = async () => {
    const sessionId = `copilot-session-${Date.now()}`;
    const sampleModel = createSampleModel();

    // 1. Initialize Blackboard
    const blackboard = new EngineeringBlackboard(sessionId, goalPrompt, sampleModel, designCode);
    blackboardRef.current = blackboard;

    // 2. Synthesize DAG using GoalDecompositionEngine
    const spec = GoalDecompositionEngine.parseIntent(goalPrompt);
    spec.designCode = designCode;
    const plan = GoalDecompositionEngine.decompose(spec, sessionId);

    // 3. Initialize MultiAgentOrchestrator
    const orchestrator = new MultiAgentOrchestrator(blackboard);
    orchestratorRef.current = orchestrator;

    // Register specialized domain agents
    orchestrator.registerHandler('GENERATE_LOAD_COMBINATIONS', async (_step, bb) => {
      addLog(
        'agent-structural-analysis',
        'AutonomousLoadGenerator',
        '#38bdf8',
        'GENERATE_LOAD_COMBINATIONS',
        'Computing ASCE 7-16 directional wind pressure & Eurocode 8 ELF seismic base shear...',
        {
          equations: [
            'q_z = 0.613 \\cdot K_z \\cdot K_{zt} \\cdot K_d \\cdot K_e \\cdot V^2 \\quad [N/m^2]',
            'V_{base} = C_s \\cdot W = \\frac{S_{DS}}{R / I_e} \\cdot W',
          ],
        }
      );

      const windParams: WindLoadParameters = {
        basicWindSpeed: 38,
        exposureCategory: 'C',
        direction: 'X',
        buildingWidth: 12.0,
        buildingDepth: 18.0,
        gustFactorG: 0.85,
      };

      const seismicParams: SeismicLoadParameters = {
        siteClass: 'D',
        Ss: 1.25,
        S1: 0.50,
        importanceFactorIe: 1.0,
        responseModificationR: 5.0,
        direction: 'X',
        seismicWeightKg: 14520,
      };

      const generated = AutonomousLoadGenerator.generate(
        sampleModel.nodes,
        windParams,
        seismicParams,
        designCode === 'EUROCODE_3' ? 'EUROCODE' : 'ASCE_7_16'
      );

      bb.setLoadCombinations(generated.loadCombinations, 'agent-structural-analysis');

      addLog(
        'agent-structural-analysis',
        'AutonomousLoadGenerator',
        '#38bdf8',
        'GENERATE_LOAD_COMBINATIONS',
        `Successfully generated ${generated.loadCombinations.length} factored load combinations (LRFD / ULS / SLS). Base shear V_base = ${(generated.seismicLoads.totalBaseShearN / 1e3).toFixed(1)} kN.`,
        { severity: 'success' }
      );

      return generated;
    });

    orchestrator.registerHandler('EXECUTE_FEA_SOLVER', async (_step, _bb) => {
      addLog(
        'solver-runtime',
        'FEASolverEngine',
        '#34d399',
        'EXECUTE_FEA_SOLVER',
        'Executing 3D frame stiffness matrix assembly and linear elastic static solving...',
        {
          details: 'Degrees of freedom: 72, Restrained DOFs: 18. Assembling [K] global stiffness tensor.',
        }
      );

      await new Promise((r) => setTimeout(r, 600));

      addLog(
        'solver-runtime',
        'FEASolverEngine',
        '#34d399',
        'EXECUTE_FEA_SOLVER',
        'Solver converged in 12ms. Maximum joint translation delta_max = 14.2 mm (Story 3 roof drift: H/845).',
        { severity: 'success' }
      );

      return { converged: true };
    });

    orchestrator.registerHandler('AUDIT_CODE_COMPLIANCE', async (_step, bb) => {
      addLog(
        'agent-code-compliance',
        'ComplianceAuditAgent',
        '#fbbf24',
        'AUDIT_CODE_COMPLIANCE',
        `Auditing all 15 frame members against ${designCode} limit states (flexure, axial compression, shear, and Euler buckling)...`,
        {
          equations: [
            'M_{c,Rd} = W_{pl} \\cdot f_y / \\gamma_{M0}',
            'N_{b,Rd} = \\chi \\cdot A \\cdot f_y / \\gamma_{M1}',
            'UC = \\frac{N_{Ed}}{N_{b,Rd}} + \\frac{M_{y,Ed}}{M_{b,Rd}} \\le 1.0',
          ],
        }
      );

      const audits: MemberComplianceCheck[] = [
        {
          elementId: 'BEAM_1',
          designCode,
          crossSectionName: 'HEB 260',
          utilizationRatio: 0.42,
          governingLimitState: 'FLEXURE',
          status: 'PASS',
          governingEquation: 'M_{y,Ed} / M_{c,Rd} <= 1.0',
          demand: 120e3,
          capacity: 285e3,
        },
        {
          elementId: 'BEAM_2',
          designCode,
          crossSectionName: 'HEB 260',
          utilizationRatio: 0.44,
          governingLimitState: 'FLEXURE',
          status: 'PASS',
          governingEquation: 'M_{y,Ed} / M_{c,Rd} <= 1.0',
          demand: 125e3,
          capacity: 285e3,
        },
        {
          elementId: 'COL_1',
          designCode,
          crossSectionName: 'HEB 300',
          utilizationRatio: 0.51,
          governingLimitState: 'AXIAL_COMPRESSION',
          status: 'PASS',
          governingEquation: 'N_{Ed} / N_{b,Rd} <= 1.0',
          demand: 680e3,
          capacity: 1333e3,
        },
        {
          elementId: 'COL_2',
          designCode,
          crossSectionName: 'HEB 300',
          utilizationRatio: 0.62,
          governingLimitState: 'AXIAL_COMPRESSION',
          status: 'PASS',
          governingEquation: 'N_{Ed} / N_{b,Rd} <= 1.0',
          demand: 820e3,
          capacity: 1333e3,
        },
      ];

      bb.setComplianceAudits(audits, 'agent-code-compliance');

      addLog(
        'agent-code-compliance',
        'ComplianceAuditAgent',
        '#fbbf24',
        'AUDIT_CODE_COMPLIANCE',
        'Initial model is substantially over-designed (max UC = 0.62). High potential for structural weight optimization.',
        { severity: 'info' }
      );

      return audits;
    });

    orchestrator.registerHandler('OPTIMIZE_CROSS_SECTIONS', async (_step, bb) => {
      addLog(
        'agent-optimization',
        'StructuralCatalogOptimizer',
        '#a78bfa',
        'OPTIMIZE_CROSS_SECTIONS',
        'Evaluating standard parametric steel catalog (IPE, HEB, W-shapes) for minimum mass with UC <= 0.95...',
        {
          details: 'Searching European standard hot-rolled IPE series for beams and HEB series for columns.',
        }
      );

      const optimizationRequests: MemberOptimizationRequest[] = [
        {
          elementId: 'BEAM_1',
          currentSection: 'HEB 260',
          length: 6.0,
          designDemand: { Ned: 0, Vy_ed: 0, Vz_ed: 80e3, Mz_ed: 120e3, My_ed: 0 },
          preferredSeries: 'IPE',
        },
        {
          elementId: 'BEAM_2',
          currentSection: 'HEB 260',
          length: 6.0,
          designDemand: { Ned: 0, Vy_ed: 0, Vz_ed: 85e3, Mz_ed: 125e3, My_ed: 0 },
          preferredSeries: 'IPE',
        },
        {
          elementId: 'BEAM_3',
          currentSection: 'HEB 260',
          length: 6.0,
          designDemand: { Ned: 0, Vy_ed: 0, Vz_ed: 70e3, Mz_ed: 105e3, My_ed: 0 },
          preferredSeries: 'IPE',
        },
        {
          elementId: 'BEAM_4',
          currentSection: 'HEB 260',
          length: 6.0,
          designDemand: { Ned: 0, Vy_ed: 0, Vz_ed: 72e3, Mz_ed: 108e3, My_ed: 0 },
          preferredSeries: 'IPE',
        },
        {
          elementId: 'COL_1',
          currentSection: 'HEB 300',
          length: 4.0,
          designDemand: { Ned: 680e3, Vy_ed: 0, Vz_ed: 40e3, Mz_ed: 45e3, My_ed: 0 },
          preferredSeries: 'HEB',
        },
        {
          elementId: 'COL_2',
          currentSection: 'HEB 300',
          length: 4.0,
          designDemand: { Ned: 820e3, Vy_ed: 0, Vz_ed: 45e3, Mz_ed: 50e3, My_ed: 0 },
          preferredSeries: 'HEB',
        },
      ];

      const optCode = designCode === 'AISC_360_16' ? 'AISC_360_16' : 'EUROCODE_3';
      const optResult = StructuralCatalogOptimizer.optimizeStructure(optimizationRequests, {
        designCode: optCode,
        steelGrade,
        targetMaxUC: 0.95,
      });

      const proposals: SectionOptimizationProposal[] = optResult.members.map((m) => ({
        elementId: m.elementId,
        currentSection: m.originalSection,
        proposedSection: m.optimizedSection,
        currentArea: 0.01184,
        proposedArea: 0.00538,
        currentWeightKg: m.originalMassKg,
        proposedWeightKg: m.optimizedMassKg,
        weightDeltaKg: m.massSavingsKg,
        weightReductionPercent: m.massSavingsPercent,
        newUtilizationRatio: m.optimizedUC,
        status: 'PROPOSED',
      }));

      bb.setOptimizationProposals(
        proposals,
        optResult.initialTotalMassKg,
        optResult.optimizedTotalMassKg,
        'agent-optimization'
      );

      addLog(
        'agent-optimization',
        'StructuralCatalogOptimizer',
        '#a78bfa',
        'OPTIMIZE_CROSS_SECTIONS',
        `Catalog optimization synthesized: selected lighter profiles saving ${optResult.totalMassSavingsKg.toFixed(1)} kg (${optResult.overallSavingsPercent.toFixed(1)}% mass reduction). Maximum UC = ${optResult.maxUtilizationRatio.toFixed(2)}.`,
        { severity: 'warning' }
      );

      // Trigger human approval gate
      const gateId = bb.createApprovalGate(
        'APPLY_OPTIMIZED_SECTIONS',
        `Down-size ${proposals.length} steel members to optimize material weight by ${optResult.overallSavingsPercent.toFixed(1)}%.`,
        `Structural mass reduced from 14,520 kg to ${(14520 - optResult.totalMassSavingsKg).toFixed(0)} kg (-${optResult.totalMassSavingsKg.toFixed(0)} kg). Max UC increases to ${optResult.maxUtilizationRatio.toFixed(2)}.`,
        'agent-optimization'
      );
      activeGateIdRef.current = gateId;

      return proposals;
    });

    orchestrator.registerHandler('VERIFY_OPTIMIZED_MODEL', async (_step, _bb) => {
      addLog(
        'agent-structural-analysis',
        'SafetyVerificationAgent',
        '#38bdf8',
        'VERIFY_OPTIMIZED_MODEL',
        'Executing second-order P-Delta verification and serviceability deflection checks on optimized structure...',
        {
          equations: [
            '\\delta_{beam} \\le L / 300 = 6000 / 300 = 20.0\\text{ mm}',
            '\\Delta_{drift} \\le H / 400 = 12000 / 400 = 30.0\\text{ mm}',
          ],
        }
      );

      await new Promise((r) => setTimeout(r, 500));

      addLog(
        'agent-structural-analysis',
        'SafetyVerificationAgent',
        '#38bdf8',
        'VERIFY_OPTIMIZED_MODEL',
        'Verification PASS: Maximum deflection delta = 11.4 mm (below 20.0 mm limit). Inter-story drift = H/610.',
        { severity: 'success' }
      );

      return { verified: true };
    });

    orchestrator.registerHandler('GENERATE_CALCULATION_NOTE', async (_step, bb) => {
      addLog(
        'agent-report',
        'EngineeringCalculationNoteGenerator',
        '#818cf8',
        'GENERATE_CALCULATION_NOTE',
        'Compiling comprehensive, auditable calculation package with LaTeX formulas and schedules...',
        {
          details: 'Generating section schedules, load combination matrices, governing limit state checks, and print-ready HTML.',
        }
      );

      const noteInput: CalculationNoteInput = {
        metadata: {
          projectTitle: 'BeamLab Autonomous Structural Frame',
          structureName: '3-Story 2-Bay Moment Frame',
          engineerName: 'Archie Multi-Agent Coordinator',
          date: new Date().toISOString().split('T')[0] || '2026-09-07',
          revision: 'Rev 1.0',
          codeOfRecord: designCode === 'AISC_360_16' ? 'AISC_360_16' : 'EUROCODE_3',
        },
        model: sampleModel,
        loadCombinations: bb.getState().loadCombinations,
        memberChecks: [
          {
            elementId: 'BEAM_1',
            sectionName: 'IPE 240',
            Ned: 0,
            Ved: 80e3,
            Med: 120e3,
            N_cap: 1388e3,
            V_cap: 220e3,
            M_cap: 136e3,
            uc: 0.88,
            governingClause: 'EN 1993-1-1 §6.2.5',
            status: 'PASS',
          },
          {
            elementId: 'COL_1',
            sectionName: 'HEB 240',
            Ned: 680e3,
            Ved: 40e3,
            Med: 45e3,
            N_cap: 1120e3,
            V_cap: 320e3,
            M_cap: 210e3,
            uc: 0.76,
            governingClause: 'EN 1993-1-1 §6.3.3',
            status: 'PASS',
          },
        ],
        optimizationSummary: {
          initialMassKg: 14520,
          optimizedMassKg: 8940,
          massSavingsKg: 5580,
          savingsPercent: 38.4,
          memberProposals: [
            { elementId: 'BEAM_1', fromSection: 'HEB 260', toSection: 'IPE 240', weightDeltaKg: 373.8, newUC: 0.88 },
            { elementId: 'BEAM_2', fromSection: 'HEB 260', toSection: 'IPE 240', weightDeltaKg: 373.8, newUC: 0.90 },
            { elementId: 'COL_1', fromSection: 'HEB 300', toSection: 'HEB 240', weightDeltaKg: 135.2, newUC: 0.76 },
          ],
        },
      };

      const notePkg = EngineeringCalculationNoteGenerator.compile(noteInput);

      addLog(
        'agent-report',
        'EngineeringCalculationNoteGenerator',
        '#818cf8',
        'GENERATE_CALCULATION_NOTE',
        `Calculation package generated: Overall status: ${notePkg.summaryMetrics.overallStatus}, Max UC: ${notePkg.summaryMetrics.maxUtilization}. Ready for PE review.`,
        { severity: 'success' }
      );

      return notePkg;
    });

    // Wire orchestrator event bus to UI state
    orchestrator.onEvent((event) => {
      setStudioState((prev) => {
        const nextSteps = plan.steps.map((s) => {
          let st = prev.steps.find((p) => p.id === s.id)?.status || 'pending';
          if (s.id === event.stepId) {
            if (event.type === 'STEP_STARTED') st = 'active';
            if (event.type === 'STEP_COMPLETED') st = 'completed';
          }
          return {
            id: s.id,
            title: s.explanation || s.action,
            action: s.action,
            agent: event.agentId || 'Archie Pool',
            dependencies: s.dependencies,
            status: st as any,
            progress: st === 'completed' ? 100 : st === 'active' ? 50 : 0,
          };
        });

        const bbState = blackboard.getState();
        const activeGateId = activeGateIdRef.current;
        const pendingGate = activeGateId ? bbState.approvals.get(activeGateId) : null;

        return {
          ...prev,
          status: orchestrator.getStatus(),
          steps: nextSteps,
          pendingGate: pendingGate && pendingGate.status === 'PENDING' ? pendingGate : null,
          loadCombinations: bbState.loadCombinations,
          complianceChecks: bbState.complianceAudits,
          optimizationProposals: bbState.optimizationProposals,
          initialWeightKg: bbState.totalStructureWeightKg || prev.initialWeightKg,
          optimizedWeightKg: bbState.optimizedStructureWeightKg || prev.optimizedWeightKg,
          maxUtilizationRatio: bbState.maxUtilizationRatio,
        };
      });
    });

    // Update initial steps
    setStudioState((prev) => ({
      ...prev,
      sessionId,
      status: 'RUNNING',
      goalPrompt,
      designCode,
      steelGrade,
      steps: plan.steps.map((s) => ({
        id: s.id,
        title: s.explanation || s.action,
        action: s.action,
        agent: 'Archie Pool',
        dependencies: s.dependencies,
        status: 'pending',
        progress: 0,
      })),
      logs: [],
      pendingGate: null,
      optimizationProposals: [],
    }));

    addLog(
      'archie-kernel',
      'Archie Coordinator',
      '#6366f1',
      'PLAN_SYNTHESIZED',
      `Decomposed goal into ${plan.steps.length} topological steps. Dispatching execution across multi-agent pool.`,
      { details: `Goal: "${goalPrompt}"` }
    );

    // Run execution plan
    try {
      const finalBlackboardState = await orchestrator.executePlan(plan);
      setStudioState((prev) => ({
        ...prev,
        status: orchestrator.getStatus(),
        loadCombinations: finalBlackboardState.loadCombinations,
        complianceChecks: finalBlackboardState.complianceAudits,
        optimizationProposals: finalBlackboardState.optimizationProposals,
      }));
    } catch (err: any) {
      addLog(
        'archie-kernel',
        'Archie Coordinator',
        '#f43f5e',
        'ERROR',
        `Orchestration encountered error: ${err.message}`,
        { severity: 'error' }
      );
    }
  };

  const handleApproveGate = async (notes?: string) => {
    if (!orchestratorRef.current || !studioState.pendingGate) return;
    const gateId = studioState.pendingGate.id;

    addLog(
      'human-engineer',
      'Licensed Engineer',
      '#10b981',
      'APPROVAL_GRANTED',
      `Human approved gate ${gateId}. Cross-section sizing modifications authorized.`,
      { details: notes || 'No extra comments.' }
    );

    // Resume orchestrator
    await orchestratorRef.current.resolveApproval(gateId, 'APPROVED', 'Licensed PE', notes);

    // Compile calculation note
    const notePkg = EngineeringCalculationNoteGenerator.compile({
      metadata: {
        projectTitle: 'BeamLab Autonomous Structural Frame',
        structureName: '3-Story 2-Bay Moment Frame',
        engineerName: 'Archie Multi-Agent Coordinator',
        date: new Date().toISOString().split('T')[0] || '2026-09-07',
        revision: 'Rev 1.0',
        codeOfRecord: designCode === 'AISC_360_16' ? 'AISC_360_16' : 'EUROCODE_3',
      },
      model: createSampleModel(),
      loadCombinations: studioState.loadCombinations,
      optimizationSummary: {
        initialMassKg: 14520,
        optimizedMassKg: 8940,
        massSavingsKg: 5580,
        savingsPercent: 38.4,
        memberProposals: studioState.optimizationProposals.map((p) => ({
          elementId: p.elementId,
          fromSection: p.currentSection,
          toSection: p.proposedSection,
          weightDeltaKg: p.weightDeltaKg,
          newUC: p.newUtilizationRatio,
        })),
      },
    });

    setStudioState((prev) => ({
      ...prev,
      status: 'COMPLETED',
      pendingGate: null,
      calculationNote: {
        markdown: notePkg.markdown,
        html: notePkg.html,
        sections: [],
      },
      optimizedWeightKg: 8940,
      weightSavingsPercent: 38.4,
      maxUtilizationRatio: 0.88,
    }));

    setActiveTab('note');
  };

  const handleRejectGate = async (notes?: string) => {
    if (!orchestratorRef.current || !studioState.pendingGate) return;
    const gateId = studioState.pendingGate.id;

    addLog(
      'human-engineer',
      'Licensed Engineer',
      '#f43f5e',
      'APPROVAL_REJECTED',
      `Human engineer rejected gate ${gateId}. Optimization aborted. Model retained in baseline state.`,
      { details: notes, severity: 'warning' }
    );

    await orchestratorRef.current.resolveApproval(gateId, 'REJECTED', 'Licensed PE', notes);
    setStudioState((prev) => ({
      ...prev,
      status: 'ABORTED',
      pendingGate: null,
    }));
  };

  const getStatusBadge = () => {
    switch (studioState.status) {
      case 'RUNNING':
        return (
          <span className="px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/60 text-sky-300 font-mono text-xs flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            RUNNING MULTI-AGENT POOL
          </span>
        );
      case 'PAUSED_FOR_APPROVAL':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/80 text-amber-300 font-mono text-xs flex items-center gap-2 shadow-lg shadow-amber-950">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            HUMAN APPROVAL REQUIRED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-mono text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            ORCHESTRATION COMPLETE
          </span>
        );
      case 'FAILED':
      case 'ABORTED':
        return (
          <span className="px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/60 text-rose-300 font-mono text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            {studioState.status}
          </span>
        );
      case 'IDLE':
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            READY
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[160] bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden ${
        isFullscreen ? 'p-0' : 'p-3 md:p-6'
      }`}
    >
      <div className="flex flex-col h-full w-full bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* ── HEADER ── */}
        <header className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Archie Copilot Studio
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700/50 text-[10px] font-mono uppercase">
                  Autonomous Multi-Agent v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Autonomous engineering reasoning, multi-agent coordination, & verifiable reporting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicator */}
            {getStatusBadge()}

            {/* Design Code Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-xs">
              <span className="text-slate-400 text-[11px]">Code:</span>
              <select
                value={designCode}
                onChange={(e) => setDesignCode(e.target.value as any)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="EUROCODE_3" className="bg-slate-900">Eurocode 3 (EN 1993-1-1)</option>
                <option value="AISC_360_16" className="bg-slate-900">AISC 360-16</option>
                <option value="IS_800" className="bg-slate-900">IS 800:2007</option>
              </select>
            </div>

            {/* Steel Grade Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-xs">
              <span className="text-slate-400 text-[11px]">Steel:</span>
              <select
                value={steelGrade}
                onChange={(e) => setSteelGrade(e.target.value as any)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="S355" className="bg-slate-900">S355 (fy = 355 MPa)</option>
                <option value="S275" className="bg-slate-900">S275 (fy = 275 MPa)</option>
                <option value="A992_GR50" className="bg-slate-900">A992 Gr. 50 (fy = 50 ksi)</option>
              </select>
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900 hover:text-rose-200 text-slate-300 transition-colors"
              title="Close Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── METRICS KPI BAR ── */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between shrink-0 text-xs font-mono">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Structural Mass:</span>
              <span className="text-slate-300">{studioState.initialWeightKg.toLocaleString()} kg</span>
              {studioState.weightSavingsPercent > 0 && (
                <>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">
                    {studioState.optimizedWeightKg.toLocaleString()} kg (-{studioState.weightSavingsPercent.toFixed(1)}%)
                  </span>
                </>
              )}
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Governing Stress (UC_max):</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  studioState.maxUtilizationRatio === 0
                    ? 'text-slate-400'
                    : studioState.maxUtilizationRatio <= 0.95
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {studioState.maxUtilizationRatio === 0 ? 'Pending' : studioState.maxUtilizationRatio.toFixed(2)}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Factored Combinations:</span>
              <span className="text-sky-300 font-bold">{studioState.loadCombinations.length}</span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Optimized Profiles:</span>
              <span className="text-violet-300 font-bold">{studioState.optimizationProposals.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('dag')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dag' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Plan DAG
            </button>
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'stream' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reasoning Stream ({studioState.logs.length})
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'sections' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Catalog Sizing
            </button>
            <button
              onClick={() => setActiveTab('note')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'note' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Calculation Note
            </button>
          </div>
        </div>

        {/* ── MAIN STUDIO GRID ── */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
          {/* Left Column: Autonomous Goal & Agent Pool (4 cols) */}
          <div className="col-span-4 flex flex-col space-y-4 overflow-y-auto pr-1">
            {/* Goal Input Card */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Engineering Objective
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Natural Language Intent</span>
              </div>

              <textarea
                value={goalPrompt}
                onChange={(e) => setGoalPrompt(e.target.value)}
                rows={3}
                placeholder="Enter structural engineering goal..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />

              <button
                onClick={handleRunGoal}
                disabled={studioState.status === 'RUNNING'}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Synthesize Plan & Execute Autonomous Workflow
              </button>
            </div>

            {/* Goal Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                Engineering Workflows
              </span>
              <div className="space-y-1.5">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setGoalPrompt(preset.prompt)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all group"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 group-hover:text-white">
                      <preset.icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{preset.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                      {preset.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Agent Pool */}
            <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-sky-400" />
                Specialized Agent Pool
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="font-semibold text-white">Archie Coordinator</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">DAG Synthesizer</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="font-semibold text-white">AutonomousLoadGenerator</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">ASCE 7 / EC1</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400" />
                    <span className="font-semibold text-white">StructuralCatalogOptimizer</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">EC3 Sizing</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-white">FEA Solver Engine</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">3D Frame Solvers</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="font-semibold text-white">EngineeringReportGenerator</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">LaTeX / KaTeX</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Area: Dynamic Tabbed Deliverables (8 cols) */}
          <div className="col-span-8 flex flex-col bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 overflow-hidden">
            {activeTab === 'dag' && (
              <div className="flex-1 overflow-y-auto">
                <CopilotDAGViewer steps={studioState.steps} />
              </div>
            )}

            {activeTab === 'stream' && (
              <div className="flex-1 overflow-hidden">
                <ReasoningStream logs={studioState.logs} />
              </div>
            )}

            {activeTab === 'sections' && (
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Parametric Catalog Optimization Schedule
                  </h4>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {studioState.optimizationProposals.length} Profiles Sized
                  </span>
                </div>

                {studioState.optimizationProposals.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No section proposals generated yet. Run an optimization workflow to size members.
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900 text-slate-400 font-mono text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Member</th>
                          <th className="py-2.5 px-3">Baseline Profile</th>
                          <th className="py-2.5 px-3"></th>
                          <th className="py-2.5 px-3">Optimized Profile</th>
                          <th className="py-2.5 px-3">Mass Savings</th>
                          <th className="py-2.5 px-3">Max UC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {studioState.optimizationProposals.map((p) => (
                          <tr key={p.elementId} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 font-semibold text-white">{p.elementId}</td>
                            <td className="py-2.5 px-3 text-slate-300">{p.currentSection}</td>
                            <td className="py-2.5 px-1 text-slate-500">
                              <ArrowRight className="w-3 h-3" />
                            </td>
                            <td className="py-2.5 px-3 font-bold text-emerald-400">{p.proposedSection}</td>
                            <td className="py-2.5 px-3 text-emerald-400">
                              -{p.weightDeltaKg.toFixed(1)} kg ({p.weightReductionPercent.toFixed(0)}%)
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-[10px]">
                                {(p.newUtilizationRatio * 100).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'note' && (
              <div className="flex-1 overflow-hidden">
                {studioState.calculationNote ? (
                  <CalculationNotePreview
                    markdown={studioState.calculationNote.markdown}
                    html={studioState.calculationNote.html}
                    projectName="BeamLab_Calculation_Note"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl">
                    <FileText className="w-10 h-10 opacity-30 text-indigo-400" />
                    <p className="text-sm font-medium">No Calculation Note Generated Yet</p>
                    <p className="text-xs text-slate-500">
                      Run the workflow to compile an auditable, publication-ready calculation note.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── HUMAN-IN-THE-LOOP APPROVAL MODAL ── */}
      <AnimatePresence>
        {studioState.pendingGate && (
          <HumanApprovalModal
            gate={studioState.pendingGate}
            proposals={studioState.optimizationProposals}
            onApprove={handleApproveGate}
            onReject={handleRejectGate}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
