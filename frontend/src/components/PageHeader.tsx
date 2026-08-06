import type { ReactNode } from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { Button } from './Button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, onBack, backLabel, actions }: PageHeaderProps) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      {onBack && (
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} weight="bold" />} onClick={onBack}>
          {backLabel ?? 'Back'}
        </Button>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-[13px] text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
