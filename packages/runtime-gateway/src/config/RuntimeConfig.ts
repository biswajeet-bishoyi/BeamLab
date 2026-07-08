import { z } from 'zod';

export const RuntimeConfigSchema = z.object({
  provider: z.enum(['mock', 'openai', 'anthropic', 'google']).default('mock'),
  model: z.string().default('mock-model'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4000),
  timeoutMs: z.number().int().positive().default(30000),
  retryPolicy: z.object({
    maxRetries: z.number().int().min(0).default(3),
    backoffMs: z.number().int().min(0).default(1000)
  }).default({ maxRetries: 3, backoffMs: 1000 }),
  streamingEnabled: z.boolean().default(true)
});

export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

export const defaultConfig = RuntimeConfigSchema.parse({});
