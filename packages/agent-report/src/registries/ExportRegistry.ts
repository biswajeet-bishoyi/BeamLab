export interface ExportRecord {
  exportId: string;
  reportId: string;
  format: string;
  url: string;
  timestamp: string;
}

export class ExportRegistry {
  private exports: Map<string, ExportRecord> = new Map();

  public register(exportRecord: ExportRecord): void {
    this.exports.set(exportRecord.exportId, exportRecord);
  }

  public getByReport(reportId: string): ExportRecord[] {
    return Array.from(this.exports.values()).filter(e => e.reportId === reportId);
  }
}
