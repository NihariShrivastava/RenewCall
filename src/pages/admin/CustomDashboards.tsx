import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllLeadsRaw, 
  getBatches, 
  getCustomDashboards, 
  saveCustomDashboard, 
  deleteCustomDashboard 
} from '../../lib/db';
import { Lead, UploadBatch, CustomDashboard } from '../../types';
import { exportToExcel, formatDate, getLeadColumnValue } from '../../lib/utils';
import { AssignModal } from '../../components/common/AssignModal';
import { LeadDetailPanel } from '../../components/common/LeadDetailPanel';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip 
} from 'recharts';
import { 
  Sliders, 
  Filter, 
  Save, 
  Download, 
  UserCheck, 
  Plus, 
  X, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  FolderOpen,
  PieChart as PieChartIcon,
  Search,
  CheckCircle2,
  RotateCcw,
  Sparkles
} from 'lucide-react';

const PALETTE = [
  '#4f6ef7',
  '#8b5cf6',
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#f97316',
  '#14b8a6',
  '#a855f7',
  '#3b82f6',
  '#84cc16'
];

export const STANDARD_INSURANCE_COLUMNS = [
  'Product',
  'Sub Product',
  'RTO State',
  'RTO Place',
  'Vehicle No',
  'Employee',
  'Insu.Company',
  'Policy Type',
  'Branch',
  'Amount',
  'Policy No',
  'Chasis No',
  'Net Total(1+2)',
  'Net Total(1)',
  'Net Total(2)',
  'Service Tax',
  'App Date',
  'App ID',
  'S/O',
  'Ret. Incentive',
  'Remark'
];

export const DEFAULT_SELECTED_COLUMNS = [
  'Product',
  'Sub Product',
  'RTO State',
  'RTO Place',
  'Employee',
  'Insu.Company'
];

export const CustomDashboards: React.FC = () => {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [savedDashboards, setSavedDashboards] = useState<CustomDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active dashboard config
  const [dashboardName, setDashboardName] = useState('New Custom Dashboard');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_SELECTED_COLUMNS);
  const [columnSearch, setColumnSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  // Table state
  const [tablePage, setTablePage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null);

  // Save Modal
  const [isSaving, setIsSaving] = useState(false);
  const [newDashboardTitle, setNewDashboardTitle] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [leads, bList, dashboards] = await Promise.all([
        getAllLeadsRaw(),
        getBatches(),
        getCustomDashboards()
      ]);
      setAllLeads(leads);
      setBatches(bList);
      setSavedDashboards(dashboards);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Find all available column names across standard columns, batch headers, and live lead data
  const availableColumns = useMemo(() => {
    const colSet = new Set<string>();

    // 1. Add standard insurance columns first to ensure they are always present
    STANDARD_INSURANCE_COLUMNS.forEach(c => colSet.add(c));

    // 2. Add columns from uploaded batches headers
    batches.forEach(b => {
      (b.column_headers || []).forEach(h => {
        const trimmed = h ? h.trim() : '';
        if (trimmed && !['Customer Name', 'Phone', 'Policy Expiry', 'Policy Date', 'Name of Insured', 'Mobile No'].includes(trimmed)) {
          colSet.add(trimmed);
        }
      });
    });

    // 3. Add dynamic columns from loaded leads
    const scopedLeads = selectedBatchId === 'all' 
      ? allLeads 
      : allLeads.filter(l => l.batch_id === selectedBatchId);

    scopedLeads.forEach(lead => {
      Object.keys(lead.data || {}).forEach(k => {
        const trimmed = k ? k.trim() : '';
        if (trimmed && !['Customer Name', 'Phone', 'Policy Expiry', 'Policy Date', 'Name of Insured', 'Mobile No'].includes(trimmed)) {
          colSet.add(trimmed);
        }
      });
    });

    return Array.from(colSet);
  }, [allLeads, batches, selectedBatchId]);

  // Filter columns by user search input
  const searchedColumns = useMemo(() => {
    if (!columnSearch.trim()) return availableColumns;
    const q = columnSearch.toLowerCase().trim();
    return availableColumns.filter(c => c.toLowerCase().includes(q));
  }, [availableColumns, columnSearch]);

  // Distinct values per selected column
  const distinctValuesPerCol = useMemo(() => {
    const map: Record<string, { value: string; count: number }[]> = {};
    const scopedLeads = selectedBatchId === 'all' 
      ? allLeads 
      : allLeads.filter(l => l.batch_id === selectedBatchId);

    selectedColumns.forEach(col => {
      const counts: Record<string, number> = {};
      scopedLeads.forEach(lead => {
        const val = getLeadColumnValue(lead, col);
        counts[val] = (counts[val] || 0) + 1;
      });

      map[col] = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    });

    return map;
  }, [allLeads, selectedBatchId, selectedColumns]);

  // Filtered Leads: AND across columns, OR within a column
  const filteredLeads = useMemo(() => {
    let list = selectedBatchId === 'all' 
      ? allLeads 
      : allLeads.filter(l => l.batch_id === selectedBatchId);

    // Apply checkbox filters
    const filterEntries = Object.entries(activeFilters).filter(([_, vals]) => vals.length > 0);

    if (filterEntries.length > 0) {
      list = list.filter(lead => {
        // Must satisfy ALL active column filters (AND)
        return filterEntries.every(([col, selectedVals]) => {
          const leadVal = getLeadColumnValue(lead, col);
          // Must match ANY of the checked values within this column (OR)
          return selectedVals.includes(leadVal);
        });
      });
    }

    return list;
  }, [allLeads, selectedBatchId, activeFilters]);

  // Calculate donut chart datasets based on filteredLeads
  const chartsData = useMemo(() => {
    const dataMap: Record<string, { name: string; value: number; color: string }[]> = {};

    selectedColumns.forEach(col => {
      const counts: Record<string, number> = {};
      filteredLeads.forEach(lead => {
        const val = getLeadColumnValue(lead, col);
        counts[val] = (counts[val] || 0) + 1;
      });

      dataMap[col] = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10) // top 10
        .map(([name, value], idx) => ({
          name,
          value,
          color: PALETTE[idx % PALETTE.length],
        }));
    });

    return dataMap;
  }, [filteredLeads, selectedColumns]);

  // Toggle filter checkbox
  const handleToggleFilter = (col: string, val: string) => {
    setActiveFilters(prev => {
      const current = prev[col] || [];
      const updated = current.includes(val) 
        ? current.filter(v => v !== val) 
        : [...current, val];

      return {
        ...prev,
        [col]: updated,
      };
    });
    setTablePage(1);
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    setTablePage(1);
  };

  // Add/Remove column from dashboard
  const handleAddColumn = (col: string) => {
    if (!selectedColumns.includes(col)) {
      setSelectedColumns([...selectedColumns, col]);
    }
  };

  const handleRemoveColumn = (col: string) => {
    setSelectedColumns(selectedColumns.filter(c => c !== col));
    setActiveFilters(prev => {
      const next = { ...prev };
      delete next[col];
      return next;
    });
  };

  const handleToggleColumn = (col: string) => {
    if (selectedColumns.includes(col)) {
      handleRemoveColumn(col);
    } else {
      handleAddColumn(col);
    }
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns([...availableColumns]);
  };

  const handleSelectStandardColumns = () => {
    setSelectedColumns([...DEFAULT_SELECTED_COLUMNS]);
  };

  const handleClearAllColumns = () => {
    setSelectedColumns([]);
    setActiveFilters({});
  };

  // Save Dashboard
  const handleSaveDashboard = async () => {
    if (!newDashboardTitle.trim()) return;
    const saved = await saveCustomDashboard({
      name: newDashboardTitle.trim(),
      config: {
        batch_id: selectedBatchId,
        selected_columns: selectedColumns,
        saved_filters: activeFilters,
      },
      created_by: 'admin',
    });
    setSavedDashboards([saved, ...savedDashboards]);
    setDashboardName(saved.name);
    setIsSaving(false);
    setNewDashboardTitle('');
  };

  // Load Dashboard
  const handleLoadDashboard = (dash: CustomDashboard) => {
    setDashboardName(dash.name);
    setSelectedBatchId(dash.config.batch_id || 'all');
    setSelectedColumns(dash.config.selected_columns || []);
    setActiveFilters(dash.config.saved_filters || {});
    setTablePage(1);
  };

  // Export Filtered Table
  const handleExport = () => {
    const rows = filteredLeads.map(l => ({
      'Customer Name': l.customer_name,
      'Phone': l.phone,
      'Policy Date': l.policy_date,
      'Status': l.status.toUpperCase(),
      ...l.data,
    }));
    exportToExcel(rows, `RenewCall_Custom_${dashboardName.replace(/\s+/g, '_')}`);
  };

  // Paged table items
  const pagedRecords = filteredLeads.slice((tablePage - 1) * pageSize, tablePage * pageSize);
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header & Dashboard Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black tracking-tight text-white">{dashboardName}</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#4f6ef7]/15 text-[#4f6ef7] border border-[#4f6ef7]/30">
              Custom Analytics
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic multidimensional breakdowns with cross-column filtering & direct telecaller assignment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Batch Selector */}
          <select
            value={selectedBatchId}
            onChange={(e) => {
              setSelectedBatchId(e.target.value);
              setTablePage(1);
            }}
            className="px-3 py-2 bg-[#161926] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
          >
            <option value="all">All Batches Data</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.file_name}
              </option>
            ))}
          </select>

          {/* Load Dashboard Dropdown */}
          {savedDashboards.length > 0 && (
            <div className="relative group">
              <select
                onChange={(e) => {
                  const found = savedDashboards.find(d => d.id === e.target.value);
                  if (found) handleLoadDashboard(found);
                }}
                defaultValue=""
                className="px-3 py-2 bg-[#161926] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none"
              >
                <option value="" disabled>Load Saved Dashboard...</option>
                {savedDashboards.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={() => setIsSaving(true)}
            className="px-3.5 py-2 rounded-xl bg-[#161926] border border-[#252840] text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5 text-[#4f6ef7]" />
            <span>Save View</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20 text-xs font-semibold flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Interactive Column Selection Center */}
      <div className="bg-[#161926] border border-[#252840] rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#252840]">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#4f6ef7]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Excel Column Selector & Donut Breakdowns
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4f6ef7]/15 text-[#4f6ef7] border border-[#4f6ef7]/30">
                {selectedColumns.length} Active / {availableColumns.length} Available
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click any column pill to toggle its Donut breakdown chart and filter criteria.
            </p>
          </div>

          {/* Quick Preset Actions */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleSelectStandardColumns}
              className="px-2.5 py-1.5 rounded-xl bg-[#0e1017] border border-[#252840] hover:border-[#4f6ef7] text-slate-300 hover:text-white text-[11px] font-medium flex items-center space-x-1.5 transition-colors"
              title="Reset to Product, Sub Product, RTO State, RTO Place, Employee, Insu.Company"
            >
              <RotateCcw className="w-3 h-3 text-[#4f6ef7]" />
              <span>Standard 6 Columns</span>
            </button>
            <button
              onClick={handleSelectAllColumns}
              className="px-2.5 py-1.5 rounded-xl bg-[#0e1017] border border-[#252840] hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 text-[11px] font-medium flex items-center space-x-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Select All ({availableColumns.length})</span>
            </button>
            <button
              onClick={handleClearAllColumns}
              disabled={selectedColumns.length === 0}
              className="px-2.5 py-1.5 rounded-xl bg-[#0e1017] border border-[#252840] hover:border-rose-500/50 text-slate-400 hover:text-rose-400 text-[11px] font-medium flex items-center space-x-1.5 disabled:opacity-40 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Search Bar for Columns */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              placeholder="Search column name (e.g. Product, RTO State, Employee, Vehicle No, Amount)..."
              className="w-full pl-9 pr-8 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#4f6ef7]"
            />
            {columnSearch && (
              <button
                onClick={() => setColumnSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* All Available Column Pills Matrix */}
        <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
          {searchedColumns.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No columns match "{columnSearch}".
            </p>
          ) : (
            searchedColumns.map(col => {
              const isSelected = selectedColumns.includes(col);
              return (
                <button
                  key={col}
                  onClick={() => handleToggleColumn(col)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#4f6ef7] to-[#8b5cf6] text-white shadow-md shadow-indigo-600/25 border border-indigo-400/40 ring-1 ring-white/10'
                      : 'bg-[#0e1017] border border-[#252840] text-slate-300 hover:border-[#4f6ef7] hover:text-white hover:bg-[#161926]'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3 h-3 text-white" />
                      <span>{col}</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center ml-0.5 hover:bg-white/40">
                        <X className="w-2.5 h-2.5 text-white" />
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 text-slate-500" />
                      <span>{col}</span>
                    </>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Active Selection Summary Bar */}
        {selectedColumns.length > 0 ? (
          <div className="pt-2 border-t border-[#252840] flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <PieChartIcon className="w-3.5 h-3.5 text-[#4f6ef7]" />
              <span>Active Breakdown Cards: <strong className="text-white">{selectedColumns.length}</strong> columns displaying charts below</span>
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Tip: Click any active pill above or the chart's close icon to remove.
            </span>
          </div>
        ) : (
          <div className="pt-2 border-t border-[#252840] text-xs text-amber-400/90 flex items-center space-x-2">
            <span>⚠️ No columns selected. Click any column above or click "Standard 6 Columns" to view donut breakdowns.</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left Filters Panel & Right Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left FILTERS Panel */}
        <div className="lg:col-span-1 bg-[#161926] border border-[#252840] rounded-2xl p-5 space-y-5 h-fit shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-[#252840]">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-[#4f6ef7]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Dynamic Filters</h3>
            </div>
            {Object.values(activeFilters).some(v => v.length > 0) && (
              <button
                onClick={handleClearFilters}
                className="text-[10px] text-slate-400 hover:text-rose-400 underline font-semibold"
              >
                Clear all
              </button>
            )}
          </div>

          {selectedColumns.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Select at least one column above.</p>
          ) : (
            selectedColumns.map(col => {
              const values = distinctValuesPerCol[col] || [];
              const checkedList = activeFilters[col] || [];

              return (
                <div key={col} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                      {col}
                    </span>
                    {checkedList.length > 0 && (
                      <span className="text-[10px] font-bold text-[#4f6ef7]">
                        {checkedList.length} active
                      </span>
                    )}
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 bg-[#0e1017] p-2 rounded-xl border border-[#252840]">
                    {values.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic">No values</span>
                    ) : (
                      values.map(({ value, count }) => {
                        const isChecked = checkedList.includes(value);
                        return (
                          <label
                            key={value}
                            className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors ${
                              isChecked ? 'bg-[#4f6ef7]/15 text-white' : 'text-slate-300 hover:bg-[#161926]'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0 pr-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleFilter(col, value)}
                                className="rounded border-[#252840] text-[#4f6ef7] focus:ring-0 accent-[#4f6ef7]"
                              />
                              <span className="truncate text-[11px]">{value}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                              {count}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Charts Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {selectedColumns.map(col => {
              const data = chartsData[col] || [];
              const totalColLeads = data.reduce((acc, curr) => acc + curr.value, 0);

              return (
                <div
                  key={col}
                  className="bg-[#161926] border border-[#252840] rounded-2xl p-5 shadow-sm flex flex-col justify-between group hover:border-[#393e60] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white truncate">
                        {col}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {data.length} distinct categories
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveColumn(col)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-[#0e1017] transition-colors"
                      title={`Remove ${col} breakdown`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {data.length === 0 ? (
                    <div className="h-48 w-full flex flex-col items-center justify-center text-center p-4 bg-[#0e1017]/40 rounded-xl my-3 border border-dashed border-[#252840]">
                      <span className="text-xs text-slate-400">No values in dataset</span>
                      <span className="text-[10px] text-slate-500 mt-1">Excel rows do not contain "{col}" yet</span>
                    </div>
                  ) : (
                    <>
                      {/* Donut Chart */}
                      <div className="h-48 w-full relative flex items-center justify-center my-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#161926',
                                borderColor: '#252840',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '11px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-lg font-bold text-white">{totalColLeads}</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Total</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-1 pt-2 border-t border-[#252840] max-h-32 overflow-y-auto pr-1">
                        {data.slice(0, 5).map(item => (
                          <div key={item.name} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center space-x-1.5 min-w-0 pr-1">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-slate-300 truncate">{item.name}</span>
                            </div>
                            <span className="font-semibold text-white ml-2 font-mono">
                              {item.value} ({totalColLeads > 0 ? Math.round((item.value / totalColLeads) * 100) : 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Matching Records Table Below Charts */}
      <div className="bg-[#161926] border border-[#252840] rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">Filtered Records ({filteredLeads.length})</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Entries matching active visual and column filters. Select rows to assign to telecallers.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {selectedLeadIds.length > 0 && (
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="px-4 py-2 rounded-xl gradient-btn text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assign {selectedLeadIds.length} to Telecaller</span>
              </button>
            )}

            <button
              onClick={() => {
                if (selectedLeadIds.length === filteredLeads.length) {
                  setSelectedLeadIds([]);
                } else {
                  setSelectedLeadIds(filteredLeads.map(l => l.id));
                }
              }}
              className="px-3 py-2 rounded-xl bg-[#0e1017] border border-[#252840] text-xs text-slate-300 hover:text-white"
            >
              {selectedLeadIds.length === filteredLeads.length ? 'Deselect All' : 'Select All Filtered'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-[#252840] rounded-xl bg-[#0e1017]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#252840] bg-[#161926]/70 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 w-10"></th>
                <th className="py-2.5 px-3 font-bold text-slate-300">Customer Name</th>
                <th className="py-2.5 px-3 font-bold text-slate-300">Phone</th>
                <th className="py-2.5 px-3 font-bold text-slate-300">Policy Expiry</th>
                <th className="py-2.5 px-3 font-bold text-slate-300">Status</th>
                {selectedColumns.map(c => (
                  <th key={c} className="py-2.5 px-3 text-slate-400">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252840]/60">
              {pagedRecords.length === 0 ? (
                <tr>
                  <td colSpan={5 + selectedColumns.length} className="py-8 text-center text-slate-500">
                    No matching records for current filter selection.
                  </td>
                </tr>
              ) : (
                pagedRecords.map(lead => {
                  const isChecked = selectedLeadIds.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setViewingLeadId(lead.id)}
                      className="hover:bg-[#161926]/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedLeadIds(selectedLeadIds.filter(i => i !== lead.id));
                            } else {
                              setSelectedLeadIds([...selectedLeadIds, lead.id]);
                            }
                          }}
                          className="rounded border-[#252840] text-[#4f6ef7] focus:ring-0 accent-[#4f6ef7]"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">{lead.customer_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{lead.phone}</td>
                      <td className="py-2.5 px-3">{formatDate(lead.policy_date)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-[#252840]">
                          {lead.status}
                        </span>
                      </td>
                      {selectedColumns.map(c => {
                        const cellVal = getLeadColumnValue(lead, c);
                        return (
                          <td key={c} className="py-2.5 px-3 text-slate-300">
                            {cellVal === 'Unknown / Blank' ? '—' : cellVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span>
            Page {tablePage} of {totalPages} &bull; Showing {pagedRecords.length} records
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTablePage(p => Math.max(1, p - 1))}
              disabled={tablePage === 1}
              className="px-3 py-1 bg-[#0e1017] border border-[#252840] rounded-lg disabled:opacity-30"
            >
              Prev
            </button>
            <button
              onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
              disabled={tablePage >= totalPages}
              className="px-3 py-1 bg-[#0e1017] border border-[#252840] rounded-lg disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Save Dashboard Modal */}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#161926] border border-[#252840] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Save Custom Dashboard</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter a name for this custom analytical view:
            </p>
            <input
              type="text"
              value={newDashboardTitle}
              onChange={(e) => setNewDashboardTitle(e.target.value)}
              placeholder="e.g. 3W Stand Visit / Brand Breakdown"
              className="w-full px-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 mb-4 focus:outline-none focus:border-[#4f6ef7]"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsSaving(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDashboard}
                disabled={!newDashboardTitle.trim()}
                className="px-4 py-1.5 gradient-btn text-white text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      <AssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedLeadIds={selectedLeadIds}
        onAssigned={() => {
          setSelectedLeadIds([]);
          loadInitialData();
        }}
      />

      {/* Lead Detail Panel */}
      <LeadDetailPanel
        leadId={viewingLeadId}
        onClose={() => setViewingLeadId(null)}
      />
    </div>
  );
};
