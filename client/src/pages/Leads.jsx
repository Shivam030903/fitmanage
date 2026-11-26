import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Sparkles, 
  Phone, 
  MessageSquare, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  Zap, 
  QrCode, 
  CreditCard, 
  Target, 
  Flame, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UpgradeModal from '../components/UpgradeModal';

export default function Leads() {
  const { gym } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [goalFilter, setGoalFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeLead, setActiveLead] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Add Lead Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('Weight Loss');
  const [budget, setBudget] = useState('₹1,500 - ₹3,000/mo');
  const [source, setSource] = useState('Walk-in Reception');
  const [notes, setNotes] = useState('');
  const [sendTrialPassNow, setSendTrialPassNow] = useState(true);
  const [submittingLead, setSubmittingLead] = useState(false);

  // Conversion Form State
  const [convertPlanName, setConvertPlanName] = useState('');
  const [convertDuration, setConvertDuration] = useState(30);
  const [convertAmount, setConvertAmount] = useState(1500);
  const [convertPaymentMethod, setConvertPaymentMethod] = useState('UPI');
  const [converting, setConverting] = useState(false);

  // Log Note State
  const [interactionNote, setInteractionNote] = useState('');
  const [interactionType, setInteractionType] = useState('call');
  const [loggingNote, setLoggingNote] = useState(false);

  // Success Feedback Toast
  const [toastMessage, setToastMessage] = useState('');

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.getLeads({
        search,
        status: statusFilter,
        goal: goalFilter
      });
      setLeads(res.leads || []);
      setStats(res.stats || null);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, goalFilter]);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await api.getSettings();
        if (res.plans && res.plans.length > 0) {
          setPlans(res.plans);
          setConvertPlanName(res.plans[0].name);
          setConvertAmount(res.plans[0].price);
          setConvertDuration(res.plans[0].durationDays);
        }
      } catch (e) {
        console.warn('Error loading plans:', e);
      }
    }
    loadPlans();
  }, []);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // 1. Create Lead Handler
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Name and phone are required.');
      return;
    }
    setSubmittingLead(true);
    try {
      const res = await api.createLead({
        name,
        phone,
        gender,
        email,
        fitnessGoal,
        budget,
        source,
        notes,
        sendTrialPassNow
      });

      setShowAddModal(false);
      setName('');
      setPhone('');
      setNotes('');
      showToast(res.message);
      fetchLeads();
    } catch (err) {
      alert(err.message || 'Failed to save inquiry.');
    } finally {
      setSubmittingLead(false);
    }
  };

  // 2. Send Day 1 Trial Pass
  const handleSendTrialPass = async (lead) => {
    try {
      const res = await api.sendLeadPass(lead._id);
      showToast(res.message);
      fetchLeads();
    } catch (err) {
      alert(err.message || 'Failed to dispatch pass.');
    }
  };

  // 3. Send Day 3 Follow-up Offer
  const handleSendDay3Offer = async (lead) => {
    try {
      const res = await api.sendLeadOffer(lead._id, { customDiscount: '15% Off' });
      showToast(res.message);
      fetchLeads();
    } catch (err) {
      alert(err.message || 'Failed to dispatch follow-up offer.');
    }
  };

  // 4. Log Interaction Note
  const handleSaveInteraction = async (e) => {
    e.preventDefault();
    if (!interactionNote.trim() || !activeLead) return;
    setLoggingNote(true);
    try {
      await api.logLeadInteraction(activeLead._id, {
        note: interactionNote,
        type: interactionType
      });
      setShowLogModal(false);
      setInteractionNote('');
      showToast('Interaction note logged.');
      fetchLeads();
    } catch (err) {
      alert(err.message || 'Failed to log note.');
    } finally {
      setLoggingNote(false);
    }
  };

  // 5. 1-Click Convert Lead to Member
  const handleConvertLead = async (e) => {
    e.preventDefault();
    if (!activeLead) return;
    setConverting(true);
    try {
      const res = await api.convertLead(activeLead._id, {
        planName: convertPlanName,
        durationDays: convertDuration,
        amount: Number(convertAmount),
        paymentMethod: convertPaymentMethod
      });

      triggerCelebration();
      setShowConvertModal(false);
      showToast(res.message);
      fetchLeads();
    } catch (err) {
      const errMsg = err.message || 'Failed to convert lead.';
      if (errMsg.toLowerCase().includes('limit reached') || errMsg.toLowerCase().includes('upgrade')) {
        setShowConvertModal(false);
        setShowUpgradeModal(true);
      } else {
        alert(errMsg);
      }
    } finally {
      setConverting(false);
    }
  };

  // 6. Delete Lead
  const handleDeleteLead = async (id, leadName) => {
    if (!confirm(`Are you sure you want to remove inquiry record for ${leadName}?`)) return;
    try {
      await api.deleteLead(id);
      showToast('Lead record removed.');
      fetchLeads();
    } catch (err) {
      alert(err.message || 'Failed to delete lead.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            <Target className="w-4 h-4" />
            <span>Lead & Walk-in Inquiry CRM</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Walk-in Inquiries & Guest Trials
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-generate Free 1-Day Trial Passes on WhatsApp, follow up on Day 3, and convert 60% more members.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Walk-in Inquiry</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Funnel KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inquiries */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Inquiries</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.totalInquiries || 0}
          </div>
          <p className="text-[10px] text-slate-400">Walk-ins & inquiries captured</p>
        </div>

        {/* Free Trials Issued */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Guest Passes</span>
            <QrCode className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {stats?.trialBookedCount || 0}
          </div>
          <p className="text-[10px] text-emerald-700 font-medium">1-Day WhatsApp passes generated</p>
        </div>

        {/* Converted to Paid Members */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Converted</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-purple-700 font-mono">
              {stats?.convertedCount || 0}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              {stats?.conversionRate || 0}% Rate
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Paid gym memberships locked</p>
        </div>

        {/* Follow-ups Due */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Follow-ups Due</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {stats?.followUpsDue || 0}
          </div>
          <p className="text-[10px] text-amber-700 font-medium">Day 3 offers & calls waiting</p>
        </div>
      </div>

      {/* Leads Table & Filter Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        {/* Search & Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl text-xs">
            {[
              { id: 'all', label: 'All Leads' },
              { id: 'trial_booked', label: 'Guest Trials (Day 1)' },
              { id: 'contacted', label: 'Followed Up' },
              { id: 'converted', label: 'Converted 🎉' },
              { id: 'lost', label: 'Lost' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box & Goal filter */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, phone, pass code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={goalFilter}
              onChange={(e) => setGoalFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
            >
              <option value="all">All Goals</option>
              <option value="Weight Loss">Weight Loss</option>
              <option value="Muscle Building">Muscle Building</option>
              <option value="General Fitness">General Fitness</option>
              <option value="Strength & Stamina">Strength & Stamina</option>
            </select>
          </div>
        </div>

        {/* Leads Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
            <span>Loading inquiries...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-3">
            <Target className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No walk-in leads found in this view.</p>
            <p className="text-[11px] max-w-sm mx-auto">
              Click <strong>"+ New Walk-in Inquiry"</strong> to capture visitors and automatically text them a 1-day guest workout pass.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">Prospect & Contact</th>
                  <th className="pb-3">Fitness Goal & Budget</th>
                  <th className="pb-3">1-Day Guest Pass</th>
                  <th className="pb-3">Funnel Status</th>
                  <th className="pb-3">Next Action / Follow-up</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => {
                  const pass = lead.trialPass || {};
                  const isConverted = lead.status === 'converted';

                  return (
                    <tr key={lead._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-3.5 pl-2">
                        <div className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                          <span>{lead.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            ({lead.leadId})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-500 mt-0.5">
                          <a
                            href={`tel:+91${lead.phone}`}
                            className="font-mono text-emerald-700 hover:underline flex items-center space-x-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>+91 {lead.phone}</span>
                          </a>
                          <span>•</span>
                          <span className="text-[10px] text-slate-400">{lead.source}</span>
                        </div>
                      </td>

                      {/* Fitness Goal & Budget */}
                      <td className="py-3.5">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {lead.fitnessGoal}
                        </span>
                        {lead.budget && (
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">Budget: {lead.budget}</p>
                        )}
                      </td>

                      {/* 1-Day Guest Pass Code & Redemption */}
                      <td className="py-3.5">
                        <div className="flex items-center space-x-1.5 font-mono">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-extrabold text-[11px] border border-emerald-200">
                            {pass.passCode || 'NO-PASS'}
                          </span>
                          {pass.isUsed ? (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Used</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Till {pass.validDate ? new Date(pass.validDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Active'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Scannable at Reception Desk</p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5">
                        {isConverted ? (
                          <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-black text-[10px] flex items-center space-x-1 w-fit">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>Converted Member ({lead.convertedToCustomerId})</span>
                          </span>
                        ) : lead.status === 'trial_booked' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Trial Booked
                          </span>
                        ) : lead.status === 'trial_completed' ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                            Workout Completed
                          </span>
                        ) : lead.status === 'contacted' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            Day 3 Followed Up
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                            Lost
                          </span>
                        )}
                      </td>

                      {/* Follow-up Note */}
                      <td className="py-3.5">
                        <p className="text-[11px] font-semibold text-slate-700">
                          {lead.followUpDate ? `Due: ${lead.followUpDate}` : 'No date set'}
                        </p>
                        {lead.notes && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{lead.notes}</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-2 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* 1-Click Convert to Member */}
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveLead(lead);
                                setShowConvertModal(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center space-x-1 shadow-sm transition-all"
                              title="1-Click Convert to Paid Gym Member"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Convert</span>
                            </button>
                          )}

                          {/* WhatsApp Day 1 Pass */}
                          <button
                            type="button"
                            onClick={() => handleSendTrialPass(lead)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors"
                            title="Send/Re-send Free Trial Pass via WhatsApp"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Day 3 Offer */}
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => handleSendDay3Offer(lead)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 transition-colors"
                              title="Send Day 3 15% Joining Discount Offer via WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                          )}

                          {/* Log Note */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLead(lead);
                              setShowLogModal(true);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Log Call / Interaction Note"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead._id, lead.name)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Lead"
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
        )}
      </div>

      {/* 1. Modal: Add New Walk-in Inquiry */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>Register Walk-in Inquiry</span>
                </h3>
                <p className="text-xs text-slate-400">Capture prospect and immediately issue a 1-day workout trial pass</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prospect Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohit Verma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp / Phone *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fitness Goal</label>
                  <select
                    value={fitnessGoal}
                    onChange={(e) => setFitnessGoal(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Weight Loss">Weight Loss & Fat Reduction</option>
                    <option value="Muscle Building">Muscle Building & Hypertrophy</option>
                    <option value="General Fitness">General Fitness & Health</option>
                    <option value="Strength & Stamina">Strength, Power & Stamina</option>
                    <option value="Flexibility / Yoga">Flexibility, Mobility & Yoga</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Walk-in Reception">Walk-in Reception</option>
                    <option value="Instagram / Social">Instagram / Facebook</option>
                    <option value="Google / Website">Google Search / Maps</option>
                    <option value="Referral by Member">Friend / Member Referral</option>
                    <option value="Flyer / Billboard">Local Banner / Flyer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expected Budget (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ₹2,000/mo or Looking for Annual"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Receptionist Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Wants morning workouts, interested in personal training."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              {/* Free Trial WhatsApp Drip Trigger */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                    📲
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">Send Free 1-Day Trial Pass via WhatsApp</p>
                    <p className="text-[10px] text-slate-500">Auto-sends pass code & valid date immediately</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendTrialPassNow}
                  onChange={(e) => setSendTrialPassNow(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLead}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  {submittingLead ? 'Registering...' : 'Save Inquiry & Issue Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: 1-Click Convert Lead to Member */}
      {showConvertModal && activeLead && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowConvertModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-purple-500" />
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Convert to Active Member</span>
                </h3>
                <p className="text-xs text-slate-400">Prospect: <strong>{activeLead.name}</strong> (+91 {activeLead.phone})</p>
              </div>
              <button 
                onClick={() => setShowConvertModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertLead} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Membership Plan</label>
                <select
                  value={convertPlanName}
                  onChange={(e) => {
                    const selected = plans.find(p => p.name === e.target.value);
                    setConvertPlanName(e.target.value);
                    if (selected) {
                      setConvertAmount(selected.price);
                      setConvertDuration(selected.durationDays);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  {plans.map(p => (
                    <option key={p._id} value={p.name}>
                      {p.name} ({p.durationDays} Days) - ₹{p.price?.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    value={convertDuration}
                    onChange={(e) => setConvertDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['UPI', 'Cash', 'Other'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setConvertPaymentMethod(method)}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs text-center transition-all ${
                        convertPaymentMethod === method 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                FitManage will automatically generate the official Member ID, activate the membership, record upfront payment, and send a Welcome WhatsApp message with receipt.
              </p>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/25"
                >
                  {converting ? 'Converting...' : 'Confirm & Convert to Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Log Interaction Note */}
      {showLogModal && activeLead && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowLogModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Log Interaction Note
                </h3>
                <p className="text-xs text-slate-400">Prospect: {activeLead.name}</p>
              </div>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInteraction} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Interaction Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'call', label: '📞 Phone Call' },
                    { id: 'whatsapp', label: '💬 WhatsApp' },
                    { id: 'visit', label: '🏢 Gym Visit' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInteractionType(t.id)}
                      className={`p-2 rounded-xl border text-center font-bold ${
                        interactionType === t.id ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Note / Feedback</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Called to check on trial workout, offered 15% discount on quarterly plan. Will visit tomorrow."
                  value={interactionNote}
                  onChange={(e) => setInteractionNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loggingNote}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  {loggingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Modal Paywall */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Member Limit Reached"
        message={`Your ${gym?.subscription?.planName || 'current'} plan capacity has been reached. Upgrade to unlock more members!`}
        currentCount={gym?.subscription?.memberLimit || 100}
        limit={gym?.subscription?.memberLimit || 100}
        plan={gym?.subscription?.planName || 'Plan'}
      />
    </div>
  );
}
