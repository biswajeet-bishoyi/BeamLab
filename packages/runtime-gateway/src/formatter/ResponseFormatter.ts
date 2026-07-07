export interface StructuredResponse {
  markdown: string;
  metadata?: any;
  toolExecutionSummaries?: Array<{ toolId: string; status: string; result: any }>;
  warnings?: string[];
  errors?: string[];
}

export class ResponseFormatter {
  public formatText(text: string): StructuredResponse {
    return {
      markdown: text
    };
  }

  public formatToolExecution(toolId: string, result: any): StructuredResponse {
    return {
      markdown: `Successfully executed tool **${toolId}**.`,
      toolExecutionSummaries: [{ toolId, status: 'success', result }]
    };
  }

  public formatError(error: Error): StructuredResponse {
    return {
      markdown: `An error occurred: ${error.message}`,
      errors: [error.message]
    };
  }
}

export const formatter = new ResponseFormatter();
