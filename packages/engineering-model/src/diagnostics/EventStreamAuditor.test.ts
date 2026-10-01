import { describe, it, expect } from 'vitest';
import { EngineeringModel } from '../model/EngineeringModel';
import { EventStreamAuditor } from './EventStreamAuditor';

describe('B1.6 EventStreamAuditor', () => {
  it('records and filters CEM events into circular buffer with sequence numbers', () => {
    const model = new EngineeringModel('model-event-01', { name: 'Auditor Test' });
    const auditor = model.createEventAuditor(10); // Small buffer for testing evictions

    // Fire some model creation events
    model.addNode('n1', 'Node 1', 0, 0, 0, 'struct-1');
    model.addNode('n2', 'Node 2', 5, 0, 0, 'struct-1');
    const mat = model.addMaterial('mat-1', 'S355', 210e9, 81e9, 0.3, 7850, 'Steel');
    const sec = model.addSection('sec-1', 'IPE 300', 5.38e-3, 6.04e-6, 8.36e-5, 2.01e-7);
    model.addMember('m1', 'Member 1', 'n1', 'n2', mat.identity.id, sec.identity.id, 'struct-1');

    expect(auditor.size()).toBeGreaterThanOrEqual(5);

    const allEvents = auditor.getEvents();
    expect(allEvents[0]?.seq).toBe(1);
    expect(allEvents[1]?.seq).toBe(2);

    // Filter by object ID
    const n1Events = auditor.getEvents({ objectId: 'n1' });
    expect(n1Events.length).toBeGreaterThan(0);
    expect(n1Events[0]?.objectId).toBe('n1');

    // Filter by event type
    const createdEvents = auditor.getEvents({ types: ['EngineeringObjectCreated'] });
    expect(createdEvents.length).toBeGreaterThan(0);

    // Summary metrics
    const summary = auditor.getSummary();
    expect(summary.totalEvents).toBe(auditor.size());
    expect(summary.countsByType['EngineeringObjectCreated']).toBeGreaterThan(0);
  });

  it('evicts oldest events when buffer capacity is exceeded', () => {
    const auditor = new EventStreamAuditor(3);

    auditor.record({ type: 'EngineeringObjectCreated', timestamp: '1', modelId: 'm1', payload: {} });
    auditor.record({ type: 'EngineeringObjectCreated', timestamp: '2', modelId: 'm1', payload: {} });
    auditor.record({ type: 'EngineeringObjectCreated', timestamp: '3', modelId: 'm1', payload: {} });
    expect(auditor.size()).toBe(3);

    // 4th event should evict 1st event
    auditor.record({ type: 'EngineeringObjectCreated', timestamp: '4', modelId: 'm1', payload: {} });
    expect(auditor.size()).toBe(3);

    const events = auditor.getEvents();
    expect(events[0]?.seq).toBe(2); // Sequence 1 was evicted
    expect(events[2]?.seq).toBe(4);
  });
});
