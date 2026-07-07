import { WorkspaceEventBus } from '../events/WorkspaceEventBus';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface WorkspaceNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  action?: {
    label: string;
    commandId: string;
  };
}

export class NotificationService {
  private notifications: WorkspaceNotification[] = [];
  private eventBus: WorkspaceEventBus;

  constructor(eventBus: WorkspaceEventBus) {
    this.eventBus = eventBus;
  }

  notify(notification: Omit<WorkspaceNotification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: WorkspaceNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false
    };

    this.notifications.push(newNotification);
    
    // Broadcast the new notification to the UI
    this.eventBus.emit('NotificationCreated', newNotification);
  }

  getNotifications(): WorkspaceNotification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.eventBus.emit('NotificationUpdated', notif);
    }
  }

  clearAll() {
    this.notifications = [];
    this.eventBus.emit('NotificationsCleared', null);
  }
}
