import React, { useState } from 'react';
import { Shield, Lock, Mail, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UserRole } from '../../types/ehr';
import { store } from '../../services/store';

interface LoginProps {
  onLoginSuccess: (role: UserRole) => void;
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('dr_sarah_chen@aegishealth.org');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      setIsLoading(false);
      const user = store.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (user) {
        store.loginAs(user.role);
        onLoginSuccess(user.role);
      } else {
        setError("We couldn't sign you in. Check your credentials or contact your administrator.");
      }
    }, 400);
  };

  const handleQuickLogin = (role: UserRole) => {
    const target = store.users.find(u => u.role === role);
    if (target) {
      setEmail(target.email);
      setPassword('CorrectHorseBatteryStaple!2026');
      store.loginAs(role);
      onLoginSuccess(role);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2457C5] text-white shadow-md mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-[#142238] tracking-tight">
          Sign in to your health record system
        </h1>
        <p className="text-xs text-[#596579] mt-1.5">
          Secure, column-encrypted access to authorized healthcare records.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-lg border border-[#DCE3EC] rounded-2xl">
          {error && (
            <div className="mb-5 p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start gap-2.5 text-xs text-[#B91C1C]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <Input
              label="Work or Personal Email"
              type="email"
              required
              leftIcon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@organization.com"
            />

            <div>
              <Input
                label="Password"
                type="password"
                required
                leftIcon={<Lock className="w-4 h-4" />}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => onNavigate('/auth/forgot-password')}
                  className="text-xs font-medium text-[#2457C5] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              Sign in with Multi-Factor Verification
            </Button>
          </form>

          {/* 1-Click Evaluation Persona Selector */}
          <div className="mt-6 pt-6 border-t border-[#DCE3EC]">
            <p className="text-xs font-semibold text-[#172033] mb-2.5">
              Instant 1-Click Test Personas (Synthetic Evaluation):
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('DOCTOR')}
                className="w-full text-left px-3 py-2 text-xs rounded-lg border border-[#DCE3EC] hover:bg-[#F8FAFC] flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-[#172033]">Dr. Sarah Chen, MD (Doctor)</div>
                  <div className="text-[11px] text-[#596579]">dr_sarah_chen@aegishealth.org</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#2457C5]" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('PATIENT')}
                className="w-full text-left px-3 py-2 text-xs rounded-lg border border-[#DCE3EC] hover:bg-[#F8FAFC] flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-[#172033]">Alex Morgan (Patient)</div>
                  <div className="text-[11px] text-[#596579]">alex_morgan@example.com</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#0F766E]" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('INSURANCE')}
                className="w-full text-left px-3 py-2 text-xs rounded-lg border border-[#DCE3EC] hover:bg-[#F8FAFC] flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-[#172033]">Elena Rostova (Insurance)</div>
                  <div className="text-[11px] text-[#596579]">elena_rostova@apexinsurance.com</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#7C3AED]" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="w-full text-left px-3 py-2 text-xs rounded-lg border border-[#DCE3EC] hover:bg-[#F8FAFC] flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-[#172033]">Marcus Vance (Administrator)</div>
                  <div className="text-[11px] text-[#596579]">marcus_vance@aegishealth.org</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#B45309]" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('AUDITOR')}
                className="w-full text-left px-3 py-2 text-xs rounded-lg border border-[#DCE3EC] hover:bg-[#F8FAFC] flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-[#172033]">Dr. Hassan Malik (Security Auditor)</div>
                  <div className="text-[11px] text-[#596579]">dr_hassan_malik@auditguard.org</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#15803D]" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#596579] space-x-3">
          <button onClick={() => onNavigate('/legal/privacy')} className="hover:underline cursor-pointer">
            Privacy Policy
          </button>
          <span>·</span>
          <button onClick={() => onNavigate('/legal/terms')} className="hover:underline cursor-pointer">
            Terms of Use
          </button>
          <span>·</span>
          <button onClick={() => onNavigate('/system-status')} className="hover:underline cursor-pointer">
            Service Availability
          </button>
        </div>
      </div>
    </div>
  );
};

export const MfaPage: React.FC<{ onMfaSuccess: () => void }> = ({ onMfaSuccess }) => {
  const [code, setCode] = useState('849201');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onMfaSuccess();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-lg border border-[#DCE3EC] rounded-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-[#EAF0FF] text-[#2457C5] flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#142238]">Verify your identity</h1>
          <p className="text-xs text-[#596579] mt-1 mb-6">
            Enter the 6-digit verification code from your hardware token or authenticator app.
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              label="Verification Code"
              type="text"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value)}
              className="text-center font-mono text-lg tracking-widest"
              required
            />
            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Verify and continue
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-lg border border-[#DCE3EC] rounded-2xl text-center">
          <h1 className="text-xl font-bold text-[#142238]">Reset your password</h1>
          <p className="text-xs text-[#596579] mt-1 mb-6">
            Enter the email address associated with your account.
          </p>

          {submitted ? (
            <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-left text-xs text-[#15803D] space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Instructions Sent</span>
              </div>
              <p>
                If an eligible account matches that address, password-reset instructions have been sent.
              </p>
              <Button variant="secondary" size="sm" onClick={() => onNavigate('/login')} className="w-full mt-2">
                Back to sign in
              </Button>
            </div>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-4"
            >
              <Input
                label="Email address"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@organization.com"
              />
              <Button type="submit" variant="primary" className="w-full">
                Send reset link
              </Button>
              <Button type="button" variant="tertiary" onClick={() => onNavigate('/login')} className="w-full">
                Back to sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const AccessDeniedPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-center py-12 px-6">
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-[#FECACA] shadow-lg text-center">
        <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-[#142238]">You don't have access to this page</h1>
        <p className="text-xs text-[#596579] mt-2 mb-6 leading-relaxed">
          Your account does not have permission to access this resource. An authorization denial event
          has been securely recorded in the tamper-evident audit log.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="primary" onClick={() => onNavigate('/doctor/dashboard')}>
            Return to dashboard
          </Button>
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
};

export const SystemStatusPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#142238]">System status</h1>
          <p className="text-xs text-[#596579] mt-1">Current availability of application services.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onNavigate('/doctor/dashboard')}>
          Back to portal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {store.health.map(h => (
          <div key={h.id} className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#172033]">{h.name}</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                {h.status}
              </span>
            </div>
            <p className="text-xs text-[#596579]">{h.message}</p>
            <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B] font-mono">
              <span>Latency: {h.latencyMs}ms</span>
              <span>Updated: Just now</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LegalPage: React.FC<{ title: string; content: string; onNavigate: (path: string) => void }> = ({
  title,
  content,
  onNavigate,
}) => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="bg-white p-8 rounded-2xl border border-[#DCE3EC] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-4">
          <h1 className="text-2xl font-bold text-[#142238]">{title}</h1>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('/login')}>
            Back
          </Button>
        </div>
        <div className="prose text-xs text-[#596579] leading-relaxed whitespace-pre-line">{content}</div>
      </div>
    </div>
  );
};
