import { UsersThree } from '@phosphor-icons/react';

interface TopNavProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TopNav({ tabs, activeTab, onTabChange }: TopNavProps) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <UsersThree size={16} weight="fill" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-slate-900">Globe1</span>
        <span className="hidden h-4 w-px bg-slate-200 sm:block" />
        <span className="hidden text-sm text-slate-500 sm:block">Resume Management</span>
      </div>

      <nav
        aria-label="Main navigation"
        className="mx-auto flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="flex w-[140px] shrink-0 justify-end">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
          Internal tool
        </span>
      </div>
    </header>
  );
}
