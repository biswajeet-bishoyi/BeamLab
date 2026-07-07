import { ILLMProvider, LLMRequest, LLMResponse } from './ILLMProvider';

export class MockProvider implements ILLMProvider {
  async generate(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    // If the user mentions "delete beam", mock a tool call
    if (request.userPrompt.toLowerCase().includes('delete beam')) {
      return {
        toolCalls: [{
          id: 'call_123',
          name: 'deleteBeam',
          arguments: { beamId: 'beam_1' }
        }]
      };
    }

    return {
      text: "This is a mocked response from the MockProvider. I am ready to help you with BeamLab engineering."
    };
  }

  async *stream(request: LLMRequest, signal?: AbortSignal): AsyncGenerator<Partial<LLMResponse>, void, unknown> {
    const text = "This is a streaming mocked response from the MockProvider.";
    const chunks = text.split(' ');
    
    for (const chunk of chunks) {
      if (signal?.aborted) {
        throw new Error('AbortError');
      }
      yield { text: chunk + ' ' };
      await new Promise(resolve => setTimeout(resolve, 10)); // simulate latency
    }
  }
}
