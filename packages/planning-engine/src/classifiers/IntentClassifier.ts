export type Intent = 
  | 'Conversation'
  | 'Question'
  | 'Engineering Analysis'
  | 'Structural Design'
  | 'Optimization'
  | 'Tool Invocation'
  | 'Report Generation'
  | 'Workflow'
  | 'Automation'
  | 'Code Compliance'
  | 'Unknown';

export class IntentClassifier {
  classifyIntent(request: string): Intent {
    const lower = request.toLowerCase();
    if (lower.includes('analyze') || lower.includes('analysis')) return 'Engineering Analysis';
    if (lower.includes('design')) return 'Structural Design';
    if (lower.includes('optimize')) return 'Optimization';
    if (lower.includes('report') || lower.includes('generate')) return 'Report Generation';
    if (lower.includes('run') || lower.includes('execute') || lower.includes('tool')) return 'Tool Invocation';
    if (lower.includes('code') || lower.includes('compliance') || lower.includes('standard')) return 'Code Compliance';
    if (lower.includes('workflow') || lower.includes('automate')) return 'Workflow';
    if (lower.includes('?') || lower.includes('what') || lower.includes('how') || lower.includes('why')) return 'Question';
    return 'Conversation';
  }
}
