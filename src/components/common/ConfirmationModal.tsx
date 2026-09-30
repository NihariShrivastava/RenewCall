import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  isDestructive = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2338]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className={`p-3 rounded-xl border ${
            isDestructive 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
              : 'bg-[#4f6ef7]/10 border-[#4f6ef7]/30 text-[#4f6ef7]'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-400">Action confirmation</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed bg-[#0e1017] p-3 rounded-xl border border-[#252840]">
          {message}
        </p>

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-[#1f2338]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30'
                : 'gradient-btn'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
