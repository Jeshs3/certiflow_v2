import React, { useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { loginAdminOfficer, OfficerUser } from '../services/authService';

interface AdminLoginViewProps {
  onLoginSuccess: (user: OfficerUser) => void;
  initialError?: string | null;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  initialError = null,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your officer email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const result = await loginAdminOfficer(username.trim(), password);
    setIsSubmitting(false);

    if (result.ok && result.user) {
      onLoginSuccess(result.user);
    } else {
      setError(
        result.error ||
          'Incorrect email or password. Please double-check your credentials and try again.'
      );
    }
  };

  return (
    <div className="font-helvetica bg-registry-grid min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-[780px] bg-[#1D4ED8] border-2 border-[#1E3A8A] rounded-sm shadow-[8px_8px_0px_0px_rgba(30,58,138,0.18)] text-white overflow-hidden">
        {/* Top Archival Ledger Strip */}
        <div className="px-6 py-3.5 sm:px-8 border-b border-white/20 bg-[#1E40AF] flex flex-wrap items-center justify-between gap-2 text-xs text-blue-100">
          <span>Republic of the Philippines · Province of Bohol</span>
          <span className="font-semibold tracking-wide text-white">Registry Portal CR-01</span>
        </div>

        {/* Asymmetric Two-Column Dossier Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.18fr] items-stretch">
          {/* Left Institutional Plate */}
          <div className="p-6 sm:p-8 flex flex-col justify-between gap-8 border-b md:border-b-0 md:border-r border-white/20 bg-[#1E3A8A]/45">
            <div className="space-y-5">
              {/* Custom Municipal Crest */}
              <div className="inline-flex items-center gap-3">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 44 44"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <rect
                    x="1.5"
                    y="1.5"
                    width="41"
                    height="41"
                    rx="2"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="5.5"
                    y="5.5"
                    width="33"
                    height="33"
                    rx="1"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth="1"
                  />
                  <path
                    d="M15 14H24L29 19V30H15V14Z"
                    stroke="white"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path d="M24 14V19H29" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M18.5 22.5H25.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M18.5 26H23.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div className="leading-tight">
                  <div className="text-lg font-bold tracking-tight text-white">Certiflow</div>
                  <div className="text-xs text-blue-100">Sagbayan Documents</div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h1 className="text-2xl font-bold leading-snug text-white [text-wrap:balance]">
                  Municipal Civil Registry Office
                </h1>
                <p className="text-sm text-blue-100 leading-relaxed">
                  Official preparation workspace for Certificate of Live Birth (COLB Form 102) and
                  Certificate of Marriage (COM Form 97).
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/20 text-xs text-blue-100 space-y-1">
              <div className="font-semibold text-white">Municipality of Sagbayan</div>
              <div>Authorized Civil Registry Personnel Only</div>
            </div>
          </div>

          {/* Right Royal Blue Sign-In Form */}
          <div className="p-6 sm:p-8 flex flex-col justify-center bg-[#1D4ED8]">
            <div className="mb-6 space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">Officer Sign In</h2>
              <p className="text-xs text-blue-100">
                Enter your registered municipal email and password to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-sm bg-rose-950/85 border border-rose-300/60 px-3.5 py-2.5 text-xs text-white font-medium"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-200" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="officer-username"
                  className="block text-xs font-semibold text-blue-50"
                >
                  Officer Email
                </label>
                <input
                  id="officer-username"
                  type="email"
                  autoComplete="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="officer@sagbayan.gov.ph"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-sm bg-white border border-blue-900/30 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="officer-password"
                  className="block text-xs font-semibold text-blue-50"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="officer-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full min-h-[42px] pl-3.5 pr-10 py-2 rounded-sm bg-white border border-blue-900/30 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded-sm"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-sm bg-white hover:bg-blue-50 text-[#1E3A8A] text-sm font-bold tracking-tight transition-colors duration-150 disabled:opacity-65 cursor-pointer whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Sign In to Registry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
