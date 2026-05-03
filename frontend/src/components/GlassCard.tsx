import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = '', hover = false }: GlassCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-3xl
        bg-white/10 backdrop-blur-xl
        border border-white/20
        shadow-lg shadow-black/40
        ${hover ? 'transition-all duration-300 ease-in-out hover:scale-[1.02] hover:bg-white/15 hover:shadow-[0_8px_32px_rgba(6,182,212,0.2)]' : ''}
        ${className}
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
