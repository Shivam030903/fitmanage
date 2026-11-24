import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  CreditCard, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  RefreshCw,
  Dumbbell,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, gym, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/customers/new', label: 'Add Customer', icon: UserPlus },
    { to: '/memberships', label: 'Memberships', icon: Dumbbell },
    { to: '/renewals', label: 'Renewals', icon: RefreshCw },
    { to: '/payments', label: 'Payments', icon: CreditCard },
    { to: '/reminders', label: 'WhatsApp', icon: MessageSquare, badge: 'Hot' },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/staff', label: 'Staff & Roles', icon: ShieldCheck, ownerOnly: true },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-[#0f172a] text-slate-300 min-h-screen border-r border-slate-800 flex-shrink-0 select-none">
      {/* Gym Brand / Logo */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Dumbbell className="w-5 h-5 text-slate-950" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-white text-base tracking-tight truncate leading-tight">
              {gym?.gymName || 'FitManage'}
            </h1>
            <p className="text-xs text-emerald-400 font-medium tracking-wide">
              Gym Management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Operations
        </div>

        {navItems.map((item) => {
          if (item.ownerOnly && user?.role !== 'owner' && user?.role !== 'admin') {
            return null;
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      isActive ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* Member Self-Service Portal Quick Access */}
        <div className="pt-3">
          <a
            href="/portal"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
          >
            <div className="flex items-center space-x-2.5">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Member Portal Pass</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </nav>

      {/* User profile & sign out footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400 uppercase">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <span className="inline-block text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-medium capitalize">
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
