/**
 * BeamLab B1.5 — Interoperability Provider Registry
 *
 * Central pluggable registry for external structural format providers.
 */

import { IInteropProvider, InteropFormat, ImportOptions, ExportOptions } from './InteropTypes';
import { EngineeringModel } from '../model/EngineeringModel';
import { IfcInteropProvider } from './providers/IfcInteropProvider';
import { DxfInteropProvider } from './providers/DxfInteropProvider';
import { CsvInteropProvider } from './providers/CsvInteropProvider';
import { StaadInteropProvider } from './providers/StaadInteropProvider';
import { Sap2000InteropProvider } from './providers/Sap2000InteropProvider';

export class InteropRegistry {
  private readonly _providers: Map<string, IInteropProvider> = new Map();

  constructor() {
    this._registerBuiltInProviders();
  }

  register(provider: IInteropProvider): void {
    this._providers.set(provider.format.toLowerCase(), provider);
  }

  registerProvider(provider: IInteropProvider): void {
    this.register(provider);
  }

  get(format: InteropFormat | string): IInteropProvider | undefined {
    return this._providers.get(format.toLowerCase());
  }

  getProvider(format: InteropFormat | string): IInteropProvider | undefined {
    return this.get(format);
  }

  has(format: InteropFormat | string): boolean {
    return this._providers.has(format.toLowerCase());
  }

  hasFormat(format: InteropFormat | string): boolean {
    return this.has(format);
  }

  formats(): string[] {
    return Array.from(this._providers.keys());
  }

  getSupportedFormats(): string[] {
    return this.formats();
  }

  all(): IInteropProvider[] {
    return Array.from(this._providers.values());
  }

  async importModel(format: InteropFormat | string, content: string, options?: ImportOptions): Promise<EngineeringModel> {
    const provider = this.get(format);
    if (!provider) {
      throw new Error(`No interoperability provider registered for format "${format}"`);
    }
    return Promise.resolve(provider.importModel(content, options));
  }

  async exportModel(format: InteropFormat | string, model: EngineeringModel, options?: ExportOptions): Promise<string> {
    const provider = this.get(format);
    if (!provider) {
      throw new Error(`No interoperability provider registered for format "${format}"`);
    }
    return Promise.resolve(provider.exportModel(model, options) as string);
  }

  private _registerBuiltInProviders(): void {
    this.register(new IfcInteropProvider());
    this.register(new DxfInteropProvider());
    this.register(new CsvInteropProvider());
    this.register(new StaadInteropProvider());
    this.register(new Sap2000InteropProvider());
  }
}
