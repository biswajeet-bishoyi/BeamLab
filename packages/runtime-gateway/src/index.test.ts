import { describe, it, expect } from 'vitest';
import { archieRuntime } from './index';

describe('Archie Runtime Gateway (ARG)', () => {
  it('streams text responses for conversational intents', async () => {
    const stream = archieRuntime.streamRequest({
      prompt: 'Hello Archie!',
      projectId: 'proj_1',
      userId: 'user_1'
    });

    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    expect(chunks.length).toBeGreaterThan(0);
    // SSE formatting check
    expect(chunks[0]).toContain('data: {"type":"message_started"');
    expect(chunks.some(c => c.includes('"type":"text"'))).toBe(true);
  });

  it('triggers tool execution and handles approvals for destructive actions', async () => {
    const stream = archieRuntime.streamRequest({
      prompt: 'Delete beam 123',
      projectId: 'proj_1',
      userId: 'user_1'
    });

    const events: any[] = [];
    for await (const chunk of stream) {
      // Parse SSE chunk
      const payloadStr = chunk.replace('data: ', '').trim();
      if (payloadStr) events.push(JSON.parse(payloadStr));
    }

    // Should contain a tool_start event
    expect(events.some(e => e.type === 'tool_start')).toBe(true);
    // Should contain an approval_required event because deleteBeam needs approval
    expect(events.some(e => e.type === 'approval_required')).toBe(true);
  });

  it('handles cancellation tokens immediately', async () => {
    const controller = new AbortController();
    const stream = archieRuntime.streamRequest({
      prompt: 'Write a very long essay about concrete',
      projectId: 'proj_1',
      userId: 'user_1'
    }, controller.signal);

    const events: any[] = [];
    try {
      // abort after 1st tick
      setTimeout(() => controller.abort(), 10);
      for await (const chunk of stream) {
        events.push(chunk);
      }
    } catch (e: any) {
      expect(e.message).toBe('AbortError');
    }
    
    // Stream should be truncated
    expect(events.length).toBeLessThan(10);
  });
});
