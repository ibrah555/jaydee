import { create } from 'zustand';

type UserRole = 'owner' | 'manager' | 'cashier' | 'inventory';

type User = {
  id: string;
  name: string;
  role: UserRole;
};

type AuthStore = {
  user: User | null;
  signIn: (pin: string) => void;
  signOut: () => void;
};

const defaultUsers: Record<string, User> = {
  '1234': { id: 'u1', name: 'Owner', role: 'owner' },
  '4321': { id: 'u2', name: 'Manager', role: 'manager' },
  '1111': { id: 'u3', name: 'Cashier', role: 'cashier' }
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
  signIn: (pin) => {
    const user = defaultUsers[pin] || defaultUsers['1111'];
    localStorage.setItem('jaydee-user', JSON.stringify(user));
    set({ user });
  },
  signOut: () => {
    localStorage.removeItem('jaydee-user');
    set({ user: null });
  }
}));
