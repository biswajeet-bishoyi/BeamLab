import { AnyContext } from './ContextTypes';

export interface IContextCollector<T extends AnyContext = AnyContext> {
  /**
   * Uniquely identifies this collector (e.g., 'ProjectCollector')
   */
  name: string;
  
  /**
   * Collects domain-specific context.
   */
  collect(params: Record<string, any>): Promise<T>;
}
