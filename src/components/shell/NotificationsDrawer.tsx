import React from 'react';
import { X, CheckCheck, Bell } from 'lucide-react';
import { store } from '../../services/store';
import { api } from '../../services/api';
import { Button } from '../ui/Button';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const notifications = store.notifications.filter(n => n.recipientUserId === store.currentUser.id);

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-[#111C2D]/50 backdrop-blur-2xs" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-[#DCE3EC] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-[#DCE3EC]">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#2457C5]" />
              <h2 className="text-base font-semibold text-[#172033]">Notifications</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="tertiary" onClick={handleMarkAllRead}>
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
              <button
                onClick={onClose}
                className="p-1.5 text-[#596579] hover:text-[#172033] rounded-lg cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-[#596579] text-sm">
                No notifications to display.
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    n.read
                      ? 'bg-white border-[#E2E8F0] opacity-80'
                      : 'bg-[#F0F5FF] border-[#BFDBFE]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#172033]">{n.title}</span>
                    <span className="text-[10px] text-[#64748B] font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#596579] leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
