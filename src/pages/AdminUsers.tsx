import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { useNavigate } from 'react-router-dom';
import { User } from '../db/schema';
import { Plus, Trash2, Edit2, AlertCircle, Check } from 'lucide-react';
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

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    name: '',
    phone: '',
    role: 'cashier' as User['role'],
    temporaryPassword: ''
  });

  // Check if user is superadmin
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.email || !formData.name || !formData.phone) {
      setError('All fields are required');
      return;
    }

    setError('');
    setSuccess('');

    if (editingId) {
      // Update existing user
      const updateData: Record<string, unknown> = {
        username: formData.username,
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        role: formData.role
      };

      if (formData.temporaryPassword) {
        updateData.passwordHash = formData.temporaryPassword;
      }

      const result = await updateUser(editingId, updateData);
      if (result.success) {
        setSuccess('User updated successfully' + (formData.temporaryPassword ? ' (Password changed)' : ''));
        resetForm();
        loadUsers();
      } else {
        setError(result.message);
      }
    } else {
      // Create new user
      const password = formData.temporaryPassword || generateRandomPassword();
      const result = await createUser({
        ...formData,
        temporaryPassword: password
      });

      if (result.success) {
        setSuccess(`User created successfully. Temporary password: ${password}`);
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
      email: u.email,
      name: u.name,
      phone: u.phone ?? '',
      role: u.role as User['role'],
      temporaryPassword: '' // Reset password field, only fill if they want to change it
    });
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    const result = await deleteUser(id);
    if (result.success) {
      setSuccess('User deleted successfully');
      loadUsers();
    } else {
      setError(result.message);
    }
  };

  const handleDeactivateUser = async (id: number, isActive: boolean) => {
    const result = await updateUser(id, { isActive: !isActive });
    if (result.success) {
      setSuccess(`User ${!isActive ? 'activated' : 'deactivated'} successfully`);
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
      temporaryPassword: ''
    });
    setIsFormOpen(false);
    setEditingId(null);
  };

  return (
    <div className="min-h-screen p-4 pb-24 bg-slate-50">
      <header className="mb-5">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Administration</p>
              <h1 className="mt-2 text-2xl font-semibold text-accent">User Management</h1>
            </div>
            <button
              onClick={() => { resetForm(); setIsFormOpen(true); }}
              className="inline-flex items-center gap-2 rounded-3xl bg-accent px-4 py-3 text-white shadow-lg hover:bg-purple-900"
            >
              <Plus className="h-5 w-5" />
              Add User
            </button>
          </div>
        </div>
      </header>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{editingId ? 'Edit User' : 'Add New User'}</h2>

            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl bg-rose-50 p-3 border border-rose-200">
                <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="e.g., john.doe"
                  disabled={editingId !== null} // Prevent changing username for existing users if desired, or remove disabled to allow
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                  <option value="inventory">Inventory</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {editingId ? 'New Password (optional)' : 'Temporary Password (optional)'}
                </label>
                <input
                  type="text"
                  value={formData.temporaryPassword}
                  onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder={editingId ? 'Leave blank to keep current' : 'Leave blank to auto-generate'}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-accent px-4 py-2 text-white font-semibold hover:bg-purple-900"
                >
                  {editingId ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
          <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="rounded-3xl bg-white p-5 text-slate-500 shadow-sm ring-1 ring-slate-200">
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">No users yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{u.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      u.isActive 
                        ? 'bg-emerald-100 text-emerald-900' 
                        : 'bg-slate-100 text-slate-900'
                    }`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">@{u.username}</p>
                  <div className="mt-2 flex gap-4 text-sm text-slate-600">
                    <span>{u.email}</span>
                    <span>{u.phone}</span>
                    <span className="capitalize font-medium text-slate-700">{u.role}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditForm(u)}
                    className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    title="Edit User"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeactivateUser(u.id!, u.isActive)}
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                      u.isActive
                        ? 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                    }`}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id!)}
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                    title="Delete User"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
