import { IEngineeringPipeline, ExecutionContext } from '@beamlab/agent-framework';
import { OptimizationSession } from '../models';
import { ObjectiveManager } from '../objectives/ObjectiveManager';
import { ConstraintManager } from '../constraints/ConstraintManager';
import { CandidateGenerator } from '../candidates/CandidateGenerator';
import { AlternativeEvaluator } from '../evaluation/AlternativeEvaluator';
import { TradeOffAnalyzer } from '../tradeoffs/TradeOffAnalyzer';
import { OptimizationReasoningStrategy } from '../intelligence/OptimizationReasoningStrategy';
import { OptimizationRecommendationEngine } from '../recommendations/OptimizationRecommendationEngine';
import { OptimizationNarrativeBuilder } from '../narrative/OptimizationNarrativeBuilder';

export class OptimizationPipeline implements IEngineeringPipeline {
  private objectiveManager = new ObjectiveManager();
  private constraintManager = new ConstraintManager();
  private candidateGenerator = new CandidateGenerator();
  private alternativeEvaluator = new AlternativeEvaluator();
  private tradeOffAnalyzer = new TradeOffAnalyzer();
  private reasoningStrategy = new OptimizationReasoningStrategy();
  private recommendationEngine = new OptimizationRecommendationEngine();
  private narrativeBuilder = new OptimizationNarrativeBuilder();

  public async execute(request: any, context: ExecutionContext): Promise<any> {
    console.log('[OptimizationPipeline] Starting Optimization Pipeline...');
    
    // Create new session per request (CTO Addition)
    const session: OptimizationSession = {
      sessionId: `opt-${Date.now()}`,
      status: 'started',
      objectives: [],
      constraints: [],
      candidates: [],
      tradeOffs: [],
      recommendations: [],
      metrics: {}
    };

    const executionContext = await this.collectContext(request, context);
    const knowledge = await this.retrieveKnowledge(executionContext);
    const policy = await this.evaluatePolicy(executionContext, knowledge);
    const resources = await this.resolveResources(executionContext);
    
    const plan = await this.plan(executionContext, knowledge, policy, resources, session);
    const executionResult = await this.executeDiscipline(plan, session);
    const reasoning = await this.reason(executionResult, session);
    const recommendations = await this.recommend(reasoning, session);
    const narrative = await this.generateNarrative(reasoning, recommendations, session);
    
    session.status = 'completed';
    return this.createResponse({ session, narrative, reasoning, recommendations, executionResult });
  }

  public async collectContext(request: any, context: ExecutionContext): Promise<any> {
    return { request, context };
  }

  public async retrieveKnowledge(context: any): Promise<any> {
    return { standard: 'AISC 360-16' };
  }

  public async evaluatePolicy(context: any, knowledge: any): Promise<any> {
    return { optimizationAllowed: true };
  }

  public async resolveResources(context: any): Promise<any> {
    return { availableSections: ['W-Shapes', 'HSS'] };
  }

  public async plan(context: any, knowledge: any, policy: any, resources: any, session: OptimizationSession): Promise<any> {
    session.status = 'planning';
    
    this.objectiveManager.addObjective({ id: 'obj-1', name: 'Weight Reduction', description: 'Minimize steel weight', weight: 0.8 });
    this.constraintManager.addConstraint({ id: 'con-1', type: 'Policy', description: 'Must satisfy AISC 360-16', isSatisfied: true });

    session.objectives = this.objectiveManager.getObjectives();
    session.constraints = this.constraintManager.getConstraints();

    return { objectives: session.objectives, constraints: session.constraints };
  }

  public async executeDiscipline(plan: any, session: OptimizationSession): Promise<any> {
    session.status = 'generating';
    const candidates = this.candidateGenerator.generate({}, plan.objectives, plan.constraints);
    session.candidates.push(...candidates);

    session.status = 'evaluating';
    for (const candidate of candidates) {
      await this.alternativeEvaluator.evaluate(candidate);
    }

    const tradeOffs = this.tradeOffAnalyzer.analyze(candidates);
    session.tradeOffs.push(...tradeOffs);
    
    return { candidates, tradeOffs };
  }

  public async reason(executionResult: any, session: OptimizationSession): Promise<any> {
    await this.reasoningStrategy.analyze({}, { session, executionResult });
    await this.reasoningStrategy.reason();
    const confidence = await this.reasoningStrategy.confidence();
    const justification = await this.reasoningStrategy.justify();
    return { confidence, justification };
  }

  public async recommend(reasoning: any, session: OptimizationSession): Promise<any> {
    const recommendations = this.recommendationEngine.generate(session, reasoning);
    session.recommendations.push(...recommendations);
    if (recommendations.length > 0) {
      session.selectedSolutionId = recommendations[0].candidateId;
    }
    return recommendations;
  }

  public async generateNarrative(reasoning: any, recommendations: any, session: OptimizationSession): Promise<any> {
    return this.narrativeBuilder.build(session, recommendations);
  }

  public async createResponse(data: any): Promise<any> {
    return {
      status: 'success',
      data
    };
  }
}
