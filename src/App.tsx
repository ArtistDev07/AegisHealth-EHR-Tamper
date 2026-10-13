/**
 * AegisHealth EHR & Tamper-Evident Audit System
 * Complete Full-Stack Healthcare Application
 */

import React, { useState, useEffect } from 'react';
import { ToastProvider } from './components/ui/Toast';
import { AppShell } from './components/shell/AppShell';
import { store } from './services/store';
import { UserRole } from './types/ehr';

// Auth & Public Views
import {
  LoginPage,
  MfaPage,
  ForgotPasswordPage,
  AccessDeniedPage,
  SystemStatusPage,
  LegalPage,
} from './features/auth/AuthViews';

// Doctor Views
import { DoctorDashboard, PatientDirectory } from './features/doctor/DoctorViews';
import { PatientDetail } from './features/doctor/PatientDetail';
import { EncounterEditor } from './features/doctor/EncounterEditor';

// Patient Views
import {
  PatientDashboard,
  PatientRecordsHub,
  PatientAppointments,
  PatientConsents,
  PatientAccessHistory,
} from './features/patient/PatientViews';

// Insurance Views
import {
  InsuranceDashboard,
  ClaimsList,
  ClaimDetail,
  AuthorizationsList,
} from './features/insurance/InsuranceViews';

// Admin Views
import {
  AdminDashboard,
  UserManagement,
  RolesPermissions,
  AdminAuditLogs,
  IntegrityVerification,
  EncryptionManagement,
} from './features/admin/AdminViews';

// Auditor Views
import {
  AuditorDashboard,
  SecurityEventsView,
  AuditorReportsView,
} from './features/auditor/AuditorViews';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>('/doctor/dashboard');
  const [currentUser, setCurrentUser] = useState(store.currentUser);

  // Sync state on navigation
  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (role: UserRole) => {
    setCurrentUser(store.currentUser);
    switch (role) {
      case 'DOCTOR':
        setCurrentPath('/doctor/dashboard');
        break;
      case 'PATIENT':
        setCurrentPath('/patient/dashboard');
        break;
      case 'INSURANCE':
        setCurrentPath('/insurance/dashboard');
        break;
      case 'ADMIN':
        setCurrentPath('/admin/dashboard');
        break;
      case 'AUDITOR':
        setCurrentPath('/auditor/dashboard');
        break;
    }
  };

  // Route Router & Access Guard
  const renderCurrentView = () => {
    // 1. Public & Auth Routes
    if (currentPath === '/login') {
      return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigate} />;
    }
    if (currentPath === '/auth/mfa') {
      return <MfaPage onMfaSuccess={() => handleLoginSuccess(store.currentUser.role)} />;
    }
    if (currentPath === '/auth/forgot-password') {
      return <ForgotPasswordPage onNavigate={handleNavigate} />;
    }
    if (currentPath === '/access-denied') {
      return <AccessDeniedPage onNavigate={handleNavigate} />;
    }
    if (currentPath === '/system-status') {
      return <SystemStatusPage onNavigate={handleNavigate} />;
    }
    if (currentPath === '/legal/privacy') {
      return (
        <LegalPage
          title="Privacy Policy & HIPAA Disclosures"
          onNavigate={handleNavigate}
          content={`AegisHealth Academic Medical Center strictly enforces the Principle of Least Privilege and Column-Level Encryption for all Protected Health Information (PHI).

1. Data Collection & Purpose
Protected medical records, demographic details, and clinical documentation are collected exclusively for direct patient care, certified laboratory diagnostic reporting, and authorized insurance claims adjudication.

2. Column-Level Encryption Architecture
All sensitive medical fields—including clinical notes, vital signs, diagnostic results, and phone numbers—are encrypted prior to persistent storage using AES-256-GCM. Cryptographic Data Encryption Keys (DEKs) are managed separately from application database instances.

3. Tamper-Evident Historical Audit Trail
In compliance with the HIPAA Security Rule (45 CFR § 164.312(b)), every access, view, modification, and query is permanently recorded in an append-only sequential SHA-256 cryptographic hash chain. Attempted record deletions or alterations are mathematically detected and reported.`}
        />
      );
    }
    if (currentPath === '/legal/terms') {
      return (
        <LegalPage
          title="Terms of Use"
          onNavigate={handleNavigate}
          content={`Welcome to AegisHealth EHR. By accessing this platform, users agree to adhere to healthcare information security and authorization boundaries.

- Authorized Access Only: Access is strictly bound to assigned patients and authorized operational tasks.
- Prohibition of Credential Sharing: Multi-factor authentication credentials and session tokens must never be disclosed.
- Retrospective Auditing: All system activities are subject to independent security surveillance and cryptographic integrity verification.`}
        />
      );
    }
    if (currentPath === '/legal/accessibility') {
      return (
        <LegalPage
          title="Accessibility Statement"
          onNavigate={handleNavigate}
          content={`AegisHealth EHR conforms to the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA standards.

- Full Keyboard Operability: All forms, tables, modals, and actions support logical tab ordering and focus trapping.
- Contrast & Visual Hierarchy: Color is never used as the sole indicator of system state; explicit text labels and semantic icons accompany all status indications.
- Reduced Motion: System micro-interactions respect prefers-reduced-motion preferences.`}
        />
      );
    }

    // 2. Doctor Portal Routes
    if (currentPath.startsWith('/doctor')) {
      if (store.currentUser.role !== 'DOCTOR' && store.currentUser.role !== 'ADMIN') {
        return <AccessDeniedPage onNavigate={handleNavigate} />;
      }

      if (currentPath === '/doctor/dashboard') {
        return <DoctorDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/doctor/patients') {
        return <PatientDirectory onNavigate={handleNavigate} />;
      }
      if (currentPath.startsWith('/doctor/patients/')) {
        const parts = currentPath.split('/');
        const patientId = parts[3];
        const tab = parts[4] || 'overview';
        return <PatientDetail patientId={patientId} initialTab={tab} onNavigate={handleNavigate} />;
      }
      if (currentPath === '/doctor/encounters') {
        return <DoctorDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/doctor/encounters/new') {
        return <EncounterEditor onNavigate={handleNavigate} />;
      }
      if (currentPath.startsWith('/doctor/encounters/')) {
        const encId = currentPath.split('/')[3];
        return <EncounterEditor encounterId={encId} onNavigate={handleNavigate} />;
      }
      if (currentPath === '/doctor/appointments') {
        return <DoctorDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/doctor/tasks') {
        return <DoctorDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/doctor/settings') {
        return (
          <div className="bg-white p-6 rounded-xl border border-[#DCE3EC]">
            <h2 className="text-lg font-bold text-[#142238]">Physician Profile & Credentials</h2>
            <p className="text-xs text-[#596579] mt-1">Dr. Sarah Chen, MD · License #MED-CA-889102 · Internal Medicine</p>
          </div>
        );
      }
    }

    // 3. Patient Portal Routes
    if (currentPath.startsWith('/patient')) {
      if (store.currentUser.role !== 'PATIENT' && store.currentUser.role !== 'ADMIN') {
        return <AccessDeniedPage onNavigate={handleNavigate} />;
      }

      if (currentPath === '/patient/dashboard') {
        return <PatientDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/patient/records') {
        return <PatientRecordsHub onNavigate={handleNavigate} />;
      }
      if (currentPath === '/patient/appointments') {
        return <PatientAppointments onNavigate={handleNavigate} />;
      }
      if (currentPath === '/patient/consents') {
        return <PatientConsents onNavigate={handleNavigate} />;
      }
      if (currentPath === '/patient/access-history') {
        return <PatientAccessHistory onNavigate={handleNavigate} />;
      }
      if (currentPath === '/patient/notifications') {
        return <PatientDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/patient/settings') {
        return (
          <div className="bg-white p-6 rounded-xl border border-[#DCE3EC]">
            <h2 className="text-lg font-bold text-[#142238]">Patient Profile & Preferences</h2>
            <p className="text-xs text-[#596579] mt-1">Alex Morgan · MRN-2026-9042 · MFA Protected</p>
          </div>
        );
      }
    }

    // 4. Insurance Portal Routes
    if (currentPath.startsWith('/insurance')) {
      if (store.currentUser.role !== 'INSURANCE' && store.currentUser.role !== 'ADMIN') {
        return <AccessDeniedPage onNavigate={handleNavigate} />;
      }

      if (currentPath === '/insurance/dashboard') {
        return <InsuranceDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/insurance/claims') {
        return <ClaimsList onNavigate={handleNavigate} />;
      }
      if (currentPath.startsWith('/insurance/claims/')) {
        const claimId = currentPath.split('/')[3];
        return <ClaimDetail claimId={claimId} onNavigate={handleNavigate} />;
      }
      if (currentPath === '/insurance/authorizations') {
        return <AuthorizationsList onNavigate={handleNavigate} />;
      }
      if (currentPath === '/insurance/policies') {
        return <InsuranceDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/insurance/documents') {
        return <InsuranceDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/insurance/access-history') {
        return <PatientAccessHistory onNavigate={handleNavigate} />;
      }
      if (currentPath === '/insurance/settings') {
        return (
          <div className="bg-white p-6 rounded-xl border border-[#DCE3EC]">
            <h2 className="text-lg font-bold text-[#142238]">Adjuster Credentials & Carrier Bindings</h2>
            <p className="text-xs text-[#596579] mt-1">Elena Rostova · Apex Health Shield Enterprise</p>
          </div>
        );
      }
    }

    // 5. Admin Portal Routes
    if (currentPath.startsWith('/admin')) {
      if (store.currentUser.role !== 'ADMIN') {
        return <AccessDeniedPage onNavigate={handleNavigate} />;
      }

      if (currentPath === '/admin/dashboard') {
        return <AdminDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/admin/users') {
        return <UserManagement onNavigate={handleNavigate} />;
      }
      if (currentPath === '/admin/roles') {
        return <RolesPermissions onNavigate={handleNavigate} />;
      }
      if (currentPath === '/admin/audit') {
        return <AdminAuditLogs onNavigate={handleNavigate} />;
      }
      if (currentPath === '/admin/audit/integrity') {
        return <IntegrityVerification onNavigate={handleNavigate} />;
      }
      if (currentPath === '/admin/encryption') {
        return <EncryptionManagement onNavigate={handleNavigate} />;
      }
      if (currentPath === '/admin/security') {
        return <AdminDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/admin/system-health') {
        return <SystemStatusPage onNavigate={handleNavigate} />;
      }
      if (currentPath === '/admin/backup-recovery') {
        return <AdminDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/admin/settings') {
        return <AdminDashboard onNavigate={handleNavigate} />;
      }
    }

    // 6. Security Auditor Portal Routes
    if (currentPath.startsWith('/auditor')) {
      if (store.currentUser.role !== 'AUDITOR' && store.currentUser.role !== 'ADMIN') {
        return <AccessDeniedPage onNavigate={handleNavigate} />;
      }

      if (currentPath === '/auditor/dashboard') {
        return <AuditorDashboard onNavigate={handleNavigate} />;
      }
      if (currentPath === '/auditor/audit') {
        return <AdminAuditLogs onNavigate={handleNavigate} />;
      }
      if (currentPath === '/auditor/integrity') {
        return <IntegrityVerification onNavigate={handleNavigate} />;
      }
      if (currentPath === '/auditor/security-events') {
        return <SecurityEventsView onNavigate={handleNavigate} />;
      }
      if (currentPath === '/auditor/reports') {
        return <AuditorReportsView onNavigate={handleNavigate} />;
      }
    }

    // Default Fallback
    return <DoctorDashboard onNavigate={handleNavigate} />;
  };

  const isPublicRoute =
    currentPath === '/login' ||
    currentPath === '/auth/mfa' ||
    currentPath === '/auth/forgot-password' ||
    currentPath === '/access-denied' ||
    currentPath === '/system-status' ||
    currentPath.startsWith('/legal/');

  return (
    <ToastProvider>
      {isPublicRoute ? (
        renderCurrentView()
      ) : (
        <AppShell currentPath={currentPath} onNavigate={handleNavigate}>
          {renderCurrentView()}
        </AppShell>
      )}
    </ToastProvider>
  );
}
