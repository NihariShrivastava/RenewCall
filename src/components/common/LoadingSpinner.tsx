import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading workstation...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#4f6ef7] animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-[#8b5cf6] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      <p className="text-sm font-medium text-slate-400 tracking-wide">{message}</p>
    </div>
  );
};
