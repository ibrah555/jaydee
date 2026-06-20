import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { 
  ShoppingBag, 
  Package, 
  History, 
  LogOut, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  // Define navigation tabs with roles
  const menuItems = [
    {
      name: 'Sale',
      path: '/',
      icon: ShoppingBag,
      allowedRoles: ['owner', 'manager', 'cashier']
    },
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: BarChart3,
      allowedRoles: ['owner']
    },
    {
      name: 'Products',
      path: '/products',
      icon: Package,
      allowedRoles: ['owner', 'manager', 'inventory']
    },
    {
      name: 'History',
      path: '/history',
      icon: History,
      allowedRoles: ['owner', 'manager']
    }
  ];

  const allowedMenuItems = menuItems.filter(item => 
    item.allowedRoles.includes(user.role)
  );

  return (
    <>
      {/* Bottom Nav Bar for Mobile (screen < md) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex items-center justify-around px-4 z-50 shadow-lg">
        {allowedMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition ${
                  isActive ? 'text-accent' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
        
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium text-slate-400 hover:text-red-500 transition"
        >
          <LogOut className="w-5 h-5 mb-0.5" />
          <span>Exit</span>
        </button>
      </div>

      {/* Responsive Sidebar for Desktop (screen >= md) */}
      <aside 
        className={`hidden md:flex flex-col h-screen bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 relative z-40 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-slate-800 border border-slate-700 text-slate-300 p-1.5 rounded-full hover:bg-slate-700 hover:text-white transition shadow"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Brand / Logo */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-lg">
              JD
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-white tracking-wider text-lg">
                JayDee POS
              </span>
            )}
          </div>
        </div>

        {/* User Card */}
        <div className={`p-4 border-b border-slate-800/50 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-accent font-semibold text-sm border border-slate-700">
            {user.name.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold text-white truncate">{user.name}</h4>
              <div className="flex items-center gap-1 mt-0.5">
                <UserCheck className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-400 capitalize">{user.role}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {allowedMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl transition font-medium text-sm ${
                    isActive 
                      ? 'bg-accent text-white shadow-md' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Action */}
        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-red-950/30 text-slate-400 hover:text-red-400 transition font-medium text-sm"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
