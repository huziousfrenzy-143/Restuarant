import { EventEmitter } from 'events';

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase limit if we have many concurrent orgs connected
    this.setMaxListeners(100);
  }

  emitOrgEvent(orgId: string, eventType: 'orders' | 'inventory' | 'sales' | 'clients' | 'tasks') {
    this.emit(`updated:${orgId}`, { type: eventType });
  }
}

export const eventBus = new AppEventBus();
