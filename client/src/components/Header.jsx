import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Dumbbell, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, onInstallClick, isInstallable }) {
  const { gym } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customers?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
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
      <div className="flex items-center space-x-3">
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
      </div>
    </header>
  );
}
