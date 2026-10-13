import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  headerAction,
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-[#DCE3EC] shadow-xs overflow-hidden ${className}`}
      {...props}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DCE3EC] bg-[#FFFFFF]">
          <div>
            {title && <h3 className="text-base font-semibold text-[#172033] tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[#596579] mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div className="shrink-0 ml-4">{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
