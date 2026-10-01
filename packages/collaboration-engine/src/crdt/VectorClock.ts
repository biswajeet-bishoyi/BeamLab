/**
 * VectorClock represents a logical vector clock for tracking causality in
 * distributed, multi-user structural engineering model collaboration.
 */
export type ClockComparison = 'before' | 'after' | 'concurrent' | 'equal';

export class VectorClock {
  private readonly entries: Map<string, number>;

  constructor(initialEntries?: Record<string, number> | Map<string, number>) {
    this.entries = new Map<string, number>();
    if (initialEntries) {
      if (initialEntries instanceof Map) {
        for (const [peerId, counter] of initialEntries.entries()) {
          this.entries.set(peerId, counter);
        }
      } else {
        for (const [peerId, counter] of Object.entries(initialEntries)) {
          this.entries.set(peerId, counter);
        }
      }
    }
  }

  /**
   * Get the logical clock counter for a specific peer.
   */
  public get(peerId: string): number {
    return this.entries.get(peerId) ?? 0;
  }

  /**
   * Increment the counter for the given peer ID by 1.
   * Returns the new value.
   */
  public increment(peerId: string): number {
    const current = this.get(peerId);
    const next = current + 1;
    this.entries.set(peerId, next);
    return next;
  }

  /**
   * Explicitly set the counter for a given peer ID.
   */
  public set(peerId: string, value: number): void {
    this.entries.set(peerId, Math.max(0, Math.floor(value)));
  }

  /**
   * Create an independent clone of this vector clock.
   */
  public clone(): VectorClock {
    const cloned = new VectorClock();
    for (const [peerId, counter] of this.entries.entries()) {
      cloned.set(peerId, counter);
    }
    return cloned;
  }

  /**
   * Merge this vector clock with another vector clock by taking the maximum
   * counter for every peer observed in either clock.
   * Returns a new merged VectorClock instance.
   */
  public merge(other: VectorClock): VectorClock {
    const merged = this.clone();
    for (const [peerId, counter] of other.entries.entries()) {
      const current = merged.get(peerId);
      if (counter > current) {
        merged.set(peerId, counter);
      }
    }
    return merged;
  }

  /**
   * Compare causality with another vector clock:
   * - 'equal': all peer values are identical.
   * - 'before': this clock happened before `other` (this <= other and this != other).
   * - 'after': this clock happened after `other` (this >= other and this != other).
   * - 'concurrent': neither dominates the other (divergent parallel edits).
   */
  public compare(other: VectorClock): ClockComparison {
    const allPeers = new Set([...this.entries.keys(), ...other.entries.keys()]);
    
    let hasGreater = false;
    let hasLesser = false;

    for (const peer of allPeers) {
      const a = this.get(peer);
      const b = other.get(peer);

      if (a > b) {
        hasGreater = true;
      } else if (a < b) {
        hasLesser = true;
      }
    }

    if (hasGreater && hasLesser) {
      return 'concurrent';
    }
    if (hasGreater) {
      return 'after';
    }
    if (hasLesser) {
      return 'before';
    }
    return 'equal';
  }

  /**
   * Returns true if this clock causally preceded `other`.
   */
  public isBefore(other: VectorClock): boolean {
    return this.compare(other) === 'before';
  }

  /**
   * Returns true if this clock is concurrent with `other`.
   */
  public isConcurrent(other: VectorClock): boolean {
    return this.compare(other) === 'concurrent';
  }

  /**
   * Serialize to a JSON-compatible object record.
   */
  public toJSON(): Record<string, number> {
    const record: Record<string, number> = {};
    for (const [peerId, counter] of this.entries.entries()) {
      record[peerId] = counter;
    }
    return record;
  }

  /**
   * Deserialize a VectorClock from a JSON record.
   */
  public static fromJSON(record: Record<string, number>): VectorClock {
    return new VectorClock(record);
  }
}
