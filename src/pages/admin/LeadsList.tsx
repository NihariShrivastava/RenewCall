import React, { useState, useEffect, useMemo } from 'react';
import { 
  getLeads, 
  getBatches, 
  getUsers, 
  bulkUnassignLeads, 
  bulkDeleteLeads,
  getAllLeadsRaw 
} from '../../lib/db';
import { Lead, UploadBatch, User, LeadStatus } from '../../types';
import { formatDate, exportToExcel, getLeadColumnValue } from '../../lib/utils';
import { AssignModal } from '../../components/common/AssignModal';
import { LeadDetailPanel } from '../../components/common/LeadDetailPanel';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { 
  Search, 
  Filter, 
  Download, 
  UserCheck, 
  UserX, 
  Trash2, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal,
  Calendar,
  CheckSquare,
  Square,
  RefreshCw,
  Phone
} from 'lucide-react';

export const LeadsList: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [telecallers, setTelecallers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTelecaller, setSelectedTelecaller] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);

  // Dynamic Column Visibility
  const [allDynamicKeys, setAllDynamicKeys] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  useEffect(() => {
    // Initial fetch of batches & telecallers
    Promise.all([getBatches(), getUsers()]).then(([bList, uList]) => {
      setBatches(bList);
      setTelecallers(uList.filter(u => u.role === 'telecaller' && u.is_active));
    });
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [search, selectedStatus, selectedTelecaller, selectedBatch, startDate, endDate, page, pageSize]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await getLeads(
        {
          search: search.trim() || undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          assigned_to: selectedTelecaller !== 'all' ? selectedTelecaller : undefined,
          batch_id: selectedBatch !== 'all' ? selectedBatch : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        page,
        pageSize
      );

      setLeads(res.leads);
      setTotalCount(res.total);

      // Collect all dynamic keys from data
      const keySet = new Set<string>();
      res.leads.forEach(l => {
        Object.keys(l.data || {}).forEach(k => keySet.add(k));
      });
      const keys = Array.from(keySet);
      setAllDynamicKeys(keys);
      if (visibleColumns.length === 0 && keys.length > 0) {
        const priorityOrder = ['Product', 'Sub Product', 'RTO State', 'RTO Place', 'Vehicle No', 'Employee', 'Insu.Company', 'Amount'];
        const matched = priorityOrder.filter(p => keys.includes(p));
        const remaining = keys.filter(k => !priorityOrder.includes(k));
        const combined = [...matched, ...remaining];
        setVisibleColumns(combined.slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to load leads:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Row selection helpers
  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = leads.map(l => l.id);
      setSelectedLeadIds(Array.from(new Set([...selectedLeadIds, ...pageIds])));
    } else {
      const pageIds = new Set(leads.map(l => l.id));
      setSelectedLeadIds(selectedLeadIds.filter(id => !pageIds.has(id)));
      setSelectAllMatching(false);
    }
  };

  const handleToggleLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter(i => i !== id));
      setSelectAllMatching(false);
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  const handleSelectAllMatchingAcrossPages = async () => {
    setSelectAllMatching(true);
    const raw = await getAllLeadsRaw();
    // Filter matching
    const matching = raw.filter(l => {
      if (selectedStatus !== 'all' && l.status !== selectedStatus) return false;
      if (selectedTelecaller !== 'all') {
        if (selectedTelecaller === 'unassigned' && l.assigned_to) return false;
        if (selectedTelecaller !== 'unassigned' && l.assigned_to !== selectedTelecaller) return false;
      }
      if (selectedBatch !== 'all' && l.batch_id !== selectedBatch) return false;
      if (startDate && l.policy_date < startDate) return false;
      if (endDate && l.policy_date > endDate) return false;
      if (search) {
        const q = search.toLowerCase();
        const inName = l.customer_name.toLowerCase().includes(q);
        const inPhone = l.phone.includes(q);
        const inData = Object.values(l.data || {}).some(v => String(v).toLowerCase().includes(q));
        if (!inName && !inPhone && !inData) return false;
      }
      return true;
    });
    setSelectedLeadIds(matching.map(m => m.id));
  };

  const handleBulkUnassign = async () => {
    await bulkUnassignLeads(selectedLeadIds, 'admin');
    setSelectedLeadIds([]);
    setSelectAllMatching(false);
    await fetchLeads();
  };

  const handleBulkDelete = async () => {
    await bulkDeleteLeads(selectedLeadIds);
    setSelectedLeadIds([]);
    setSelectAllMatching(false);
    await fetchLeads();
  };

  const handleExportFiltered = async () => {
    const raw = await getAllLeadsRaw();
    const exportData = raw
      .filter(l => selectedLeadIds.length === 0 || selectedLeadIds.includes(l.id))
      .map(l => ({
        'Customer Name': l.customer_name,
        'Phone': l.phone,
        'Policy Date': l.policy_date,
        'Status': l.status.toUpperCase(),
        'Assigned To': l.assigned_user?.full_name || 'Unassigned',
        'Next Call Date': l.next_call_date || '',
        'Skip Count': l.skip_count || 0,
        'Last Remark': l.last_remark || '',
        ...l.data,
      }));

    exportToExcel(exportData, `RenewCall_Leads_Export_${new Date().toISOString().split('T')[0]}`);
  };

  const toggleColumn = (col: string) => {
    if (visibleColumns.includes(col)) {
      setVisibleColumns(visibleColumns.filter(c => c !== col));
    } else {
      setVisibleColumns([...visibleColumns, col]);
    }
  };

  const isAllOnPageSelected = leads.length > 0 && leads.every(l => selectedLeadIds.includes(l.id));

  return (
    <div className="space-y-6">
      {/* Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Leads & Renewals Repository</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, filter, dynamically customize columns, and bulk assign to telecallers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowColumnToggle(!showColumnToggle)}
            className="px-3.5 py-2 rounded-xl bg-[#161926] border border-[#252840] text-xs font-semibold text-slate-300 hover:text-white flex items-center space-x-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#4f6ef7]" />
            <span>Columns ({visibleColumns.length})</span>
          </button>

          <button
            onClick={handleExportFiltered}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20 text-xs font-semibold flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Dynamic Column Selector Dropdown / Panel */}
      {showColumnToggle && (
        <div className="bg-[#161926] border border-[#252840] rounded-2xl p-4 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Toggle Dynamic Column Visibility
            </span>
            <button
              onClick={() => setVisibleColumns(allDynamicKeys)}
              className="text-[11px] text-[#4f6ef7] hover:underline"
            >
              Select All Columns
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            {allDynamicKeys.map(key => (
              <button
                key={key}
                onClick={() => toggleColumn(key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  visibleColumns.includes(key)
                    ? 'bg-[#4f6ef7]/20 border-[#4f6ef7] text-white'
                    : 'bg-[#0e1017] border-[#252840] text-slate-400 hover:text-slate-200'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-[#161926] border border-[#252840] rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Global Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone, vehicle..."
              className="w-full pl-9 pr-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#4f6ef7]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
          >
            <option value="all">All Statuses</option>
            <option value="unassigned">Unassigned</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
            <option value="closed">Closed</option>
            <option value="reverted">Reverted</option>
          </select>

          {/* Assigned To Filter */}
          <select
            value={selectedTelecaller}
            onChange={(e) => {
              setSelectedTelecaller(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
          >
            <option value="all">All Telecallers</option>
            <option value="unassigned">Unassigned Only</option>
            {telecallers.map(tc => (
              <option key={tc.id} value={tc.id}>
                {tc.full_name}
              </option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.file_name} ({b.total_rows})
              </option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center space-x-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-1/2 px-2 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[#4f6ef7]"
              title="From Policy Date"
            />
            <span className="text-slate-500 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-1/2 px-2 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[#4f6ef7]"
              title="To Policy Date"
            />
          </div>
        </div>

        {/* Bulk Action Bar (when rows are selected) */}
        {selectedLeadIds.length > 0 && (
          <div className="pt-3 border-t border-[#252840] flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <span className="font-semibold text-white px-2.5 py-1 bg-[#0e1017] rounded-lg border border-[#252840]">
                {selectedLeadIds.length} Selected
              </span>

              {!selectAllMatching && totalCount > selectedLeadIds.length && (
                <button
                  onClick={handleSelectAllMatchingAcrossPages}
                  className="text-[#4f6ef7] hover:underline font-medium"
                >
                  Select all {totalCount} matching filters
                </button>
              )}

              {selectAllMatching && (
                <span className="text-emerald-400 font-medium">
                  All {selectedLeadIds.length} matching leads selected across pages
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl gradient-btn text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assign to Telecaller</span>
              </button>

              <button
                onClick={() => setIsUnassignModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#0e1017] border border-[#252840] text-slate-300 hover:text-white text-xs font-medium flex items-center space-x-1.5"
              >
                <UserX className="w-3.5 h-3.5 text-amber-400" />
                <span>Unassign</span>
              </button>

              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#0e1017] border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-medium flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table with Sticky Header & Horizontal Scroll */}
      <div className="bg-[#161926] border border-[#252840] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[600px] relative">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-20 bg-[#161926] border-b border-[#252840] text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllOnPageSelected}
                    onChange={handleSelectAllOnPage}
                    className="rounded border-[#252840] text-[#4f6ef7] focus:ring-0 accent-[#4f6ef7]"
                  />
                </th>
                <th className="py-3 px-4 font-bold text-slate-300">Customer Name</th>
                <th className="py-3 px-4 font-bold text-slate-300">Phone</th>
                <th className="py-3 px-4 font-bold text-slate-300">Policy Expiry</th>
                <th className="py-3 px-4 font-bold text-slate-300">Status</th>
                <th className="py-3 px-4 font-bold text-slate-300">Assigned Telecaller</th>
                <th className="py-3 px-4 font-bold text-slate-300">Next Call</th>
                <th className="py-3 px-4 font-bold text-slate-300">Skips</th>

                {/* Visible Dynamic Columns */}
                {visibleColumns.map(col => (
                  <th key={col} className="py-3 px-4 text-slate-400">
                    {col}
                  </th>
                ))}

                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#252840]/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9 + visibleColumns.length} className="py-12 text-center text-slate-400">
                    Loading renewal records...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9 + visibleColumns.length} className="py-12 text-center text-slate-400">
                    No leads found matching current filter parameters.
                  </td>
                </tr>
              ) : (
                leads.map(lead => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setViewingLeadId(lead.id)}
                      className={`hover:bg-[#1f2338]/60 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#4f6ef7]/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleLead(lead.id)}
                          className="rounded border-[#252840] text-[#4f6ef7] focus:ring-0 accent-[#4f6ef7]"
                        />
                      </td>

                      <td className="py-3 px-4 font-semibold text-white">
                        {lead.customer_name}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {lead.phone}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-200">
                          {formatDate(lead.policy_date)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            lead.status === 'done'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : lead.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : lead.status === 'reverted'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : lead.status === 'closed'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-slate-700/30 text-slate-400 border-slate-700/50'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {lead.assigned_user ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className="text-white font-medium">{lead.assigned_user.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {lead.next_call_date ? formatDate(lead.next_call_date) : '—'}
                      </td>

                      <td className="py-3 px-4">
                        {lead.skip_count > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                            {lead.skip_count}x
                          </span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>

                      {/* Dynamic columns */}
                      {visibleColumns.map(col => {
                        const cellVal = getLeadColumnValue(lead, col);
                        return (
                          <td key={col} className="py-3 px-4 text-slate-300">
                            {cellVal === 'Unknown / Blank' ? '—' : cellVal}
                          </td>
                        );
                      })}

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setViewingLeadId(lead.id)}
                          className="p-1.5 rounded-lg bg-[#0e1017] border border-[#252840] text-slate-400 hover:text-white"
                          title="View lead entry & audit timeline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Rows Per Page */}
        <div className="p-4 border-t border-[#252840] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <span>
              Showing {leads.length === 0 ? 0 : (page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, totalCount)} of {totalCount} records
            </span>
            <div className="flex items-center space-x-1.5">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-[#0e1017] border border-[#252840] rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-[#0e1017] border border-[#252840] disabled:opacity-30 hover:bg-[#1f2338] text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-slate-300 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-[#0e1017] border border-[#252840] disabled:opacity-30 hover:bg-[#1f2338] text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Assign Modal */}
      <AssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedLeadIds={selectedLeadIds}
        onAssigned={() => {
          setSelectedLeadIds([]);
          setSelectAllMatching(false);
          fetchLeads();
        }}
      />

      {/* Lead Detail Panel Modal */}
      <LeadDetailPanel
        leadId={viewingLeadId}
        onClose={() => setViewingLeadId(null)}
        onRefresh={fetchLeads}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Leads"
        message={`Are you sure you want to delete ${selectedLeadIds.length} lead(s)? They will be marked as deleted in the system.`}
        confirmLabel="Delete Leads"
      />

      {/* Unassign Confirmation */}
      <ConfirmationModal
        isOpen={isUnassignModalOpen}
        onClose={() => setIsUnassignModalOpen(false)}
        onConfirm={handleBulkUnassign}
        title="Unassign Leads"
        message={`Are you sure you want to unassign ${selectedLeadIds.length} lead(s)? Their status will revert to unassigned.`}
        confirmLabel="Unassign Leads"
        isDestructive={false}
      />
    </div>
  );
};
