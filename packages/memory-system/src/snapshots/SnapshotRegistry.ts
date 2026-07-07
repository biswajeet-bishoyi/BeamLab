import { ISnapshotMigrator, SnapshotMetadata } from './SnapshotInterfaces';

export class SnapshotRegistry {
  private metadataIndex = new Map<string, SnapshotMetadata>();
  private migrators = new Map<number, Map<number, ISnapshotMigrator>>(); // from -> to -> Migrator

  public registerSnapshot(metadata: SnapshotMetadata): void {
    this.metadataIndex.set(metadata.snapshotId, metadata);
  }

  public getMetadata(snapshotId: string): SnapshotMetadata | undefined {
    return this.metadataIndex.get(snapshotId);
  }

  public getAllMetadata(): SnapshotMetadata[] {
    return Array.from(this.metadataIndex.values());
  }

  public registerMigrator(migrator: ISnapshotMigrator): void {
    if (!this.migrators.has(migrator.fromSchemaVersion)) {
      this.migrators.set(migrator.fromSchemaVersion, new Map());
    }
    this.migrators.get(migrator.fromSchemaVersion)!.set(migrator.toSchemaVersion, migrator);
  }

  public async migrate(payload: any, fromVersion: number, toVersion: number): Promise<any> {
    if (fromVersion === toVersion) return payload;

    // A simple linear migration strategy for now. Real-world needs a pathfinding algorithm.
    let currentPayload = payload;
    let currentVersion = fromVersion;

    while (currentVersion < toVersion) {
      const availableMigrators = this.migrators.get(currentVersion);
      if (!availableMigrators) {
        throw new Error(`No migrator found for schema version ${currentVersion}`);
      }

      // Find the migrator that advances the version
      const nextVersion = Array.from(availableMigrators.keys()).find(v => v > currentVersion);
      if (!nextVersion) {
        throw new Error(`No migrator found advancing from schema version ${currentVersion}`);
      }

      const migrator = availableMigrators.get(nextVersion)!;
      currentPayload = await migrator.migrate(currentPayload);
      currentVersion = nextVersion;
    }

    return currentPayload;
  }
}
