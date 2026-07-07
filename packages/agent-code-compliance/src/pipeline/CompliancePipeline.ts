import { IEngineeringPipeline, ExecutionContext } from '@beamlab/agent-framework';
import { ComplianceSession, ComplianceStatus } from '../models';
import { StandardRegistry } from '../standards/StandardRegistry';
import { ClauseRegistry } from '../clauses/ClauseRegistry';
import { ClauseInterpreter } from '../rules/ClauseInterpreter';
import { ComplianceRuleEngine } from '../rules/ComplianceRuleEngine';
import { ComplianceEvidenceEngine } from '../evidence/ComplianceEvidenceEngine';
import { ViolationDetector } from '../violations/ViolationDetector';
import { EngineeringReviewEngine } from '../review/EngineeringReviewEngine';
import { ComplianceReasoningStrategy } from '../intelligence/ComplianceReasoningStrategy';
import { ComplianceRecommendationEngine } from '../recommendations/ComplianceRecommendationEngine';
import { ComplianceNarrativeBuilder } from '../narrative/ComplianceNarrativeBuilder';
import { StaticProvider } from '../providers/StandardProvider';

export class CompliancePipeline implements IEngineeringPipeline {
  private standardRegistry = new StandardRegistry();
  private clauseRegistry = new ClauseRegistry();
  private clauseInterpreter = new ClauseInterpreter();
  private ruleEngine = new ComplianceRuleEngine();
  private evidenceEngine = new ComplianceEvidenceEngine();
  private violationDetector = new ViolationDetector();
  private reviewEngine = new EngineeringReviewEngine();
  private reasoningStrategy = new ComplianceReasoningStrategy();
  private recommendationEngine = new ComplianceRecommendationEngine();
  private narrativeBuilder = new ComplianceNarrativeBuilder();

  constructor() {
    // Register default static provider
    const staticProvider = new StaticProvider();
    this.standardRegistry.registerProvider(staticProvider);
    this.clauseRegistry.registerProvider(staticProvider);
  }

  public async execute(request: any, context: ExecutionContext): Promise<any> {
    console.log('[CompliancePipeline] Starting Compliance Pipeline...');
    
    const session: ComplianceSession = {
      sessionId: `comp-${Date.now()}`,
      status: 'started',
      standards: [],
      clauses: [],
      rules: [],
      evaluations: [],
      violations: [],
      evidenceGraph: { id: '', sessionId: '', nodes: [], edges: [] },
      overallStatus: ComplianceStatus.NotEvaluated
    };

    const executionContext = await this.collectContext(request, context);
    executionContext.session = session;
    
    const knowledge = await this.retrieveKnowledge(executionContext);
    const policy = await this.evaluatePolicy(executionContext, knowledge);
    const resources = await this.resolveResources(executionContext);
    
    const plan = await this.plan(executionContext, knowledge, policy, resources);
    const executionResult = await this.executeDiscipline(plan);
    const reasoning = await this.reason(executionResult);
    const recommendations = await this.recommend(reasoning);
    const narrative = await this.generateNarrative(reasoning, recommendations);
    
    session.status = 'completed';
    return this.createResponse({ session, narrative, reasoning, recommendations, executionResult });
  }

  public async collectContext(request: any, context: ExecutionContext): Promise<any> {
    return { request, context, inputs: request.inputs || {} };
  }

  public async retrieveKnowledge(context: any): Promise<any> {
    return { requestedStandard: context.request.standard || 'IS-800:2007' };
  }

  public async evaluatePolicy(context: any, knowledge: any): Promise<any> {
    return { strictMode: true };
  }

  public async resolveResources(context: any): Promise<any> {
    return {};
  }

  public async plan(context: any, knowledge: any, policy: any, resources: any): Promise<any> {
    const session: ComplianceSession = context.session;
    session.status = 'planning';
    
    // Resolve Standard
    const standard = await this.standardRegistry.resolveStandard(knowledge.requestedStandard);
    if (standard) {
      session.standards.push(standard);
      // Fetch Clauses
      const clauses = await this.clauseRegistry.fetchClausesForStandard(standard.id);
      session.clauses.push(...clauses);
      
      // Interpret Rules
      session.clauses.forEach(clause => {
        const rules = this.clauseInterpreter.interpret(clause);
        session.rules.push(...rules);
      });
    }

    return { session, inputs: context.inputs };
  }

  public async executeDiscipline(plan: any): Promise<any> {
    const session: ComplianceSession = plan.session;
    session.status = 'evaluating_rules';
    const inputs = plan.inputs || {};

    for (const rule of session.rules) {
      const evaluation = await this.ruleEngine.evaluate(rule, inputs);
      session.evaluations.push(evaluation);
    }

    session.status = 'detecting_violations';
    const violations = this.violationDetector.detect(session.evaluations, session.rules);
    session.violations.push(...violations);

    session.evidenceGraph = this.evidenceEngine.buildGraph(session.sessionId, session.evaluations);

    // Review Engine
    session.review = this.reviewEngine.generateReview(session.sessionId, session.violations);
    
    if (session.violations.some(v => v.severity === 'Error')) {
      session.overallStatus = ComplianceStatus.NonCompliant;
    } else if (session.violations.some(v => v.severity === 'Warning')) {
      session.overallStatus = ComplianceStatus.ConditionallyCompliant;
    } else if (session.evaluations.length > 0) {
      session.overallStatus = ComplianceStatus.Compliant;
    } else {
      session.overallStatus = ComplianceStatus.NotApplicable;
    }

    return { evaluations: session.evaluations, violations: session.violations, review: session.review, session };
  }

  public async reason(executionResult: any): Promise<any> {
    const session: ComplianceSession = executionResult.session;
    session.status = 'reasoning';
    await this.reasoningStrategy.analyze({}, { session, executionResult });
    await this.reasoningStrategy.reason();
    const confidence = await this.reasoningStrategy.confidence();
    const justification = await this.reasoningStrategy.justify();
    return { confidence, justification, session };
  }

  public async recommend(reasoning: any): Promise<any> {
    const session: ComplianceSession = reasoning.session;
    const recommendations = this.recommendationEngine.generate(session);
    return { recommendations, session };
  }

  public async generateNarrative(reasoning: any, recommendations: any): Promise<any> {
    const session: ComplianceSession = reasoning.session;
    return this.narrativeBuilder.build(session);
  }

  public async createResponse(data: any): Promise<any> {
    return {
      status: 'success',
      data
    };
  }
}
