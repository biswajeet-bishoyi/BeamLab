import { ObjectIdentity } from './ObjectIdentity';
import { EngineeringMetadata, createDefaultMetadata } from './EngineeringMetadata';
import { EngineeringVersion, createInitialVersion } from './EngineeringVersion';
import { ValidationResult } from '../validation/ValidationResult';

/**
 * Root interface for every entity in the Canonical Engineering Model.
 *
 * Implementors must never depend on UI frameworks, solver internals,
 * AI agents, or rendering technologies.
 */
export interface IEngineeringObject {
  // ── Identity ──────────────────────────────────────────────────────────────
  readonly identity: ObjectIdentity;

  // ── Versioning ────────────────────────────────────────────────────────────
  readonly version: EngineeringVersion;

  // ── Metadata ──────────────────────────────────────────────────────────────
  metadata: EngineeringMetadata;

  // ── Custom extension data ─────────────────────────────────────────────────
  /**
   * Namespace-keyed dictionary for extension data.
   * Example: extensions['com.beamlab.compliance'] = { ... }
   * Agents, plugins, and integrations write to their own namespaces.
   */
  extensions: Record<string, unknown>;

  // ── Relationships ─────────────────────────────────────────────────────────
  /** IDs of related objects — kept as IDs to avoid circular references */
  relationships: EngineeringRelationships;

  // ── Type discriminator ────────────────────────────────────────────────────
  /** Machine-readable type name, e.g. "Node", "Member", "Material" */
  readonly objectType: EngineeringObjectType;

  // ── Validation ────────────────────────────────────────────────────────────
  /** Every object knows how to validate itself */
  validate(): ValidationResult;
}

// ─── Relationship map ────────────────────────────────────────────────────────

export interface EngineeringRelationships {
  /** ID of the direct parent (e.g., a Structure owns Members) */
  parentId?: string;
  /** IDs of direct children */
  childIds: string[];
  /** Referenced objects (e.g., a Member references a Material and Section by ID) */
  references: Record<string, string>; // key = reference role, value = target ID
  /** Dependency IDs — objects that must exist for this object to be valid */
  dependencyIds: string[];
  /** Loose associations with other objects (informational links) */
  associationIds: string[];
}

export function createDefaultRelationships(parentId?: string): EngineeringRelationships {
  return {
    parentId,
    childIds: [],
    references: {},
    dependencyIds: [],
    associationIds: [],
  };
}

// ─── Type registry ───────────────────────────────────────────────────────────

export type EngineeringObjectType =
  | 'Project'
  | 'Structure'
  | 'Node'
  | 'Member'
  | 'Material'
  | 'Section'
  | 'Support'
  | 'LoadPattern'
  | 'LoadCase'
  | 'LoadCombination'
  | 'NodeLoad'
  | 'MemberLoad'
  | 'AnalysisResult';

// ─── Abstract base ────────────────────────────────────────────────────────────

/**
 * Concrete base class that provides the boilerplate implementation
 * of IEngineeringObject.  Domain classes extend this.
 */
export abstract class BaseEngineeringObject implements IEngineeringObject {
  readonly identity: ObjectIdentity;
  readonly version: EngineeringVersion;
  metadata: EngineeringMetadata;
  extensions: Record<string, unknown>;
  relationships: EngineeringRelationships;
  abstract readonly objectType: EngineeringObjectType;

  constructor(id: string, name: string, parentId?: string) {
    const now = new Date().toISOString();
    this.identity = {
      id,
      name,
      version: 1,
      createdAt: now,
      modifiedAt: now,
    };
    this.version = createInitialVersion();
    this.metadata = createDefaultMetadata();
    this.extensions = {};
    this.relationships = createDefaultRelationships(parentId);
  }

  abstract validate(): ValidationResult;
}
