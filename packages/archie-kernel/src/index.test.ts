import { describe, it, expect } from 'vitest';
import { ArchieKernel } from './api/ArchieKernel';

describe('ArchieKernel', () => {
  it('should initialize successfully', () => {
    const kernel = new ArchieKernel();
    expect(kernel).toBeDefined();
  });
});
