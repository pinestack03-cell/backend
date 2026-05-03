import type { SelectHTMLAttributes } from 'react';

interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function GlassSelect({ label, options, className = '', ...props }: GlassSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300 tracking-wide">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-3 rounded-xl
          bg-white/10 backdrop-blur-md
          border border-white/20
          text-white
          outline-none
          transition-all duration-300 ease-in-out
          focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/30
          focus:shadow-[0_0_20px_rgba(6,182,212,0.3)]
          focus:bg-white/15
          hover:border-white/30 hover:bg-white/15
          cursor-pointer
          appearance-none
          ${className}
        `}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2306b6d4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: '20px',
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-900">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
