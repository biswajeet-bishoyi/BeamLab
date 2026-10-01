/**
 * BeamLab B1.4 — Engineering History Registry
 */

import { EngineeringHistoryEntry, HistoryEntryType } from './EngineeringHistory';

export class EngineeringHistoryRegistry {
  private readonly _entries: EngineeringHistoryEntry[] = [];
  private readonly _byObject: Map<string, EngineeringHistoryEntry[]> = new Map();
  private readonly _byType: Map<HistoryEntryType, EngineeringHistoryEntry[]> = new Map();

  /**
   * Append an entry to the immutable timeline.
   */
  record(entry: EngineeringHistoryEntry): void {
    this._entries.push(entry);

    // Index by affected objects
    for (const objId of entry.affectedObjectIds) {
      const list = this._byObject.get(objId) ?? [];
      list.push(entry);
      this._byObject.set(objId, list);
    }

    // Index by entry type
    const typeList = this._byType.get(entry.type) ?? [];
    typeList.push(entry);
    this._byType.set(entry.type, typeList);
  }

  /** Total count of recorded entries */
  get count(): number {
    return this._entries.length;
  }

  /** Complete chronological timeline */
  getTimeline(): readonly EngineeringHistoryEntry[] {
    return this._entries;
  }

  /** Get latest entry */
  getLatest(): EngineeringHistoryEntry | undefined {
    return this._entries[this._entries.length - 1];
  }

  /** Query history for a specific object */
  getByObject(objectId: string): readonly EngineeringHistoryEntry[] {
    return this._byObject.get(objectId) ?? [];
  }

  /** Query history by entry type */
  getByType(type: HistoryEntryType): readonly EngineeringHistoryEntry[] {
    return this._byType.get(type) ?? [];
  }

  /** Query history entries at or above a specific revision number */
  getByRevision(revisionNumber: number): readonly EngineeringHistoryEntry[] {
    return this._entries.filter(e => e.revisionNumber === revisionNumber);
  }

  /** Clear all history (used for test resets or initializations) */
  clear(): void {
    this._entries.length = 0;
    this._byObject.clear();
    this._byType.clear();
  }
}
