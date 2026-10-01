import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../db/schema';
import { hashPassword, verifyPassword, generateRandomPassword } from '../services/password';
import { getSupabase } from '../services/supabase';

export type UserRole = 'owner' | 'manager' | 'cashier' | 'inventory' | 'superadmin';

export type User = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone: string;
  email?: string;
};

type AuthStore = {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => void;
  getAllUsers: () => Promise<any[]>;
  createUser: (data: any) => Promise<{ success: boolean; message: string; password?: string }>;
  deleteUser: (id: number) => Promise<{ success: boolean; message: string }>;
  updateUser: (id: number, data: any) => Promise<{ success: boolean; message: string }>;
};

const defaultUsers: Record<string, { id: string; username: string; name: string; role: UserRole; password: string; phone: string }> = {
  owner: { id: 'u1', username: 'owner', name: 'Owner', role: 'owner', password: 'Owner123!', phone: '+254700000001' },
  manager: { id: 'u2', username: 'manager', name: 'Manager', role: 'manager', password: 'Manager123!', phone: '+254700000002' },
  cashier: { id: 'u3', username: 'cashier', name: 'Cashier', role: 'cashier', password: 'Cashier123!', phone: '+254700000003' },
  admin: { id: 'u0', username: 'admin', name: 'Super Admin', role: 'superadmin', password: 'superadmin123', phone: '+254700000000' }
};

export const useAuthStore = create<AuthStore>()(persist((set) => ({
  user: null,
  login: async (username, password) => {
    const cleanUser = username.trim();
    const normalized = cleanUser.toLowerCase();

    try {
      // 1. Check database users table first
      const dbUsers = await db.users.toArray();
      const foundDbUser = dbUsers.find((u) => u.username.toLowerCase() === normalized);

      if (foundDbUser) {
        if (foundDbUser.isActive === false) {
          return { success: false, message: 'Account is deactivated. Contact an administrator.' };
        }

        // Verify password hash or plain text fallback
        let isMatch = false;
        if (foundDbUser.passwordHash) {
          isMatch = await verifyPassword(password, foundDbUser.passwordHash);
          if (!isMatch && foundDbUser.passwordHash === password) {
            isMatch = true;
          }
        }

        if (isMatch) {
          const user: User = {
            id: String(foundDbUser.id),
            username: foundDbUser.username,
            name: foundDbUser.name,
            role: foundDbUser.role as UserRole,
            phone: foundDbUser.phone || '',
            email: foundDbUser.email
          };

          // Update last login
          await db.users.update(foundDbUser.id!, { lastLogin: Date.now() });

          set({ user });
          return { success: true, message: 'Login successful' };
        }
      }

      // 2. Fallback to default demo/system users
      const foundDefault = defaultUsers[normalized];
      if (foundDefault && foundDefault.password === password) {
        const user: User = {
          id: foundDefault.id,
          username: foundDefault.username,
          name: foundDefault.name,
          role: foundDefault.role,
          phone: foundDefault.phone
        };

        set({ user });
        return { success: true, message: 'Login successful' };
      }

      return { success: false, message: 'Invalid username or password' };
    } catch (e: any) {
      console.error('Login error', e);
      return { success: false, message: 'An error occurred during login' };
    }
  },

  signOut: () => {
    set({ user: null });
  },

  getAllUsers: async () => {
    try {
      // If Supabase is connected, pull cloud users
      const client = getSupabase();
      if (client) {
        try {
          const { data } = await client.from('users').select('*');
          if (data && data.length > 0) {
            for (const r of data) {
              const existing = await db.users.where('username').equals(r.username).first();
              if (existing && existing.id) {
                await db.users.update(existing.id, {
                  name: r.name,
                  email: r.email,
                  phone: r.phone,
                  role: r.role,
                  passwordHash: r.password_hash || existing.passwordHash,
                  isActive: r.is_active !== false
                });
              } else {
                await db.users.add({
                  username: r.username,
                  email: r.email,
                  name: r.name,
                  phone: r.phone,
                  role: r.role,
                  passwordHash: r.password_hash,
                  isActive: r.is_active !== false,
                  createdAt: Date.now()
                });
              }
            }
          }
        } catch {}
      }

      const users = await db.users.toArray();
      return users || [];
    } catch {
      return [];
    }
  },

  createUser: async (data) => {
    try {
      const cleanUsername = data.username.trim();
      const existing = await db.users.filter((u) => u.username.toLowerCase() === cleanUsername.toLowerCase()).first();
      if (existing) {
        return { success: false, message: 'Username is already taken' };
      }

      const rawPassword = data.password || data.temporaryPassword || generateRandomPassword();
      const passwordHash = await hashPassword(rawPassword);

      await db.users.add({
        username: cleanUsername,
        email: data.email?.trim() || '',
        name: data.name?.trim() || '',
        phone: data.phone?.trim() || '',
        role: data.role || 'cashier',
        passwordHash,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Sync to Supabase
      const client = getSupabase();
      if (client) {
        client.from('users').upsert({
          username: cleanUsername,
          email: data.email?.trim() || '',
          name: data.name?.trim() || '',
          phone: data.phone?.trim() || '',
          role: data.role || 'cashier',
          password_hash: passwordHash,
          is_active: true
        }, { onConflict: 'username' }).then(() => undefined);
      }

      return { success: true, message: 'User created successfully', password: rawPassword };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to create user' };
    }
  },

  deleteUser: async (id) => {
    try {
      const target = await db.users.get(id);
      await db.users.delete(id);

      const client = getSupabase();
      if (client && target?.username) {
        client.from('users').delete().eq('username', target.username).then(() => undefined);
      }

      return { success: true, message: 'User deleted successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to delete user' };
    }
  },

  updateUser: async (id, data) => {
    try {
      const updates = { ...data, updatedAt: Date.now() };

      // Hash password if a new password is being set
      if (data.password && data.password.trim()) {
        updates.passwordHash = await hashPassword(data.password.trim());
        delete updates.password;
      } else if (data.temporaryPassword && data.temporaryPassword.trim()) {
        updates.passwordHash = await hashPassword(data.temporaryPassword.trim());
        delete updates.temporaryPassword;
      }

      await db.users.update(id, updates);

      // Sync updated user to Supabase
      const client = getSupabase();
      const updatedUser = await db.users.get(id);
      if (client && updatedUser) {
        client.from('users').upsert({
          username: updatedUser.username,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          password_hash: updatedUser.passwordHash,
          is_active: updatedUser.isActive !== false
        }, { onConflict: 'username' }).then(() => undefined);
      }

      return { success: true, message: 'User updated successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to update user' };
    }
  }
}), {
  name: 'jaydee-user',
  partialize: (state) => ({ user: state.user }),
}));
