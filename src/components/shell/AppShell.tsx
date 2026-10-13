import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { Footer } from './Footer';
import { BreakGlassModal } from './BreakGlassModal';
import { NotificationsDrawer } from './NotificationsDrawer';
import { store } from '../../services/store';

interface AppShellProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentPath, onNavigate, children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isBreakGlassOpen, setIsBreakGlassOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const currentUser = store.currentUser;
  const unreadCount = store.notifications.filter(
    n => n.recipientUserId === currentUser.id && !n.read
  ).length;

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex">
      {/* Sidebar */}
      <Sidebar
        currentRole={currentUser.role}
        currentPath={currentPath}
        onNavigate={onNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-200">
        <TopHeader
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenBreakGlass={() => setIsBreakGlassOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotificationsCount={unreadCount}
          onNavigate={onNavigate}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <Footer onNavigate={onNavigate} />
      </div>

      {/* Global Modals */}
      <BreakGlassModal
        isOpen={isBreakGlassOpen}
        onClose={() => setIsBreakGlassOpen(false)}
        onSuccess={() => onNavigate('/doctor/patients/pat-104')}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
