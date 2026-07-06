import { describe, it, expect } from 'vitest';
import { logger, APIError } from './index';

describe('Logger & Errors', () => {
  it('logger is defined', () => {
    expect(logger).toBeDefined();
  });
  
  it('APIError has correct properties', () => {
    const error = new APIError();
    expect(error.statusCode).toBe(400);
  });
});
