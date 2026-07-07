export interface Recommendation {
  id: string;
  type: 'information' | 'recommendation' | 'warning' | 'critical';
  title: string;
  description: string;
  actions?: Array<{ label: string; actionId: string }>;
  contextId?: string; // e.g. a specific element id
  status: 'active' | 'pinned' | 'dismissed' | 'completed';
}

export interface IRecommendationProvider {
  /**
   * Called to evaluate the current workspace state and yield new recommendations
   */
  evaluate(contextData: any): Promise<Recommendation[]>;
}
