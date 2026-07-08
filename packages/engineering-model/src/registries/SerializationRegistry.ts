/**
 * Serialization registry for the Canonical Engineering Model.
 * Provider-driven: the core model never hardcodes a specific format.
 */

export interface ISerializationProvider<TOutput = unknown> {
  readonly format: string;   // e.g. "json", "ifc", "step"
  serialize(model: unknown): TOutput;
  deserialize(data: TOutput): unknown;
}

export class SerializationRegistry {
  private readonly _providers: Map<string, ISerializationProvider> = new Map();

  public register(provider: ISerializationProvider): void {
    this._providers.set(provider.format, provider);
  }

  public serialize(format: string, model: unknown): unknown {
    const provider = this._providers.get(format);
    if (!provider) throw new Error(`No serialization provider registered for format: "${format}"`);
    return provider.serialize(model);
  }

  public deserialize(format: string, data: unknown): unknown {
    const provider = this._providers.get(format);
    if (!provider) throw new Error(`No deserialization provider registered for format: "${format}"`);
    return provider.deserialize(data);
  }

  public has(format: string): boolean {
    return this._providers.has(format);
  }

  public formats(): string[] {
    return Array.from(this._providers.keys());
  }
}

/** Default JSON serialization provider */
export class JsonSerializationProvider implements ISerializationProvider<string> {
  readonly format = 'json';

  serialize(model: unknown): string {
    return JSON.stringify(model, null, 2);
  }

  deserialize(data: string): unknown {
    return JSON.parse(data);
  }
}
