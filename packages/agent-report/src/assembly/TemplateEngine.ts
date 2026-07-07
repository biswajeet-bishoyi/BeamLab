import { ReportModel, DocumentModel, DocumentBlock } from '../models';
import { TemplateRegistry, ITemplateProvider } from '../registries';

export class TemplateEngine {
  constructor(private templateRegistry: TemplateRegistry) {}

  public applyTemplate(reportModel: ReportModel, templateId: string): DocumentModel {
    const template = this.templateRegistry.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Transform ReportModel to DocumentModel
    return template.applyTemplate(reportModel);
  }
}
