import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ArrowRight, ShieldCheck, UserCheck, Sparkles, Crown, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (demoEmail, demoPassword, targetPath = '/dashboard') => {
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
      navigate(targetPath);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res?.user?.isSuperAdmin || res?.user?.role === 'superadmin') {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/20 mb-1">
            <Dumbbell className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            FitManage
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Smart Gym Operations, Subscriptions & WhatsApp Reminders
          </p>
        </div>

        {/* 1-Click Demo Accounts Banner */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>1-Click Quick Access</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('owner@fitmanage.io', 'password123', '/dashboard')}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700 font-semibold transition-all flex flex-col items-center justify-center space-y-1 group"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:text-slate-950" />
              <span>Gym Owner</span>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-900 font-normal">Vikram (All Access)</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin@fitmanage.io', 'password123', '/dashboard')}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700 font-semibold transition-all flex flex-col items-center justify-center space-y-1 group"
            >
              <UserCheck className="w-4 h-4 text-teal-400 group-hover:text-slate-950" />
              <span>Gym Admin</span>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-900 font-normal">Pooja (Staff Desk)</span>
            </button>
          </div>

          {/* Super Admin Quick Button */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickLogin('superadmin@fitmanage.io', 'password123', '/super-admin')}
            className="w-full p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 hover:from-amber-500 hover:to-amber-400 hover:text-slate-950 text-amber-300 border border-amber-500/30 font-bold transition-all flex items-center justify-center space-x-2 group text-xs shadow-sm"
          >
            <Crown className="w-4 h-4 text-amber-400 group-hover:text-slate-950" />
            <span>Login as Super Admin (SaaS Founder)</span>
          </button>
        </div>

        {/* Main Sign-In Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <div>
              <h2 className="text-base font-bold text-white">Sign In to Your Gym</h2>
              <p className="text-[11px] text-slate-400">Enter your credentials provided by the administrator</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
              Active Fleet
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="owner@fitmanage.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Signing in...' : 'Sign In to FitManage'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Super Admin Provisioning Note */}
          <div className="pt-2 border-t border-slate-800/60 flex items-start space-x-2 text-[11px] text-slate-400 bg-slate-950/40 p-3 rounded-xl border">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <span className="text-slate-300 font-semibold">Self-registration disabled:</span> All gym accounts are onboarded and managed directly by the platform Super Admin.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          FitManage Progressive Web App (PWA) • Built for Indian Gyms & Studios
        </p>
      </div>
    </div>
  );
}
