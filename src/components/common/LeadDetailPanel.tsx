import React, { useState, useEffect } from 'react';
import { Lead, LeadActivity } from '../../types';
import { getLeadActivities, getLeadById } from '../../lib/db';
import { formatDate } from '../../lib/utils';
import { X, Calendar, Phone, Clock, FileText, CheckCircle2, AlertTriangle, UserCheck } from 'lucide-react';

interface LeadDetailPanelProps {
  leadId: string | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export const LeadDetailPanel: React.FC<LeadDetailPanelProps> = ({ leadId, onClose, onRefresh }) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      return;
    }
    setIsLoading(true);
    Promise.all([getLeadById(leadId), getLeadActivities(leadId)])
      .then(([leadData, actList]) => {
        setLead(leadData);
        setActivities(actList);
      })
      .finally(() => setIsLoading(false));
  }, [leadId]);

  if (!leadId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-[#161926] border border-[#252840] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-[#252840] flex items-center justify-between bg-[#0e1017]/50">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white">
                {lead?.customer_name || 'Lead Details'}
              </h3>
              {lead?.status && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    lead.status === 'done'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : lead.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : lead.status === 'reverted'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : lead.status === 'closed'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}
                >
                  {lead.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <a href={`tel:${lead?.phone}`} className="text-[#4f6ef7] hover:underline font-mono">
                  {lead?.phone}
                </a>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Policy: {formatDate(lead?.policy_date)}</span>
              </span>
              {lead?.skip_count ? (
                <>
                  <span>•</span>
                  <span className="text-amber-400 font-medium">
                    Skipped: {lead.skip_count}x
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2338]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Loading record attributes...
            </div>
          ) : lead ? (
            <>
              {/* Dynamic Excel Attributes (2-Column Key/Value Grid) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-[#4f6ef7]" />
                  <span>Original Excel Attributes ({Object.keys(lead.data || {}).length} columns)</span>
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

              {/* Assignment & Call Schedule */}
              <div className="bg-[#0e1017] p-4 rounded-xl border border-[#252840] space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 mb-2">
                  <UserCheck className="w-4 h-4 text-[#8b5cf6]" />
                  <span>Assignment & Next Action</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Assigned Telecaller</span>
                    <span className="font-semibold text-white">
                      {lead.assigned_user?.full_name || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Next Call Scheduled</span>
                    <span className="font-semibold text-[#4f6ef7]">
                      {lead.next_call_date ? formatDate(lead.next_call_date) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Last Remark</span>
                    <span className="text-slate-300 italic">
                      {lead.last_remark || 'No remarks recorded yet.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-[#eab308]" />
                  <span>Call & Activity Timeline ({activities.length})</span>
                </h4>
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-[#0e1017] p-4 rounded-xl border border-[#252840]">
                    No activity recorded yet for this lead.
                  </p>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#252840]">
                    {activities.map((act) => (
                      <div key={act.id} className="relative flex items-start space-x-3 text-xs pl-1">
                        <div className="w-6 h-6 rounded-full bg-[#161926] border-2 border-[#4f6ef7] flex items-center justify-center flex-shrink-0 z-10 text-[10px] text-white">
                          ●
                        </div>
                        <div className="flex-1 bg-[#0e1017] p-3 rounded-xl border border-[#252840]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white capitalize">{act.action}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(act.created_at).toLocaleString()}
                            </span>
                          </div>
                          {act.remark && (
                            <p className="text-slate-300 mt-1">{act.remark}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            By: {act.user?.full_name || 'System / Admin'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-rose-400 text-sm">
              Record could not be loaded.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#252840] bg-[#0e1017]/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#1f2338] hover:bg-[#252840] rounded-xl transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
