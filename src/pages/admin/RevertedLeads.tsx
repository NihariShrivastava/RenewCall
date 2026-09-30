import React, { useState, useEffect } from 'react';
import { getAllLeadsRaw, updateLead, addLeadActivity } from '../../lib/db';
import { Lead } from '../../types';
import { formatDate, exportToExcel } from '../../lib/utils';
import { AssignModal } from '../../components/common/AssignModal';
import { LeadDetailPanel } from '../../components/common/LeadDetailPanel';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { 
  RotateCcw, 
  UserCheck, 
  XCircle, 
  Download, 
  MessageSquare, 
  Phone, 
  Calendar, 
  Eye, 
  Search,
  CheckCircle2
} from 'lucide-react';

export const RevertedLeads: React.FC = () => {
  const [revertedLeads, setRevertedLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchRevertedLeads();
  }, []);

  const fetchRevertedLeads = async () => {
    setIsLoading(true);
    try {
      const all = await getAllLeadsRaw();
      const reverted = all.filter(l => l.status === 'reverted');
      setRevertedLeads(reverted);
    } catch (e) {
      console.error('Failed to load reverted leads:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkClose = async () => {
    const now = new Date().toISOString();
    for (const id of selectedLeadIds) {
      await updateLead(id, {
        status: 'closed',
        last_remark: 'Closed by Admin after Telecaller reversion.',
        updated_at: now
      });
      await addLeadActivity({
        lead_id: id,
        user_id: 'admin',
        action: 'closed',
        remark: 'Closed by Admin after telecaller reversion.',
        meta: { source: 'reverted_queue' }
      });
    }
    setSelectedLeadIds([]);
    await fetchRevertedLeads();
  };

  const handleExport = () => {
    const data = revertedLeads.map(l => ({
      'Customer Name': l.customer_name,
      'Phone': l.phone,
      'Policy Expiry': l.policy_date,
      'Telecaller Remark': l.last_remark || 'No remark given',
      'Date Reverted': formatDate(l.updated_at),
      ...l.data
    }));
    exportToExcel(data, `RenewCall_Reverted_Queue_${new Date().toISOString().split('T')[0]}`);
  };

  const filtered = revertedLeads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.customer_name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.last_remark && l.last_remark.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Reverted Leads Queue</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
              {revertedLeads.length} Items
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Leads returned by telecallers requiring admin review, reassignment, or final closure.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25 text-xs font-semibold flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Bulk Action Toolbar */}
      <div className="bg-[#161926] border border-[#252840] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, phone, remarks..."
            className="w-full pl-9 pr-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#4f6ef7]"
          />
        </div>

        {selectedLeadIds.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-300 font-semibold px-2 py-1 bg-[#0e1017] rounded-lg border border-[#252840]">
              {selectedLeadIds.length} Selected
            </span>

            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl gradient-btn text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Reassign to Telecaller</span>
            </button>

            <button
              onClick={() => setIsCloseModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#0e1017] border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-medium flex items-center space-x-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Close Leads</span>
            </button>
          </div>
        )}
      </div>

      {/* Cards Queue List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-[#161926] border border-[#252840] rounded-2xl text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-200">Reverted Queue is Clean</p>
            <p className="text-slate-500 mt-0.5">No pending reverted leads require attention.</p>
          </div>
        ) : (
          filtered.map(lead => {
            const isSelected = selectedLeadIds.includes(lead.id);

            return (
              <div
                key={lead.id}
                className={`p-5 bg-[#161926] border rounded-2xl transition-all ${
                  isSelected ? 'border-[#4f6ef7] bg-[#4f6ef7]/5 shadow-md shadow-indigo-600/10' : 'border-[#252840] hover:border-[#393e60]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setSelectedLeadIds(selectedLeadIds.filter(i => i !== lead.id));
                        } else {
                          setSelectedLeadIds([...selectedLeadIds, lead.id]);
                        }
                      }}
                      className="mt-1 rounded border-[#252840] text-[#4f6ef7] focus:ring-0 accent-[#4f6ef7]"
                    />

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-bold text-white">{lead.customer_name}</h4>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          Reverted
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center space-x-1 font-mono text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{lead.phone}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Policy Expiry: {formatDate(lead.policy_date)}</span>
                        </span>
                        {lead.data?.['Vehicle Brand'] && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300 font-medium">
                              {lead.data['Vehicle Brand']} ({lead.data['Vehicle No'] || ''})
                            </span>
                          </>
                        )}
                      </div>

                      {/* Prominent Telecaller Remark Box */}
                      <div className="mt-3 bg-[#0e1017] p-3 rounded-xl border border-purple-500/20 text-xs flex items-start space-x-2">
                        <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-bold uppercase text-purple-400 block tracking-wider">
                            Telecaller Reason For Reversion:
                          </span>
                          <p className="text-slate-200 mt-0.5 italic">
                            "{lead.last_remark || 'Customer requested removal from calling list / contact info issue.'}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this lead */}
                  <div className="flex items-center space-x-2 self-end md:self-center">
                    <button
                      onClick={() => setViewingLeadId(lead.id)}
                      className="p-2 rounded-xl bg-[#0e1017] border border-[#252840] text-slate-400 hover:text-white"
                      title="View Lead Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedLeadIds([lead.id]);
                        setIsAssignModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl gradient-btn text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Reassign</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedLeadIds([lead.id]);
                        setIsCloseModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#0e1017] border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center space-x-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assign Modal */}
      <AssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedLeadIds={selectedLeadIds}
        onAssigned={() => {
          setSelectedLeadIds([]);
          fetchRevertedLeads();
        }}
      />

      {/* Lead Detail Panel Modal */}
      <LeadDetailPanel
        leadId={viewingLeadId}
        onClose={() => setViewingLeadId(null)}
        onRefresh={fetchRevertedLeads}
      />

      {/* Close Leads Confirmation */}
      <ConfirmationModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirm={handleBulkClose}
        title="Close Reverted Leads"
        message={`Are you sure you want to mark ${selectedLeadIds.length} lead(s) as Closed / Lost? They will no longer be called.`}
        confirmLabel="Close Leads"
      />
    </div>
  );
};
