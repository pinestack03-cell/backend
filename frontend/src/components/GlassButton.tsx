import type { ButtonHTMLAttributes } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function GlassButton({ children, variant = 'primary', className = '', ...props }: GlassButtonProps) {
  const baseStyles = `
    px-6 py-3 rounded-xl font-semibold
    transition-all duration-300 ease-in-out
    transform hover:scale-[1.02] active:scale-[0.98]
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-blue-500 to-cyan-400
      text-white
      shadow-[0_4px_20px_rgba(59,130,246,0.4)]
      hover:shadow-[0_4px_30px_rgba(6,182,212,0.5)]
      hover:from-blue-400 hover:to-cyan-300
    `,
    secondary: `
      bg-white/10 backdrop-blur-md
      border border-white/30
      text-white
      shadow-lg shadow-black/20
      hover:bg-white/20 hover:border-white/40
    `,
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
