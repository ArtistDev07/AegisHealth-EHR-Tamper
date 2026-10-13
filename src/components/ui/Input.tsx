import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  id,
  className = '',
  required,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#172033]">
          {label}
          {required && <span className="text-[#B91C1C] ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-[#596579] pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          required={required}
          className={`w-full h-10 px-3.5 ${leftIcon ? 'pl-10' : ''} ${
            rightIcon ? 'pr-10' : ''
          } bg-white text-sm text-[#172033] placeholder:text-[#94A3B8] border ${
            error ? 'border-[#B91C1C] focus:ring-[#B91C1C]' : 'border-[#DCE3EC] focus:border-[#2457C5]'
          } rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#2457C5]/20 transition-all ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-[#596579] flex items-center">{rightIcon}</div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-[#B91C1C] mt-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#596579] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  id,
  className = '',
  required,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-[#172033]">
          {label}
          {required && <span className="text-[#B91C1C] ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        required={required}
        className={`w-full h-10 px-3 bg-white text-sm text-[#172033] border ${
          error ? 'border-[#B91C1C]' : 'border-[#DCE3EC]'
        } rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#2457C5]/20 focus:border-[#2457C5] transition-all cursor-pointer ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-[#B91C1C] mt-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#596579] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  id,
  className = '',
  required,
  rows = 4,
  ...props
}) => {
  const areaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={areaId} className="block text-xs font-semibold text-[#172033]">
          {label}
          {required && <span className="text-[#B91C1C] ml-1">*</span>}
        </label>
      )}
      <textarea
        id={areaId}
        rows={rows}
        required={required}
        className={`w-full p-3 bg-white text-sm text-[#172033] placeholder:text-[#94A3B8] border ${
          error ? 'border-[#B91C1C]' : 'border-[#DCE3EC]'
        } rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#2457C5]/20 focus:border-[#2457C5] transition-all ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-[#B91C1C] mt-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#596579] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
