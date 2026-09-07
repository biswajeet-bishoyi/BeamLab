/**
 * BeamLab B1.5 — Interop Relationship Mapping
 */

export interface ExternalMemberConnectivity {
  readonly memberExternalId: string;
  readonly startNodeExternalId: string;
  readonly endNodeExternalId: string;
  readonly materialExternalId?: string;
  readonly sectionExternalId?: string;
}

export class RelationshipMapper {
  private readonly _extToCan: Map<string, string> = new Map(); // External ID -> Canonical ID
  private readonly _canToExt: Map<string, string> = new Map(); // Canonical ID -> External ID

  registerIdMapping(externalId: string, canonicalId: string): void {
    this._extToCan.set(externalId, canonicalId);
    this._canToExt.set(canonicalId, externalId);
  }

  getCanonicalId(externalId: string): string | undefined {
    return this._extToCan.get(externalId);
  }

  toCanonicalId(externalId: string): string | undefined {
    return this._extToCan.get(externalId);
  }

  getExternalId(canonicalId: string): string | undefined {
    return this._canToExt.get(canonicalId);
  }

  toExternalId(canonicalId: string): string | undefined {
    return this._canToExt.get(canonicalId);
  }

  hasMapping(externalId: string): boolean {
    return this._extToCan.has(externalId);
  }

  clear(): void {
    this._extToCan.clear();
    this._canToExt.clear();
  }
}
