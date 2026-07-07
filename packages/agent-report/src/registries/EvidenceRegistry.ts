import { Evidence } from '../models';

export class EvidenceRegistry {
  private evidenceMap: Map<string, Evidence> = new Map();
  private reportEvidenceMap: Map<string, Set<string>> = new Map();

  public register(reportId: string, evidence: Evidence): void {
    this.evidenceMap.set(evidence.id, evidence);
    if (!this.reportEvidenceMap.has(reportId)) {
      this.reportEvidenceMap.set(reportId, new Set());
    }
    this.reportEvidenceMap.get(reportId)!.add(evidence.id);
  }

  public getEvidenceForReport(reportId: string): Evidence[] {
    const evidenceIds = this.reportEvidenceMap.get(reportId);
    if (!evidenceIds) return [];
    
    return Array.from(evidenceIds)
      .map(id => this.evidenceMap.get(id))
      .filter((e): e is Evidence => e !== undefined);
  }

  public getEvidenceById(id: string): Evidence | undefined {
    return this.evidenceMap.get(id);
  }
}
