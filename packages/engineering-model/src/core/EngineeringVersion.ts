/**
 * Version record attached to an engineering object.
 * Enables immutable-style updates: each mutation creates a new version.
 */
export interface EngineeringVersion {
  /** Monotonically incrementing integer starting at 1 */
  readonly number: number;
  /** ISO-8601 timestamp when this version was created */
  readonly timestamp: string;
  /** Human-readable description of the change that produced this version */
  readonly changeDescription?: string;
  /** ID of the previous version (null for first version) */
  readonly previousVersionId?: string;
  /** Author identifier (future: user/agent ID) */
  readonly author?: string;
}

/**
 * Compact snapshot of what changed between two versions.
 * Used by change tracking and future diff/merge workflows.
 */
export interface VersionChangeset {
  objectId: string;
  fromVersion: number;
  toVersion: number;
  changedFields: string[];
  timestamp: string;
}

/** Utility to create a version-1 record */
export function createInitialVersion(description?: string): EngineeringVersion {
  return {
    number: 1,
    timestamp: new Date().toISOString(),
    changeDescription: description ?? 'Initial creation',
  };
}

/** Utility to bump a version record */
export function bumpVersion(
  current: EngineeringVersion,
  description?: string,
): EngineeringVersion {
  return {
    number: current.number + 1,
    timestamp: new Date().toISOString(),
    changeDescription: description,
    previousVersionId: `${current.number}`,
  };
}
