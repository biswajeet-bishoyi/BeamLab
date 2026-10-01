/**
 * BeamLab B1.6 — Live Event Stream Auditor
 *
 * Captures, buffers, filters, and replays all Canonical Engineering Model events
 * with sequence numbering, payload inspection, and diagnostic filtering.
 */

import { CEMEvent, CEMEventType, CEMEventEmitter } from '../events/ModelEvents';

export interface AuditedEvent extends CEMEvent {
  readonly seq: number;
  readonly recordedAt: string;
}

export interface EventFilter {
  readonly types?: CEMEventType[];
  readonly objectId?: string;
  readonly modelId?: string;
  readonly limit?: number;
  readonly sinceSeq?: number;
}

export interface EventStreamSummary {
  readonly totalEvents: number;
  readonly countsByType: Record<string, number>;
  readonly oldestTimestamp?: string;
  readonly newestTimestamp?: string;
  readonly lastSeq: number;
}

export class EventStreamAuditor {
  private readonly _buffer: AuditedEvent[] = [];
  private readonly _maxSize: number;
  private _nextSeq: number = 1;
  private _detachFns: Array<() => void> = [];

  constructor(maxSize: number = 500) {
    this._maxSize = maxSize;
  }

  /**
   * Subscribe and start auditing an event emitter.
   */
  public attach(emitter: CEMEventEmitter): () => void {
    const allTypes: CEMEventType[] = [
      'EngineeringObjectCreated',
      'EngineeringObjectUpdated',
      'EngineeringObjectDeleted',
      'RelationshipCreated',
      'RelationshipRemoved',
      'ValidationCompleted',
      'VersionChanged',
      'StructureAdded',
      'ModelLoaded',
      'ModelCleared',
      'AnalysisResultCreated',
      'AnalysisResultInvalidated',
      'HistoryEntryRecorded',
    ];

    for (const type of allTypes) {
      const unsub = emitter.on(type, (event: CEMEvent) => {
        this.record(event);
      });
      this._detachFns.push(unsub);
    }

    return () => this.detach();
  }

  /**
   * Unsubscribe from all attached emitters.
   */
  public detach(): void {
    for (const unsub of this._detachFns) {
      unsub();
    }
    this._detachFns = [];
  }

  /**
   * Record an incoming CEM event into the circular buffer.
   */
  public record(event: CEMEvent): AuditedEvent {
    const audited: AuditedEvent = {
      ...event,
      seq: this._nextSeq++,
      recordedAt: new Date().toISOString(),
    };

    if (this._buffer.length >= this._maxSize) {
      this._buffer.shift(); // Evict oldest
    }
    this._buffer.push(audited);
    return audited;
  }

  /**
   * Query recorded events with optional filters.
   */
  public getEvents(filter?: EventFilter): AuditedEvent[] {
    let result = [...this._buffer];

    if (filter) {
      if (filter.types && filter.types.length > 0) {
        const typeSet = new Set(filter.types);
        result = result.filter(e => typeSet.has(e.type));
      }
      if (filter.objectId) {
        result = result.filter(e => e.objectId === filter.objectId);
      }
      if (filter.modelId) {
        result = result.filter(e => e.modelId === filter.modelId);
      }
      if (filter.sinceSeq !== undefined) {
        result = result.filter(e => e.seq > filter.sinceSeq!);
      }
      if (filter.limit !== undefined && filter.limit > 0) {
        result = result.slice(-filter.limit);
      }
    }

    return result;
  }

  /**
   * Get analytical summary of the current event buffer.
   */
  public getSummary(): EventStreamSummary {
    const countsByType: Record<string, number> = {};
    for (const ev of this._buffer) {
      countsByType[ev.type] = (countsByType[ev.type] ?? 0) + 1;
    }

    return {
      totalEvents: this._buffer.length,
      countsByType,
      oldestTimestamp: this._buffer[0]?.timestamp,
      newestTimestamp: this._buffer[this._buffer.length - 1]?.timestamp,
      lastSeq: this._nextSeq - 1,
    };
  }

  public size(): number {
    return this._buffer.length;
  }

  public clear(): void {
    this._buffer.length = 0;
  }
}
