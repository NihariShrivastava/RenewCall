import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { User as UserIcon, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { RenewCallLogo, RenewCallIcon } from '../../components/common/RenewCallLogo';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const res = await login(username, password);
    setIsSubmitting(false);

    if (res.success) {
      const rawUser = localStorage.getItem('renewcall_auth_session');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/telecaller/roster');
        }
      } else {
        navigate('/admin/dashboard');
      }
    } else {
      setError(res.error || 'Failed to authenticate.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1017] flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#4f6ef7]/10 to-[#8b5cf6]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Server status pill */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between z-10">
        <RenewCallLogo size="sm" />

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#161926] border border-[#252840] text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Server: {isSupabaseConfigured ? 'Supabase' : 'Active (Local)'}</span>
        </div>
      </div>

      {/* Center Form Card */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-8">
        {/* Brand Header with New Calling-Renewal Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#161926] to-[#1f2338] border border-[#252840] flex items-center justify-center shadow-xl shadow-indigo-950/60 mb-4 ring-8 ring-[#161926]">
            <RenewCallIcon size={44} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white font-sans">
            RENEW<span className="text-[#4f6ef7]">CALL</span>
          </h1>
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mt-1">
            INSURANCE RENEWAL ENGINE
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#161926] border border-[#252840] rounded-2xl p-7 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Welcome Back</h2>
            <p className="text-xs text-slate-400 mt-1">
              Access your administrative or telecaller calling workstation.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or telecaller"
                  className="w-full pl-10 pr-4 py-3 bg-[#0e1017] border border-[#252840] rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#4f6ef7] focus:ring-1 focus:ring-[#4f6ef7] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-3 bg-[#0e1017] border border-[#252840] rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#4f6ef7] focus:ring-1 focus:ring-[#4f6ef7] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl gradient-btn text-white text-sm font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Enter Workstation →'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 z-10">
        RenewCall Insurance Calling System &bull; Secure Administrative & Agent Portal
      </div>
    </div>
  );
};
