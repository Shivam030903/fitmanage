import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Clock, AlertTriangle, ShieldAlert, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TrialBanner() {
  const { gym, user } = useAuth();
  const location = useLocation();

  // Don't show banner if on the subscription billing page or if user is superadmin
  if (location.pathname === '/subscription' || user?.isSuperAdmin) {
    return null;
  }

  const sub = gym?.subscription;
  const isLocked = gym?.isLocked;

  // 1. Account Locked Banner
  if (isLocked) {
    return (
      <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sticky top-14 z-20">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 text-white animate-pulse" />
          <span>
            <strong>Account Locked:</strong> {gym.lockReason || 'Your gym subscription has lapsed.'} Access is currently restricted.
          </span>
        </div>
        <Link
          to="/subscription"
          className="px-3 py-1 rounded-lg bg-white text-rose-700 font-bold hover:bg-rose-50 transition-colors shrink-0 flex items-center space-x-1"
        >
          <span>Renew Subscription</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  // 2. Trial Active Countdown Banner
  if (sub?.status === 'trial') {
    const daysLeft = sub.daysRemaining !== undefined ? sub.daysRemaining : 14;
    const isUrgent = daysLeft <= 3;

    return (
      <div className={`px-4 py-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b transition-colors sticky top-14 z-20 ${
        isUrgent 
          ? 'bg-amber-500/10 border-amber-300 text-amber-900' 
          : 'bg-emerald-500/10 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center space-x-2">
          {isUrgent ? (
            <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>
            <strong>FitManage {sub.planName || 'Pro'} Trial:</strong>{' '}
            {daysLeft === 0 ? (
              <span className="text-rose-600 font-bold">Expires TODAY!</span>
            ) : (
              <span><strong>{daysLeft} days remaining</strong>. Enjoy unlimited members, WhatsApp automation & QR check-in.</span>
            )}
          </span>
        </div>
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <Link
            to="/subscription"
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center space-x-1 shadow-sm transition-all"
          >
            <span>Upgrade to Paid Plan</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  // 3. Trial Expired Banner
  if (sub?.status === 'expired') {
    return (
      <div className="bg-rose-50 border-b border-rose-200 text-rose-900 px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 sticky top-14 z-20">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            <strong>14-Day Free Trial Expired:</strong> Choose a plan starting from ₹799/mo to continue uninterrupted member management & WhatsApp automation.
          </span>
        </div>
        <Link
          to="/subscription"
          className="px-3.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center space-x-1 shadow-sm shrink-0 self-start sm:self-auto"
        >
          <span>Select a SaaS Plan</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return null;
}
