import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Package, Receipt, Settings } from 'lucide-react';

export default function NavBar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/', label: 'New Sale', icon: ShoppingBag },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/history', label: 'History', icon: Receipt },
    { path: '/more', label: 'More', icon: Settings },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur z-40">
      <div className="mx-auto flex max-w-xl items-center justify-between px-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                isActive
                  ? 'text-primary font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-wide uppercase font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
