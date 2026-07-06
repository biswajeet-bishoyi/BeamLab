import { z } from 'zod';

export type ToolCategory =
  | 'Workspace'
  | 'Engineering'
  | 'Analysis'
  | 'Design'
  | 'Optimization'
  | 'Reports'
  | 'Drawing'
  | 'Projects'
  | 'Storage'
  | 'Administration'
  | 'Automation'
  | 'AI'
  | 'Marketplace'
  | 'Future Extensions';

export type Permission = 'Guest' | 'Student' | 'Professional' | 'Enterprise' | 'Admin' | 'Owner';

export interface ToolContext {
  userId: string;
  projectId: string;
  roles: Permission[];
  services: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface UndoPayload {
  toolId: string;
  payload: any;
}

export interface BaseTool<Input, Output> {
  metadata: {
    id: string;
    name: string;
    category: ToolCategory;
    description: string;
    version: string;
  };
  
  schemas: {
    input: z.ZodType<Input>;
    output: z.ZodType<Output>;
  };
  
  security: {
    permissions: Permission[];
    requiresApproval: boolean;
  };
  
  history: {
    supportsUndo: boolean;
  };
  
  events: {
    onStart?: string;
    onSuccess?: string;
    onFailure?: string;
  };
  
  dependencies: {
    services: string[];
  };

  execute(input: Input, context: ToolContext): Promise<Output>;
  validate?(input: Input, context: ToolContext): Promise<ValidationResult>;
  createUndoAction?(input: Input, output: Output, context: ToolContext): UndoPayload;
}
