import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
type Size = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium select-none ' +
  'transition-colors duration-150 disabled:pointer-events-none disabled:select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-slate-400/60 dark:focus-visible:ring-offset-slate-900 ' +
  'active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 ' +
    'dark:bg-slate-950 dark:hover:bg-slate-900 dark:active:bg-slate-800 ' +
    'disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 ' +
    'disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 ' +
    'dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-slate-600 dark:active:bg-slate-800 ' +
    'dark:disabled:bg-slate-900 dark:disabled:text-slate-600 dark:disabled:border-slate-800',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 ' +
    'disabled:text-slate-300 disabled:hover:bg-transparent ' +
    'dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:disabled:text-slate-600 dark:disabled:hover:bg-transparent',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 ' +
    'disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500',
  'danger-ghost':
    'text-red-600 hover:bg-red-50 hover:text-red-700 ' +
    'disabled:text-slate-300 disabled:hover:bg-transparent ' +
    'dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:disabled:text-slate-600 dark:disabled:hover:bg-transparent',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px]',
  md: 'h-9 px-3.5 text-sm',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({ label, className = '', ref, children, ...props }: IconButtonProps) {
  return (
    <button
      ref={ref}
      aria-label={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 dark:focus-visible:ring-slate-400/60 active:scale-[0.98] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
