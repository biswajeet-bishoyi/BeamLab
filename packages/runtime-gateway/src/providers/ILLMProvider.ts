export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  tools?: any[]; // Available tools schemas
}

export interface LLMResponse {
  text?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
  }>;
}

export interface ILLMProvider {
  /**
   * Generates a non-streaming response
   */
  generate(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse>;
  
  /**
   * Generates a streaming response via async generator
   */
  stream(request: LLMRequest, signal?: AbortSignal): AsyncGenerator<Partial<LLMResponse>, void, unknown>;
}
