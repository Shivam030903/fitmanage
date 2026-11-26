import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Dumbbell, Bell, MoreVertical, LogOut, Settings, ShieldCheck, RefreshCw, User, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, onInstallClick, isInstallable }) {
  const { user, gym, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close 3-dots dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customers?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    setShowMenu(false);
    logout();
    navigate('/login');
  };

  const handleClearCacheAndReload = async () => {
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) {
          await reg.unregister();
        }
      }
    } catch (err) {
      console.warn('Error clearing cache:', err);
    }
    window.location.reload(true);
  };

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between">
      {/* Page Title & Breadcrumb / Mobile Brand */}
      <div className="flex items-center space-x-3">
        <div className="lg:hidden flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
            <Dumbbell className="w-4 h-4 text-slate-950" />
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight">{gym?.gymName || 'FitManage'}</span>
        </div>
        <div className="hidden lg:block">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500 font-medium">{todayStr}</p>
        </div>
      </div>

      {/* Global Quick Search + Action Buttons */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Search form */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-48 md:w-72">
          <input
            type="text"
            placeholder="Search member, phone, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs pl-8 pr-4 py-2 rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-400"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </form>

        {/* Quick Check-in Button */}
        <button
          onClick={() => navigate('/attendance')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-sm"
          title="Reception QR Attendance Scanner"
        >
          <QrCode className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Check-in</span>
        </button>

        {/* PWA Install Button */}
        <button
          onClick={onInstallClick}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Install App</span>
          <span className="md:hidden">PWA</span>
        </button>

        {/* Notification bell */}
        <button
          onClick={() => navigate('/reminders')}
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Renewals & Reminders"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
        </button>

        {/* 3-Dots Menu Dropdown (Web & Mobile Header) */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-xl transition-all ${
              showMenu
                ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Account & More Options"
            aria-label="Account & More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95 origin-top-right">
              {/* User Profile Card */}
              <div className="p-3 bg-slate-50 rounded-xl mb-1 flex items-center space-x-3 border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-emerald-400 font-bold flex items-center justify-center text-xs uppercase shadow-sm">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-emerald-600 capitalize font-medium">{user?.role} • {gym?.gymName || 'FitManage'}</p>
                </div>
              </div>

              {/* Quick Navigation Items */}
              <div className="space-y-0.5 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); navigate('/settings'); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Gym Settings</span>
                </button>

                {(user?.role === 'owner' || user?.role === 'admin') && (
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); navigate('/staff'); }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    <span>Staff & Roles</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClearCacheAndReload}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  title="Purge cached files and reload fresh version"
                >
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  <span>Refresh & Clear Cache</span>
                </button>
              </div>

              {/* Log Out Action */}
              <div className="pt-1 mt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors text-left border border-rose-100"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
