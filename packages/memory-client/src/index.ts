export * from './MemoryClient';

// Re-export core types for consumers so they don't need to depend directly on memory-system
export type { 
  MemoryScope, 
  MemoryRecord,
  SnapshotMetadata,
  Snapshot,
  IMemoryProvider
} from '@beamlab/memory-system';
