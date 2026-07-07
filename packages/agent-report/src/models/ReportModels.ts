export interface ReportModel {
  id: string;
  metadata: Record<string, any>;
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  type: string;
  title: string;
  content: any; // Raw engineering data for the section
  order: number;
}

export interface DocumentModel {
  id: string;
  templateId: string;
  title: string;
  blocks: DocumentBlock[];
}

export interface DocumentBlock {
  type: 'Heading' | 'Paragraph' | 'Table' | 'List' | 'Image';
  content: string | any;
  citations?: string[]; // IDs mapping to CitationGraph nodes
}

export interface LivingReport {
  id: string;
  status: 'Draft' | 'Review' | 'Approved';
  reportModel: ReportModel;
  documentModel: DocumentModel;
}
