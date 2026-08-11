import type { InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from 'react';
import { inputBaseClass, inputErrorClass } from './inputStyles';

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, required, error, hint, children, className = '' }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ className = '', error, leading, trailing, ref, ...props }: InputProps) {
  const input = (
    <input
      ref={ref}
      className={`${inputBaseClass} ${leading ? 'pl-8' : ''} ${trailing ? 'pr-10' : ''} ${inputErrorClass(error)} ${className}`}
      {...props}
    />
  );
  if (leading === undefined && trailing === undefined) return input;
  return (
    <div className="relative">
      {input}
      {leading !== undefined && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-slate-400 dark:text-slate-500">
          {leading}
        </span>
      )}
      {trailing !== undefined && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] font-medium text-slate-400 dark:text-slate-500">
          {trailing}
        </span>
      )}
    </div>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ className = '', error, ref, ...props }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      className={`${inputBaseClass} h-auto min-h-[72px] py-2 leading-relaxed resize-none ${inputErrorClass(error)} ${className}`}
      {...props}
    />
  );
}
