export interface Evidence {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  confidence: number;
  references: string[];
  payload: any;
  reasoning: string;
  trace: string[];
  metadata: Record<string, any>;
}
