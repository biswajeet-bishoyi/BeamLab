import { ContextGraph } from '../graph/ContextGraph';

export class ContextVersioner {
  private versions = new Map<string, number>();

  public bumpVersion(projectId: string): number {
    const current = this.versions.get(projectId) || 0;
    const next = current + 1;
    this.versions.set(projectId, next);
    return next;
  }

  public getVersion(projectId: string): number {
    return this.versions.get(projectId) || 0;
  }
}

export const contextVersioner = new ContextVersioner();
