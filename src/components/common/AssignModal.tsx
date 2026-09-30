import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { getUsers, bulkAssignLeads } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeadIds: string[];
  onAssigned: (count: number) => void;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  isOpen,
  onClose,
  selectedLeadIds,
  onAssigned,
}) => {
  const { user } = useAuth();
  const [telecallers, setTelecallers] = useState<User[]>([]);
  const [selectedTelecallerId, setSelectedTelecallerId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      getUsers().then((allUsers) => {
        const activeTCs = allUsers.filter((u) => u.role === 'telecaller' && u.is_active);
        setTelecallers(activeTCs);
        if (activeTCs.length > 0) {
          setSelectedTelecallerId(activeTCs[0].id);
        }
      });
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAssign = async () => {
    if (!selectedTelecallerId) {
      setError('Please select an active telecaller.');
      return;
    }

    const tc = telecallers.find((t) => t.id === selectedTelecallerId);
    if (!tc) return;

    setIsSubmitting(true);
    setError('');

    try {
      const assignedCount = await bulkAssignLeads(
        selectedLeadIds,
        tc.id,
        user?.id || 'admin',
        tc.full_name
      );
      setIsSubmitting(false);
      onAssigned(assignedCount);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to assign leads.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2338]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-gradient-to-tr from-[#4f6ef7]/20 to-[#8b5cf6]/20 border border-[#4f6ef7]/40 rounded-xl text-[#4f6ef7]">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Assign Leads to Telecaller</h3>
            <p className="text-xs text-slate-400">
              Assigning <span className="text-[#4f6ef7] font-semibold">{selectedLeadIds.length}</span> lead{selectedLeadIds.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="bg-[#0e1017] p-3.5 rounded-xl border border-[#252840] text-xs text-slate-300 space-y-1.5 mb-5">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Automatic Reminder Scheduling</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            The next call date will automatically be set to <strong>1 month before policy expiry</strong>. If that date is today or in the past, it will be scheduled for <strong>today</strong> immediately.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
              Select Active Telecaller
            </label>
            {telecallers.length === 0 ? (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                No active telecallers found. Please create or activate telecallers in Role Management first.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {telecallers.map((tc) => (
                  <label
                    key={tc.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTelecallerId === tc.id
                        ? 'bg-[#4f6ef7]/15 border-[#4f6ef7] text-white shadow-sm shadow-indigo-600/20'
                        : 'bg-[#0e1017] border-[#252840] text-slate-300 hover:border-[#393e60]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="telecaller"
                        value={tc.id}
                        checked={selectedTelecallerId === tc.id}
                        onChange={() => setSelectedTelecallerId(tc.id)}
                        className="accent-[#4f6ef7]"
                      />
                      <div>
                        <p className="text-sm font-semibold">{tc.full_name}</p>
                        <p className="text-xs text-slate-400 font-mono">@{tc.username}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-[#1f2338]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={isSubmitting || telecallers.length === 0}
              className="px-5 py-2.5 text-xs font-semibold text-white gradient-btn rounded-xl disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <span>Assigning...</span>
              ) : (
                <span>Confirm Assignment</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
