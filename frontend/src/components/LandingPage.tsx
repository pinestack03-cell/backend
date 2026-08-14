import { Moon, ShieldCheck, Sun, UserCircle, UsersThree } from '@phosphor-icons/react';
import { Button, Panel } from './index';

export type AuthMode = 'admin' | 'candidate';

interface LandingPageProps {
  dark: boolean;
  onToggleDark: () => void;
  onSelect: (mode: AuthMode) => void;
}

export function LandingPage({ dark, onToggleDark, onSelect }: LandingPageProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex h-14 shrink-0 items-center justify-between px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white dark:bg-slate-950">
            <UsersThree size={16} weight="fill" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Globe1</span>
          <span className="hidden h-4 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
          <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">Resume Management</span>
        </div>
        <button
          onClick={onToggleDark}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Light mode' : 'Dark mode'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-slate-400/60 active:scale-[0.98]"
        >
          {dark ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="auth-enter w-full max-w-xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm dark:bg-slate-950">
              <UsersThree size={24} weight="fill" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Resume Management
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Internal candidate records platform. Sign in as an administrator to manage records, or as a candidate
              to view and update your profile.
            </p>
          </div>

          <div className="auth-enter-late mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Panel className="flex flex-col p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <ShieldCheck size={18} weight="bold" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Administrator</h2>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                Search candidates, review resumes, and manage records.
              </p>
              <Button className="mt-4 w-full" onClick={() => onSelect('admin')}>
                Admin Login
              </Button>
            </Panel>

            <Panel className="flex flex-col p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <UserCircle size={18} weight="bold" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Candidate</h2>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                View your profile, update your details, and upload your CV.
              </p>
              <Button variant="secondary" className="mt-4 w-full" onClick={() => onSelect('candidate')}>
                Continue with Google
              </Button>
            </Panel>
          </div>
        </div>
      </main>

      <footer className="pb-5 text-center text-xs text-slate-400 dark:text-slate-600">
        Internal tool · Globe1
      </footer>
    </div>
  );
}
