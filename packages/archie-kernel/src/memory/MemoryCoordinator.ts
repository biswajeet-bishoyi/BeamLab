import { IMemoryProvider } from '../interfaces/IMemoryProvider';

export class MemoryCoordinator {
  private providers: Map<string, IMemoryProvider> = new Map();

  registerProvider(name: string, provider: IMemoryProvider): void {
    this.providers.set(name, provider);
  }

  getProvider(name: string): IMemoryProvider | undefined {
    return this.providers.get(name);
  }

  async storeInAll(key: string, value: any): Promise<void> {
    const promises = Array.from(this.providers.values()).map(p => p.store(key, value));
    await Promise.all(promises);
  }
}
