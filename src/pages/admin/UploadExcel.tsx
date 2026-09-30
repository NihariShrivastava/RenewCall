import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  createBatch, 
  getBatches, 
  deleteBatch, 
  insertLeadsInChunks, 
  getAllLeadsRaw 
} from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { UploadBatch } from '../../types';
import { parseExcelDate, sanitizePhone, isValidPhone, formatDate, toISODateString } from '../../lib/utils';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  ArrowRight, 
  RefreshCw, 
  Calendar, 
  User, 
  Phone, 
  Layers, 
  Check, 
  X,
  FileCheck2
} from 'lucide-react';

interface ParsedRow {
  _raw: Record<string, any>;
  _rowIndex: number;
  customer_name?: string;
  phone?: string;
  policy_date?: string | null;
  isValidDate: boolean;
  isValidPhone: boolean;
  isDuplicate?: boolean;
}

export const UploadExcel: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  // Mapping state
  const [nameCol, setNameCol] = useState('');
  const [phoneCol, setPhoneCol] = useState('');
  const [dateCol, setDateCol] = useState('');

  // Options
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(false);

  // Import progress
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    imported: number;
    skipped: number;
    failed: number;
  } | null>(null);

  // Deletion modal
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    const list = await getBatches();
    setBatches(list);
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (json.length === 0) {
        alert('The uploaded Excel spreadsheet is empty.');
        return;
      }

      const foundHeaders = Object.keys(json[0]);
      setHeaders(foundHeaders);
      setRawRows(json);

      // Auto-detect columns intelligently
      autoDetectColumns(foundHeaders);
    };
    reader.readAsArrayBuffer(file);
  };

  const autoDetectColumns = (cols: string[]) => {
    // Name detect: priority to "Name of Insured", then insured, customer, client, name
    const nameMatch = cols.find(c => /^name of insured$/i.test(c.trim())) ||
      cols.find(c => /insured/i.test(c)) ||
      cols.find(c => /customer|client|name/i.test(c));
    if (nameMatch) setNameCol(nameMatch);
    else if (cols.length > 0) setNameCol(cols[0]);

    // Phone detect: priority to "Mobile No", then mobile, phone, contact
    const phoneMatch = cols.find(c => /^mobile no$/i.test(c.trim())) ||
      cols.find(c => /mobile/i.test(c)) ||
      cols.find(c => /phone|contact|cell/i.test(c));
    if (phoneMatch) setPhoneCol(phoneMatch);
    else if (cols.length > 1) setPhoneCol(cols[1]);

    // Date detect: priority to "Policy Date", then date, expiry, renew
    const dateMatch = cols.find(c => /^policy date$/i.test(c.trim())) ||
      cols.find(c => /policy.?date/i.test(c)) ||
      cols.find(c => /expiry|renew|exp/i.test(c));
    if (dateMatch) setDateCol(dateMatch);
    else if (cols.length > 2) setDateCol(cols[2]);
  };

  // Preview validation of first 20 rows
  const previewRows: ParsedRow[] = rawRows.slice(0, 20).map((row, idx) => {
    const rawName = nameCol ? String(row[nameCol] || '').trim() : '';
    const rawPhone = phoneCol ? sanitizePhone(row[phoneCol]) : '';
    const parsedDate = dateCol ? parseExcelDate(row[dateCol]) : null;

    return {
      _raw: row,
      _rowIndex: idx + 1,
      customer_name: rawName,
      phone: rawPhone,
      policy_date: parsedDate,
      isValidDate: Boolean(parsedDate),
      isValidPhone: isValidPhone(rawPhone),
    };
  });

  const handleStartImport = async () => {
    if (!nameCol || !phoneCol || !dateCol) {
      alert('Please map Customer Name, Phone, and Policy Date columns.');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Fetch existing leads for duplicate checking
      const existingLeads = await getAllLeadsRaw();
      const existingKeySet = new Set(
        existingLeads.map(l => `${l.phone}_${l.policy_date}`)
      );

      // Create UploadBatch record first
      const newBatch = await createBatch({
        file_name: fileName || 'Uploaded_Sheet.xlsx',
        uploaded_by: user?.id || 'admin',
        column_headers: headers,
        column_mapping: {
          customer_name: nameCol,
          phone: phoneCol,
          policy_date: dateCol,
        },
        total_rows: rawRows.length,
      });

      let skippedCount = 0;
      const validLeadsToInsert: any[] = [];

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const custName = String(row[nameCol] || 'Customer').trim();
        const rawPhone = String(row[phoneCol] || '').trim();
        const cleanPhone = sanitizePhone(rawPhone) || rawPhone || '0000000000';
        const cleanDate = parseExcelDate(row[dateCol]) || toISODateString(new Date());

        const validDate = Boolean(parseExcelDate(row[dateCol]));
        const validPhone = isValidPhone(cleanPhone);

        if (skipInvalid && (!validDate || !validPhone)) {
          skippedCount++;
          continue;
        }

        const duplicateKey = `${cleanPhone}_${cleanDate}_${row['Vehicle No'] || row['Policy No'] || i}`;
        if (skipDuplicates && existingKeySet.has(duplicateKey)) {
          skippedCount++;
          continue;
        }

        // Add to batch insert list; ALL other columns kept in data JSONB
        validLeadsToInsert.push({
          batch_id: newBatch.id,
          customer_name: custName,
          phone: cleanPhone,
          policy_date: cleanDate,
          status: 'unassigned',
          assigned_to: null,
          assigned_at: null,
          skip_count: 0,
          next_call_date: null,
          last_remark: null,
          data: row,
        });

        // Track in current set to avoid duplicates within same uploaded file
        existingKeySet.add(duplicateKey);
      }

      // Chunked insert in blocks of 500
      const { inserted, failed } = await insertLeadsInChunks(
        validLeadsToInsert,
        (pct) => setImportProgress(pct)
      );

      setImportSummary({
        total: rawRows.length,
        imported: inserted,
        skipped: skippedCount,
        failed,
      });

      // Reload batches
      await loadBatches();
      // Reset raw rows
      setRawRows([]);
      setHeaders([]);
      setFileName('');
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!batchToDelete) return;
    await deleteBatch(batchToDelete);
    setBatchToDelete(null);
    await loadBatches();
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Upload Excel Spreadsheets</h1>
        <p className="text-xs text-slate-400 mt-1">
          Import client renewal records with dynamic column mapping, validation, and batching.
        </p>
      </div>

      {/* Upload Zone / Drop Area */}
      {rawRows.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all bg-[#161926]/60 ${
            isDragging
              ? 'border-[#4f6ef7] bg-[#4f6ef7]/10'
              : 'border-[#252840] hover:border-[#393e60]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0e1017] border border-[#252840] flex items-center justify-center text-[#4f6ef7] mb-4 shadow-lg">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-white">Drag and Drop Your Excel or CSV File</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Supports .xlsx, .xls, and .csv files. Handles unlimited columns (Brand, Vehicle No, Policy No, Premium, Insurer, City, etc.).
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-xl gradient-btn text-white text-xs font-semibold shadow-lg shadow-indigo-600/25"
            >
              Browse Files from Computer
            </button>
            <a
              href="/sample_renewals.xlsx"
              download="RenewCall_Insurance_Sample.xlsx"
              className="px-4 py-3 rounded-xl bg-[#0e1017] border border-[#252840] hover:border-[#4f6ef7] text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Download Sample Excel</span>
            </a>
          </div>
        </div>
      ) : (
        /* Column Mapping & Verification Section */
        <div className="bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#252840] gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-[#4f6ef7]" />
                <h3 className="text-base font-bold text-white">{fileName}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {rawRows.length} total rows detected &bull; {headers.length} columns found
              </p>
            </div>
            <button
              onClick={() => {
                setRawRows([]);
                setHeaders([]);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#0e1017] border border-[#252840] text-xs text-slate-400 hover:text-white"
            >
              Upload Different File
            </button>
          </div>

          {/* Column Selectors */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <span>Required Column Mapping</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-[#4f6ef7]" />
                  <span>Customer Name Column</span>
                </label>
                <select
                  value={nameCol}
                  onChange={(e) => setNameCol(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Phone Number Column</span>
                </label>
                <select
                  value={phoneCol}
                  onChange={(e) => setPhoneCol(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[#8b5cf6]" />
                  <span>Policy Expiry Date Column</span>
                </label>
                <select
                  value={dateCol}
                  onChange={(e) => setDateCol(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Note: All other insurance columns (Product, RTO State, Vehicle No, Employee, Amount, etc.) are automatically preserved in the JSON data payload.
            </p>

            {/* Detected Standard Insurance Columns Pills */}
            <div className="mt-4 pt-4 border-t border-[#252840]/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Insurance Columns Detected in This Sheet:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Policy Date', 'Product', 'Sub Product', 'RTO State', 'RTO Place', 
                  'Vehicle No', 'Employee', 'Insu.Company', 'Policy Type', 'Branch', 
                  'Amount', 'Policy No', 'Chasis No', 'Net Total(1+2)'
                ].map(colName => {
                  const isFound = headers.some(h => h.trim().toLowerCase() === colName.toLowerCase());
                  return (
                    <span
                      key={colName}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                        isFound
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#0e1017] text-slate-500 border-[#252840]'
                      }`}
                    >
                      {isFound ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="w-3 text-center">-</span>}
                      <span>{colName}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Import Controls & Options */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0e1017] border border-[#252840]">
            <div className="flex items-center space-x-6 text-xs text-slate-300">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded border-[#252840] text-[#4f6ef7] focus:ring-0 accent-[#4f6ef7]"
                />
                <span>Skip Duplicates (Same Phone + Date)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipInvalid}
                  onChange={(e) => setSkipInvalid(e.target.checked)}
                  className="rounded border-[#252840] text-[#4f6ef7] focus:ring-0 accent-[#4f6ef7]"
                />
                <span>Skip Rows with Invalid Phone/Date</span>
              </label>
            </div>

            <button
              onClick={handleStartImport}
              disabled={isImporting}
              className="px-6 py-2.5 rounded-xl gradient-btn text-white text-xs font-semibold shadow-md flex items-center space-x-2 disabled:opacity-50"
            >
              {isImporting ? (
                <span>Importing ({importProgress}%)...</span>
              ) : (
                <>
                  <span>Import {rawRows.length} Rows</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {isImporting && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Importing chunk batch into database...</span>
                <span>{importProgress}%</span>
              </div>
              <div className="w-full bg-[#0e1017] h-2.5 rounded-full overflow-hidden border border-[#252840]">
                <div
                  className="bg-gradient-to-r from-[#4f6ef7] to-[#8b5cf6] h-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* First 20 Rows Preview Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Preview First 20 Rows Validation
              </h4>
              <span className="text-[11px] text-slate-400">
                Showing rows 1–{previewRows.length}
              </span>
            </div>

            <div className="border border-[#252840] rounded-xl overflow-x-auto bg-[#0e1017]">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[#252840] bg-[#161926]/70 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-200">Name of Insured</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-200">Mobile No</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-200">Policy Date</th>
                    <th className="py-2.5 px-3 text-slate-400">Product / Sub Product</th>
                    <th className="py-2.5 px-3 text-slate-400">RTO (State & Place)</th>
                    <th className="py-2.5 px-3 text-slate-400">Vehicle No</th>
                    <th className="py-2.5 px-3 text-slate-400">Employee</th>
                    <th className="py-2.5 px-3 text-slate-400">Insu. Company</th>
                    <th className="py-2.5 px-3 text-slate-400">Amount</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252840]/60">
                  {previewRows.map((r) => {
                    const isAllValid = r.isValidDate && r.isValidPhone;
                    const raw = r._raw;
                    const productStr = [raw['Product'], raw['Sub Product']].filter(Boolean).join(' • ');
                    const rtoStr = [raw['RTO Place'], raw['RTO State']].filter(Boolean).join(', ');
                    const vehicleNo = raw['Vehicle No'] || '—';
                    const employee = raw['Employee'] || '—';
                    const insuCo = raw['Insu.Company'] || raw['Insurer'] || '—';
                    const amount = raw['Amount'] || raw['Net Total(1+2)'] || '—';

                    return (
                      <tr key={r._rowIndex} className="hover:bg-[#161926]/40 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{r._rowIndex}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {r.customer_name || <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className={r.isValidPhone ? 'text-slate-200' : 'text-rose-400 font-semibold'}>
                            {r.phone || 'Invalid'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={r.isValidDate ? 'text-slate-200' : 'text-rose-400 font-semibold'}>
                            {r.policy_date ? formatDate(r.policy_date) : 'Invalid Date'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-medium">
                          {productStr || raw['Vehicle Brand'] || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {rtoStr || raw['City'] || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {vehicleNo}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {employee}
                        </td>
                        <td className="py-2.5 px-3 text-indigo-400 font-medium">
                          {insuCo}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400">
                          {amount !== '—' ? `₹${amount}` : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {isAllValid ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-400 text-[10px] font-semibold">
                              <Check className="w-3.5 h-3.5" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-400 text-[10px] font-semibold">
                              <X className="w-3.5 h-3.5" />
                              <span>Check</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Import Summary Alert */}
      {importSummary && (
        <div className="bg-[#161926] border border-emerald-500/30 rounded-2xl p-6 animate-in fade-in">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import Batch Completed</h3>
              <p className="text-xs text-slate-400">Renewal leads successfully uploaded and indexed</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="bg-[#0e1017] p-3 rounded-xl border border-[#252840]">
              <span className="text-slate-400 block text-[10px] uppercase">Total Sheet Rows</span>
              <span className="text-lg font-bold text-white">{importSummary.total}</span>
            </div>
            <div className="bg-[#0e1017] p-3 rounded-xl border border-[#252840]">
              <span className="text-slate-400 block text-[10px] uppercase">Imported Leads</span>
              <span className="text-lg font-bold text-emerald-400">{importSummary.imported}</span>
            </div>
            <div className="bg-[#0e1017] p-3 rounded-xl border border-[#252840]">
              <span className="text-slate-400 block text-[10px] uppercase">Skipped / Duplicates</span>
              <span className="text-lg font-bold text-amber-400">{importSummary.skipped}</span>
            </div>
            <div className="bg-[#0e1017] p-3 rounded-xl border border-[#252840]">
              <span className="text-slate-400 block text-[10px] uppercase">Failed Rows</span>
              <span className="text-lg font-bold text-rose-400">{importSummary.failed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Upload History List */}
      <div className="bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Upload History</h3>
            <p className="text-xs text-slate-400 mt-0.5">Historical batches uploaded to the calling system</p>
          </div>
          <button
            onClick={loadBatches}
            className="p-2 rounded-xl bg-[#0e1017] border border-[#252840] text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs bg-[#0e1017] rounded-xl border border-[#252840]">
            No uploaded spreadsheets found. Drag and drop a file above to begin.
          </div>
        ) : (
          <div className="divide-y divide-[#252840] border border-[#252840] rounded-xl overflow-hidden bg-[#0e1017]">
            {batches.map((b) => (
              <div
                key={b.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-[#161926]/40 transition-colors gap-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#161926] border border-[#252840] flex items-center justify-center text-[#4f6ef7]">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{b.file_name}</h4>
                    <p className="text-[11px] text-slate-400">
                      Uploaded on {new Date(b.created_at).toLocaleDateString()} &bull; {b.total_rows} records
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-[#252840]">
                    {b.column_headers.length} Columns
                  </span>
                  <button
                    onClick={() => setBatchToDelete(b.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Delete batch and its leads"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Batch Confirmation Dialog */}
      <ConfirmationModal
        isOpen={Boolean(batchToDelete)}
        onClose={() => setBatchToDelete(null)}
        onConfirm={handleDeleteBatch}
        title="Delete Upload Batch"
        message="Are you sure you want to delete this batch? All leads belonging to this batch will be soft deleted from the system."
        confirmLabel="Delete Batch"
      />
    </div>
  );
};
