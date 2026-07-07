// Typed Policy Expression Tree

export type ExpressionType = 
  | 'AND' 
  | 'OR' 
  | 'NOT' 
  | 'EQ' 
  | 'NE' 
  | 'IN' 
  | 'EXISTS'
  | 'TIME' // Future
  | 'ROLE' // Future
  | 'PERMISSION' // Future
  | 'KNOWLEDGE' // Future
  | 'GRAPH' // Future
  | 'SELECTION' // Future
  | 'WORKFLOW' // Future
  | 'PLUGIN'; // Future

export interface BaseExpression {
  type: ExpressionType;
}

// Logical Expressions
export interface AndExpression extends BaseExpression {
  type: 'AND';
  children: PolicyExpression[];
}

export interface OrExpression extends BaseExpression {
  type: 'OR';
  children: PolicyExpression[];
}

export interface NotExpression extends BaseExpression {
  type: 'NOT';
  child: PolicyExpression;
}

// Comparison Expressions
export interface EqExpression extends BaseExpression {
  type: 'EQ';
  field: string;
  value: any;
}

export interface NeExpression extends BaseExpression {
  type: 'NE';
  field: string;
  value: any;
}

export interface InExpression extends BaseExpression {
  type: 'IN';
  field: string;
  values: any[];
}

export interface ExistsExpression extends BaseExpression {
  type: 'EXISTS';
  field: string;
}

// Future Extension Interfaces
export interface TimeExpression extends BaseExpression { type: 'TIME'; /* ... */ }
export interface RoleExpression extends BaseExpression { type: 'ROLE'; /* ... */ }
export interface PermissionExpression extends BaseExpression { type: 'PERMISSION'; /* ... */ }
export interface KnowledgeExpression extends BaseExpression { type: 'KNOWLEDGE'; /* ... */ }
export interface GraphExpression extends BaseExpression { type: 'GRAPH'; /* ... */ }
export interface SelectionExpression extends BaseExpression { type: 'SELECTION'; /* ... */ }
export interface WorkflowExpression extends BaseExpression { type: 'WORKFLOW'; /* ... */ }
export interface PluginExpression extends BaseExpression { type: 'PLUGIN'; /* ... */ }

export type PolicyExpression = 
  | AndExpression
  | OrExpression
  | NotExpression
  | EqExpression
  | NeExpression
  | InExpression
  | ExistsExpression
  | TimeExpression
  | RoleExpression
  | PermissionExpression
  | KnowledgeExpression
  | GraphExpression
  | SelectionExpression
  | WorkflowExpression
  | PluginExpression;
