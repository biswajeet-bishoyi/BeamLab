export interface ITemplateProvider {
  id: string;
  name: string;
  version: string;
  // Transforms ReportModel -> DocumentModel
  applyTemplate(reportModel: any): any; 
}

export class TemplateRegistry {
  private templates: Map<string, ITemplateProvider> = new Map();

  public register(template: ITemplateProvider): void {
    this.templates.set(template.id, template);
  }

  public get(id: string): ITemplateProvider | undefined {
    return this.templates.get(id);
  }

  public list(): ITemplateProvider[] {
    return Array.from(this.templates.values());
  }
}
