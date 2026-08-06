interface StatusBadgeProps {
  status?: string;
}

interface Tone {
  label: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
}

const STATUS_TONES: Record<string, Tone> = {
  notice_period: {
    label: 'Notice Period',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    dot: 'bg-sky-500',
    text: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  offer_extended: {
    label: 'Offer Extended',
    dot: 'bg-violet-500',
    text: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  joined: {
    label: 'Joined',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  on_hold: {
    label: 'On Hold',
    dot: 'bg-slate-400',
    text: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
};

const FALLBACK_TONE: Tone = {
  label: '',
  dot: 'bg-slate-400',
  text: 'text-slate-600',
  bg: 'bg-slate-50',
  border: 'border-slate-200',
};

const formatStatus = (status: string) =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return null;
  const tone = STATUS_TONES[status.toLowerCase()] ?? {
    ...FALLBACK_TONE,
    label: formatStatus(status),
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${tone.bg} ${tone.border} ${tone.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {tone.label}
    </span>
  );
}
