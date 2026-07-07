export interface IConfidenceContributor {
  id: string;
  name: string;
  evaluate(context: any, evidence: any): Promise<{ score: number; explanation: string }>;
}
