import { useEffect, useState } from 'react';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  characterId?: string;
}

interface NotificationToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onCharacterClick?: (characterId: string) => void;
}

export function NotificationToast({ notifications, onDismiss, onCharacterClick }: NotificationToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((n) => (
        <ToastItem
          key={n.id}
          notification={n}
          onDismiss={onDismiss}
          onCharacterClick={onCharacterClick}
        />
      ))}
    </div>
  );
}

function ToastItem({
  notification,
  onDismiss,
  onCharacterClick,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
  onCharacterClick?: (characterId: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(notification.id), 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const bgColors = {
    success: 'rgba(6, 214, 160, 0.15)',
    error: 'rgba(239, 71, 111, 0.15)',
    info: 'rgba(155, 93, 229, 0.15)',
  };

  const borderColors = {
    success: '#06D6A0',
    error: '#EF476F',
    info: '#9B5DE5',
  };

  return (
    <div
      className={`pointer-events-auto px-4 py-3 rounded-lg border cursor-pointer transition-all duration-300 max-w-sm ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
      style={{
        backgroundColor: bgColors[notification.type],
        borderColor: borderColors[notification.type],
      }}
      onClick={() => {
        if (notification.characterId && onCharacterClick) {
          onCharacterClick(notification.characterId);
        }
        onDismiss(notification.id);
      }}
    >
      <p className="text-sm">{notification.message}</p>
    </div>
  );
}
