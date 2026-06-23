import { create } from 'zustand';
import { db } from '../db/schema';

type UserRole = 'owner' | 'manager' | 'cashier' | 'inventory' | 'superadmin';

type User = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone: string;
};

type AuthStore = {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => void;
  getAllUsers: () => Promise<any[]>;
  createUser: (data: any) => Promise<{ success: boolean; message: string }>;
  deleteUser: (id: number) => Promise<{ success: boolean; message: string }>;
  updateUser: (id: number, data: any) => Promise<{ success: boolean; message: string }>;
};

const defaultUsers: Record<string, { id: string; username: string; name: string; role: UserRole; password: string; phone: string }> = {
  owner: { id: 'u1', username: 'owner', name: 'Owner', role: 'owner', password: 'Owner123!', phone: '+2348010000001' },
  manager: { id: 'u2', username: 'manager', name: 'Manager', role: 'manager', password: 'Manager123!', phone: '+2348010000002' },
  cashier: { id: 'u3', username: 'cashier', name: 'Cashier', role: 'cashier', password: 'Cashier123!', phone: '+2348010000003' },
  demo: { id: 'u4', username: 'demo', name: 'Demo User', role: 'cashier', password: 'Demo1234', phone: '+2348010000004' }
};

const getSavedUser = (): User | null => {
  try {
    const stored = localStorage.getItem('jaydee-user');
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: getSavedUser(),
  login: async (username, password) => {
    const normalized = username.trim().toLowerCase();
    const found = defaultUsers[normalized];
    if (!found || found.password !== password) {
      return { success: false, message: 'Invalid username or password' };
    }

    const user = {
      id: found.id,
      username: found.username,
      name: found.name,
      role: found.role,
      phone: found.phone
    };
    
    localStorage.setItem('jaydee-user', JSON.stringify(user));
    set({ user });
    
    return { success: true, message: 'Login successful' };
  },
  signOut: () => {
    localStorage.removeItem('jaydee-user');
    set({ user: null });
  },
  getAllUsers: async () => {
    try {
      const users = await db.users.toArray();
      return users || [];
    } catch {
      return [];
    }
  },
  createUser: async (data) => {
    try {
      await db.users.add({
        username: data.username,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        isActive: true,
        createdAt: Date.now()
      });
      return { success: true, message: 'User created successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to create user' };
    }
  },
  deleteUser: async (id) => {
    try {
      await db.users.delete(id);
      return { success: true, message: 'User deleted successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to delete user' };
    }
  },
  updateUser: async (id, data) => {
    try {
      await db.users.update(id, data);
      return { success: true, message: 'User updated successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to update user' };
    }
  }
}));

