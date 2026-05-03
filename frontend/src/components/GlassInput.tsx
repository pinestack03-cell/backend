import type { InputHTMLAttributes } from 'react';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function GlassInput({ label, className = '', ...props }: GlassInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300 tracking-wide">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3 rounded-xl
          bg-white/10 backdrop-blur-md
          border border-white/20
          text-white placeholder-white/40
          outline-none
          transition-all duration-300 ease-in-out
          focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/30
          focus:shadow-[0_0_20px_rgba(6,182,212,0.3)]
          focus:bg-white/15
          hover:border-white/30 hover:bg-white/15
          ${className}
        `}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
        }}
        {...props}
      />
    </div>
  );
}
