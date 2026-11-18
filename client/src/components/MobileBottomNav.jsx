import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, PlusCircle, CreditCard, MoreHorizontal, MessageSquare, BarChart3, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <>
      {/* "More" Drawer for Mobile */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden flex flex-col justify-end"
          onClick={() => setShowMoreMenu(false)}
        >
          <div 
            className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 space-y-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">More Options</h3>
            <div className="grid grid-cols-2 gap-2">
              <NavLink
                to="/reminders"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium text-xs transition-colors"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span>WhatsApp Reminders</span>
              </NavLink>

              <NavLink
                to="/reports"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium text-xs transition-colors"
              >
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span>Analytics & Reports</span>
              </NavLink>

              {(user?.role === 'owner' || user?.role === 'admin') && (
                <NavLink
                  to="/staff"
                  onClick={() => setShowMoreMenu(false)}
                  className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium text-xs transition-colors"
                >
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span>Staff & Roles</span>
                </NavLink>
              )}

              <NavLink
                to="/settings"
                onClick={() => setShowMoreMenu(false)}
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium text-xs transition-colors"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <Settings className="w-4 h-4" />
                </div>
                <span>Gym Settings</span>
              </NavLink>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Sticky Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200/90 shadow-lg px-2 py-2 flex items-center justify-around">
        {/* Home */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
              isActive ? 'text-emerald-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </NavLink>

        {/* Members */}
        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
              isActive ? 'text-emerald-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Members</span>
        </NavLink>

        {/* Add Button - Centered & Prominent */}
        <NavLink
          to="/customers/new"
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 active:scale-95 transition-transform">
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-emerald-700 mt-1">Add</span>
        </NavLink>

        {/* Payments */}
        <NavLink
          to="/payments"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
              isActive ? 'text-emerald-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <CreditCard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Payments</span>
        </NavLink>

        {/* More */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className="flex flex-col items-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">More</span>
        </button>
      </div>
    </>
  );
}
