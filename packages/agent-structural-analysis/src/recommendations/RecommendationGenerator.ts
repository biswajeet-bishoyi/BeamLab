import { EngineeringInsight } from '../reasoning/ReasoningRegistry';

export interface Recommendation {
  id: string;
  action: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export class RecommendationGenerator {
  public generate(insights: EngineeringInsight[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const hasDeflectionIssue = insights.some(i => i.id === 'excessive-deflection');
    if (hasDeflectionIssue) {
      recommendations.push({
        id: 'rec-1',
        action: 'Optimize Section',
        description: 'Consider increasing the moment of inertia for critical members.',
        priority: 'high'
      });
    }

    recommendations.push({
      id: 'rec-2',
      action: 'Run Code Compliance',
      description: 'Run the code compliance agent to verify standard limits.',
      priority: 'medium'
    });

    return recommendations;
  }
}
