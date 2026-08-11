import { useEffect, useState } from 'react';
import { CheckCircle, Info, XCircle } from '@phosphor-icons/react';
import { subscribeToasts, type ToastItem } from '../utils/toast';

const toastStyles = {
  success: { icon: <CheckCircle size={18} weight="fill" className="text-emerald-500" /> },
  error: { icon: <XCircle size={18} weight="fill" className="text-red-500" /> },
  info: { icon: <Info size={18} weight="fill" className="text-blue-500 dark:text-slate-300" /> },
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-toast flex w-[340px] flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className="toast-enter pointer-events-auto flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-lifted dark:border-slate-700 dark:bg-slate-900"
        >
          <span className="mt-px shrink-0">{toastStyles[item.type].icon}</span>
          <p className="text-[13px] leading-snug text-slate-700 dark:text-slate-200">{item.message}</p>
        </div>
      ))}
    </div>
  );
}
