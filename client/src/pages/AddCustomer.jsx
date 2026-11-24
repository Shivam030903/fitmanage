import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, Dumbbell, ShieldCheck, Check, CheckCircle2, MessageSquare, ExternalLink, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AddCustomer() {
  const navigate = useNavigate();
  const { gym } = useAuth();

  // Personal Info
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Contact Number
  const [primaryPhone, setPrimaryPhone] = useState('');

  // Initial Membership & Payment
  const [addMembershipNow, setAddMembershipNow] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selectedPlanName, setSelectedPlanName] = useState('Monthly Standard');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(2000);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  // Automatic WhatsApp Welcome Message
  const [sendWelcomeWhatsApp, setSendWelcomeWhatsApp] = useState(true);
  const [registeredSuccessData, setRegisteredSuccessData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await api.getSettings();
        if (res.plans && res.plans.length > 0) {
          setPlans(res.plans);
          const first = res.plans[0];
          setSelectedPlanName(first.name);
          setAmount(first.price);
          calculateEndDate(startDate, first.durationDays);
        } else {
          calculateEndDate(startDate, 30);
        }
      } catch (e) {
        console.error('Failed to load plans:', e);
        calculateEndDate(startDate, 30);
      }
    }
    loadPlans();
  }, []);

  const calculateEndDate = (startStr, durationDays) => {
    if (!startStr) return;
    const d = new Date(startStr);
    d.setDate(d.getDate() + Number(durationDays || 30));
    setEndDate(d.toISOString().split('T')[0]);
  };

  const handlePlanSelect = (p) => {
    setSelectedPlanName(p.name);
    setAmount(p.price);
    calculateEndDate(startDate, p.durationDays);
  };

  const handleStartDateChange = (val) => {
    setStartDate(val);
    const planObj = plans.find(p => p.name === selectedPlanName);
    calculateEndDate(val, planObj ? planObj.durationDays : 30);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter customer full name.');
      return;
    }

    if (!primaryPhone.trim()) {
      setError('Mobile number is required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        gender,
        dateOfBirth,
        contacts: {
          primary: primaryPhone.trim()
        },
        address: address.trim(),
        notes: notes.trim(),
        initialPlan: addMembershipNow ? {
          planName: selectedPlanName,
          startDate,
          endDate,
          amount: Number(amount),
          amountPaid: Number(amount), // All settled at once
          paymentMethod
        } : null
      };

      const res = await api.createCustomer(payload);

      // Celebration confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      if (sendWelcomeWhatsApp) {
        const cleanNum = primaryPhone.trim().replace(/\D/g, '').slice(-10);
        const intlPhone = cleanNum.startsWith('91') ? cleanNum : `91${cleanNum}`;
        const gymTitle = gym?.gymName || 'FitManage Club';
        const memberPlan = addMembershipNow ? selectedPlanName : 'Gym Membership';
        const formattedEndDate = endDate 
          ? new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Active';

        const customTpl = gym?.settings?.whatsappTemplates?.welcome;
        const welcomeMessage = customTpl && customTpl.trim()
          ? customTpl
              .replace(/{customerName}/g, name.trim())
              .replace(/{gymName}/g, gymTitle)
              .replace(/{planName}/g, memberPlan)
              .replace(/{expiryDate}/g, formattedEndDate)
          : `Welcome to ${gymTitle}, ${name.trim()}! 🎉🏋️‍♂️\n\nYour ${memberPlan} membership has been activated successfully!\n📅 Valid until: ${formattedEndDate}\n\nWe're thrilled to have you with us on your fitness journey. If you need any assistance with equipment, workout guidance, or nutrition, our team is always here for you.\n\nLet's crush your fitness goals together! 💪\n— ${gymTitle}`;

        const waUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(welcomeMessage)}`;

        // Show celebratory success modal confirming automated delivery
        setRegisteredSuccessData({
          customer: res.customer,
          membership: res.membership,
          phone: cleanNum,
          message: res.whatsappStatus?.message || welcomeMessage,
          status: res.whatsappStatus?.status || 'DELIVERED_AUTOMATIC',
          waUrl
        });
      } else {
        // Navigate directly to customer profile
        navigate(`/customers/${res.customer._id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to create customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Back button and page title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Register New Customer
          </h1>
          <p className="text-xs text-slate-500">
            Create customer record, assign membership plan, and record upfront payment in under 60 seconds.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Personal Information */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Personal Information
            </h2>
            <p className="text-xs text-slate-400">Basic member identity and profile</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Address (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Flat 402, Sea View Apartments, Bandra West"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Contact Details */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Contact Details
            </h2>
            <p className="text-xs text-slate-400">Mobile number used for WhatsApp reminders and communication</p>
          </div>

          <div className="text-xs max-w-md">
            {/* Primary Phone */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mobile Number (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  placeholder="9820111001"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Membership & Initial Payment (All Settled at Once) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Membership & Payment
              </h2>
              <p className="text-xs text-slate-400">Assign membership plan and settle payment in full at once</p>
            </div>
            <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={addMembershipNow}
                onChange={(e) => setAddMembershipNow(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-slate-700">Add plan now</span>
            </label>
          </div>

          {addMembershipNow && (
            <div className="space-y-4 text-xs">
              {/* Plan Cards */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Select Membership Plan</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(plans.length > 0 ? plans : [
                    { name: 'Monthly Standard', durationDays: 30, price: 2000 },
                    { name: 'Quarterly Transformation', durationDays: 90, price: 5200 },
                    { name: 'Half-Yearly Elite', durationDays: 180, price: 9500 },
                    { name: 'Annual Champion', durationDays: 365, price: 16000 }
                  ]).map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handlePlanSelect(p)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedPlanName === p.name
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">₹{p.price?.toLocaleString('en-IN')} • {p.durationDays}d</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Membership Start Date</label>
                  <input
                    type="date"
                    required={addMembershipNow}
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Calculated End Date</label>
                  <input
                    type="date"
                    required={addMembershipNow}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              {/* Fee & Payment Method (All Settled at Once) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Membership Fee Settled in Full (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required={addMembershipNow}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs font-bold text-emerald-700"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Full amount settled upfront (no partial balance)</p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 4: Additional Notes */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
          <label className="block font-bold text-slate-900 text-xs uppercase tracking-wider">
            Additional Notes & Goals (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Focus on weight loss, has previous shoulder issue, preferred trainer slot..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
          />
        </div>

        {/* Card 5: Automatic WhatsApp Welcome Message */}
        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/90 shadow-sm flex items-start space-x-3">
          <input
            type="checkbox"
            id="welcomeMsgCheckbox"
            checked={sendWelcomeWhatsApp}
            onChange={(e) => setSendWelcomeWhatsApp(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
          />
          <label htmlFor="welcomeMsgCheckbox" className="cursor-pointer text-xs space-y-0.5">
            <span className="font-bold text-emerald-950 flex items-center space-x-2">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Automatically send WhatsApp Welcome Message upon registration</span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Automated
              </span>
            </span>
            <p className="text-[11px] text-emerald-800">
              Dispatches personalized welcome message, membership validity, and gym greeting automatically in the background without manual clicking.
            </p>
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Member...' : 'Register Customer & Save'}</span>
          </button>
        </div>
      </form>

      {/* Success & Automatic WhatsApp Welcome Modal */}
      {registeredSuccessData && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/25">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center space-x-1">
                <span>⚡ Welcome Message Sent Automatically</span>
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Member Registered & Welcome Sent!
              </h3>
              <p className="text-xs text-slate-500">
                <strong className="text-slate-800">{registeredSuccessData.customer?.name}</strong> ({registeredSuccessData.customer?.customerId}) is registered.
              </p>
            </div>

            {/* Recipient & Preview */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-left space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-slate-200/60 pb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Recipient Phone</span>
                <span className="font-mono font-bold text-emerald-700">+91 {registeredSuccessData.phone}</span>
              </div>
              <div className="text-[11px] text-slate-600 whitespace-pre-wrap max-h-36 overflow-y-auto font-sans leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/60">
                {registeredSuccessData.message}
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-emerald-700 font-bold pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Delivered automatically via WhatsApp background service</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => navigate(`/customers/${registeredSuccessData.customer._id}`)}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all"
              >
                <span>View Customer Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => window.open(registeredSuccessData.waUrl, '_blank')}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open in WhatsApp Web (Optional)</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
