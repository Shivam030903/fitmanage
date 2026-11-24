import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ArrowRight, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gymName, setGymName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
      navigate('/dashboard');
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
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password, phone, gymName, address });
      }
      navigate('/dashboard');
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
            <span>1-Click Instant Demo Access</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('owner@fitmanage.io', 'password123')}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700 font-semibold transition-all flex flex-col items-center justify-center space-y-1 group"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:text-slate-950" />
              <span>Login as Owner</span>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-900 font-normal">Vikram (All Access)</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin@fitmanage.io', 'password123')}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700 font-semibold transition-all flex flex-col items-center justify-center space-y-1 group"
            >
              <UserCheck className="w-4 h-4 text-teal-400 group-hover:text-slate-950" />
              <span>Login as Admin</span>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-900 font-normal">Pooja (Admin Operations)</span>
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                tab === 'login' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                tab === 'register' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register New Gym
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gym / Fitness Studio Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iron Gym & Fitness"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Singhania"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gym Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9820012345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </>
            )}

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
              <span>{loading ? 'Please wait...' : tab === 'login' ? 'Sign In to FitManage' : 'Create Gym Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          FitManage Progressive Web App (PWA) • Built for Indian Gyms & Studios
        </p>
      </div>
    </div>
  );
}
