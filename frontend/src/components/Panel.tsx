import type { ReactNode } from 'react';

export interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-panel ${className}`}
    >
      {children}
    </div>
  );
}
