import { EngineeringEvent } from './EngineeringEvent';

export interface ReportEvent extends EngineeringEvent {
  category: 'Report';
  reportId: string;
}

export interface ReportRequested extends ReportEvent {
  type: 'ReportRequested';
  payload: {
    templateId: string;
  };
}

export interface EvidenceCollected extends ReportEvent {
  type: 'EvidenceCollected';
  payload: {
    evidenceCount: number;
  };
}

export interface TemplateSelected extends ReportEvent {
  type: 'TemplateSelected';
  payload: {
    templateId: string;
  };
}

export interface SectionGenerated extends ReportEvent {
  type: 'SectionGenerated';
  payload: {
    sectionId: string;
  };
}

export interface NarrativeCompleted extends ReportEvent {
  type: 'NarrativeCompleted';
  payload: {
    wordCount: number;
  };
}

export interface CitationGenerated extends ReportEvent {
  type: 'CitationGenerated';
  payload: {
    citationCount: number;
  };
}

export interface ReportReviewed extends ReportEvent {
  type: 'ReportReviewed';
  payload: {
    reviewId: string;
    status: string;
  };
}

export interface ReportRendered extends ReportEvent {
  type: 'ReportRendered';
  payload: {
    format: string;
  };
}

export interface ReportExported extends ReportEvent {
  type: 'ReportExported';
  payload: {
    url: string;
  };
}

export interface ReportCompleted extends ReportEvent {
  type: 'ReportCompleted';
  payload: {
    status: string;
  };
}
