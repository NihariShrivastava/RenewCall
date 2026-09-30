import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Eye, EyeOff, Lock, X } from 'lucide-react';

export const ChangePasswordModal: React.FC = () => {
  const { showChangePasswordModal, setShowChangePasswordModal, updateCurrentUserPassword, user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showChangePasswordModal || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const success = await updateCurrentUserPassword(newPassword);
    setIsSubmitting(false);

    if (!success) {
      setError('Failed to update password. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => setShowChangePasswordModal(false)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2338]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-[#4f6ef7]/20 to-[#8b5cf6]/20 border border-[#4f6ef7]/40 rounded-xl text-[#4f6ef7]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">First-Time Setup</h3>
            <p className="text-xs text-slate-400">Change default credentials for security</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-5 bg-[#0e1017] p-3 rounded-xl border border-[#252840]/60">
          You are currently logged in with default credentials (<span className="text-[#4f6ef7] font-mono">admin123</span>). Please update your password to secure the workstation.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-10 pr-10 py-2.5 bg-[#0e1017] border border-[#252840] rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#4f6ef7] focus:ring-1 focus:ring-[#4f6ef7]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0e1017] border border-[#252840] rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#4f6ef7] focus:ring-1 focus:ring-[#4f6ef7]"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowChangePasswordModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-[#1f2338]"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white gradient-btn rounded-xl disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
