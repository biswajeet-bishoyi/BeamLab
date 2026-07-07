export interface ISnapshotSerializer {
  serialize(payload: any): string;
  deserialize(data: string): any;
}

export interface ISnapshotCompressor {
  compress(data: string): Promise<Buffer | string>;
  decompress(data: Buffer | string): Promise<string>;
}

export interface ISnapshotMigrator {
  fromSchemaVersion: number;
  toSchemaVersion: number;
  migrate(payload: any): Promise<any>;
}

export interface SnapshotMetadata {
  snapshotId: string;
  namespace: string; // e.g. "beamlab.memory.sessions"
  schemaVersion: number;
  snapshotVersion: number;
  createdAt: number;
  checksum: string;
  isCompressed: boolean;
  isEncrypted: boolean;
}

export interface Snapshot {
  metadata: SnapshotMetadata;
  payload: any; // Kept strongly typed here, but serialized when saved
}
