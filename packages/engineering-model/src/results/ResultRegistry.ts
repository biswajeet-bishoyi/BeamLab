/**
 * BeamLab B1.4 — Result Registry
 */

import { CanonicalAnalysisResult } from './Results';
import { ResultState } from './ResultTypes';

export class ResultRegistry {
  private readonly _results: Map<string, CanonicalAnalysisResult> = new Map();
  private _activeResultId?: string;

  /** Register an analysis result */
  register(result: CanonicalAnalysisResult, makeActive = true): void {
    this._results.set(result.identity.id, result);
    if (makeActive) {
      this._activeResultId = result.identity.id;
    }
  }

  /** Retrieve a result by ID */
  get(id: string): CanonicalAnalysisResult | undefined {
    return this._results.get(id);
  }

  /** Check if a result exists */
  has(id: string): boolean {
    return this._results.has(id);
  }

  /** Get the currently active / primary analysis result */
  getActive(): CanonicalAnalysisResult | undefined {
    return this._activeResultId ? this._results.get(this._activeResultId) : undefined;
  }

  /** Set the active result */
  setActive(id: string): boolean {
    if (this._results.has(id)) {
      this._activeResultId = id;
      return true;
    }
    return false;
  }

  /** Get all results */
  all(): CanonicalAnalysisResult[] {
    return Array.from(this._results.values());
  }

  /** Get count of registered results */
  get count(): number {
    return this._results.size;
  }

  /** Get results filtered by lifecycle state */
  getByStatus(status: ResultState): CanonicalAnalysisResult[] {
    return this.all().filter(r => r.status === status);
  }

  /**
   * Invalidate all completed results (e.g. when structure or loads change).
   */
  invalidateAll(reason: string): void {
    for (const res of this._results.values()) {
      if (res.status === 'Completed' || res.status === 'Pending' || res.status === 'Running') {
        res.invalidate(reason);
      }
    }
  }

  /** Clear all results */
  clear(): void {
    this._results.clear();
    this._activeResultId = undefined;
  }
}
