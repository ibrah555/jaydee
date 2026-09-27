import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { useNavigate, Link } from 'react-router-dom';
import { User } from '../db/schema';
import { Plus, Trash2, Edit2, AlertCircle, Check, Key, Eye, EyeOff, Shield, ArrowLeft } from 'lucide-react';
import { generateRandomPassword } from '../services/password';

export default function AdminUsers() {
  const { user, getAllUsers, createUser, deleteUser, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    name: '',
    phone: '',
    role: 'cashier' as User['role'],
    password: '',
    isActive: true
  });

  useEffect(() => {
    if (!user || !['owner', 'manager', 'superadmin'].includes(user.role)) {
      navigate('/');
      return;
    }
    loadUsers();
  }, [user]);

  const loadUsers = async () => {
    setLoading(true);
    const allUsers = await getAllUsers();
    setUsers(allUsers);
    setLoading(false);
  };

  const handleGeneratePassword = () => {
    const randomPass = generateRandomPassword(10);
    setFormData((prev) => ({ ...prev, password: randomPass }));
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.name.trim()) {
      setError('Username and Full Name are required.');
      return;
    }

    if (!editingId && !formData.password.trim()) {
      setError('Please provide or generate a password for new users.');
      return;
    }

    setError('');
    setSuccess('');

    if (editingId) {
      // Update existing user
      const updateData: Record<string, unknown> = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        isActive: formData.isActive
      };

      if (formData.password.trim()) {
        updateData.password = formData.password.trim();
      }

      const result = await updateUser(editingId, updateData);
      if (result.success) {
        setSuccess(`User "${formData.name}" updated successfully${formData.password.trim() ? ' with new password.' : '.'}`);
        resetForm();
        loadUsers();
      } else {
        setError(result.message);
      }
    } else {
      // Create new user
      const result = await createUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        password: formData.password.trim()
      });

      if (result.success) {
        setSuccess(`User created successfully! Password: ${formData.password.trim()}`);
        resetForm();
        loadUsers();
      } else {
        setError(result.message);
      }
    }
  };

  const openEditForm = (u: User) => {
    setEditingId(u.id!);
    setFormData({
      username: u.username,
      email: u.email || '',
      name: u.name,
      phone: u.phone || '',
      role: (u.role as User['role']) || 'cashier',
      password: '', // blank by default, set only if admin wants to change it
      isActive: u.isActive !== false
    });
    setShowPassword(false);
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const handleDeleteUser = async (u: User) => {
    if (!u.id) return;
    if (u.username === user?.username) {
      setError('You cannot delete your own logged-in account.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user "${u.name}" (${u.username})?`)) return;

    const result = await deleteUser(u.id);
    if (result.success) {
      setSuccess(`User "${u.name}" deleted.`);
      loadUsers();
    } else {
      setError(result.message);
    }
  };

  const handleToggleActive = async (u: User) => {
    if (!u.id) return;
    const newStatus = !u.isActive;
    const result = await updateUser(u.id, { isActive: newStatus });
    if (result.success) {
      setSuccess(`User "${u.name}" ${newStatus ? 'activated' : 'deactivated'}.`);
      loadUsers();
    } else {
      setError(result.message);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      name: '',
      phone: '',
      role: 'cashier',
      password: '',
      isActive: true
    });
    setShowPassword(false);
    setIsFormOpen(false);
    setEditingId(null);
  };

  return (
    <div className="min-h-screen p-4 pb-28 bg-slate-50">
      <header className="mb-5">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/more" className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Administration</p>
                <h1 className="text-2xl font-bold text-accent">User & Cashier Management</h1>
              </div>
            </div>

            <button
              onClick={() => {
                resetForm();
                handleGeneratePassword();
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-white font-semibold text-sm shadow-md hover:bg-purple-900 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Staff / Cashier</span>
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      {success && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit User & Set Password' : 'Create New User Account'}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-accent"
                    placeholder="e.g. sarah"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-accent"
                    placeholder="e.g. Sarah Kimani"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    placeholder="sarah@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    placeholder="+254 700 000 000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="cashier">Cashier (Point of Sale only)</option>
                    <option value="manager">Manager (Sales & Reports)</option>
                    <option value="owner">Owner (Full Store Access)</option>
                    <option value="inventory">Inventory Clerk</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="active">Active (Can log in)</option>
                    <option value="inactive">Deactivated (Access blocked)</option>
                  </select>
                </div>
              </div>

              {/* Password Configuration Section */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-accent" />
                    <span>{editingId ? 'Set New Password (optional)' : 'Password *'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-semibold text-accent hover:underline"
                  >
                    Generate Strong Password
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-2xl border border-purple-200 bg-white px-3.5 py-2.5 pr-10 text-sm font-mono outline-none focus:border-accent"
                    placeholder={editingId ? 'Leave blank to keep existing password' : 'Enter password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  {editingId 
                    ? 'Only fill this in if you want to reset this user\'s password.' 
                    : 'This password will allow the staff member to log in to the POS.'}
                </p>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-accent text-white font-semibold text-sm hover:bg-purple-900 transition shadow-md"
                >
                  {editingId ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-3xl bg-white p-6 text-slate-500 shadow-sm ring-1 ring-slate-200 text-sm">
            Loading user accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 text-center">
            <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">No staff accounts found</p>
            <p className="text-xs text-slate-500 mt-1">Use the "Add Staff / Cashier" button above to create accounts.</p>
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className={`rounded-3xl bg-white p-4 shadow-sm ring-1 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                u.isActive !== false ? 'ring-slate-200' : 'ring-slate-200 bg-slate-50 opacity-75'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  u.role === 'superadmin' || u.role === 'owner' 
                    ? 'bg-purple-100 text-accent' 
                    : u.role === 'manager' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {u.name ? u.name.slice(0, 2).toUpperCase() : u.username.slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900">{u.name}</h2>
                    <span className="font-mono text-xs text-slate-500">(@{u.username})</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      u.role === 'superadmin' || u.role === 'owner' 
                        ? 'bg-purple-50 text-accent border border-purple-200' 
                        : u.role === 'manager'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {u.role}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      u.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {u.isActive !== false ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                    {u.phone && <span>Phone: {u.phone}</span>}
                    {u.email && <span>Email: {u.email}</span>}
                    {u.lastLogin && <span>Last active: {new Date(u.lastLogin).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => openEditForm(u)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition shadow-sm"
                  title="Edit details and reset password"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit / Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleActive(u)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    u.isActive !== false
                      ? 'text-amber-700 hover:bg-amber-50'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                  title={u.isActive !== false ? 'Deactivate account' : 'Activate account'}
                >
                  {u.isActive !== false ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteUser(u)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Delete user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
