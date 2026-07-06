export interface IMemoryProvider {
  store(key: string, value: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
