/**
 * BeamLab B1.5 — BIM & External Data Interoperability Types
 *
 * Common interfaces, schemas, and option types for importing,
 * exporting, and mapping structural engineering data with external tools.
 */

import { EngineeringModel } from '../model/EngineeringModel';

// ─── Supported Formats & Software Domains ─────────────────────────────────────

export type InteropFormat =
  | 'ifc'
  | 'dxf'
  | 'csv'
  | 'json'
  | 'staad'
  | 'sap2000'
  | 'etabs'
  | 'revit'
  | 'tekla'
  | 'custom';

export type InteropDirection = 'Import' | 'Export' | 'BiDirectional';

export type MappingSeverity = 'info' | 'warning' | 'error';

// ─── External Entity Representation ──────────────────────────────────────────

export interface ExternalProperty {
  readonly name: string;
  readonly value: unknown;
  readonly unit?: string;
  readonly rawType?: string;
}

export interface ExternalEntity {
  readonly externalId: string;
  readonly entityType: string;
  readonly name?: string;
  readonly properties: Record<string, ExternalProperty>;
  readonly relationships: Record<string, string[]>;
  readonly geometry?: unknown;
}

// ─── Mapping Diagnostics & Reports ───────────────────────────────────────────

export interface MappingIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: MappingSeverity;
  readonly entityId?: string;
  readonly propertyName?: string;
  readonly suggestion?: string;
}

export interface InteropReport {
  readonly format: InteropFormat;
  readonly direction: 'Import' | 'Export';
  readonly timestamp: string;
  readonly entitiesProcessed: number;
  readonly entitiesSucceeded: number;
  readonly entitiesFailed: number;
  readonly issues: MappingIssue[];
  readonly executionTimeMs: number;
}

// ─── Import & Export Options ──────────────────────────────────────────────────

export interface ImportOptions {
  /** Target project identifier */
  projectId?: string;
  /** Name for imported structural system */
  structureName?: string;
  /** Scale factor to convert lengths to SI meters (e.g. 0.001 for mm -> m) */
  lengthScaleFactor?: number;
  /** Up-axis of the source file ('Y' or 'Z') */
  sourceUpAxis?: 'Y' | 'Z';
  /** Tolerance for merging adjacent nodes [m] */
  nodeMergeTolerance?: number;
  /** Default material grade if missing in source */
  defaultMaterial?: string;
  /** Default section designation if missing in source */
  defaultSection?: string;
  /** Whether to validate model after import */
  validateAfterImport?: boolean;
}

export interface ExportOptions {
  /** Target length unit in export ('m' | 'mm' | 'ft' | 'in') */
  lengthUnit?: 'm' | 'mm' | 'ft' | 'in';
  /** Target up-axis in export ('Y' | 'Z') */
  targetUpAxis?: 'Y' | 'Z';
  /** Include load definitions */
  includeLoads?: boolean;
  /** Include analysis results */
  includeResults?: boolean;
  /** Coordinate decimal precision */
  precision?: number;
  /** Application generator signature header */
  appSignature?: string;
}

// ─── Interoperability Provider Interface ──────────────────────────────────────

export interface IInteropProvider<TData = string> {
  readonly format: InteropFormat;
  readonly name: string;
  readonly description: string;
  readonly direction: InteropDirection;
  readonly fileExtensions: readonly string[];

  /** Convert external content into a BeamLab EngineeringModel */
  importModel(content: TData, options?: ImportOptions): Promise<EngineeringModel> | EngineeringModel;

  /** Convert a BeamLab EngineeringModel into external content */
  exportModel(model: EngineeringModel, options?: ExportOptions): Promise<TData> | TData;
}
