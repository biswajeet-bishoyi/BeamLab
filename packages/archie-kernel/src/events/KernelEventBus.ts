export class KernelEventBus {
  private listeners: Map<string, Function[]> = new Map();

  subscribe(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  publish(event: string, payload: any): void {
    const callbacks = this.listeners.get(event) || [];
    for (const callback of callbacks) {
      try {
        callback(payload);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    }
  }
}
