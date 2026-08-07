import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, CheckCircle2, Sparkles, Utensils } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { saveAuthToken } from '../../utils/cookieUtils';

interface LoginViewProps {
  onLoginSuccess: (user: any, accessToken: string, refreshToken: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<'request_otp' | 'verify_otp'>('request_otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1: Request Email OTP for Staff
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Login failed');
      }

      if (json.data?.directLogin) {
        const accessToken = json.data.accessToken || 'demo-access-token';
        const refreshToken = json.data.refreshToken || 'demo-refresh-token';
        saveAuthToken(accessToken, refreshToken, json.data.user);
        onLoginSuccess(json.data.user, accessToken, refreshToken);
        return;
      }

      setSuccessMsg(`Security OTP verification code emailed to ${email}! Check your inbox.`);
      setStep('verify_otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to authentication service');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Invalid or expired OTP code');
      }

      const accessToken = json.data.accessToken || 'demo-access-token';
      const refreshToken = json.data.refreshToken || 'demo-refresh-token';

      saveAuthToken(accessToken, refreshToken, json.data.user);

      onLoginSuccess(
        json.data.user,
        accessToken,
        refreshToken
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-steel flex items-center justify-center p-6 selection:bg-primary/20">
      <div className="w-full max-w-md bg-surface border border-mist rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 bg-steel border-b border-mist text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-primary text-white font-mono font-bold text-xl flex items-center justify-center mx-auto shadow-md">
            <Utensils className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Restaurant SaaS Operations</h1>
          <p className="text-xs text-graphite font-mono">Staff Authentication Portal · Email OTP Verification</p>
        </div>

        {/* Step 1: Request OTP Form */}
        {step === 'request_otp' && (
          <form onSubmit={handleRequestOtp} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-[#C1440E] text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="text-xs font-mono text-graphite block mb-1">Staff Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-graphite" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-md border border-mist text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-surface font-mono"
                  placeholder="staff@restaurant.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-graphite block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-graphite" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-md border border-mist text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-surface font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-md bg-primary hover:bg-primary-hover text-white font-bold text-xs tracking-wider uppercase shadow flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 font-mono"
            >
              {isLoading ? 'Logging In...' : 'Login'}
              <Sparkles className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP Form */}
        {step === 'verify_otp' && (
          <form onSubmit={handleVerifyOtp} className="p-6 space-y-4 font-sans">
            {successMsg && (
              <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-[#C1440E] text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="text-center space-y-2">
              <label className="text-xs font-mono text-graphite block uppercase font-bold">Enter 6-Digit Email OTP</label>
              <input
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full py-3 text-center text-2xl font-mono font-bold tracking-[8px] rounded-md border border-primary bg-primary/5 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="123456"
              />
              <p className="text-[11px] text-graphite font-mono">OTP code sent to <strong>{email}</strong></p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('request_otp')}
                className="flex-1 py-2.5 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-mono"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="flex-1 py-2.5 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow font-mono disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify OTP & Access'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
