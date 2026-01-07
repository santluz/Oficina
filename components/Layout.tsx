
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  NAV_ITEMS, 
  COLORS, 
  LogOut, 
  Menu, 
  X, 
  UserIcon,
  Wrench
} from '../constants';
import { db } from '../services/db';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = db.getCurrentUser();

  const handleLogout = () => {
    db.logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={`min-h-screen bg-${COLORS.bg} text-${COLORS.text} flex`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 z-50 
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        <div className="p-6 border-b border-zinc-800">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className={`w-8 h-8 bg-${COLORS.primary} rounded-lg flex items-center justify-center`}>
              <Wrench size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-100">Oficina Pro</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive(item.path) 
                  ? `bg-${COLORS.primary} text-white font-semibold shadow-lg shadow-cyan-500/20` 
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-zinc-400 hover:text-zinc-100"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-zinc-100 hidden sm:block">
              {NAV_ITEMS.find(item => item.path === location.pathname)?.label || 'Sistema'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-zinc-100">{user?.name || 'Mecânico'}</p>
              <p className="text-xs text-zinc-500">{user?.email || 'oficina@exemplo.com'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
              <UserIcon size={20} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth animate-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
