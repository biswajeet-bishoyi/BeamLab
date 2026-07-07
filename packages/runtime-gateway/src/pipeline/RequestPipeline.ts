import { planner } from '../planner/Planner';
import { contextIntegrator } from '../context/ContextIntegrator';
import { toolResolver } from '../tools/ToolResolver';
import { MockProvider } from '../providers/MockProvider';
import { StreamEvent } from '../streaming/StreamingEngine';
import { LLMRequest } from '../providers/ILLMProvider';
import { metrics } from '../metrics/RuntimeMetrics';

export interface RequestPayload {
  prompt: string;
  projectId: string;
  userId: string;
}

export class RequestPipeline {
  private provider = new MockProvider();

  public async *processStream(payload: RequestPayload, traceId: string, signal?: AbortSignal): AsyncGenerator<StreamEvent, void, unknown> {
    const startTime = Date.now();
    try {
      // 1. Planner Phase
      const plan = planner.analyzeIntent(payload.prompt);
      metrics.logPipelinePhase(traceId, 'planner', Date.now() - startTime, { plan });
      
      // 2. Context Phase
      let systemPrompt = "You are Archie, the intelligent cursor of structural engineering.";
      if (plan.requiresContext) {
        const cStartTime = Date.now();
        const contextData = await contextIntegrator.getOptimizedContext(payload.projectId, 4000);
        systemPrompt += `\n\nWorkspace Context:\n${contextData}`;
        metrics.logPipelinePhase(traceId, 'context', Date.now() - cStartTime);
      }

      // 3. Provider Request Formulation
      const llmRequest: LLMRequest = {
        systemPrompt,
        userPrompt: payload.prompt,
        tools: plan.requiresTools ? toolResolver.getAvailableSchemas() : []
      };

      // 4. LLM Execution Phase (Streaming)
      const providerStream = this.provider.stream(llmRequest, signal);
      
      for await (const chunk of providerStream) {
        if (chunk.text) {
          yield { type: 'text', payload: chunk.text };
        }
      }

      // Handle non-streaming mock for tool execution 
      // (in reality, provider.stream would yield toolCalls directly, but we use provider.generate for simplicity here to mock the tool call logic)
      const fullResponse = await this.provider.generate(llmRequest, signal);
      
      if (fullResponse.toolCalls) {
        for (const call of fullResponse.toolCalls) {
          if (signal?.aborted) throw new Error('AbortError');
          
          yield { type: 'tool_start', payload: { toolId: call.name } };
          
          const tStartTime = Date.now();
          try {
            const result = await toolResolver.executeTool(call.name, call.arguments, {
              userId: payload.userId,
              projectId: payload.projectId,
              roles: ['Professional'],
              services: {}
            });
            metrics.logToolExecution(traceId, call.name, Date.now() - tStartTime, 'success');
            yield { type: 'tool_end', payload: { toolId: call.name, result } };
          } catch (e: any) {
            metrics.logToolExecution(traceId, call.name, Date.now() - tStartTime, 'failed');
            if (e.message.toLowerCase().includes('approval')) {
               yield { type: 'approval_required', payload: { toolId: call.name, details: e.message } };
            } else {
               yield { type: 'error', payload: { message: `Tool failed: ${e.message}` } };
            }
          }
        }
      }
      
    } catch (error: any) {
      metrics.logError(traceId, 'execution', error);
      yield { type: 'error', payload: { message: error.message } };
    }
  }
}

export const requestPipeline = new RequestPipeline();
