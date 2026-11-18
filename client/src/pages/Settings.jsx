import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Dumbbell, MessageSquare, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { gym, updateGym } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gym profile state
  const [gymName, setGymName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');

  // WhatsApp templates state
  const [expiringTemplate, setExpiringTemplate] = useState('');
  const [expiredTemplate, setExpiredTemplate] = useState('');
  const [paymentTemplate, setPaymentTemplate] = useState('');
  const [welcomeTemplate, setWelcomeTemplate] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add plan modal
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDays, setNewPlanDays] = useState(30);
  const [newPlanPrice, setNewPlanPrice] = useState(2000);
  const [newPlanDesc, setNewPlanDesc] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      if (res.gym) {
        setGymName(res.gym.gymName || '');
        setTagline(res.gym.tagline || '');
        setAddress(res.gym.address || '');
        setPhone(res.gym.phone || '');
        setEmail(res.gym.email || '');
        setGstin(res.gym.gstin || '');

        const templates = res.gym.settings?.whatsappTemplates || {};
        setExpiringTemplate(templates.expiringSoon || '');
        setExpiredTemplate(templates.expired || '');
        setPaymentTemplate(templates.paymentDue || '');
        setWelcomeTemplate(templates.welcome || '');
      }
      setPlans(res.plans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setSuccessMessage('');
    try {
      const res = await api.updateGymProfile({
        gymName,
        tagline,
        address,
        phone,
        email,
        gstin,
        settings: {
          whatsappTemplates: {
            expiringSoon: expiringTemplate,
            expired: expiredTemplate,
            paymentDue: paymentTemplate,
            welcome: welcomeTemplate
          }
        }
      });
      updateGym(res.gym);
      setSuccessMessage('Gym profile & WhatsApp templates saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await api.addPlan({
        name: newPlanName,
        durationDays: Number(newPlanDays),
        price: Number(newPlanPrice),
        description: newPlanDesc
      });
      setShowAddPlan(false);
      setNewPlanName('');
      setNewPlanDesc('');
      fetchSettings();
    } catch (err) {
      alert(err.message || 'Failed to add plan.');
    }
  };

  const handleDeletePlan = async (id) => {
    if (window.confirm('Delete this plan? Existing members with this plan will retain their history.')) {
      try {
        await api.deletePlan(id);
        fetchSettings();
      } catch (err) {
        alert(err.message || 'Failed to delete plan.');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Gym Configuration & Settings
        </h1>
        <p className="text-xs text-slate-500">
          Configure gym branch details, custom membership durations, pricing, and WhatsApp templates.
        </p>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1. Membership Plans Manager */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Dumbbell className="w-4 h-4 text-emerald-600" />
              <span>Membership Plans & Durations</span>
            </h2>
            <p className="text-xs text-slate-400">Gym owners can create fixed (Monthly, Quarterly, Yearly) or custom plans</p>
          </div>
          <button
            onClick={() => setShowAddPlan(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Plan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((p) => (
            <div key={p._id} className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col justify-between space-y-2 text-xs">
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-100">
                    ₹{p.price?.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-1">{p.durationDays} Days validity</p>
                {p.description && <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-2">{p.description}</p>}
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                <button
                  onClick={() => handleDeletePlan(p._id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Remove plan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Gym Profile & GST Settings */}
      <form onSubmit={handleSaveProfile} className="space-y-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Gym Details & Receipt Header
            </h2>
            <p className="text-xs text-slate-400">Displayed on member dashboard and generated payment receipts</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gym Name</label>
              <input
                type="text"
                required
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Gym Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                placeholder="27AABCU9603R1ZM"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency & Timezone</label>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-medium text-xs">
                Indian Rupee (₹ INR) • Asia/Kolkata (IST)
              </div>
            </div>
          </div>
        </div>

        {/* 3. WhatsApp Message Templates */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Message Templates</span>
            </h2>
            <p className="text-xs text-slate-400">
              Customize dynamic messages. Placeholders supported: <code>{'{customerName}'}</code>, <code>{'{gymName}'}</code>, <code>{'{expiryDate}'}</code>, <code>{'{daysRemaining}'}</code>, <code>{'{pendingAmount}'}</code>.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expiring Soon Template
              </label>
              <textarea
                rows={4}
                value={expiringTemplate}
                onChange={(e) => setExpiringTemplate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expired Membership Template
              </label>
              <textarea
                rows={4}
                value={expiredTemplate}
                onChange={(e) => setExpiredTemplate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Pending Payment Due Template
              </label>
              <textarea
                rows={3}
                value={paymentTemplate}
                onChange={(e) => setPaymentTemplate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Welcome New Member Template
              </label>
              <textarea
                rows={3}
                value={welcomeTemplate}
                onChange={(e) => setWelcomeTemplate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25"
            >
              {savingProfile ? 'Saving...' : 'Save Settings & Templates'}
            </button>
          </div>
        </div>
      </form>

      {/* Add Plan Modal */}
      {showAddPlan && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddPlan(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-slate-900 text-base">Add New Membership Plan</h3>
            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2 Months Summer Transformation"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newPlanDays}
                    onChange={(e) => setNewPlanDays(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cardio + Strength with locker"
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlan(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
