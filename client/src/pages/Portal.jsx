import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, Phone, ShieldCheck, CheckCircle2, Clock, Calendar, 
  Receipt, Megaphone, ArrowRight, LogOut, QrCode, AlertCircle, 
  MessageSquare, Sparkles, ChevronRight, User, Printer, ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from '../components/ReceiptModal';

export default function Portal() {
  const [token, setToken] = useState(() => localStorage.getItem('fitmanage_member_token') || '');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Enter phone, 2: Enter OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [devOtp, setDevOtp] = useState(null);

  // Portal Dashboard Data
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState('pass'); // 'pass', 'receipts', 'gym'
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // If token exists, load member data
  useEffect(() => {
    if (token) {
      loadMemberProfile(token);
    }
  }, [token]);

  const loadMemberProfile = async (authToken) => {
    setLoadingData(true);
    setError('');
    try {
      const res = await api.portalGetMe(authToken);
      setData(res);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Session expired. Please log in again.');
      handleLogout();
    } finally {
      setLoadingData(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter your 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setError('');
    setInfoMessage('');
    setDevOtp(null);

    try {
      const res = await api.portalSendOtp(phone.trim());
      setInfoMessage(res.message);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 4-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await api.portalVerifyOtp(phone.trim(), otp.trim());
      localStorage.setItem('fitmanage_member_token', res.token);
      setToken(res.token);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fitmanage_member_token');
    setToken('');
    setData(null);
    setStep(1);
    setOtp('');
  };

  // Open printable receipt modal
  const handleOpenReceipt = async (paymentId) => {
    try {
      const res = await api.getReceipt(paymentId);
      if (res && res.receipt) {
        setSelectedReceipt(res.receipt);
      }
    } catch (err) {
      alert('Unable to load receipt details.');
    }
  };

  // -------------------------------------------------------------
  // LOGIN / AUTH SCREEN
  // -------------------------------------------------------------
  if (!token || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
        {/* Top Minimal Header */}
        <div className="flex items-center justify-between max-w-md w-full mx-auto pt-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Dumbbell className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block leading-none">FitManage</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Member Portal</span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
            Self-Service Pass
          </span>
        </div>

        {/* Auth Form Card */}
        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="space-y-1.5 text-center">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {step === 1 ? 'Welcome to Your Gym Pass' : 'Enter Verification Code'}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 1 
                  ? 'Access your digital membership pass, check validity, and view payment receipts.' 
                  : `Enter the 4-digit code sent to +91 ${phone}`}
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-800/70 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{infoMessage}</span>
              </div>
            )}

            {devOtp && (
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-[11px] text-center">
                <span>Testing Code: </span>
                <strong className="font-mono text-sm tracking-widest text-white ml-1">{devOtp}</strong>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Use the phone number registered with your gym membership.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Sending Code...</span>
                  ) : (
                    <>
                      <span>Send WhatsApp Access Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    4-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="• • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-center text-xl tracking-widest focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Verifying Code...</span>
                  ) : (
                    <>
                      <span>Open Member Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); setInfoMessage(''); }}
                    className="text-xs text-slate-400 hover:text-slate-200 underline"
                  >
                    Change phone number
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-slate-500">
          Powered by <strong className="text-slate-400">FitManage Gym Systems</strong> • Instant PWA Pass
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MEMBER DASHBOARD SCREEN
  // -------------------------------------------------------------
  const { member, gym, currentMembership, payments = [], announcements = [], peakHours = [], occupancy = null } = data;
  const isExpired = currentMembership?.status === 'expired';
  const isActive = currentMembership?.status === 'active' || currentMembership?.status === 'expiring_soon';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(member.customerId)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Dumbbell className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white leading-tight">{gym.gymName}</h1>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{member.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {gym.phone && (
              <a
                href={`https://wa.me/91${gym.phone.replace(/\D/g, '').slice(-10)}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center space-x-1"
                title="Chat with Reception on WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reception</span>
              </a>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800/80 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl w-full mx-auto px-4 py-6 space-y-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs">
          {[
            { id: 'pass', label: '🪪 Digital Gym Pass' },
            { id: 'receipts', label: `🧾 Receipts (${payments.length})` },
            { id: 'gym', label: '🏋️ Timings & Club' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-center rounded-xl font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: DIGITAL PASS */}
        {activeTab === 'pass' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Athletic Membership Pass Card */}
            <div className="relative rounded-3xl p-6 sm:p-7 overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 border border-slate-800/80 space-y-6">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Pass Header */}
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block mb-0.5">
                    Official Member Pass
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{gym.gymName}</h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 ${
                  isActive 
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span>{isActive ? 'ACTIVE' : 'EXPIRED'}</span>
                </span>
              </div>

              {/* QR and Details Flex */}
              <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                {/* QR Code Container */}
                <div className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center flex-shrink-0">
                  <img src={qrCodeUrl} alt="Member QR Code" className="w-32 h-32 rounded-lg" />
                  <span className="font-mono text-[10px] font-bold text-slate-800 mt-1.5 tracking-wider">
                    {member.customerId}
                  </span>
                </div>

                {/* Member Details */}
                <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                  <div>
                    <h3 className="text-lg font-extrabold text-white">{member.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      +91 {member.phone}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Plan</span>
                      <span className="font-bold text-white text-xs truncate block">
                        {currentMembership?.planName || 'No Active Plan'}
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Validity</span>
                      <span className="font-bold text-emerald-400 text-xs block">
                        {currentMembership?.daysRemaining !== undefined 
                          ? `${currentMembership.daysRemaining} Days Left` 
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expiry Progress Bar */}
              {currentMembership && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 relative z-10">
                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                    <span>Valid: {new Date(currentMembership.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span className="text-white font-bold">
                      Expires: {new Date(currentMembership.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExpired 
                          ? 'bg-rose-500' 
                          : currentMembership.daysRemaining <= 7 
                          ? 'bg-amber-400' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${currentMembership.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Renewal / Status Callout */}
            {isExpired ? (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-rose-300">Membership Has Expired</h4>
                  <p className="text-xs text-rose-400/80">Renew today to continue your gym access without pause.</p>
                </div>
                {gym.phone && (
                  <a
                    href={`https://wa.me/91${gym.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi ${gym.gymName}, I'd like to renew my membership (${member.customerId}).`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center space-x-1"
                  >
                    <span>Renew Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : currentMembership?.daysRemaining <= 7 ? (
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-amber-300">Expiring in {currentMembership.daysRemaining} Days</h4>
                  <p className="text-xs text-amber-400/80">Renew early at reception to maintain your momentum!</p>
                </div>
                {gym.phone && (
                  <a
                    href={`https://wa.me/91${gym.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi ${gym.gymName}, I'd like to renew my membership early (${member.customerId}).`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all"
                  >
                    Early Renewal
                  </a>
                )}
              </div>
            ) : null}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Member Since</span>
                  <span className="font-bold text-white text-xs">
                    {new Date(member.joinedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Payments Cleared</span>
                  <span className="font-bold text-white text-xs">{payments.length} Receipts</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RECEIPTS & PAYMENTS */}
        {activeTab === 'receipts' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="font-bold text-white text-sm">Payment History & Tax Invoices</h3>
                <p className="text-xs text-slate-400">Download and save official GST receipts directly to your device.</p>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono">
                {payments.length} Payments
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 text-xs">
                No past payment records found.
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p._id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {p.transactionReference || 'PAY-REF'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {p.paymentMethod}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs">{p.planName || 'Membership Renewal'}</h4>
                      <p className="text-[11px] text-slate-400">
                        Paid on {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount Paid</span>
                        <span className="font-mono font-black text-white text-base">
                          ₹{p.amountPaid?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenReceipt(p._id)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5 border border-slate-700 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TIMINGS, ANNOUNCEMENTS & PEAK HOURS */}
        {activeTab === 'gym' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Live Studio Occupancy Meter */}
            {occupancy && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-3 w-3">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        occupancy.color === 'rose' ? 'bg-rose-400' : occupancy.color === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${
                        occupancy.color === 'rose' ? 'bg-rose-500' : occupancy.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                    </span>
                    <span className="font-extrabold text-white text-xs tracking-wider uppercase">Live Studio Occupancy</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    occupancy.color === 'rose' 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                      : occupancy.color === 'amber'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {occupancy.status}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-white font-mono">
                      {occupancy.currentMembers} <span className="text-xs font-normal text-slate-400">/ {occupancy.maxCapacity} Capacity</span>
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-300">
                      {occupancy.percentage}% Filled
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        occupancy.color === 'rose' ? 'bg-rose-500' : occupancy.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${occupancy.percentage}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  {occupancy.color === 'emerald' && '✨ Great time to hit the gym! Equipment is open and crowd is light.'}
                  {occupancy.color === 'amber' && '⚡ Moderate crowd. Plenty of space to train comfortably.'}
                  {occupancy.color === 'rose' && '🔥 Peak rush hour. Popular equipment may have short wait times.'}
                </p>
              </div>
            )}

            {/* Gym Announcements */}
            <div className="space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-emerald-400" />
                <span>Club Announcements</span>
              </h3>

              <div className="space-y-2.5">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{ann.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                        {ann.date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{ann.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Hour Guide */}
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Club Hours & Peak Occupancy Guide</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Plan your workouts around high-traffic equipment times.
                </p>
              </div>

              <div className="space-y-3">
                {peakHours.map((slot, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{slot.time}</span>
                      <span className={`font-bold ${
                        slot.color === 'rose' ? 'text-rose-400' : slot.color === 'blue' ? 'text-blue-400' : 'text-emerald-400'
                      }`}>
                        {slot.status}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          slot.color === 'rose' ? 'bg-rose-500' : slot.color === 'blue' ? 'bg-blue-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${slot.fill}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Club Information Card */}
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider">Gym Front Desk & Location</h4>
              <p className="text-slate-400">{gym.address || 'Club address registered at front desk.'}</p>
              {gym.phone && (
                <p className="text-slate-400 font-mono">
                  Direct Line: <strong className="text-white">+91 {gym.phone}</strong>
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          isOpen={Boolean(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
          receiptData={selectedReceipt}
        />
      )}
    </div>
  );
}
