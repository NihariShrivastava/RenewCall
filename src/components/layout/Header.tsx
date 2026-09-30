import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Shield, User as UserIcon, RotateCw, LogOut, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RenewCallLogo } from '../common/RenewCallLogo';

interface HeaderProps {
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    } else {
      window.location.reload();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0e1017]/95 backdrop-blur-md border-b border-[#252840] px-4 lg:px-8 py-3.5">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Brand */}
        <RenewCallLogo size="md" />

        {/* Right side status & actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Server Connection Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#161926] border border-[#252840] text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Server: {isSupabaseConfigured ? 'Supabase' : 'Active (Local)'}</span>
          </div>

          {/* User & Role Badge */}
          {user && (
            <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-[#161926] border border-[#252840]">
              <div className="w-7 h-7 rounded-lg bg-[#252840] flex items-center justify-center text-slate-300">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-white leading-tight">{user.username}</p>
                <p className="text-[9px] font-bold tracking-wider uppercase text-[#4f6ef7]">
                  {user.role === 'admin' ? 'ADMINISTRATOR' : 'TELECALLER'}
                </p>
              </div>
            </div>
          )}

          {/* Refresh Action */}
          <button
            onClick={handleRefresh}
            title="Refresh Data"
            className="p-2 rounded-xl bg-[#161926] border border-[#252840] text-slate-400 hover:text-white hover:bg-[#1f2338] transition-colors"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#4f6ef7]' : ''}`} />
          </button>

          {/* Sign Out Action */}
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#161926] border border-[#252840] text-slate-300 hover:text-red-400 hover:border-red-500/30 hover:bg-[#1f2338] transition-colors text-xs font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
