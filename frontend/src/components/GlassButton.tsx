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
      bg-gradient-to-r from-white/20 to-white/10
      border border-white/20
      text-white
      shadow-lg shadow-black/20
      hover:from-white/25 hover:to-white/15
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
