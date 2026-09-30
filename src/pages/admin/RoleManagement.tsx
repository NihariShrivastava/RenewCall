import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getAllLeadsRaw } from '../../lib/db';
import { User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  User as UserIcon, 
  Lock, 
  Phone, 
  Mail, 
  Key, 
  AlertCircle 
} from 'lucide-react';

export const RoleManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, { total: number; pending: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'telecaller'>('all');

  // Form State (for Create or Edit)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('telecaller');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Visible passwords tracking map (user.id -> boolean)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Deletion modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    loadUsersAndCounts();
  }, []);

  const loadUsersAndCounts = async () => {
    setIsLoading(true);
    try {
      const [uList, leads] = await Promise.all([getUsers(), getAllLeadsRaw()]);
      setUsers(uList);

      const counts: Record<string, { total: number; pending: number }> = {};
      uList.forEach(u => {
        const uLeads = leads.filter(l => l.assigned_to === u.id);
        counts[u.id] = {
          total: uLeads.length,
          pending: uLeads.filter(l => l.status === 'pending').length
        };
      });
      setLeadCounts(counts);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (user: User) => {
    setEditingUserId(user.id);
    setRole(user.role);
    setUsername(user.username);
    setPassword(user.password);
    setFullName(user.full_name);
    setPhone(user.phone);
    setEmail(user.email);
    setIsActive(user.is_active);
    setFormError('');
    setFormSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setRole('telecaller');
    setUsername('');
    setPassword('');
    setFullName('');
    setPhone('');
    setEmail('');
    setIsActive(true);
    setFormError('');
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!username.trim() || !password.trim() || !fullName.trim()) {
      setFormError('Please fill in username, password, and full name.');
      return;
    }

    try {
      if (editingUserId) {
        // Prevent creating a second administrator if editing
        const otherAdmins = users.filter(u => u.role === 'admin' && u.id !== editingUserId);
        if (role === 'admin' && otherAdmins.length > 0) {
          setFormError('Only one administrator is allowed across the entire website.');
          return;
        }

        // Edit existing user
        await updateUser(editingUserId, {
          username: username.trim(),
          password: password.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          role,
          is_active: isActive,
        });
        setFormSuccess('User updated successfully.');
        handleCancelEdit();
      } else {
        // Enforce strictly 1 Administrator across whole system
        if (role === 'admin' || users.some(u => u.role === 'admin')) {
          // New users must be telecallers
        }

        // Check username uniqueness
        const exists = users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
        if (exists) {
          setFormError('Username already exists. Please choose a distinct username.');
          return;
        }

        await createUser({
          username: username.trim(),
          password: password.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          role: 'telecaller',
          is_active: true,
        });

        setFormSuccess('Telecaller created successfully.');
        handleCancelEdit();
      }

      await loadUsersAndCounts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save user.');
    }
  };

  const handleCopyCredentials = (u: User) => {
    const text = `Username: ${u.username}\nPassword: ${u.password}`;
    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.role === 'admin') {
      setFormError('The Administrator cannot be deleted. Exactly one administrator must exist.');
      setUserToDelete(null);
      return;
    }
    await deleteUser(userToDelete.id);
    setUserToDelete(null);
    await loadUsersAndCounts();
  };

  const filteredUsers = users.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (search) {
      const q = search.toLowerCase();
      const mName = u.full_name.toLowerCase().includes(q);
      const mUser = u.username.toLowerCase().includes(q);
      const mPhone = u.phone.includes(q);
      if (!mName && !mUser && !mPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-7">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Role Management</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage telecallers, view plain-text credentials, assign call volume, and update access permissions.
        </p>
      </div>

      {/* 2-Column Layout matching Screenshot 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create / Edit User Form Card */}
        <div className="lg:col-span-1 bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-xl h-fit">
          <div className="flex items-center justify-between pb-4 border-b border-[#252840] mb-5">
            <h3 className="text-base font-bold text-white">
              {editingUserId ? 'Edit User Credentials' : 'Create New Telecaller'}
            </h3>
            {editingUserId && (
              <button
                onClick={handleCancelEdit}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>

          {formError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  User Role
                </label>
                <span className="text-[10px] text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  1 Administrator Max
                </span>
              </div>
              <select
                value={role}
                disabled
                className="w-full px-3 py-2.5 bg-[#0e1017]/90 border border-[#252840] rounded-xl text-xs text-slate-300 cursor-not-allowed opacity-90 focus:outline-none"
              >
                <option value="telecaller">Telecaller</option>
                {role === 'admin' && <option value="admin">Administrator (Single Root Admin)</option>}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                {role === 'admin'
                  ? 'Root Administrator account credentials.'
                  : 'Only 1 administrator is permitted across the entire website. All new accounts are Telecallers.'}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Nihari Shrivastava"
                className="w-full px-3 py-2.5 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. nihari"
                  className="w-full px-3 py-2.5 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                  Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. 123"
                  className="w-full px-3 py-2.5 bg-[#0e1017] border border-[#252840] rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. XXXXXXXXXX"
                className="w-full px-3 py-2.5 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. niharishrivastava@gmail.com"
                className="w-full px-3 py-2.5 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
              />
            </div>

            {/* Submit button */}
            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-3 rounded-xl gradient-btn text-white text-xs font-semibold shadow-lg shadow-indigo-600/25"
              >
                {editingUserId ? 'Save User Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Active Users List matching Screenshot 4 */}
        <div className="lg:col-span-2 bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#252840] gap-3">
            <h3 className="text-base font-bold text-white uppercase tracking-wider text-xs">
              Active Users & Credentials
            </h3>

            <div className="flex items-center space-x-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="px-3 py-1.5 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="telecaller">Telecaller</option>
                <option value="admin">Admin</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="pl-8 pr-3 py-1.5 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#4f6ef7]"
                />
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="divide-y divide-[#252840]">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No users found.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isRevealed = revealedPasswords[u.id];
                const counts = leadCounts[u.id] || { total: 0, pending: 0 };
                const isSelf = currentUser?.id === u.id;

                return (
                  <div
                    key={u.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-[#161926]/40 transition-colors gap-3"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0e1017] border border-[#252840] flex items-center justify-center text-[#4f6ef7] flex-shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-semibold text-white truncate">{u.full_name}</h4>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              u.role === 'admin'
                                ? 'bg-indigo-500/10 text-[#4f6ef7] border-indigo-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">@{u.username}</p>
                      </div>
                    </div>

                    {/* Plain View Password + Copy Feature (Strict requirement) */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1.5 bg-[#0e1017] px-3 py-1.5 rounded-xl border border-[#252840]">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-mono text-slate-200">
                          {isRevealed ? u.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordReveal(u.id)}
                          className="p-1 text-slate-400 hover:text-white"
                          title={isRevealed ? 'Hide Password' : 'Show Plain-text Password'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(u)}
                          className="p-1 text-slate-400 hover:text-[#4f6ef7]"
                          title="Copy Username and Password"
                        >
                          {copiedId === u.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Assignments KPI */}
                      {u.role === 'telecaller' && (
                        <div className="hidden md:block text-right text-xs">
                          <p className="text-white font-medium">{counts.total} Assigned</p>
                          <p className="text-[10px] text-amber-400">{counts.pending} Due/Pending</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleStartEdit(u)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2338]"
                          title="Edit User"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {u.role !== 'admin' && !isSelf && (
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                            title="Delete Telecaller"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete User Modal */}
      <ConfirmationModal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Delete Telecaller"
        message={`Are you sure you want to permanently delete "${userToDelete?.full_name}" (@${userToDelete?.username})? This telecaller will be permanently removed from the system and will no longer appear in the table.`}
        confirmLabel="Delete Telecaller"
      />
    </div>
  );
};
