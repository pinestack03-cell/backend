import { Moon, SignOut, Sun, UsersThree } from '@phosphor-icons/react';

interface TopNavProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  dark?: boolean;
  onToggleDark?: () => void;
  role?: 'admin' | 'candidate';
  onLogout?: () => void;
}

export function TopNav({ tabs, activeTab, onTabChange, dark, onToggleDark, role, onLogout }: TopNavProps) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white dark:bg-slate-950">
          <UsersThree size={16} weight="fill" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Globe1</span>
        <span className="hidden h-4 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
        <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">Resume Management</span>
      </div>

      {tabs.length > 0 && (
        <nav
          aria-label="Main navigation"
          className="mx-auto flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:focus-visible:ring-slate-400/60 ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      )}

      <div className="flex w-[176px] shrink-0 items-center justify-end gap-2">
        {onToggleDark && (
          <button
            onClick={onToggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-slate-400/60 active:scale-[0.98]"
          >
            {dark ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
          </button>
        )}
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {role === 'candidate' ? 'Candidate' : 'Admin'}
        </span>
        {onLogout && (
          <button
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-slate-400/60 active:scale-[0.98]"
          >
            <SignOut size={16} weight="bold" />
          </button>
        )}
      </div>
    </header>
  );
}
