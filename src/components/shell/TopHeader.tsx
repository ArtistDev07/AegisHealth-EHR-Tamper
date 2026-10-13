import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  ShieldAlert,
  ChevronDown,
  User,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { UserRole } from '../../types/ehr';
import { store } from '../../services/store';

interface TopHeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenBreakGlass: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  onNavigate: (path: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleMobileSidebar,
  onOpenBreakGlass,
  onOpenNotifications,
  unreadNotificationsCount,
  onNavigate,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPersonaSwitcherOpen, setIsPersonaSwitcherOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const currentUser = store.currentUser;

  const handlePersonaSwitch = (role: UserRole) => {
    store.loginAs(role);
    setIsPersonaSwitcherOpen(false);

    // Navigate to role's primary dashboard
    switch (role) {
      case 'DOCTOR':
        onNavigate('/doctor/dashboard');
        break;
      case 'PATIENT':
        onNavigate('/patient/dashboard');
        break;
      case 'INSURANCE':
        onNavigate('/insurance/dashboard');
        break;
      case 'ADMIN':
        onNavigate('/admin/dashboard');
        break;
      case 'AUDITOR':
        onNavigate('/auditor/dashboard');
        break;
    }
  };

  const roleLabels: Record<UserRole, { title: string; color: string }> = {
    DOCTOR: { title: 'Dr. Sarah Chen, MD (Doctor)', color: 'bg-[#2457C5]' },
    PATIENT: { title: 'Alex Morgan (Patient)', color: 'bg-[#0F766E]' },
    INSURANCE: { title: 'Elena Rostova (Insurance)', color: 'bg-[#7C3AED]' },
    ADMIN: { title: 'Marcus Vance (Admin)', color: 'bg-[#B45309]' },
    AUDITOR: { title: 'Dr. Hassan Malik (Auditor)', color: 'bg-[#15803D]' },
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#DCE3EC] flex items-center justify-between px-4 sm:px-6 shadow-2xs">
      {/* Left zone: Toggle & Organization / Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 text-[#596579] hover:text-[#172033] hover:bg-[#F1F5F9] rounded-lg cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#596579]">
          <span className="font-semibold text-[#172033]">AegisHealth AMC</span>
          <span className="text-[#CBD5E1]">/</span>
          <span className="capitalize">{currentUser.role.toLowerCase()} Portal</span>
        </div>
      </div>

      {/* Center zone: Search Input */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                if (currentUser.role === 'DOCTOR') onNavigate(`/doctor/patients?q=${encodeURIComponent(searchQuery)}`);
                else if (currentUser.role === 'INSURANCE') onNavigate(`/insurance/claims?q=${encodeURIComponent(searchQuery)}`);
                else if (currentUser.role === 'ADMIN') onNavigate(`/admin/users?q=${encodeURIComponent(searchQuery)}`);
              }
            }}
            placeholder="Search authorized patients, records, appointments..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-[#F8FAFC] text-[#172033] placeholder:text-[#94A3B8] border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#2457C5] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right zone: Actions, Persona Switcher & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Emergency Break-Glass Button for Clinicians */}
        {currentUser.role === 'DOCTOR' && (
          <button
            onClick={onOpenBreakGlass}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded-lg transition-colors cursor-pointer"
            title="Request emergency break-glass access to unassigned patient charts"
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Break-Glass</span>
          </button>
        )}

        {/* Quick Role / Persona Selector */}
        <div className="relative">
          <button
            onClick={() => setIsPersonaSwitcherOpen(!isPersonaSwitcherOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#172033] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#DCE3EC] rounded-lg transition-colors cursor-pointer"
            aria-label="Switch test persona"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#596579]" />
            <span className="hidden sm:inline">Role:</span>
            <span className="font-semibold capitalize">{currentUser.role.toLowerCase()}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
          </button>

          {isPersonaSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[#DCE3EC] p-2 z-50 animate-in fade-in duration-100">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider border-b border-[#F1F5F9] mb-1">
                Select Persona for Evaluation
              </div>
              {(['DOCTOR', 'PATIENT', 'INSURANCE', 'ADMIN', 'AUDITOR'] as UserRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => handlePersonaSwitch(r)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                    currentUser.role === r
                      ? 'bg-[#EAF0FF] text-[#2457C5] font-semibold'
                      : 'text-[#172033] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <span className="truncate">{roleLabels[r].title}</span>
                  {currentUser.role === r && <span className="w-2 h-2 rounded-full bg-[#2457C5]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-[#596579] hover:text-[#172033] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B91C1C]" />
          )}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-[#2457C5] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {currentUser.name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-semibold text-[#172033] leading-tight truncate max-w-[120px]">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-[#596579] capitalize">{currentUser.role.toLowerCase()}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] hidden xl:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#DCE3EC] p-2 z-50 animate-in fade-in duration-100">
              <div className="px-3 py-2 border-b border-[#F1F5F9] mb-1">
                <div className="text-xs font-semibold text-[#172033]">{currentUser.name}</div>
                <div className="text-[11px] text-[#596579] truncate">{currentUser.email}</div>
                <div className="text-[10px] text-[#15803D] font-medium mt-1">MFA Verified · Active Session</div>
              </div>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  onNavigate(
                    currentUser.role === 'DOCTOR'
                      ? '/doctor/settings'
                      : currentUser.role === 'PATIENT'
                      ? '/patient/settings'
                      : currentUser.role === 'INSURANCE'
                      ? '/insurance/settings'
                      : '/admin/settings'
                  );
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#172033] hover:bg-[#F8FAFC] rounded-lg transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#596579]" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  onNavigate('/system-status');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#172033] hover:bg-[#F8FAFC] rounded-lg transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#15803D]" />
                <span>System Health & Status</span>
              </button>

              <div className="border-t border-[#F1F5F9] my-1" />

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  onNavigate('/login');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
