import type { SelectHTMLAttributes } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { inputBaseClass, inputErrorClass } from './inputStyles';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ className = '', error, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={`${inputBaseClass} appearance-none pr-9 cursor-pointer ${inputErrorClass(error)} ${className}`}
        {...props}
      >
        {children}
      </select>
      <CaretDown
        size={14}
        weight="bold"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}
