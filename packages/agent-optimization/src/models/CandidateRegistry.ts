import { OptimizationCandidate } from './OptimizationSession';

export class CandidateRegistry {
  private candidates: Map<string, OptimizationCandidate> = new Map();

  public register(candidate: OptimizationCandidate): void {
    this.candidates.set(candidate.id, candidate);
  }

  public get(id: string): OptimizationCandidate | undefined {
    return this.candidates.get(id);
  }

  public getAll(): OptimizationCandidate[] {
    return Array.from(this.candidates.values());
  }

  public updateStatus(id: string, status: OptimizationCandidate['status']): void {
    const candidate = this.candidates.get(id);
    if (candidate) {
      candidate.status = status;
    }
  }

  public clear(): void {
    this.candidates.clear();
  }
}
