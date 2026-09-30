import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as XLSX from "xlsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a Date object or ISO string to dd-mm-yyyy (Indian date format)
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return "—";
  }
}

/**
 * Format a Date to yyyy-mm-dd for standard HTML inputs or database queries
 */
export function toISODateString(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

/**
 * Robust date parser supporting:
 * - Excel serial number (e.g. 45123)
 * - dd-mm-yyyy or dd/mm/yyyy
 * - yyyy-mm-dd or yyyy/mm/dd
 * - standard Date strings
 * Returns valid YYYY-MM-DD string or null if invalid.
 */
export function parseExcelDate(val: any): string | null {
  if (val === null || val === undefined || val === "") return null;

  // Handle JS Date object (e.g. from SheetJS cellDates: true)
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return toISODateString(val);
    }
    return null;
  }

  // Handle number (Excel serial date)
  if (typeof val === "number" || (!isNaN(Number(val)) && !String(val).includes("-") && !String(val).includes("/"))) {
    const serial = Number(val);
    if (serial > 10000 && serial < 80000) {
      // Excel base date is Dec 30 1899 (due to leap year bug)
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return toISODateString(date);
      }
    }
  }

  const str = String(val).trim();

  // Try dd-mm-yyyy or dd/mm/yyyy with optional time part (e.g. "20-09-2026 19:09:04 PM")
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(\s+.*)?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return toISODateString(d);
    }
  }

  // Try yyyy-mm-dd or yyyy/mm/dd with optional time part
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(\s+.*)?$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return toISODateString(d);
    }
  }

  // Fallback Native parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return toISODateString(parsed);
  }

  return null;
}

/**
 * Sanitize 10-digit Indian phone number
 */
export function sanitizePhone(val: any): string {
  if (!val) return "";
  // Strip decimals from Excel numbers e.g. 8965954507.0 -> 8965954507
  const cleaned = String(val).replace(/\.0+$/, "").replace(/\D/g, "");
  // If it starts with 91 and has 12 digits, strip 91
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned.slice(2);
  }
  // If it starts with 0 and has 11 digits, strip 0
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Validate phone number (must be 10 digits starting with 6-9, or valid length)
 */
export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone) || /^\d{10}$/.test(phone);
}

/**
 * Calculate difference in days between two dates (date2 - date1)
 */
export function getDaysDifference(targetDate: string | Date, fromDate: string | Date = new Date()): number {
  const d1 = new Date(toISODateString(fromDate));
  const d2 = new Date(toISODateString(targetDate));
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Export JSON array to Excel spreadsheet
 */
export function exportToExcel(data: Record<string, any>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Generate standard RFC4122 v4 UUID
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Robust extraction of column values from lead records.
 * Supports exact match, normalized case/space/punctuation insensitive match, and synonyms.
 */
export function getLeadColumnValue(lead: any, colName: string): string {
  if (!lead) return '—';

  // 1. Direct match in lead.data
  if (lead.data && lead.data[colName] !== undefined && lead.data[colName] !== null) {
    const s = String(lead.data[colName]).trim();
    if (s !== '') return s;
  }

  const normTarget = colName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 2. Normalized match in lead.data
  if (lead.data && typeof lead.data === 'object') {
    for (const [key, val] of Object.entries(lead.data)) {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normKey === normTarget) {
          return String(val).trim();
        }
      }
    }

    // 3. Synonym matching for common insurance columns
    for (const [key, val] of Object.entries(lead.data)) {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Insurance company aliases
        if (normTarget.includes('insu') && normKey.includes('insu')) {
          return String(val).trim();
        }
        // Vehicle number aliases
        if ((normTarget.includes('veh') || normTarget.includes('reg')) &&
            (normKey.includes('veh') || normKey.includes('reg'))) {
          return String(val).trim();
        }
        // Sub product aliases
        if (normTarget.includes('subprod') && normKey.includes('subprod')) {
          return String(val).trim();
        }
        // Employee aliases
        if (normTarget.includes('emp') && normKey.includes('emp')) {
          return String(val).trim();
        }
        // Net total aliases
        if (normTarget.includes('nettotal') && normKey.includes('nettotal')) {
          if (normTarget.includes('12') && normKey.includes('12')) return String(val).trim();
          if (normTarget.endsWith('1') && normKey.endsWith('1')) return String(val).trim();
          if (normTarget.endsWith('2') && normKey.endsWith('2')) return String(val).trim();
        }
      }
    }
  }

  // 4. Fallback to top-level Lead fields
  if (normTarget.includes('name') || normTarget.includes('insured') || normTarget.includes('customer')) {
    if (lead.customer_name) return String(lead.customer_name).trim();
  }
  if (normTarget.includes('phone') || normTarget.includes('mobile') || normTarget.includes('contact')) {
    if (lead.phone) return String(lead.phone).trim();
  }
  if (normTarget.includes('date') || normTarget.includes('expiry') || normTarget.includes('renew')) {
    if (lead.policy_date) return formatDate(lead.policy_date);
  }

  return 'Unknown / Blank';
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

