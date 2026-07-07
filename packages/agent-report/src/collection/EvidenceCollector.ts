import { EvidenceRegistry } from '../registries';
import { Evidence } from '../models';

export class EvidenceCollector {
  constructor(private evidenceRegistry: EvidenceRegistry) {}

  public collect(reportId: string): Evidence[] {
    // Collects ALL evidence registered for this report.
    // The ReportAgent does not ask agents directly; it asks the registry.
    return this.evidenceRegistry.getEvidenceForReport(reportId);
  }
}
