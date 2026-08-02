import React, { useState } from 'react';
import { Shield, Sparkles, AlertCircle, MessageSquareCode } from 'lucide-react';

interface LoginProps {
  onLogin: (userName: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isDark, onToggleTheme }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setError(null);
    // Simulate premium secure SSO oauth flow authentication
    setTimeout(() => {
      try {
        onLogin("Sarah Parker");
      } catch {
        setError("SSO Sign-in failed. Please try again.");
        setIsLoading(false);
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Top Header Row */}
      <header className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-500 text-white p-2.5 rounded-xl shadow-md shadow-emerald-500/20">
            <MessageSquareCode className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            SPPChat
          </span>
        </div>

        {/* Theme toggle switch in header */}
        <button
          onClick={onToggleTheme}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 shadow-sm text-gray-600 dark:text-gray-300 transition-all duration-200"
          aria-label="Toggle Theme"
        >
          {isDark ? (
            <span className="flex items-center gap-2 text-sm font-medium">
              ☀️ <span className="hidden sm:inline">Light Mode</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm font-medium">
              🌙 <span className="hidden sm:inline">Dark Mode</span>
            </span>
          )}
        </button>
      </header>

      {/* Main Login Auth Center Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="relative max-w-md w-full">
          {/* Decorative Background Blur */}
          <div className="absolute -top-12 -left-12 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl" />

          {/* Premium Card Container */}
          <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/10">
            {/* Branding & Header inside card */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Next-Gen Chat Web Client</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                Welcome to <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">SPPChat</span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                A premium, secure, and production-ready messaging platform. Log in below to access your dynamic chats.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Authentication SSO Button */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3.5 py-3 px-4 bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900/90 border border-gray-300 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700 rounded-xl font-semibold text-gray-800 dark:text-gray-100 shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <svg
                      className="animate-spin h-5 w-5 text-emerald-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Authenticating secure session...</span>
                  </div>
                ) : (
                  <>
                    {/* Google Gmail Multi-color Vector Logo */}
                    <svg
                      className="w-6 h-6 flex-shrink-0 group-hover:scale-105 transition-transform"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.77-.07-1.54-.2-2.27H12v4.51h6.6c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.97z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.32 14.24A7.16 7.16 0 0 1 5 12c0-.79.13-1.57.32-2.34V6.51H1.21A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.21 5.39l4.11-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.18 2.12 1.21 5.61l4.11 3.15c.94-2.85 3.57-4.96 6.68-4.96z"
                      />
                    </svg>
                    <span className="font-bold">Sign in with Google / Gmail</span>
                  </>
                )}
              </button>
            </div>

            {/* Premium details block footer within card */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" /> Secure 256-bit SSL
              </span>
              <span>v1.0.0 Stable</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center p-6 text-xs text-gray-500 dark:text-gray-400 max-w-7xl mx-auto w-full">
        <p>© 2026 SPPChat Incorporated. Built with React 19, Vite, and Tailwind CSS.</p>
      </footer>
    </div>
  );
};
