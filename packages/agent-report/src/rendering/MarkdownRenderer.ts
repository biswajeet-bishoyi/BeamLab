import { IRendererProvider } from '../registries';
import { DocumentModel } from '../models';

export class MarkdownRenderer implements IRendererProvider {
  public id = 'md-renderer';
  public format = 'Markdown' as const;

  public async render(documentModel: DocumentModel): Promise<string> {
    let md = `# ${documentModel.title}\n\n`;

    for (const block of documentModel.blocks) {
      switch (block.type) {
        case 'Heading':
          md += `## ${block.content}\n\n`;
          break;
        case 'Paragraph':
          md += `${block.content}\n\n`;
          break;
        case 'List':
          if (Array.isArray(block.content)) {
            md += block.content.map(item => `- ${item}`).join('\n') + '\n\n';
          }
          break;
        default:
          md += `${block.content}\n\n`;
      }
    }

    return md;
  }
}
