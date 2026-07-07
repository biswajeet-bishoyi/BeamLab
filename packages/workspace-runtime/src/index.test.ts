import { describe, it, expect } from 'vitest';
import { WorkspaceEventBus } from './events/WorkspaceEventBus';

describe('WorkspaceEventBus', () => {
  it('should emit and receive events', () => {
    const bus = new WorkspaceEventBus();
    let received = false;
    
    bus.subscribe('TestEvent', (event) => {
      received = true;
      expect(event.payload.foo).toBe('bar');
    });
    
    bus.emit('TestEvent', { foo: 'bar' });
    expect(received).toBe(true);
  });
});
