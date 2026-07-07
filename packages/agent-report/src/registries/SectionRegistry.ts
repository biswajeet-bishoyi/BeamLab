export interface ISectionProvider {
  id: string;
  name: string;
  generateSection(context: any, evidence: any[]): Promise<any>;
}

export class SectionRegistry {
  private sections: Map<string, ISectionProvider> = new Map();

  public register(section: ISectionProvider): void {
    this.sections.set(section.id, section);
  }

  public get(id: string): ISectionProvider | undefined {
    return this.sections.get(id);
  }

  public list(): ISectionProvider[] {
    return Array.from(this.sections.values());
  }
}
