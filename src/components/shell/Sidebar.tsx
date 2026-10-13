import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarDays,
  CheckSquare,
  ShieldCheck,
  History,
  ClipboardCheck,
  Shield,
  UserCog,
  KeyRound,
  Activity,
  HardDriveDownload,
  Settings,
  Bell,
  Stethoscope,
  FolderOpen,
  X,
  FileCheck2,
} from 'lucide-react';
import { UserRole } from '../../types/ehr';

interface SidebarProps {
  currentRole: UserRole;
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  currentPath,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const getNavItems = () => {
    switch (currentRole) {
      case 'DOCTOR':
        return [
          { label: 'Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
          { label: 'Patients', path: '/doctor/patients', icon: Users },
          { label: 'Encounters', path: '/doctor/encounters', icon: Stethoscope },
          { label: 'Appointments', path: '/doctor/appointments', icon: CalendarDays },
          { label: 'Clinical Tasks', path: '/doctor/tasks', icon: CheckSquare },
          { label: 'Settings', path: '/doctor/settings', icon: Settings },
        ];
      case 'PATIENT':
        return [
          { label: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
          { label: 'My Health Records', path: '/patient/records', icon: FileText },
          { label: 'Appointments', path: '/patient/appointments', icon: CalendarDays },
          { label: 'Consents & Privacy', path: '/patient/consents', icon: ShieldCheck },
          { label: 'Access History', path: '/patient/access-history', icon: History },
          { label: 'Notifications', path: '/patient/notifications', icon: Bell },
          { label: 'Profile Settings', path: '/patient/settings', icon: Settings },
        ];
      case 'INSURANCE':
        return [
          { label: 'Dashboard', path: '/insurance/dashboard', icon: LayoutDashboard },
          { label: 'Assigned Claims', path: '/insurance/claims', icon: ClipboardCheck },
          { label: 'Authorizations', path: '/insurance/authorizations', icon: FileCheck2 },
          { label: 'Policies', path: '/insurance/policies', icon: Shield },
          { label: 'Claim Documents', path: '/insurance/documents', icon: FolderOpen },
          { label: 'Access History', path: '/insurance/access-history', icon: History },
          { label: 'Settings', path: '/insurance/settings', icon: Settings },
        ];
      case 'ADMIN':
        return [
          { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
          { label: 'User Directory', path: '/admin/users', icon: UserCog },
          { label: 'Roles & RBAC', path: '/admin/roles', icon: ShieldCheck },
          { label: 'Audit Logs', path: '/admin/audit', icon: History },
          { label: 'Integrity Verification', path: '/admin/audit/integrity', icon: Shield },
          { label: 'Key & Encryption', path: '/admin/encryption', icon: KeyRound },
          { label: 'Security Policies', path: '/admin/security', icon: Shield },
          { label: 'System Health', path: '/admin/system-health', icon: Activity },
          { label: 'Backup & Recovery', path: '/admin/backup-recovery', icon: HardDriveDownload },
          { label: 'Org Settings', path: '/admin/settings', icon: Settings },
        ];
      case 'AUDITOR':
        return [
          { label: 'Dashboard', path: '/auditor/dashboard', icon: LayoutDashboard },
          { label: 'Audit Log Stream', path: '/auditor/audit', icon: History },
          { label: 'Cryptographic Check', path: '/auditor/integrity', icon: ShieldCheck },
          { label: 'Security Events', path: '/auditor/security-events', icon: Shield },
          { label: 'Compliance Reports', path: '/auditor/reports', icon: FileText },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-[#111C2D]/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#111C2D] text-[#CBD5E1] flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } border-r border-[#1E2E48]`}
      >
        {/* Brand Lockup */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#1E2E48] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2457C5] flex items-center justify-center text-white font-bold text-base shadow-xs">
              A
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
                AegisHealth EHR
              </div>
              <div className="text-[10px] text-[#94A3B8] font-mono tracking-wider">
                TAMPER-EVIDENT SECURE
              </div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-[#94A3B8] hover:text-white rounded-lg"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Portal Badge */}
        <div className="px-5 py-3 border-b border-[#1E2E48]/60 bg-[#0C1524]/50">
          <div className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase">
            Portal Environment
          </div>
          <div className="text-xs font-medium text-white flex items-center justify-between mt-1">
            <span className="capitalize">{currentRole.toLowerCase()} Workspace</span>
            <span className="w-2 h-2 rounded-full bg-[#15803D]" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path) && item.path !== '/doctor/dashboard');

            return (
              <button
                key={item.path}
                onClick={() => {
                  onNavigate(item.path);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-colors whitespace-nowrap cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#2457C5] text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#1E2E48]/50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Organization Details */}
        <div className="p-4 border-t border-[#1E2E48] bg-[#0C1524]/60 text-[11px] text-[#64748B] shrink-0">
          <div className="text-[#94A3B8] font-medium truncate">AegisHealth AMC</div>
          <div className="font-mono text-[10px] mt-0.5">TLS 1.3 · AES-256-GCM</div>
        </div>
      </aside>
    </>
  );
};
