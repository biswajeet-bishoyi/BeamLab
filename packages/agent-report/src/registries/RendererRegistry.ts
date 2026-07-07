export interface IRendererProvider {
  id: string;
  format: 'Markdown' | 'HTML' | 'PDF' | 'DOCX' | 'JSON';
  render(documentModel: any): Promise<string | Buffer>;
}

export class RendererRegistry {
  private renderers: Map<string, IRendererProvider> = new Map();

  public register(renderer: IRendererProvider): void {
    this.renderers.set(renderer.id, renderer);
  }

  public get(id: string): IRendererProvider | undefined {
    return this.renderers.get(id);
  }

  public list(): IRendererProvider[] {
    return Array.from(this.renderers.values());
  }
}
