import type { ReactNode } from 'react';

interface TabNavigationProps {
  tabs: { id: string; label: string; icon?: ReactNode; badge?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex justify-center mb-8">
      <div
        className="inline-flex items-center gap-1 p-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/20"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-5 py-2 rounded-full font-medium text-sm
              transition-all duration-300 ease-in-out
              ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`
                  ml-1 px-2 py-0.5 text-xs rounded-full font-semibold
                  ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/40 text-cyan-200'
                      : 'bg-white/20 text-white/70'
                  }
                `}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
