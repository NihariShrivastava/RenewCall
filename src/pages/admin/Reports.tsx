import React, { useState, useEffect } from 'react';
import { 
  getTelecallerPerformanceStats, 
  getBatches, 
  getLeads, 
  getAllLeadsRaw 
} from '../../lib/db';
import { TelecallerStats, UploadBatch, Lead } from '../../types';
import { exportToExcel, formatDate } from '../../lib/utils';
import { StatCard } from '../../components/common/StatCard';
import { LeadDetailPanel } from '../../components/common/LeadDetailPanel';
import { 
  BarChart3, 
  Download, 
  Users, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  Calendar, 
  Filter, 
  ArrowRight, 
  Phone, 
  ChevronRight,
  TrendingUp,
  X
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [stats, setStats] = useState<TelecallerStats[]>([]);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeReportTab, setActiveReportTab] = useState<'by_telecaller' | 'outcome'>('by_telecaller');
  const [isLoading, setIsLoading] = useState(true);

  // Drilldown Modal
  const [drilldownTelecaller, setDrilldownTelecaller] = useState<TelecallerStats | null>(null);
  const [drilldownLeads, setDrilldownLeads] = useState<Lead[]>([]);
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null);

  useEffect(() => {
    getBatches().then(setBatches);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedBatch, startDate, endDate]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await getTelecallerPerformanceStats(
        selectedBatch,
        startDate || undefined,
        endDate || undefined
      );
      setStats(data);
    } catch (e) {
      console.error('Failed to load performance stats:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Aggregated totals
  const totalAssigned = stats.reduce((acc, curr) => acc + curr.total_assigned, 0);
  const totalPendingDue = stats.reduce((acc, curr) => acc + curr.pending_due, 0);
  const totalDone = stats.reduce((acc, curr) => acc + curr.done, 0);
  const totalReverted = stats.reduce((acc, curr) => acc + curr.reverted, 0);
  const totalClosed = stats.reduce((acc, curr) => acc + curr.closed, 0);

  const handleExport = () => {
    const exportRows = stats.map(s => ({
      'Telecaller Name': s.telecaller_name,
      'Username': s.username,
      'Total Assigned': s.total_assigned,
      'Pending (Due Now)': s.pending_due,
      'Upcoming (Future)': s.upcoming,
      'Skipped Leads': s.skipped,
      'Insurance Done': s.done,
      'Closed / Lost': s.closed,
      'Reverted to Admin': s.reverted,
      'Calls / Actions Today': s.calls_today,
      'Conversion Rate (%)': `${s.conversion_rate}%`,
    }));

    exportToExcel(exportRows, `RenewCall_Telecaller_Report_${new Date().toISOString().split('T')[0]}`);
  };

  const handleOpenDrilldown = async (tc: TelecallerStats) => {
    setDrilldownTelecaller(tc);
    const all = await getAllLeadsRaw();
    const tcLeads = all.filter(l => l.assigned_to === tc.telecaller_id);
    setDrilldownLeads(tcLeads);
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching Screenshot 5 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Master Reports Hub</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#4f6ef7]/15 text-[#4f6ef7] border border-[#4f6ef7]/30">
              ADMIN ANALYTICS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive performance tracking, conversion outcomes, and telecaller productivity.
          </p>
        </div>

        {/* Date Filter & Export Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-[#161926] border border-[#252840] rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-[#4f6ef7]" />
            <span className="text-[11px] font-bold uppercase text-slate-400">RANGE:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none"
            />
            <span className="text-slate-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none"
            />
          </div>

          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-3 py-2 bg-[#161926] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.file_name}</option>
            ))}
          </select>

          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25 text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Subtabs matching Screenshot 5 */}
      <div className="flex items-center space-x-2 border-b border-[#252840] pb-2">
        <button
          onClick={() => setActiveReportTab('by_telecaller')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeReportTab === 'by_telecaller'
              ? 'bg-[#4f6ef7] text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-[#161926]'
          }`}
        >
          By Telecaller
        </button>
        <button
          onClick={() => setActiveReportTab('outcome')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeReportTab === 'outcome'
              ? 'bg-[#4f6ef7] text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-[#161926]'
          }`}
        >
          Outcome By Telecaller
        </button>
      </div>

      {/* Summary KPI Cards matching Screenshot 5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Telecallers"
          value={stats.length}
          icon={Users}
          iconColor="blue"
          subValue="Active calling personnel"
        />
        <StatCard
          label="Assigned Leads"
          value={totalAssigned.toLocaleString()}
          icon={BarChart3}
          iconColor="purple"
          subValue="Total leads in date range"
        />
        <StatCard
          label="Due Now / Immediate"
          value={totalPendingDue.toLocaleString()}
          icon={Clock}
          iconColor="yellow"
          subValue="Leads needing calling today"
        />
        <StatCard
          label="Insurance Renewed (Done)"
          value={totalDone.toLocaleString()}
          icon={CheckCircle2}
          iconColor="green"
          trend={totalAssigned > 0 ? `${Math.round((totalDone / totalAssigned) * 100)}% Conv` : ''}
          subValue="Successful renewals"
        />
      </div>

      {/* Performance Report Table matching Screenshot 5 */}
      <div className="bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">
              {activeReportTab === 'by_telecaller' ? 'Telecaller Productivity Breakdown' : 'Conversion Outcome Analysis'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any telecaller row to view complete assigned leads drilldown and timeline.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#252840] rounded-xl bg-[#0e1017]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#252840] bg-[#161926]/70 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-bold text-slate-300">Telecaller</th>
                <th className="py-3 px-4 font-bold text-slate-300">Total Assigned</th>
                <th className="py-3 px-4 font-bold text-amber-400">Pending (Due)</th>
                <th className="py-3 px-4 font-bold text-slate-400">Upcoming</th>
                <th className="py-3 px-4 font-bold text-emerald-400">Insurance Done</th>
                <th className="py-3 px-4 font-bold text-amber-400">Skipped</th>
                <th className="py-3 px-4 font-bold text-rose-400">Closed / Lost</th>
                <th className="py-3 px-4 font-bold text-purple-400">Reverted</th>
                <th className="py-3 px-4 font-bold text-white">Conversion %</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252840]/60">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No telecaller records found.
                  </td>
                </tr>
              ) : (
                stats.map((s) => (
                  <tr
                    key={s.telecaller_id}
                    onClick={() => handleOpenDrilldown(s)}
                    className="hover:bg-[#1f2338]/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#161926] border border-[#252840] flex items-center justify-center text-[#4f6ef7] font-bold">
                          {s.telecaller_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{s.telecaller_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">@{s.username}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-white">{s.total_assigned}</td>
                    <td className="py-3 px-4 font-semibold text-amber-400">{s.pending_due}</td>
                    <td className="py-3 px-4 text-slate-400">{s.upcoming}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{s.done}</td>
                    <td className="py-3 px-4 text-amber-400">{s.skipped}</td>
                    <td className="py-3 px-4 text-rose-400">{s.closed}</td>
                    <td className="py-3 px-4 text-purple-400">{s.reverted}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{s.conversion_rate}%</span>
                        <div className="w-16 bg-[#161926] h-1.5 rounded-full overflow-hidden border border-[#252840]">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, s.conversion_rate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center text-xs text-[#4f6ef7] hover:underline">
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Modal for Telecaller Leads */}
      {drilldownTelecaller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#161926] border border-[#252840] rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="p-5 border-b border-[#252840] flex items-center justify-between bg-[#0e1017]">
              <div>
                <h3 className="text-base font-bold text-white">
                  Leads Assigned to {drilldownTelecaller.telecaller_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Total {drilldownLeads.length} leads assigned &bull; {drilldownTelecaller.done} Completed &bull; {drilldownTelecaller.conversion_rate}% Conversion
                </p>
              </div>
              <button
                onClick={() => setDrilldownTelecaller(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2338]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {drilldownLeads.length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-xs">No leads assigned yet.</p>
              ) : (
                drilldownLeads.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setViewingLeadId(lead.id)}
                    className="p-3.5 rounded-xl bg-[#0e1017] border border-[#252840] hover:border-[#4f6ef7]/50 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{lead.customer_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          lead.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          lead.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {lead.status}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-1 flex items-center space-x-3">
                        <span className="font-mono text-slate-300">{lead.phone}</span>
                        <span>•</span>
                        <span>Policy Expiry: {formatDate(lead.policy_date)}</span>
                        {lead.next_call_date && (
                          <>
                            <span>•</span>
                            <span className="text-[#4f6ef7]">Next Call: {formatDate(lead.next_call_date)}</span>
                          </>
                        )}
                      </p>
                      {lead.last_remark && (
                        <p className="text-slate-300 italic mt-1 text-[11px]">
                          Remark: "{lead.last_remark}"
                        </p>
                      )}
                    </div>

                    <button className="px-3 py-1.5 rounded-lg bg-[#161926] border border-[#252840] text-slate-300 hover:text-white self-start sm:self-auto">
                      View Lead Timeline
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Panel Modal */}
      <LeadDetailPanel
        leadId={viewingLeadId}
        onClose={() => setViewingLeadId(null)}
      />
    </div>
  );
};
