import { Standard } from '../models';
import { IStandardProvider } from '../providers/StandardProvider';

export class StandardRegistry {
  private providers: IStandardProvider[] = [];
  private activeStandards: Standard[] = [];

  public registerProvider(provider: IStandardProvider): void {
    this.providers.push(provider);
  }

  public async resolveStandard(id: string): Promise<Standard | undefined> {
    for (const provider of this.providers) {
      const standard = await provider.getStandard(id);
      if (standard) {
        this.activeStandards.push(standard);
        return standard;
      }
    }
    return undefined;
  }

  public getActiveStandards(): Standard[] {
    return this.activeStandards;
  }

  public clear(): void {
    this.activeStandards = [];
  }
}
