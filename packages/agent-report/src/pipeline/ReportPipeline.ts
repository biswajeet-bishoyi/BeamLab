import { IEngineeringPipeline } from '@beamlab/agent-framework';
import { EvidenceCollector } from '../collection/EvidenceCollector';
import { TemplateEngine } from '../assembly/TemplateEngine';
import { ReportValidationPipeline } from '../validation/ReportValidationPipeline';
import { ReportReasoningStrategy } from '../intelligence/ReportReasoningStrategy';
import { LivingReport, ReportModel, DocumentModel } from '../models';
import { RendererRegistry } from '../registries';

export class ReportPipeline implements IEngineeringPipeline {
  constructor(
    private evidenceCollector: EvidenceCollector,
    private templateEngine: TemplateEngine,
    private validationPipeline: ReportValidationPipeline,
    private reasoningStrategy: ReportReasoningStrategy,
    private rendererRegistry: RendererRegistry
  ) {}

  public async execute(request: any, context: any): Promise<any> {
    const executionContext = await this.collectContext(request, context);
    const knowledge = await this.retrieveKnowledge(executionContext);
    const policy = await this.evaluatePolicy(executionContext, knowledge);
    const resources = await this.resolveResources(executionContext);
    
    const plan = await this.plan(executionContext, knowledge, policy, resources);
    const executionResult = await this.executeDiscipline(plan);
    const reasoning = await this.reason(executionResult);
    const recommendations = await this.recommend(reasoning);
    const narrative = await this.generateNarrative(reasoning, recommendations);
    
    return this.createResponse({ executionResult, reasoning, recommendations, narrative });
  }

  public async collectContext(request: any, context: any): Promise<any> {
    return { reportId: request.reportId || `rep-${Date.now()}`, templateId: request.templateId, format: request.format || 'Markdown' };
  }

  public async retrieveKnowledge(context: any): Promise<any> { return {}; }
  public async evaluatePolicy(context: any, knowledge: any): Promise<any> { return {}; }
  public async resolveResources(context: any): Promise<any> { return {}; }

  public async plan(context: any, knowledge: any, policy: any, resources: any): Promise<any> {
    const evidence = this.evidenceCollector.collect(context.reportId);
    
    const reportModel: ReportModel = {
      id: context.reportId,
      metadata: { generatedAt: new Date().toISOString() },
      sections: [] // In reality, assemble sections from SectionRegistry
    };

    return { reportId: context.reportId, reportModel, templateId: context.templateId, format: context.format };
  }

  public async executeDiscipline(plan: any): Promise<any> {
    // Report Model -> Document Model
    const documentModel = this.templateEngine.applyTemplate(plan.reportModel, plan.templateId);
    
    const livingReport: LivingReport = {
      id: plan.reportId,
      status: 'Draft',
      reportModel: plan.reportModel,
      documentModel
    };

    const validation = this.validationPipeline.validate(livingReport);
    if (!validation.valid) {
      // Normally throw or handle, but for now just attach
      livingReport.status = 'Review';
    }

    // Document Model -> Render
    const renderer = this.rendererRegistry.get(plan.format.toLowerCase() + '-renderer');
    let output = '';
    if (renderer) {
      output = await renderer.render(documentModel) as string;
    }

    return { livingReport, output, validation };
  }

  public async reason(executionResult: any): Promise<any> {
    await this.reasoningStrategy.analyze({}, { report: executionResult.livingReport });
    await this.reasoningStrategy.reason();
    return { confidence: await this.reasoningStrategy.confidence() };
  }

  public async recommend(reasoning: any): Promise<any> {
    return this.reasoningStrategy.recommend();
  }

  public async generateNarrative(reasoning: any, recommendations: any): Promise<any> {
    return this.reasoningStrategy.explain();
  }

  public createResponse(data: any): any {
    return {
      status: 'success',
      data
    };
  }
}
