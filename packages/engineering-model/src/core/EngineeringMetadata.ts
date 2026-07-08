/**
 * Descriptive metadata attached to any engineering object.
 * Designed to be open-ended to support future tagging, ownership, BIM links, etc.
 */
export interface EngineeringMetadata {
  /** Free-form key/value tags */
  tags: Record<string, string>;
  /** Structural category (e.g., "structural", "architectural", "mep") */
  category?: string;
  /** User-defined labels for filtering and grouping */
  labels: string[];
  /** Lifecycle status */
  status: ObjectStatus;
  /** Future: revision history entries */
  revisionNotes?: RevisionNote[];
  /** Future: BIM Global IDs (IFC GUID, etc.) */
  externalIds?: ExternalId[];
}

export type ObjectStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'deprecated'
  | 'archived';

export interface RevisionNote {
  revision: string;
  note: string;
  timestamp: string;
  author?: string;
}

export interface ExternalId {
  system: string;  // e.g., "IFC", "Revit", "AutoCAD"
  id: string;
}

/** Factory that creates a fresh default metadata object */
export function createDefaultMetadata(): EngineeringMetadata {
  return {
    tags: {},
    labels: [],
    status: 'draft',
  };
}
