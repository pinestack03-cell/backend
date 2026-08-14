import { useState } from 'react';
import {
  ArrowLeft,
  CircleNotch,
  Moon,
  ShieldCheck,
  Sun,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react';
import { Button, Field, Input, Panel } from './index';
import { API_URL } from '../utils/api';
import { getSession, setSessionToken, type Session } from '../utils/auth';
import type { AuthMode } from './LandingPage';

interface LoginViewProps {
  mode: AuthMode;
  dark: boolean;
  onToggleDark: () => void;
  onBack: () => void;
  onLogin: (session: Session) => void;
  oauthError?: string | null;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function LoginView({ mode, dark, onToggleDark, onBack, onLogin, oauthError }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = mode === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Enter your username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL.adminLogin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.token) {
        setError(data.error || 'Login failed');
        return;
      }
      setSessionToken(data.token);
      const session = getSession();
      if (session) {
        onLogin(session);
      } else {
        setError('Could not start a session. Please try again.');
      }
    } catch {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex h-14 shrink-0 items-center justify-between px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white dark:bg-slate-950">
            <UsersThree size={16} weight="fill" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Globe1</span>
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
        <div className="auth-enter w-full max-w-sm">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} weight="bold" />} onClick={onBack}>
            Back
          </Button>

          <Panel className="mt-3 p-6">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isAdmin
                  ? 'border border-blue-200 bg-blue-50 text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {isAdmin ? <ShieldCheck size={20} weight="bold" /> : <UserCircle size={20} weight="bold" />}
            </div>
            <h1 className="mt-4 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {isAdmin ? 'Admin Login' : 'Candidate Login'}
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
              {isAdmin
                ? 'Internal access for record management.'
                : 'Candidates sign in with the Google account registered by the admin.'}
            </p>

            {!isAdmin ? (
              <div className="mt-5">
                {(oauthError || error) && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium leading-relaxed text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    {oauthError || error}
                  </p>
                )}
                <a
                  href={API_URL.googleAuth}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-150 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-400/60"
                >
                  <GoogleMark />
                  Continue with Google
                </a>
                <p className="mt-3 text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                  Your Google email must match the email on your candidate profile.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <Field label="Username" htmlFor="login-username">
                  <Input
                    id="login-username"
                    name="username"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </Field>
                <Field label="Password" htmlFor="login-password">
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </Field>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <CircleNotch size={15} weight="bold" className="animate-spin" />}
                  Sign In
                </Button>
              </form>
            )}
          </Panel>
        </div>
      </main>

      <footer className="pb-5 text-center text-xs text-slate-400 dark:text-slate-600">Internal tool · Globe1</footer>
    </div>
  );
}
