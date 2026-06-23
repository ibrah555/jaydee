import { create } from 'zustand';
import { otpService } from '../services/otp';
import { db } from '../db/schema';
import { ConfirmationResult } from 'firebase/auth';

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
  loginStep: 'credentials' | 'otp';
  tempUsername: string;
  tempPhone: string;
  otpAttempts: number;
  maxOtpAttempts: number;
  startLogin: (username: string, password: string, appVerifier: any) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (otp: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => void;
  resetLoginStep: () => void;
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

let currentConfirmationResult: ConfirmationResult | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: getSavedUser(),
  loginStep: 'credentials',
  tempUsername: '',
  tempPhone: '',
  otpAttempts: 0,
  maxOtpAttempts: 3,
  startLogin: async (username, password, appVerifier) => {
    const normalized = username.trim().toLowerCase();
    const found = defaultUsers[normalized];
    if (!found || found.password !== password) {
      return { success: false, message: 'Invalid username or password' };
    }

    if (!appVerifier) {
      return { success: false, message: 'Recaptcha not initialized. Please try again.' };
    }

    currentConfirmationResult = await otpService.sendOTP(found.phone, appVerifier);

    if (!currentConfirmationResult) {
      return { success: false, message: 'Unable to send OTP. Try again later.' };
    }

    set({
      loginStep: 'otp',
      tempUsername: found.username,
      tempPhone: found.phone,
      otpAttempts: 0
    });

    return { success: true, message: `OTP sent to ${found.phone.replace(/.(?=.{4})/g, '*')}` };
  },
  verifyOTP: async (otp) => {
    const state = get();

    if (!currentConfirmationResult) {
      set({ loginStep: 'credentials', tempUsername: '', tempPhone: '', otpAttempts: 0 });
      return { success: false, message: 'OTP expired. Please login again.' };
    }

    try {
      await currentConfirmationResult.confirm(otp);
    } catch (error) {
      const nextAttempts = state.otpAttempts + 1;
      if (nextAttempts >= state.maxOtpAttempts) {
        set({ loginStep: 'credentials', tempUsername: '', tempPhone: '', otpAttempts: 0 });
        currentConfirmationResult = null;
        return { success: false, message: 'Too many failed attempts. Please restart login.' };
      }
      set({ otpAttempts: nextAttempts });
      return { success: false, message: 'Invalid OTP. Please try again.' };
    }

    const loggedInUser = defaultUsers[state.tempUsername];
    if (!loggedInUser) {
      set({ loginStep: 'credentials', tempUsername: '', tempPhone: '', otpAttempts: 0 });
      currentConfirmationResult = null;
      return { success: false, message: 'User not found. Please login again.' };
    }

    const user = {
      id: loggedInUser.id,
      username: loggedInUser.username,
      name: loggedInUser.name,
      role: loggedInUser.role,
      phone: loggedInUser.phone
    };
    localStorage.setItem('jaydee-user', JSON.stringify(user));
    set({ user, loginStep: 'credentials', tempUsername: '', tempPhone: '', otpAttempts: 0 });
    currentConfirmationResult = null;
    return { success: true, message: 'Authentication successful' };
  },
  signOut: () => {
    localStorage.removeItem('jaydee-user');
    set({ user: null, loginStep: 'credentials', tempUsername: '', tempPhone: '', otpAttempts: 0 });
    currentConfirmationResult = null;
  },
  resetLoginStep: () => {
    set({ loginStep: 'credentials', tempUsername: '', tempPhone: '', otpAttempts: 0 });
    currentConfirmationResult = null;
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
