import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, Dumbbell, ShieldCheck, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function AddCustomer() {
  const navigate = useNavigate();

  // Personal Info
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // 3 Contact Numbers
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Initial Membership & Payment
  const [addMembershipNow, setAddMembershipNow] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selectedPlanName, setSelectedPlanName] = useState('Monthly Standard');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(2000);
  const [amountPaid, setAmountPaid] = useState(2000);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

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
          setAmountPaid(first.price);
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
    setAmountPaid(p.price);
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
      setError('Primary mobile number is required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        gender,
        dateOfBirth,
        contacts: {
          primary: primaryPhone.trim(),
          secondary: secondaryPhone.trim(),
          emergency: emergencyPhone.trim()
        },
        address: address.trim(),
        notes: notes.trim(),
        initialPlan: addMembershipNow ? {
          planName: selectedPlanName,
          startDate,
          endDate,
          amount: Number(amount),
          amountPaid: Number(amountPaid),
          paymentMethod
        } : null
      };

      const res = await api.createCustomer(payload);

      // Celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Navigate to customer profile
      navigate(`/customers/${res.customer._id}`);
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

        {/* Card 2: Contact Details (3 separate numbers) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Contact Details (3 Numbers)
            </h2>
            <p className="text-xs text-slate-400">Primary phone is used for direct WhatsApp messages & renewal reminders</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Primary Phone */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Primary Mobile <span className="text-rose-500">*</span>
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
                  className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Secondary Phone */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Secondary Mobile (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="Alternate phone"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Emergency Phone */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Emergency Contact (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="Parent / Spouse"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Membership & Initial Payment */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Membership & Payment
              </h2>
              <p className="text-xs text-slate-400">Assign membership plan and record initial payment immediately</p>
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

              {/* Fees & Payment Made */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required={addMembershipNow}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid Today (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required={addMembershipNow}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs font-bold text-emerald-700"
                  />
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
                    <option value="Debit/Credit Card">Debit / Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
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
    </div>
  );
}
