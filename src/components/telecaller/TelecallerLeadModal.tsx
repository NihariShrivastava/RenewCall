import React, { useState, useEffect } from 'react';
import { Lead, LeadActivity } from '../../types';
import { 
  getLeadById, 
  getLeadActivities, 
  telecallerMarkDone, 
  telecallerMarkClosed, 
  telecallerRevertToAdmin, 
  telecallerSkipLead 
} from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getDaysDifference } from '../../lib/utils';
import { calculateNextSkipDate } from '../../lib/skipSchedule';
import { 
  X, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  FastForward, 
  Clock, 
  FileText, 
  AlertTriangle,
  Car,
  ShieldAlert
} from 'lucide-react';

interface TelecallerLeadModalProps {
  leadId: string | null;
  onClose: () => void;
  onActionComplete: () => void;
}

export const TelecallerLeadModal: React.FC<TelecallerLeadModalProps> = ({
  leadId,
  onClose,
  onActionComplete,
}) => {
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      setRemark('');
      setError('');
      return;
    }
    loadLead();
  }, [leadId]);

  const loadLead = async () => {
    if (!leadId) return;
    const [l, acts] = await Promise.all([
      getLeadById(leadId),
      getLeadActivities(leadId),
    ]);
    setLead(l);
    setActivities(acts);
    setRemark('');
    setError('');
  };

  if (!leadId || !lead) return null;

  const daysLeft = getDaysDifference(lead.policy_date);
  const isOverdue = daysLeft < 0;
  const nextSkipInfo = calculateNextSkipDate(lead.skip_count, lead.policy_date);

  const handleDone = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setError('');
    try {
      await telecallerMarkDone(lead.id, user.id, remark.trim() || 'Insurance successfully renewed.');
      onActionComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!user) return;
    if (!remark.trim()) {
      setError('Please provide a remark explaining why this lead is being closed (e.g. renewed elsewhere, vehicle sold).');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await telecallerMarkClosed(lead.id, user.id, remark.trim());
      onActionComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to close lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevert = async () => {
    if (!user) return;
    if (!remark.trim()) {
      setError('Please provide a remark explaining why this lead is being reverted to Admin.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await telecallerRevertToAdmin(lead.id, user.id, remark.trim());
      onActionComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to revert lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setError('');
    try {
      await telecallerSkipLead(lead.id, user.id, remark.trim());
      onActionComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to skip lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#161926] border border-[#252840] rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#252840] bg-[#0e1017] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white truncate">{lead.customer_name}</h3>
              {isOverdue && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  OVERDUE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center space-x-1 text-[#4f6ef7] font-bold font-mono hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{lead.phone}</span>
              </a>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Expires: {formatDate(lead.policy_date)}</span>
              </span>
              <span>•</span>
              <span className={`font-semibold ${isOverdue ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#1f2338]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Call Action Card */}
          <div className="bg-gradient-to-r from-[#4f6ef7]/15 to-[#8b5cf6]/15 border border-[#4f6ef7]/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Direct Tap-to-Call
              </p>
              <p className="text-base font-bold text-white font-mono mt-0.5">{lead.phone}</p>
            </div>
            <a
              href={`tel:${lead.phone}`}
              className="px-5 py-2.5 rounded-xl gradient-btn text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30"
            >
              <Phone className="w-4 h-4" />
              <span>Dial Now</span>
            </a>
          </div>

          {/* Dynamic Excel Attributes (2-Column Key/Value Grid) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-[#4f6ef7]" />
              <span>Policy & Vehicle Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(lead.data || {}).map(([key, val]) => (
                <div
                  key={key}
                  className="bg-[#0e1017] p-3 rounded-xl border border-[#252840] flex flex-col justify-center"
                >
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                    {key}
                  </span>
                  <span className="text-sm font-medium text-slate-100 mt-0.5 break-words">
                    {String(val || '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Skip Schedule Preview Widget */}
          <div className="bg-[#0e1017] p-4 rounded-xl border border-[#252840] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <FastForward className="w-4 h-4" />
                <span>Next Skip Preview (Skip #{nextSkipInfo.nextSkipCount})</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Current skips: {lead.skip_count}x
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Next scheduled call: <strong className="text-white">{formatDate(nextSkipInfo.nextCallDate)}</strong>. {nextSkipInfo.notes}
            </p>
          </div>

          {/* History / Activity Timeline */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-[#8b5cf6]" />
              <span>Previous Remarks & History ({activities.length})</span>
            </h4>
            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-[#0e1017] p-3 rounded-xl border border-[#252840]">
                No previous call notes recorded yet.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {activities.map((act) => (
                  <div key={act.id} className="p-3 bg-[#0e1017] rounded-xl border border-[#252840] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white capitalize">{act.action}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                    {act.remark && (
                      <p className="text-slate-300 italic">"{act.remark}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Action Bar with Remark Input & Actions */}
        <div className="p-4 sm:p-5 border-t border-[#252840] bg-[#0e1017] space-y-3">
          <div>
            <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">
              Call Remark / Customer Feedback
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Discussed comprehensive plan with NCB bonus, customer agreed to renew online..."
              rows={2}
              className="w-full px-3 py-2 bg-[#161926] border border-[#252840] rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#4f6ef7]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleDone}
              disabled={isSubmitting}
              className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done</span>
            </button>

            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-amber-600/20 disabled:opacity-50"
            >
              <FastForward className="w-4 h-4" />
              <span>Skip ({lead.skip_count + 1})</span>
            </button>

            <button
              onClick={handleRevert}
              disabled={isSubmitting}
              className="py-3 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Revert</span>
            </button>

            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-rose-600/20 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
