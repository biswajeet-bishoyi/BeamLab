import { MemoryRecord } from '../core/MemoryRecord';
import { SnapshotMetadata } from '../snapshots/SnapshotInterfaces';

export interface MemoryEvent {
  eventId: string;
  timestamp: number;
}

export interface MemoryCreatedEvent extends MemoryEvent {
  type: 'MemoryCreated';
  record: MemoryRecord;
}

export interface MemoryLoadedEvent extends MemoryEvent {
  type: 'MemoryLoaded';
  record: MemoryRecord;
}

export interface MemoryUpdatedEvent extends MemoryEvent {
  type: 'MemoryUpdated';
  record: MemoryRecord;
}

export interface MemoryDestroyedEvent extends MemoryEvent {
  type: 'MemoryDestroyed';
  memoryId: string;
}

export interface MemorySnapshotCreatedEvent extends MemoryEvent {
  type: 'MemorySnapshotCreated';
  metadata: SnapshotMetadata;
}

export interface MemoryRestoredEvent extends MemoryEvent {
  type: 'MemoryRestored';
  metadata: SnapshotMetadata;
}

export interface MemoryMigratedEvent extends MemoryEvent {
  type: 'MemoryMigrated';
  memoryId: string;
  fromVersion: number;
  toVersion: number;
}
