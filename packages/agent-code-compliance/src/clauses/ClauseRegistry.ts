import { Clause } from '../models';
import { IStandardProvider } from '../providers/StandardProvider';

export class ClauseRegistry {
  private providers: IStandardProvider[] = [];
  private activeClauses: Clause[] = [];

  public registerProvider(provider: IStandardProvider): void {
    this.providers.push(provider);
  }

  public async fetchClausesForStandard(standardId: string): Promise<Clause[]> {
    let clauses: Clause[] = [];
    for (const provider of this.providers) {
      const result = await provider.getClauses(standardId);
      if (result.length > 0) {
        clauses = clauses.concat(result);
        break; // Assume one provider owns the clauses for a specific standard
      }
    }
    
    this.activeClauses.push(...clauses);
    return clauses;
  }

  public getActiveClauses(): Clause[] {
    return this.activeClauses;
  }

  public clear(): void {
    this.activeClauses = [];
  }
}
