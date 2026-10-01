import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';
import { EnvelopeType } from './LoadTypes';

// ─── Load Envelope ────────────────────────────────────────────────────────────

/**
 * Canonical B1.3 Load Envelope.
 *
 * Groups multiple load cases or combinations to find the extreme design values
 * (Maximum, Minimum, or Absolute Maximum) for member design.
 */
export class LoadEnvelope extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'LoadCombination'; // Reuse slot

  envelopeType: EnvelopeType;

  /** IDs of load cases or combinations included in this envelope */
  sourceIds: string[];

  constructor(
    id: string,
    name: string,
    sourceIds: string[] = [],
    envelopeType: EnvelopeType = 'AbsoluteMaximum',
  ) {
    super(id, name);
    this.sourceIds = sourceIds;
    this.envelopeType = envelopeType;
    this.relationships.dependencyIds = [...sourceIds];
  }

  addSource(sourceId: string): void {
    if (!this.sourceIds.includes(sourceId)) {
      this.sourceIds.push(sourceId);
      this.relationships.dependencyIds.push(sourceId);
    }
  }

  validate(): ValidationResult {
    const diags = [];
    if (this.sourceIds.length === 0) {
      diags.push({
        code: 'LDM-ENV001',
        severity: 'error' as const,
        message: 'Load envelope must contain at least one source load case or combination.',
        objectId: this.identity.id,
      });
    }
    return new ValidationResult(this.identity.id, diags);
  }
}

// ─── Envelope Registry ─────────────────────────────────────────────────────────

export class EnvelopeRegistry {
  private readonly _envelopes: Map<string, LoadEnvelope> = new Map();

  public register(envelope: LoadEnvelope): void {
    this._envelopes.set(envelope.identity.id, envelope);
  }

  public get(id: string): LoadEnvelope | undefined {
    return this._envelopes.get(id);
  }

  public getByType(type: EnvelopeType): LoadEnvelope[] {
    return Array.from(this._envelopes.values()).filter(e => e.envelopeType === type);
  }

  public all(): LoadEnvelope[] {
    return Array.from(this._envelopes.values());
  }

  public remove(id: string): void {
    this._envelopes.delete(id);
  }
}
