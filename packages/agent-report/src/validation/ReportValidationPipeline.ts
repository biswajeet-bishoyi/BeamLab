import { LivingReport } from '../models';
import { EvidenceRegistry, CitationRegistry } from '../registries';

export class ReportValidationPipeline {
  constructor(
    private evidenceRegistry: EvidenceRegistry,
    private citationRegistry: CitationRegistry
  ) {}

  public validate(report: LivingReport): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Evidence Complete?
    const evidence = this.evidenceRegistry.getEvidenceForReport(report.id);
    if (!evidence || evidence.length === 0) {
      errors.push('No evidence collected for report');
    }

    // 2. Missing References?
    // Check if sections have citations
    const docModel = report.documentModel;
    const hasCitations = docModel.blocks.some(b => b.citations && b.citations.length > 0);
    if (!hasCitations) {
      errors.push('Report lacks citations/references');
    }

    // 3. Broken Citations?
    const graph = this.citationRegistry.getGraph(report.id);
    if (graph) {
      docModel.blocks.forEach(block => {
        if (block.citations) {
          block.citations.forEach(cit => {
            if (!graph.nodes.find(n => n.id === cit)) {
              errors.push(`Broken citation reference: ${cit}`);
            }
          });
        }
      });
    }

    // 4. Template Valid?
    if (!docModel.templateId) {
      errors.push('Document model lacks template ID');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
