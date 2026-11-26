import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Building2, 
  DollarSign, 
  Lock, 
  Unlock, 
  ExternalLink, 
  Search, 
  Filter, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  MessageSquare, 
  Phone, 
  Mail, 
  Calendar,
  Activity,
  Layers,
  Eye,
  Sliders,
  X,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Key,
  Share2,
  Crown
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SuperAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [gyms, setGyms] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Change Plan / Extend Trial Modal state
  const [selectedGym, setSelectedGym] = useState(null);
  const [newPlan, setNewPlan] = useState('pro');
  const [newStatus, setNewStatus] = useState('active');
  const [extendDays, setExtendDays] = useState(30);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  // Lock account modal state
  const [lockTargetGym, setLockTargetGym] = useState(null);
  const [lockReason, setLockReason] = useState('Subscription payment lapsed.');
  const [locking, setLocking] = useState(false);

  // Setup / Onboard New Gym state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdGymResult, setCreatedGymResult] = useState(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [createForm, setCreateForm] = useState({
    gymName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: 'password123',
    address: '',
    planId: 'pro',
    billingCycle: 'monthly',
    status: 'trial',
    trialDays: 14,
    whatsAppProvider: 'whatsapp_qr'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, gymsRes, subsRes] = await Promise.all([
        api.getSuperAdminStats(),
        api.getSuperAdminGyms({ search, plan: planFilter, status: statusFilter }),
        api.getSuperAdminSubscriptions()
      ]);
      setStats(statsRes);
      setGyms(gymsRes.gyms || []);
      setSubscriptions(subsRes.subscriptions || []);
    } catch (err) {
      console.error('SuperAdmin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [planFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleToggleLock = async () => {
    if (!lockTargetGym) return;
    setLocking(true);
    try {
      const willLock = !lockTargetGym.isLocked;
      await api.superAdminToggleLock(lockTargetGym._id, {
        lock: willLock,
        reason: lockReason
      });
      setLockTargetGym(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update lock status.');
    } finally {
      setLocking(false);
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!selectedGym) return;
    setUpdatingPlan(true);
    try {
      await api.superAdminChangePlan(selectedGym._id, {
        planId: newPlan,
        status: newStatus,
        extendDays: Number(extendDays)
      });
      setSelectedGym(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update plan.');
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleImpersonate = async (gymId) => {
    try {
      const res = await api.superAdminImpersonate(gymId);
      if (res.token) {
        // Save current super admin token in backup slot so you can switch back!
        const currentToken = localStorage.getItem('fitmanage_token');
        if (currentToken) {
          localStorage.setItem('fitmanage_superadmin_token_backup', currentToken);
        }
        localStorage.setItem('fitmanage_token', res.token);
        localStorage.setItem('fitmanage_user', JSON.stringify(res.user));
        localStorage.setItem('fitmanage_gym', JSON.stringify(res.gym));
        window.open('/dashboard', '_blank');
      }
    } catch (err) {
      alert(err.message || 'Impersonation failed.');
    }
  };

  const handleCreateGymSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    setSubmittingCreate(true);
    try {
      const res = await api.superAdminCreateGym(createForm);
      setCreatedGymResult(res);
      setShowCreateModal(false);
      setCreateForm({
        gymName: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        password: 'password123',
        address: '',
        planId: 'pro',
        billingCycle: 'monthly',
        status: 'trial',
        trialDays: 14,
        whatsAppProvider: 'whatsapp_qr'
      });
      fetchData();
    } catch (err) {
      setCreateError(err.message || 'Failed to onboard gym.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleDeleteGym = async (gym) => {
    if (!window.confirm(`⚠️ DANGER: Are you sure you want to permanently delete gym "${gym.gymName}"? All its member records, plans, and attendance data will be permanently wiped.`)) {
      return;
    }
    try {
      await api.superAdminDeleteGym(gym._id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete gym.');
    }
  };

  const copyWhatsAppMessage = (res) => {
    if (!res) return;
    const planName = res.gym?.subscription?.plan ? res.gym.subscription.plan.toUpperCase() : 'PRO';
    const text = `🎉 Welcome to FitManage!\n\nYour gym management system for *${res.gym?.gymName}* is now active and ready to use.\n\n🌐 *Login Portal:* https://fitmanage-p8bc.onrender.com/login\n👤 *Owner Email:* ${res.credentials?.email}\n🔑 *Password:* ${res.credentials?.password}\n⭐ *Plan:* ${planName} (${res.gym?.subscription?.status === 'trial' ? '14-Day Free Trial' : 'Active Paid'})\n\nYou can log in, set up your studio profile, and start registering members and sending automated WhatsApp expiry alerts!\n\n_FitManage SaaS Platform_`;

    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px] uppercase border border-emerald-500/30 flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Founder Master Control</span>
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-300 text-xs font-mono">FitManage SaaS Platform OS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Super Admin Overview
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Monitor monthly recurring revenue (MRR), manage gym fleet subscriptions, unlock accounts, and provision new gym tenants.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => { setShowCreateModal(true); setCreateError(''); }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Setup New Gym</span>
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center space-x-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/dashboard"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition-all border border-slate-700"
            >
              <span>Gym App</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Founder Master KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Platform MRR</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 font-mono">
              ₹{(stats?.mrr || 0).toLocaleString('en-IN')}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              ARR: <strong className="text-slate-700 font-mono">₹{((stats?.mrr || 0) * 12).toLocaleString('en-IN')}</strong>/yr run-rate
            </p>
          </div>
          <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl font-bold border border-emerald-100 flex items-center justify-between">
            <span>Paid Gyms: {stats?.activePaidCount || 0}</span>
            <span>Trials: {stats?.trialCount || 0}</span>
          </div>
        </div>

        {/* Total Gyms Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gym Fleet</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {stats?.totalGyms || 0}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Locked / Suspended: <strong className="text-rose-600 font-mono">{stats?.lockedCount || 0}</strong>
            </p>
          </div>
          <div className="text-[10px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl font-semibold border border-slate-200/70 flex items-center justify-between font-mono">
            <span>S: {stats?.planBreakdown?.starter || 0}</span>
            <span>G: {stats?.planBreakdown?.growth || 0}</span>
            <span>P: {stats?.planBreakdown?.pro || 0}</span>
          </div>
        </div>

        {/* Total Members Across India */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Members Managed</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {(stats?.totalMembers || 0).toLocaleString('en-IN')}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Across all registered gym studios
            </p>
          </div>
          <div className="text-[10px] text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl font-bold border border-purple-100 flex items-center space-x-1">
            <span>Processed: ₹{(stats?.totalPaymentsVolume || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* WhatsApp Health Fleet Rate */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Fleet Health</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {stats?.whatsAppHealth?.healthPercentage || 100}%
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Delivery Success Rate
            </p>
          </div>
          <div className="text-[10px] text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl font-bold border border-teal-100 flex items-center justify-between font-mono">
            <span>Sent: {stats?.whatsAppHealth?.totalSent || 0}</span>
            <span>Failed: {stats?.whatsAppHealth?.failed || 0}</span>
          </div>
        </div>
      </div>

      {/* Gym Fleet Directory */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>Gym Fleet Directory ({gyms.length})</span>
            </h2>
            <p className="text-xs text-slate-400">Search and manage platform subscriptions for all onboarded gyms</p>
          </div>

          {/* Search & Filters */}
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search gym, owner, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-48 sm:w-60 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
            >
              <option value="all">All Plans</option>
              <option value="starter">Starter Plan</option>
              <option value="growth">Growth Plan</option>
              <option value="pro">Pro Plan</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="trial">Trial Active</option>
              <option value="active">Paid Active</option>
              <option value="expired">Trial Expired</option>
              <option value="locked">Account Locked</option>
            </select>

            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Filter
            </button>

            <button
              type="button"
              onClick={() => { setShowCreateModal(true); setCreateError(''); }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Onboard Gym</span>
            </button>
          </form>
        </div>

        {/* Gym Fleet Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                <th className="pb-3 pl-2">Gym & Location</th>
                <th className="pb-3">Owner Contact</th>
                <th className="pb-3">SaaS Plan</th>
                <th className="pb-3">Status & Days</th>
                <th className="pb-3">Members / Quota</th>
                <th className="pb-3">WhatsApp Engine</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gyms.map((gym) => {
                const sub = gym.subscription || {};
                return (
                  <tr key={gym._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Gym Info */}
                    <td className="py-4 pl-2">
                      <div className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                        <span>{gym.gymName}</span>
                        {gym.isLocked && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                            Locked
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{gym.address || 'Address not set'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {gym._id}</p>
                    </td>

                    {/* Owner Info */}
                    <td className="py-4">
                      <p className="font-semibold text-slate-800">{gym.owner?.name || 'Owner'}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{gym.owner?.email || gym.email}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{gym.phone || gym.owner?.phone || 'No phone'}</p>
                    </td>

                    {/* Plan Badge */}
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold capitalize ${
                        sub.plan === 'pro' 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : sub.plan === 'growth'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {sub.planName || 'Pro'}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1 capitalize">{sub.billingCycle || 'monthly'}</p>
                    </td>

                    {/* Status & Expiry */}
                    <td className="py-4">
                      {gym.isLocked ? (
                        <div className="text-rose-600 font-bold text-[11px] flex items-center space-x-1">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>Suspended</span>
                        </div>
                      ) : sub.status === 'trial' ? (
                        <div>
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200">
                            Trial: {sub.daysRemaining}d left
                          </span>
                        </div>
                      ) : sub.status === 'active' ? (
                        <div>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                            Active ({sub.daysRemaining}d)
                          </span>
                        </div>
                      ) : (
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[10px] border border-rose-200">
                          Expired
                        </span>
                      )}
                    </td>

                    {/* Members Quota */}
                    <td className="py-4">
                      <span className="font-mono font-bold text-slate-900">
                        {gym.membersCount}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {' '}/ {sub.memberLimit >= 10000 ? '∞' : sub.memberLimit}
                      </span>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{
                            width: `${sub.memberLimit >= 10000 ? 20 : Math.min(100, Math.round((gym.membersCount / (sub.memberLimit || 500)) * 100))}%`
                          }} 
                        />
                      </div>
                    </td>

                    {/* WhatsApp */}
                    <td className="py-4">
                      <span className="text-[11px] font-semibold text-slate-700 flex items-center space-x-1">
                        <span>{gym.whatsAppProvider === 'meta' ? 'Meta Cloud API' : 'Direct QR'}</span>
                      </span>
                      {gym.isMetaConfigured && (
                        <span className="text-[10px] text-emerald-600 font-bold">Meta Active</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 pr-2 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Impersonate / Preview Gym */}
                        <button
                          type="button"
                          onClick={() => handleImpersonate(gym._id)}
                          title="Impersonate Gym Owner (Login as Gym in new tab)"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Change Plan / Extend Trial */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGym(gym);
                            setNewPlan(sub.plan || 'pro');
                            setNewStatus(sub.status || 'active');
                            setExtendDays(30);
                          }}
                          title="Change SaaS Plan or Extend Trial"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {/* Lock / Unlock */}
                        <button
                          type="button"
                          onClick={() => {
                            setLockTargetGym(gym);
                            setLockReason(gym.lockReason || 'Subscription lapsed. Please contact billing support.');
                          }}
                          title={gym.isLocked ? "Unlock Gym Account" : "Lock / Suspend Gym Account"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            gym.isLocked 
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                              : 'bg-slate-100 text-slate-500 hover:text-rose-600'
                          }`}
                        >
                          {gym.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete Gym */}
                        <button
                          type="button"
                          onClick={() => handleDeleteGym(gym)}
                          title="Permanently Delete Gym Account"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Plan / Grant Subscription Modal */}
      {selectedGym && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedGym(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Manage Subscription Plan
                </h3>
                <p className="text-xs text-slate-400">Gym: {selectedGym.gymName}</p>
              </div>
              <button 
                onClick={() => setSelectedGym(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select SaaS Plan Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'starter', label: 'Starter', price: '₹799' },
                    { id: 'growth', label: 'Growth', price: '₹1,999' },
                    { id: 'pro', label: 'Pro', price: '₹3,499' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPlan(p.id)}
                      className={`p-2.5 rounded-xl border text-center font-bold capitalize transition-all ${
                        newPlan === p.id 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div>{p.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">{p.price}/mo</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subscription Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                >
                  <option value="active">Paid Active (Full Access)</option>
                  <option value="trial">Free Trial Mode</option>
                  <option value="expired">Expired / Past Due</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Validity Extension (Days from today)</label>
                <select
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                >
                  <option value="7">+7 Days</option>
                  <option value="14">+14 Days</option>
                  <option value="30">+30 Days (1 Month)</option>
                  <option value="90">+90 Days (Quarterly)</option>
                  <option value="365">+365 Days (1 Year Free Founder Grant)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedGym(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPlan}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  {updatingPlan ? 'Saving...' : 'Apply Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lock Gym Account Modal */}
      {lockTargetGym && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLockTargetGym(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                lockTargetGym.isLocked ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {lockTargetGym.isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {lockTargetGym.isLocked ? 'Unlock Gym Account' : 'Lock & Suspend Gym Account'}
                </h3>
                <p className="text-xs text-slate-400">{lockTargetGym.gymName}</p>
              </div>
            </div>

            {!lockTargetGym.isLocked && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Suspension (Visible to Gym Staff)
                </label>
                <input
                  type="text"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="e.g. Subscription lapsed or policy violation"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setLockTargetGym(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleLock}
                disabled={locking}
                className={`px-5 py-2 rounded-xl font-bold text-white ${
                  lockTargetGym.isLocked ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {locking ? 'Updating...' : lockTargetGym.isLocked ? 'Unlock Account' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup / Onboard New Gym Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Setup & Onboard New Gym</h3>
                  <p className="text-xs text-slate-400">Provision gym workspace, owner login credentials, and SaaS tier</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateGymSubmit} className="space-y-4 text-xs">
              {/* Gym Info Section */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Gym Facility Details</span>
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gym / Studio Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Iron Gym & Fitness"
                      value={createForm.gymName}
                      onChange={(e) => setCreateForm({ ...createForm, gymName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Location / Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Bandra West, Mumbai"
                      value={createForm.address}
                      onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Account Section */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>2. Gym Owner Login Credentials</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Malhotra"
                      value={createForm.ownerName}
                      onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Owner Email (Login ID) *</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@irongym.com"
                      value={createForm.ownerEmail}
                      onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Owner WhatsApp Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9820012345"
                      value={createForm.ownerPhone}
                      onChange={(e) => setCreateForm({ ...createForm, ownerPhone: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Initial Password *</label>
                      <button
                        type="button"
                        onClick={() => {
                          const randomPass = 'fit' + Math.floor(100000 + Math.random() * 900000);
                          setCreateForm({ ...createForm, password: randomPass });
                        }}
                        className="text-[10px] text-emerald-600 hover:underline font-bold"
                      >
                        🎲 Generate Random
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SaaS Subscription Tier & Engine */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>3. SaaS Subscription Plan & Gateway</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div 
                    onClick={() => setCreateForm({ ...createForm, planId: 'starter' })}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      createForm.planId === 'starter' 
                        ? 'border-emerald-500 bg-emerald-50 text-slate-900 shadow-sm' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs">Starter</div>
                    <div className="text-[11px] text-emerald-600 font-mono font-bold mt-0.5">₹799/mo</div>
                    <div className="text-[10px] text-slate-400 mt-1">Up to 100 Members</div>
                  </div>

                  <div 
                    onClick={() => setCreateForm({ ...createForm, planId: 'growth' })}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      createForm.planId === 'growth' 
                        ? 'border-emerald-500 bg-emerald-50 text-slate-900 shadow-sm' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs">Growth</div>
                    <div className="text-[11px] text-emerald-600 font-mono font-bold mt-0.5">₹1,999/mo</div>
                    <div className="text-[10px] text-slate-400 mt-1">Up to 500 Members</div>
                  </div>

                  <div 
                    onClick={() => setCreateForm({ ...createForm, planId: 'pro' })}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all relative ${
                      createForm.planId === 'pro' 
                        ? 'border-emerald-500 bg-emerald-50 text-slate-900 shadow-sm' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      Popular
                    </span>
                    <div className="font-bold text-xs">Pro</div>
                    <div className="text-[11px] text-emerald-600 font-mono font-bold mt-0.5">₹3,499/mo</div>
                    <div className="text-[10px] text-slate-400 mt-1">Unlimited Members</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Subscription Mode</label>
                    <select
                      value={createForm.status}
                      onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      <option value="trial">14-Day Free Trial (Active)</option>
                      <option value="active">Active Paid (30 Days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">WhatsApp Provider</label>
                    <select
                      value={createForm.whatsAppProvider}
                      onChange={(e) => setCreateForm({ ...createForm, whatsAppProvider: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      <option value="whatsapp_qr">Direct WhatsApp Web QR (Instant)</option>
                      <option value="meta">Meta Cloud API (Official)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <span>{submittingCreate ? 'Provisioning...' : '🚀 Provision & Launch Gym'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gym Provisioned Credentials & WhatsApp Share Dialog */}
      {createdGymResult && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setCreatedGymResult(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Gym Account Provisioned!</h3>
              <p className="text-slate-500 text-xs">
                {createdGymResult.gym?.gymName} is now live on the FitManage platform.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-400 font-sans">Gym ID:</span>
                <span className="font-bold text-slate-800">{createdGymResult.gym?._id}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-400 font-sans">Owner Name:</span>
                <span className="font-bold text-slate-800">{createdGymResult.owner?.name}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-400 font-sans">Login Email:</span>
                <span className="font-bold text-emerald-700">{createdGymResult.credentials?.email}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-400 font-sans">Password:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {createdGymResult.credentials?.password}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Plan & Status:</span>
                <span className="font-bold text-slate-800 uppercase">
                  {createdGymResult.gym?.subscription?.plan} ({createdGymResult.gym?.subscription?.status})
                </span>
              </div>
            </div>

            {/* Copy WhatsApp Invitation Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => copyWhatsAppMessage(createdGymResult)}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md ${
                  copiedMessage 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copiedMessage ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedMessage ? '✅ Copied to Clipboard!' : '📋 Copy WhatsApp Welcome & Login Message'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const gymId = createdGymResult.gym?._id;
                  setCreatedGymResult(null);
                  if (gymId) handleImpersonate(gymId);
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors border border-emerald-200"
              >
                <Eye className="w-4 h-4" />
                <span>Open Gym Dashboard (Impersonate)</span>
              </button>
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setCreatedGymResult(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
