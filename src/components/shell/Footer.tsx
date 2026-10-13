import React from 'react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-auto border-t border-[#DCE3EC] bg-white py-4 px-6 text-xs text-[#596579]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#172033]">AegisHealth AMC</span>
          <span>·</span>
          <span>Version 4.2-EHR (AES-256 Envelope Certified)</span>
          <span>·</span>
          <span className="flex items-center gap-1.5 text-[#15803D]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
            Systems Operational
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('/legal/privacy')}
            className="hover:text-[#172033] hover:underline cursor-pointer"
          >
            Privacy
          </button>
          <button
            onClick={() => onNavigate('/legal/terms')}
            className="hover:text-[#172033] hover:underline cursor-pointer"
          >
            Terms of Use
          </button>
          <button
            onClick={() => onNavigate('/legal/accessibility')}
            className="hover:text-[#172033] hover:underline cursor-pointer"
          >
            Accessibility
          </button>
          <button
            onClick={() => onNavigate('/system-status')}
            className="hover:text-[#172033] hover:underline cursor-pointer font-medium text-[#2457C5]"
          >
            System Status
          </button>
        </div>
      </div>
    </footer>
  );
};
