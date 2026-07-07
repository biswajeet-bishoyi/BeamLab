import { Policy } from '../core/PolicyModel';

export interface IPolicyProvider {
  getPolicies(): Promise<Policy[]>;
  getPolicyById(id: string): Promise<Policy | null>;
}
