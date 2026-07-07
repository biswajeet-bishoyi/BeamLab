import { PolicyExpression, AndExpression, OrExpression, NotExpression, EqExpression, NeExpression, InExpression, ExistsExpression } from '../core/PolicyExpression';
import { ActionRequest } from '../core/PolicyModel';

export class ExpressionEvaluator {
  
  public evaluate(expression: PolicyExpression, request: ActionRequest): boolean {
    switch (expression.type) {
      case 'AND': return this.evaluateAnd(expression as AndExpression, request);
      case 'OR': return this.evaluateOr(expression as OrExpression, request);
      case 'NOT': return this.evaluateNot(expression as NotExpression, request);
      case 'EQ': return this.evaluateEq(expression as EqExpression, request);
      case 'NE': return this.evaluateNe(expression as NeExpression, request);
      case 'IN': return this.evaluateIn(expression as InExpression, request);
      case 'EXISTS': return this.evaluateExists(expression as ExistsExpression, request);
      default:
        // Future extensions default to true during alpha or throw depending on strictness
        console.warn(`[ExpressionEvaluator] Unsupported expression type: ${expression.type}`);
        return true; 
    }
  }

  private evaluateAnd(expr: AndExpression, request: ActionRequest): boolean {
    return expr.children.every(child => this.evaluate(child, request));
  }

  private evaluateOr(expr: OrExpression, request: ActionRequest): boolean {
    return expr.children.some(child => this.evaluate(child, request));
  }

  private evaluateNot(expr: NotExpression, request: ActionRequest): boolean {
    return !this.evaluate(expr.child, request);
  }

  private evaluateEq(expr: EqExpression, request: ActionRequest): boolean {
    const fieldValue = this.getFieldValue(expr.field, request);
    return fieldValue === expr.value;
  }

  private evaluateNe(expr: NeExpression, request: ActionRequest): boolean {
    const fieldValue = this.getFieldValue(expr.field, request);
    return fieldValue !== expr.value;
  }

  private evaluateIn(expr: InExpression, request: ActionRequest): boolean {
    const fieldValue = this.getFieldValue(expr.field, request);
    return expr.values.includes(fieldValue);
  }

  private evaluateExists(expr: ExistsExpression, request: ActionRequest): boolean {
    const fieldValue = this.getFieldValue(expr.field, request);
    return fieldValue !== undefined && fieldValue !== null;
  }

  // Helper for deep property access (e.g. 'resource.type')
  private getFieldValue(path: string, obj: any): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}
