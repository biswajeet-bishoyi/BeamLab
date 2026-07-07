import { describe, it, expect } from 'vitest';
import { ReportPipeline } from './ReportPipeline';
import { EvidenceCollector } from '../collection/EvidenceCollector';
import { TemplateEngine } from '../assembly/TemplateEngine';
import { ReportValidationPipeline } from '../validation/ReportValidationPipeline';
import { ReportReasoningStrategy } from '../intelligence/ReportReasoningStrategy';
import { EvidenceRegistry, TemplateRegistry, RendererRegistry, CitationRegistry } from '../registries';

describe('ReportPipeline', () => {
  it('should successfully execute the report pipeline', async () => {
    const evidenceRegistry = new EvidenceRegistry();
    const templateRegistry = new TemplateRegistry();
    const rendererRegistry = new RendererRegistry();
    const citationRegistry = new CitationRegistry();
    
    // Register mock template
    templateRegistry.register({
      id: 'mock-template',
      name: 'Mock',
      version: '1.0',
      applyTemplate: (reportModel) => ({
        id: reportModel.id,
        templateId: 'mock-template',
        title: 'Mock Report',
        blocks: [{ type: 'Paragraph', content: 'Mock Content' }]
      })
    });

    const pipeline = new ReportPipeline(
      new EvidenceCollector(evidenceRegistry),
      new TemplateEngine(templateRegistry),
      new ReportValidationPipeline(evidenceRegistry, citationRegistry),
      new ReportReasoningStrategy(),
      rendererRegistry
    );

    const result = await pipeline.execute({ reportId: 'rep-1', templateId: 'mock-template', format: 'Markdown' }, {});
    
    expect(result.status).toBe('success');
    expect(result.data.executionResult.livingReport.status).toBe('Review'); // Because evidence is empty, validation fails
    expect(result.data.reasoning.confidence.overall).toBe(0.95);
  });
});
