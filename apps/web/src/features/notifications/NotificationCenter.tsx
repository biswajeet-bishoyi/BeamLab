import React, { useEffect, useState } from 'react';
import { workspace, type WorkspaceNotification } from '@beamlab/workspace-runtime';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>(workspace.notifications.getNotifications());

  useEffect(() => {
    const handleCreated = (event: any) => {
      setNotifications(workspace.notifications.getNotifications());
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        workspace.notifications.markAsRead(event.payload.id);
        setNotifications(workspace.notifications.getNotifications());
      }, 5000);
    };

    const handleUpdated = () => {
      setNotifications(workspace.notifications.getNotifications());
    };

    const unsubCreated = workspace.on('NotificationCreated', handleCreated);
    const unsubUpdated = workspace.on('NotificationUpdated', handleUpdated);
    const unsubCleared = workspace.on('NotificationsCleared', handleUpdated);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubCleared();
    };
  }, []);

  const unreadNotifications = notifications.filter(n => !n.read);

  if (unreadNotifications.length === 0) return null;

  return (
    <div className="absolute bottom-12 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {unreadNotifications.map(notification => (
        <div 
          key={notification.id}
          className="pointer-events-auto bg-panel border border-subtle shadow-xl rounded-md p-3 flex items-start gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300"
        >
          <div className="shrink-0 mt-0.5">
            {notification.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          </div>
          
          <div className="flex-1">
            <h4 className="text-sm font-medium text-primary">{notification.title}</h4>
            <p className="text-sm text-muted mt-0.5">{notification.message}</p>
            {notification.action && (
              <button 
                className="mt-2 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                onClick={() => {
                  workspace.commands.executeCommand(notification.action!.commandId, { selection: [], focus: null });
                  workspace.notifications.markAsRead(notification.id);
                }}
              >
                {notification.action.label}
              </button>
            )}
          </div>

          <button 
            className="shrink-0 text-muted hover:text-primary transition-colors"
            onClick={() => workspace.notifications.markAsRead(notification.id)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
