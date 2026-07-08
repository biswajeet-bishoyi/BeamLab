/**
 * Adjacency map for engineering relationships.
 * Relationships are keyed by (sourceId, role).
 */
export class RelationshipRegistry {
  /** sourceId → { role → targetId } */
  private readonly _outbound: Map<string, Map<string, string>> = new Map();
  /** targetId → [sourceId, role][] */
  private readonly _inbound: Map<string, Array<{ sourceId: string; role: string }>> = new Map();

  public set(sourceId: string, role: string, targetId: string): void {
    if (!this._outbound.has(sourceId)) this._outbound.set(sourceId, new Map());
    this._outbound.get(sourceId)!.set(role, targetId);

    if (!this._inbound.has(targetId)) this._inbound.set(targetId, []);
    // Remove stale entry for same (sourceId, role)
    const inList = this._inbound.get(targetId)!;
    const existing = inList.findIndex(e => e.sourceId === sourceId && e.role === role);
    if (existing >= 0) inList.splice(existing, 1);
    inList.push({ sourceId, role });
  }

  public get(sourceId: string, role: string): string | undefined {
    return this._outbound.get(sourceId)?.get(role);
  }

  /** All outbound references for a given source */
  public outboundOf(sourceId: string): Map<string, string> {
    return this._outbound.get(sourceId) ?? new Map();
  }

  /** All objects that reference a given target */
  public inboundTo(targetId: string): Array<{ sourceId: string; role: string }> {
    return this._inbound.get(targetId) ?? [];
  }

  public remove(sourceId: string): void {
    const refs = this._outbound.get(sourceId);
    if (refs) {
      refs.forEach((targetId) => {
        const inList = this._inbound.get(targetId);
        if (inList) {
          const idx = inList.findIndex(e => e.sourceId === sourceId);
          if (idx >= 0) inList.splice(idx, 1);
        }
      });
      this._outbound.delete(sourceId);
    }
  }
}
