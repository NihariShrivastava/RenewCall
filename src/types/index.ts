export type UserRole = 'admin' | 'telecaller';

export interface User {
  id: string;
  username: string;
  password: string; // Plain text column as explicitly required
  full_name: string;
  phone: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  first_login?: boolean;
}

export type LeadStatus = 'unassigned' | 'pending' | 'done' | 'closed' | 'reverted';

export interface UploadBatch {
  id: string;
  file_name: string;
  uploaded_by: string | null;
  column_headers: string[]; // Original Excel headers
  column_mapping: {
    customer_name: string;
    phone: string;
    policy_date: string;
    [key: string]: string;
  };
  total_rows: number;
  created_at: string;
  is_deleted?: boolean;
}

export interface Lead {
  id: string;
  batch_id: string;
  data: Record<string, any>; // Full original Excel row with dynamic columns
  customer_name: string;
  phone: string;
  policy_date: string; // YYYY-MM-DD
  status: LeadStatus;
  assigned_to: string | null;
  assigned_at: string | null;
  skip_count: number;
  next_call_date: string | null; // YYYY-MM-DD
  last_remark: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Join fields
  assigned_user?: User | null;
}

export type LeadActivityAction = 
  | 'assigned' 
  | 'skipped' 
  | 'done' 
  | 'closed' 
  | 'reverted' 
  | 'remark' 
  | 'reassigned' 
  | 'unassigned';

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string | null;
  action: LeadActivityAction;
  remark: string | null;
  meta: Record<string, any>;
  created_at: string;
  user?: User | null;
}

export interface CustomDashboardConfig {
  batch_id?: string;
  selected_columns: string[];
  saved_filters?: Record<string, string[]>;
  chart_types?: Record<string, 'donut' | 'bar'>;
}

export interface CustomDashboard {
  id: string;
  name: string;
  config: CustomDashboardConfig;
  created_by: string | null;
  created_at: string;
}

export interface TelecallerStats {
  telecaller_id: string;
  telecaller_name: string;
  username: string;
  total_assigned: number;
  pending_due: number; // status=pending & next_call_date <= today
  upcoming: number; // status=pending & next_call_date > today
  skipped: number; // skip_count > 0
  done: number;
  closed: number;
  reverted: number;
  calls_today: number;
  conversion_rate: number; // done / total_assigned * 100
}
