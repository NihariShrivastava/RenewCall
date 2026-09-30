import React, { useState, useEffect } from 'react';
import { getAllLeadsRaw, getBatches, getUsers } from '../../lib/db';
import { Lead, UploadBatch, User } from '../../types';
import { exportToExcel, formatDate } from '../../lib/utils';
import { StatCard } from '../../components/common/StatCard';
import { 
  Layers, 
  Download, 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  UserCheck, 
  FileSpreadsheet, 
  FastForward,
  ShieldCheck 
} from 'lucide-react';

export const LeadStatusCount: React.FC = () => {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [telecallers, setTelecallers] = useState<User[]>([]);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedTelecaller, setSelectedTelecaller] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllLeadsRaw(), getBatches(), getUsers()]).then(([leads, bList, uList]) => {
      setAllLeads(leads);
      setBatches(bList);
      setTelecallers(uList.filter(u => u.role === 'telecaller' && u.is_active));
      setIsLoading(false);
    });
  }, []);

  const filteredLeads = allLeads.filter(lead => {
    if (selectedBatch !== 'all' && lead.batch_id !== selectedBatch) return false;
    if (selectedTelecaller !== 'all') {
      if (selectedTelecaller === 'unassigned' && lead.assigned_to) return false;
      if (selectedTelecaller !== 'unassigned' && lead.assigned_to !== selectedTelecaller) return false;
    }
    if (startDate && lead.policy_date < startDate) return false;
    if (endDate && lead.policy_date > endDate) return false;
    return true;
  });

  const total = filteredLeads.length;
  const unassigned = filteredLeads.filter(l => l.status === 'unassigned').length;
  const pending = filteredLeads.filter(l => l.status === 'pending').length;
  const skipped = filteredLeads.filter(l => (l.skip_count || 0) > 0).length;
  const done = filteredLeads.filter(l => l.status === 'done').length;
  const closed = filteredLeads.filter(l => l.status === 'closed').length;
  const reverted = filteredLeads.filter(l => l.status === 'reverted').length;

  const handleExport = () => {
    const summaryData = [
      { Metric: 'Total Leads', Count: total },
      { Metric: 'Unassigned Leads', Count: unassigned },
      { Metric: 'Pending Reminders', Count: pending },
      { Metric: 'Skipped Reminders', Count: skipped },
      { Metric: 'Insurance Renewed (Done)', Count: done },
      { Metric: 'Closed / Lost', Count: closed },
      { Metric: 'Reverted to Admin', Count: reverted },
      { Metric: 'Conversion Rate', Count: total > 0 ? `${Math.round((done / total) * 100)}%` : '0%' },
    ];
    exportToExcel(summaryData, `RenewCall_Status_Count_Summary_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Lead Status Count</h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated tally across all lifecycle stages with multi-dimensional filtering.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25 text-xs font-semibold flex items-center space-x-1.5 shadow-sm self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Summary Excel</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#161926] border border-[#252840] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Batch Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Batch Source
          </label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="w-full px-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.file_name}</option>
            ))}
          </select>
        </div>

        {/* Telecaller Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Telecaller Allocation
          </label>
          <select
            value={selectedTelecaller}
            onChange={(e) => setSelectedTelecaller(e.target.value)}
            className="w-full px-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
          >
            <option value="all">All Telecallers</option>
            <option value="unassigned">Unassigned Only</option>
            {telecallers.map(tc => (
              <option key={tc.id} value={tc.id}>{tc.full_name}</option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            From Policy Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            To Policy Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
          />
        </div>
      </div>

      {/* Grid of Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={total.toLocaleString()}
          icon={FileSpreadsheet}
          iconColor="blue"
          subValue="Across active filters"
        />
        <StatCard
          label="Unassigned"
          value={unassigned.toLocaleString()}
          icon={Users}
          iconColor="purple"
          subValue="Awaiting telecaller allocation"
        />
        <StatCard
          label="Pending Reminders"
          value={pending.toLocaleString()}
          icon={Clock}
          iconColor="yellow"
          subValue="In telecaller roster"
        />
        <StatCard
          label="Skipped Leads"
          value={skipped.toLocaleString()}
          icon={FastForward}
          iconColor="yellow"
          subValue="Deferred by telecaller (1+ skips)"
        />
        <StatCard
          label="Insurance Done"
          value={done.toLocaleString()}
          icon={CheckCircle2}
          iconColor="green"
          trend={total > 0 ? `${Math.round((done / total) * 100)}% Conv` : ''}
          subValue="Successfully renewed"
        />
        <StatCard
          label="Closed / Lost"
          value={closed.toLocaleString()}
          icon={XCircle}
          iconColor="red"
          subValue="Renewed elsewhere or lost"
        />
        <StatCard
          label="Reverted to Admin"
          value={reverted.toLocaleString()}
          icon={RotateCcw}
          iconColor="purple"
          subValue="Needs admin reassignment"
        />
        <StatCard
          label="Overall Conversion"
          value={total > 0 ? `${Math.round((done / total) * 100)}%` : '0%'}
          icon={ShieldCheck}
          iconColor="emerald"
          subValue="Done vs Total Registered"
        />
      </div>
    </div>
  );
};
