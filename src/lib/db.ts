import { supabase, isSupabaseConfigured } from './supabase';
import { 
  User, 
  UploadBatch, 
  Lead, 
  LeadActivity, 
  CustomDashboard, 
  TelecallerStats 
} from '../types';
import { calculateInitialCallDate, calculateNextSkipDate } from './skipSchedule';
import { toISODateString, generateUUID, isValidUUID } from './utils';

// Local storage keys for fallback persistence
// Safe storage wrapper that works seamlessly in browser and Node/SSR
const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try { return safeStorage.getItem(key); } catch { return null; }
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try { safeStorage.setItem(key, value); } catch {}
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try { safeStorage.removeItem(key); } catch {}
    }
  }
};

const LS_USERS = 'renewcall_users';
const LS_BATCHES = 'renewcall_batches';
const LS_LEADS = 'renewcall_leads';
const LS_ACTIVITIES = 'renewcall_activities';
const LS_DASHBOARDS = 'renewcall_dashboards';

// Clean initial default admin user ONLY (matching Supabase user UUID)
const SEED_USERS: User[] = [
  {
    id: '79674a24-31af-4081-a110-23aa9d00a9d9',
    username: 'admin',
    password: 'admin123',
    full_name: 'Administrator',
    phone: '9876543210',
    email: 'admin@renewcall.com',
    role: 'admin',
    is_active: true,
    first_login: false,
    created_at: new Date().toISOString(),
  }
];

// Local storage init - ensures 100% clean data with NO false/mock records
function initLocalStorage() {
  // Wipe any legacy fake sample leads/batches/activities
  const rawLeads = safeStorage.getItem(LS_LEADS);
  if (rawLeads && (rawLeads.includes('batch-demo-1') || rawLeads.includes('Rajesh Malhotra'))) {
    safeStorage.removeItem(LS_LEADS);
    safeStorage.removeItem(LS_BATCHES);
    safeStorage.removeItem(LS_ACTIVITIES);
  }

  // Remove previous dummy telecallers (kuldeep, rohit, himanshi) from local storage
  const rawUsers = safeStorage.getItem(LS_USERS);
  if (rawUsers) {
    try {
      const uList: User[] = JSON.parse(rawUsers);
      const filtered = uList.filter(u => 
        u.username.toLowerCase() !== 'kuldeep' && 
        u.username.toLowerCase() !== 'rohit' && 
        u.username.toLowerCase() !== 'himanshi'
      );
      if (!filtered.some(u => u.username.toLowerCase() === 'admin')) {
        filtered.unshift(SEED_USERS[0]);
      }
      safeStorage.setItem(LS_USERS, JSON.stringify(filtered));
    } catch (e) {
      safeStorage.setItem(LS_USERS, JSON.stringify(SEED_USERS));
    }
  } else {
    safeStorage.setItem(LS_USERS, JSON.stringify(SEED_USERS));
  }

  if (!safeStorage.getItem(LS_BATCHES)) {
    safeStorage.setItem(LS_BATCHES, JSON.stringify([]));
  }
  if (!safeStorage.getItem(LS_LEADS)) {
    safeStorage.setItem(LS_LEADS, JSON.stringify([]));
  }
  if (!safeStorage.getItem(LS_ACTIVITIES)) {
    safeStorage.setItem(LS_ACTIVITIES, JSON.stringify([]));
  }
  if (!safeStorage.getItem(LS_DASHBOARDS)) {
    safeStorage.setItem(LS_DASHBOARDS, JSON.stringify([]));
  }
}

// Initialize on script evaluation
try {
  initLocalStorage();
} catch (e) {
  console.warn('LocalStorage init warning:', e);
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------
export async function getUsers(): Promise<User[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data as User[];
    } catch (e) {
      console.warn('Supabase getUsers error, falling back to local:', e);
    }
  }
  const raw = safeStorage.getItem(LS_USERS);
  return raw ? JSON.parse(raw) : SEED_USERS;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.id === id) || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
  if (userData.role === 'admin') {
    const existingUsers = await getUsers();
    if (existingUsers.some(u => u.role === 'admin')) {
      throw new Error('Only one administrator is allowed in the entire website.');
    }
  }

  const newUser: User = {
    ...userData,
    id: generateUUID(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();
      if (!error && data) {
        const users = await getUsers();
        users.unshift(data as User);
        safeStorage.setItem(LS_USERS, JSON.stringify(users));
        return data as User;
      }
      if (error) {
        console.error('Supabase createUser error:', error);
      }
    } catch (e) {
      console.warn('Supabase createUser error, writing locally:', e);
    }
  }

  const users = await getUsers();
  users.unshift(newUser);
  safeStorage.setItem(LS_USERS, JSON.stringify(users));
  return newUser;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  if (isSupabaseConfigured && isValidUUID(id)) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as User;
    } catch (e) {
      console.warn('Supabase updateUser error, updating locally:', e);
    }
  }

  const users = await getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    safeStorage.setItem(LS_USERS, JSON.stringify(users));
    return users[idx];
  }
  throw new Error('User not found');
}

/**
 * Permanently delete user from the system (NOT soft-deactivate)
 * Also automatically unassigns any leads assigned to this user
 */
export async function deleteUser(id: string): Promise<void> {
  const allUsers = await getUsers();
  const target = allUsers.find(u => u.id === id);
  if (target?.role === 'admin') {
    throw new Error('The root administrator cannot be deleted. There must be exactly one administrator.');
  }

  if (isSupabaseConfigured && isValidUUID(id)) {
    try {
      // 1. Unassign any leads currently assigned to this user
      await supabase
        .from('leads')
        .update({ assigned_to: null, status: 'unassigned' })
        .eq('assigned_to', id);

      // 2. Permanently delete user record from database
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete user error:', error);
      }
    } catch (e) {
      console.warn('Supabase deleteUser exception:', e);
    }
  }

  // Permanently delete user from local storage
  const users = await getUsers();
  const filtered = users.filter(u => u.id !== id);
  safeStorage.setItem(LS_USERS, JSON.stringify(filtered));

  // Also unassign leads locally
  const rawL = safeStorage.getItem(LS_LEADS);
  if (rawL) {
    const leads: Lead[] = JSON.parse(rawL);
    const updated = leads.map(l => 
      l.assigned_to === id 
        ? { ...l, assigned_to: null, status: 'unassigned' as const } 
        : l
    );
    safeStorage.setItem(LS_LEADS, JSON.stringify(updated));
  }
}

// -------------------------------------------------------------
// BATCH OPERATIONS
// -------------------------------------------------------------
export async function getBatches(): Promise<UploadBatch[]> {
  let supaBatches: UploadBatch[] = [];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('upload_batches')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (!error && data) {
        supaBatches = data as UploadBatch[];
      } else if (error) {
        console.error('Supabase getBatches error:', error);
      }
    } catch (e) {
      console.warn('Supabase getBatches error:', e);
    }
  }

  const raw = safeStorage.getItem(LS_BATCHES);
  const localBatches: UploadBatch[] = raw ? JSON.parse(raw) : [];
  const activeLocal = localBatches.filter(b => !b.is_deleted);

  // Merge so no batch is lost
  const batchMap = new Map<string, UploadBatch>();
  activeLocal.forEach(b => batchMap.set(b.id, b));
  supaBatches.forEach(b => batchMap.set(b.id, b));

  const list = Array.from(batchMap.values());
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  safeStorage.setItem(LS_BATCHES, JSON.stringify(list));
  return list;
}

export async function createBatch(batchData: Omit<UploadBatch, 'id' | 'created_at'>): Promise<UploadBatch> {
  const batchId = generateUUID();
  const validUploadedBy = isValidUUID(batchData.uploaded_by) ? batchData.uploaded_by : null;

  const newBatch: UploadBatch = {
    ...batchData,
    id: batchId,
    uploaded_by: validUploadedBy,
    created_at: new Date().toISOString(),
    is_deleted: false,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('upload_batches')
        .insert([newBatch])
        .select()
        .single();
      if (!error && data) {
        const raw = safeStorage.getItem(LS_BATCHES);
        const list: UploadBatch[] = raw ? JSON.parse(raw) : [];
        list.unshift(data as UploadBatch);
        safeStorage.setItem(LS_BATCHES, JSON.stringify(list));
        return data as UploadBatch;
      }
      if (error) {
        console.error('Supabase createBatch error:', error);
      }
    } catch (e) {
      console.warn('Supabase createBatch error:', e);
    }
  }

  const raw = safeStorage.getItem(LS_BATCHES);
  const batches: UploadBatch[] = raw ? JSON.parse(raw) : [];
  batches.unshift(newBatch);
  safeStorage.setItem(LS_BATCHES, JSON.stringify(batches));
  return newBatch;
}

export async function deleteBatch(batchId: string): Promise<void> {
  if (isSupabaseConfigured && isValidUUID(batchId)) {
    try {
      await supabase
        .from('upload_batches')
        .update({ is_deleted: true })
        .eq('id', batchId);
      await supabase
        .from('leads')
        .update({ is_deleted: true })
        .eq('batch_id', batchId);
    } catch (e) {
      console.warn('Supabase deleteBatch error:', e);
    }
  }

  const rawB = safeStorage.getItem(LS_BATCHES);
  if (rawB) {
    const batches: UploadBatch[] = JSON.parse(rawB);
    const updated = batches.map(b => b.id === batchId ? { ...b, is_deleted: true } : b);
    safeStorage.setItem(LS_BATCHES, JSON.stringify(updated));
  }

  const rawL = safeStorage.getItem(LS_LEADS);
  if (rawL) {
    const leads: Lead[] = JSON.parse(rawL);
    const updatedL = leads.map(l => l.batch_id === batchId ? { ...l, is_deleted: true } : l);
    safeStorage.setItem(LS_LEADS, JSON.stringify(updatedL));
  }
}

// -------------------------------------------------------------
// LEAD OPERATIONS
// -------------------------------------------------------------
export interface LeadFilterParams {
  search?: string;
  status?: string;
  assigned_to?: string;
  batch_id?: string;
  startDate?: string;
  endDate?: string;
  telecaller_id?: string;
  is_due_today?: boolean;
}

export async function getLeads(
  filters: LeadFilterParams = {},
  page = 1,
  pageSize = 50
): Promise<{ leads: Lead[]; total: number }> {
  let allLeads: Lead[] = [];

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.assigned_to && filters.assigned_to !== 'all') {
        if (filters.assigned_to === 'unassigned') {
          query = query.is('assigned_to', null);
        } else {
          query = query.eq('assigned_to', filters.assigned_to);
        }
      }
      if (filters.telecaller_id) {
        query = query.eq('assigned_to', filters.telecaller_id);
      }
      if (filters.batch_id && filters.batch_id !== 'all') {
        query = query.eq('batch_id', filters.batch_id);
      }
      if (filters.startDate) {
        query = query.gte('policy_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('policy_date', filters.endDate);
      }
      if (filters.is_due_today) {
        const todayStr = toISODateString(new Date());
        query = query.lte('next_call_date', todayStr).eq('status', 'pending');
      }
      if (filters.search) {
        query = query.or(`customer_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.order('policy_date', { ascending: true }).range(from, to);

      const { data, count, error } = await query;
      if (!error && data) {
        const users = await getUsers();
        const enriched = (data as Lead[]).map(l => ({
          ...l,
          assigned_user: users.find(u => u.id === l.assigned_to) || null
        }));
        return { leads: enriched, total: count || 0 };
      }
    } catch (e) {
      console.warn('Supabase getLeads error, falling back to local:', e);
    }
  }

  // Local storage query & filtering
  const raw = safeStorage.getItem(LS_LEADS);
  allLeads = raw ? JSON.parse(raw) : [];
  allLeads = allLeads.filter(l => !l.is_deleted);

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    allLeads = allLeads.filter(l => l.status === filters.status);
  }
  if (filters.assigned_to && filters.assigned_to !== 'all') {
    if (filters.assigned_to === 'unassigned') {
      allLeads = allLeads.filter(l => !l.assigned_to);
    } else {
      allLeads = allLeads.filter(l => l.assigned_to === filters.assigned_to);
    }
  }
  if (filters.telecaller_id) {
    allLeads = allLeads.filter(l => l.assigned_to === filters.telecaller_id);
  }
  if (filters.batch_id && filters.batch_id !== 'all') {
    allLeads = allLeads.filter(l => l.batch_id === filters.batch_id);
  }
  if (filters.startDate) {
    allLeads = allLeads.filter(l => l.policy_date >= filters.startDate!);
  }
  if (filters.endDate) {
    allLeads = allLeads.filter(l => l.policy_date <= filters.endDate!);
  }
  if (filters.is_due_today) {
    const todayStr = toISODateString(new Date());
    allLeads = allLeads.filter(l => l.status === 'pending' && l.next_call_date && l.next_call_date <= todayStr);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    allLeads = allLeads.filter(l => 
      l.customer_name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      Object.values(l.data || {}).some(val => String(val).toLowerCase().includes(q))
    );
  }

  // Sort ascending by policy_date
  allLeads.sort((a, b) => (a.policy_date || '').localeCompare(b.policy_date || ''));

  const users = await getUsers();
  const total = allLeads.length;
  const from = (page - 1) * pageSize;
  const pagedLeads = allLeads.slice(from, from + pageSize).map(l => ({
    ...l,
    assigned_user: users.find(u => u.id === l.assigned_to) || null
  }));

  return { leads: pagedLeads, total };
}

export async function getAllLeadsRaw(): Promise<Lead[]> {
  let supaLeads: Lead[] = [];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('is_deleted', false)
        .limit(10000);
      if (!error && data) {
        supaLeads = data as Lead[];
      } else if (error) {
        console.error('Supabase getAllLeadsRaw error:', error);
      }
    } catch (e) {
      console.warn('Supabase getAllLeadsRaw error:', e);
    }
  }

  const raw = safeStorage.getItem(LS_LEADS);
  const localLeads: Lead[] = raw ? JSON.parse(raw) : [];
  const activeLocal = localLeads.filter(l => !l.is_deleted);

  // Merge by id so no leads are lost even during offline/fallback modes
  const leadMap = new Map<string, Lead>();
  activeLocal.forEach(l => leadMap.set(l.id, l));
  supaLeads.forEach(l => leadMap.set(l.id, l));

  const merged = Array.from(leadMap.values());
  safeStorage.setItem(LS_LEADS, JSON.stringify(merged));
  return merged;
}

export async function getLeadById(id: string): Promise<Lead | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        const users = await getUsers();
        return {
          ...data,
          assigned_user: users.find(u => u.id === data.assigned_to) || null
        } as Lead;
      }
    } catch (e) {
      console.warn('Supabase getLeadById error:', e);
    }
  }

  const leads = await getAllLeadsRaw();
  const found = leads.find(l => l.id === id);
  if (!found) return null;
  const users = await getUsers();
  return {
    ...found,
    assigned_user: users.find(u => u.id === found.assigned_to) || null
  };
}

/**
 * Bulk insert leads with batch chunking (chunks of 500) and progress callback
 */
export async function insertLeadsInChunks(
  leadsToInsert: Array<Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>>,
  onProgress?: (progressPercent: number) => void
): Promise<{ inserted: number; failed: number }> {
  const chunkSize = 500;
  const total = leadsToInsert.length;
  let inserted = 0;
  let failed = 0;

  const now = new Date().toISOString();
  const fullLeads: Lead[] = leadsToInsert.map((item) => ({
    ...item,
    id: generateUUID(),
    assigned_to: isValidUUID(item.assigned_to) ? item.assigned_to : null,
    is_deleted: false,
    created_at: now,
    updated_at: now,
  }));

  for (let i = 0; i < fullLeads.length; i += chunkSize) {
    const chunk = fullLeads.slice(i, i + chunkSize);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('leads').insert(chunk);
        if (error) {
          console.error('Supabase chunk insert error:', error);
          // Fallback to local storage so data is NEVER lost
          const existingRaw = safeStorage.getItem(LS_LEADS);
          const existing: Lead[] = existingRaw ? JSON.parse(existingRaw) : [];
          existing.push(...chunk);
          safeStorage.setItem(LS_LEADS, JSON.stringify(existing));
          failed += chunk.length;
        } else {
          inserted += chunk.length;
          // Sync backup to local storage
          const existingRaw = safeStorage.getItem(LS_LEADS);
          const existing: Lead[] = existingRaw ? JSON.parse(existingRaw) : [];
          existing.push(...chunk);
          safeStorage.setItem(LS_LEADS, JSON.stringify(existing));
        }
      } catch (err) {
        console.error('Supabase chunk insert exception:', err);
        const existingRaw = safeStorage.getItem(LS_LEADS);
        const existing: Lead[] = existingRaw ? JSON.parse(existingRaw) : [];
        existing.push(...chunk);
        safeStorage.setItem(LS_LEADS, JSON.stringify(existing));
        failed += chunk.length;
      }
    } else {
      const existingRaw = safeStorage.getItem(LS_LEADS);
      const existing: Lead[] = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push(...chunk);
      safeStorage.setItem(LS_LEADS, JSON.stringify(existing));
      inserted += chunk.length;
    }

    if (onProgress) {
      const pct = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
      onProgress(pct);
    }
  }

  return { inserted, failed };
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const now = new Date().toISOString();
  const payload: any = { 
    ...updates, 
    assigned_to: updates.assigned_to !== undefined 
      ? (isValidUUID(updates.assigned_to) ? updates.assigned_to : null)
      : undefined,
    updated_at: now 
  };
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  if (isSupabaseConfigured && isValidUUID(id)) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        const raw = safeStorage.getItem(LS_LEADS);
        const leads: Lead[] = raw ? JSON.parse(raw) : [];
        const idx = leads.findIndex(l => l.id === id);
        if (idx !== -1) {
          leads[idx] = data as Lead;
          safeStorage.setItem(LS_LEADS, JSON.stringify(leads));
        }
        return data as Lead;
      }
      if (error) console.error('Supabase updateLead error:', error);
    } catch (e) {
      console.warn('Supabase updateLead error:', e);
    }
  }

  const raw = safeStorage.getItem(LS_LEADS);
  const leads: Lead[] = raw ? JSON.parse(raw) : [];
  const idx = leads.findIndex(l => l.id === id);
  if (idx !== -1) {
    leads[idx] = { ...leads[idx], ...payload };
    safeStorage.setItem(LS_LEADS, JSON.stringify(leads));
    return leads[idx];
  }
  throw new Error('Lead not found');
}

/**
 * Bulk assign leads to telecaller
 */
export async function bulkAssignLeads(
  leadIds: string[],
  telecallerId: string,
  assignedByUserId: string,
  telecallerName: string
): Promise<number> {
  const allLeads = await getAllLeadsRaw();
  const targetLeads = allLeads.filter(l => leadIds.includes(l.id));
  const now = new Date().toISOString();

  let count = 0;
  for (const lead of targetLeads) {
    const nextCallDate = calculateInitialCallDate(lead.policy_date);
    const updates: Partial<Lead> = {
      status: 'pending',
      assigned_to: telecallerId,
      assigned_at: now,
      next_call_date: nextCallDate,
      skip_count: 0,
      updated_at: now
    };

    await updateLead(lead.id, updates);

    // Activity log
    await addLeadActivity({
      lead_id: lead.id,
      user_id: assignedByUserId,
      action: 'assigned',
      remark: `Assigned to ${telecallerName}. Next call scheduled for ${nextCallDate}.`,
      meta: { telecaller_id: telecallerId, telecaller_name: telecallerName, next_call_date: nextCallDate }
    });
    count++;
  }

  return count;
}

/**
 * Bulk unassign leads
 */
export async function bulkUnassignLeads(
  leadIds: string[],
  unassignedByUserId: string
): Promise<number> {
  const now = new Date().toISOString();
  let count = 0;
  for (const id of leadIds) {
    await updateLead(id, {
      status: 'unassigned',
      assigned_to: null,
      assigned_at: null,
      next_call_date: null,
      updated_at: now
    });

    await addLeadActivity({
      lead_id: id,
      user_id: unassignedByUserId,
      action: 'unassigned',
      remark: 'Unassigned by Admin',
      meta: {}
    });
    count++;
  }
  return count;
}

/**
 * Bulk delete leads (soft delete)
 */
export async function bulkDeleteLeads(leadIds: string[]): Promise<number> {
  let count = 0;
  for (const id of leadIds) {
    await updateLead(id, { is_deleted: true });
    count++;
  }
  return count;
}

// -------------------------------------------------------------
// TELECALLER ACTIONS ON LEADS
// -------------------------------------------------------------
export async function telecallerMarkDone(
  leadId: string,
  userId: string,
  remark: string
): Promise<Lead> {
  const updated = await updateLead(leadId, {
    status: 'done',
    last_remark: remark || 'Insurance renewed / done',
    next_call_date: null
  });

  await addLeadActivity({
    lead_id: leadId,
    user_id: userId,
    action: 'done',
    remark: remark || 'Insurance renewed / done',
    meta: { status: 'done' }
  });

  return updated;
}

export async function telecallerMarkClosed(
  leadId: string,
  userId: string,
  remark: string
): Promise<Lead> {
  if (!remark?.trim()) {
    throw new Error('Remark is required to close a lead.');
  }

  const updated = await updateLead(leadId, {
    status: 'closed',
    last_remark: remark,
    next_call_date: null
  });

  await addLeadActivity({
    lead_id: leadId,
    user_id: userId,
    action: 'closed',
    remark,
    meta: { status: 'closed' }
  });

  return updated;
}

export async function telecallerRevertToAdmin(
  leadId: string,
  userId: string,
  remark: string
): Promise<Lead> {
  if (!remark?.trim()) {
    throw new Error('Remark is required to revert a lead to Admin.');
  }

  const updated = await updateLead(leadId, {
    status: 'reverted',
    assigned_to: null,
    next_call_date: null,
    last_remark: remark
  });

  await addLeadActivity({
    lead_id: leadId,
    user_id: userId,
    action: 'reverted',
    remark,
    meta: { status: 'reverted' }
  });

  return updated;
}

export async function telecallerSkipLead(
  leadId: string,
  userId: string,
  remark: string
): Promise<Lead> {
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error('Lead not found');

  const skipResult = calculateNextSkipDate(lead.skip_count, lead.policy_date);

  const updated = await updateLead(leadId, {
    skip_count: skipResult.nextSkipCount,
    next_call_date: skipResult.nextCallDate,
    last_remark: remark || `Skipped (Call #${skipResult.nextSkipCount})`
  });

  await addLeadActivity({
    lead_id: leadId,
    user_id: userId,
    action: 'skipped',
    remark: remark ? `${remark} (Next call: ${skipResult.nextCallDate})` : `Skipped. Next call scheduled on ${skipResult.nextCallDate}`,
    meta: {
      skip_count: skipResult.nextSkipCount,
      next_call_date: skipResult.nextCallDate,
      is_overdue: skipResult.isOverdue
    }
  });

  return updated;
}

// -------------------------------------------------------------
// LEAD ACTIVITIES
// -------------------------------------------------------------
export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('lead_activity')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const users = await getUsers();
        return (data as LeadActivity[]).map(a => ({
          ...a,
          user: users.find(u => u.id === a.user_id) || null
        }));
      }
    } catch (e) {
      console.warn('Supabase getLeadActivities error:', e);
    }
  }

  const raw = safeStorage.getItem(LS_ACTIVITIES);
  const list: LeadActivity[] = raw ? JSON.parse(raw) : [];
  const users = await getUsers();
  return list
    .filter(a => a.lead_id === leadId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(a => ({
      ...a,
      user: users.find(u => u.id === a.user_id) || null
    }));
}

export async function addLeadActivity(
  act: Omit<LeadActivity, 'id' | 'created_at'>
): Promise<LeadActivity> {
  const newActivity: LeadActivity = {
    ...act,
    id: generateUUID(),
    user_id: isValidUUID(act.user_id) ? act.user_id : null,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && isValidUUID(act.lead_id)) {
    try {
      const { data, error } = await supabase
        .from('lead_activity')
        .insert([newActivity])
        .select()
        .single();
      if (!error && data) return data as LeadActivity;
      if (error) console.error('Supabase addLeadActivity error:', error);
    } catch (e) {
      console.warn('Supabase addLeadActivity error:', e);
    }
  }

  const raw = safeStorage.getItem(LS_ACTIVITIES);
  const list: LeadActivity[] = raw ? JSON.parse(raw) : [];
  list.unshift(newActivity);
  safeStorage.setItem(LS_ACTIVITIES, JSON.stringify(list));
  return newActivity;
}

// -------------------------------------------------------------
// CUSTOM DASHBOARDS
// -------------------------------------------------------------
export async function getCustomDashboards(): Promise<CustomDashboard[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('custom_dashboards')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        safeStorage.setItem(LS_DASHBOARDS, JSON.stringify(data));
        return data as CustomDashboard[];
      }
      if (error) console.error('Supabase getCustomDashboards error:', error);
    } catch (e) {
      console.warn('Supabase getCustomDashboards error:', e);
    }
  }
  const raw = safeStorage.getItem(LS_DASHBOARDS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCustomDashboard(dash: Omit<CustomDashboard, 'id' | 'created_at'>): Promise<CustomDashboard> {
  const validCreatedBy = isValidUUID(dash.created_by) ? dash.created_by : null;
  const newDash: CustomDashboard = {
    ...dash,
    id: generateUUID(),
    created_by: validCreatedBy,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('custom_dashboards')
        .insert([newDash])
        .select()
        .single();
      if (!error && data) {
        const raw = safeStorage.getItem(LS_DASHBOARDS);
        const list: CustomDashboard[] = raw ? JSON.parse(raw) : [];
        list.unshift(data as CustomDashboard);
        safeStorage.setItem(LS_DASHBOARDS, JSON.stringify(list));
        return data as CustomDashboard;
      }
      if (error) {
        console.error('Supabase saveCustomDashboard error:', error);
      }
    } catch (e) {
      console.warn('Supabase saveCustomDashboard error:', e);
    }
  }

  const raw = safeStorage.getItem(LS_DASHBOARDS);
  const list: CustomDashboard[] = raw ? JSON.parse(raw) : [];
  list.unshift(newDash);
  safeStorage.setItem(LS_DASHBOARDS, JSON.stringify(list));
  return newDash;
}

export async function deleteCustomDashboard(id: string): Promise<void> {
  if (isSupabaseConfigured && isValidUUID(id)) {
    try {
      await supabase.from('custom_dashboards').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase deleteCustomDashboard error:', e);
    }
  }

  const raw = safeStorage.getItem(LS_DASHBOARDS);
  if (raw) {
    const list: CustomDashboard[] = JSON.parse(raw);
    safeStorage.setItem(LS_DASHBOARDS, JSON.stringify(list.filter(d => d.id !== id)));
  }
}

// -------------------------------------------------------------
// STATS AND AGGREGATION HELPERS
// -------------------------------------------------------------
export async function getDashboardOverviewStats() {
  const leads = await getAllLeadsRaw();
  const users = await getUsers();
  const telecallers = users.filter(u => u.role === 'telecaller' && u.is_active);

  const total = leads.length;
  const unassigned = leads.filter(l => l.status === 'unassigned').length;
  const pending = leads.filter(l => l.status === 'pending').length;
  const done = leads.filter(l => l.status === 'done').length;
  const closed = leads.filter(l => l.status === 'closed').length;
  const reverted = leads.filter(l => l.status === 'reverted').length;

  const today = new Date();
  const dTodayStr = toISODateString(today);

  // Renewals due in next 7 and 30 days
  const d7 = new Date(today);
  d7.setDate(today.getDate() + 7);
  const d7Str = toISODateString(d7);

  const d30 = new Date(today);
  d30.setDate(today.getDate() + 30);
  const d30Str = toISODateString(d30);

  const dueNext7Days = leads.filter(l => l.policy_date >= dTodayStr && l.policy_date <= d7Str).length;
  const dueNext30Days = leads.filter(l => l.policy_date >= dTodayStr && l.policy_date <= d30Str).length;

  return {
    total,
    unassigned,
    pending,
    done,
    closed,
    reverted,
    totalTelecallers: telecallers.length,
    dueNext7Days,
    dueNext30Days
  };
}

export async function getTelecallerPerformanceStats(
  batchId?: string,
  startDate?: string,
  endDate?: string
): Promise<TelecallerStats[]> {
  const users = await getUsers();
  const telecallers = users.filter(u => u.role === 'telecaller');
  let leads = await getAllLeadsRaw();

  if (batchId && batchId !== 'all') {
    leads = leads.filter(l => l.batch_id === batchId);
  }
  if (startDate) {
    leads = leads.filter(l => l.policy_date >= startDate);
  }
  if (endDate) {
    leads = leads.filter(l => l.policy_date <= endDate);
  }

  const todayStr = toISODateString(new Date());

  return telecallers.map(tc => {
    const tcLeads = leads.filter(l => l.assigned_to === tc.id);
    const total_assigned = tcLeads.length;
    const pending_due = tcLeads.filter(l => l.status === 'pending' && l.next_call_date && l.next_call_date <= todayStr).length;
    const upcoming = tcLeads.filter(l => l.status === 'pending' && l.next_call_date && l.next_call_date > todayStr).length;
    const skipped = tcLeads.filter(l => (l.skip_count || 0) > 0).length;
    const done = tcLeads.filter(l => l.status === 'done').length;
    const closed = tcLeads.filter(l => l.status === 'closed').length;
    const reverted = tcLeads.filter(l => l.status === 'reverted').length;
    const calls_today = tcLeads.filter(l => l.updated_at && l.updated_at.startsWith(todayStr)).length;
    const conversion_rate = total_assigned > 0 ? Math.round((done / total_assigned) * 100) : 0;

    return {
      telecaller_id: tc.id,
      telecaller_name: tc.full_name,
      username: tc.username,
      total_assigned,
      pending_due,
      upcoming,
      skipped,
      done,
      closed,
      reverted,
      calls_today,
      conversion_rate
    };
  });
}
