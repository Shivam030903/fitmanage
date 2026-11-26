import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Dumbbell, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Smartphone, 
  AlertCircle, 
  ArrowRight, 
  Printer, 
  ExternalLink, 
  Sparkles,
  Zap,
  QrCode,
  ChevronRight,
  User,
  Phone,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PublicPayment() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  // Checkout selection
  const [paymentType, setPaymentType] = useState('renewal'); // 'renewal' or 'dues'
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Razorpay'); // 'Razorpay' or 'UPI'
  const [upiRef, setUpiRef] = useState('');

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  useEffect(() => {
    if (token) {
      loadCheckoutData(token);
    }
  }, [token]);

  const loadCheckoutData = async (identifier) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getOnlinePayDetails(identifier);
      setData(res);
      // Auto-select first available plan or matching current plan
      if (res.plans && res.plans.length > 0) {
        const matching = res.plans.find(p => p.name === res.currentMembership?.planName);
        setSelectedPlanId(matching ? matching._id : res.plans[0]._id);
      }
      // If outstanding dues exist and no active plan, default to dues if allowed
      if (res.outstandingBalance > 0 && !res.currentMembership) {
        setPaymentType('dues');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load member renewal details.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = data?.plans?.find(p => p._id === selectedPlanId) || null;
  const renewalAmount = paymentType === 'dues' 
    ? (data?.outstandingBalance || 0)
    : (selectedPlan?.price || 0);

  // Calculate prospective new expiry date
  const computeProspectiveExpiry = () => {
    if (!selectedPlan) return null;
    const durationDays = selectedPlan.durationDays || 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = today;
    if (data?.currentMembership?.endDate) {
      const currentEnd = new Date(data.currentMembership.endDate);
      currentEnd.setHours(0, 0, 0, 0);
      if (currentEnd >= today && data.currentMembership.status !== 'cancelled') {
        start = currentEnd;
      }
    }

    const prospectiveEnd = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
    return prospectiveEnd.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }
  };

  // 1. Pay via Razorpay
  const handleRazorpayPay = async () => {
    if (!renewalAmount || renewalAmount <= 0) {
      alert('Please select a valid membership plan or dues amount.');
      return;
    }

    setProcessing(true);
    try {
      const orderRes = await api.createOnlineOrder({
        token,
        amount: renewalAmount,
        planId: paymentType === 'renewal' ? selectedPlanId : null,
        type: paymentType
      });

      // If Razorpay live gateway is active
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout SDK failed to load. Please check your internet connection or try UPI payment.');
      }

      if (orderRes.isDemo) {
        // Simulated checkout confirmation for test environment
        const verifyRes = await api.verifyOnlinePayment({
          token,
          razorpay_order_id: orderRes.orderId,
          razorpay_payment_id: `pay_demo_${Date.now().toString().slice(-8)}`,
          razorpay_signature: 'demo_signature',
          planId: paymentType === 'renewal' ? selectedPlanId : null,
          amount: renewalAmount,
          type: paymentType,
          paymentMethod: 'Razorpay',
          isDemo: true
        });

        setPaymentSuccess(verifyRes);
        triggerCelebration();
        return;
      }

      // Open Razorpay Standard Checkout Popup
      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: data.gym?.gymName || 'FitManage Gym',
        description: `${paymentType === 'renewal' ? (selectedPlan?.name || 'Membership Renewal') : 'Outstanding Dues Clearance'} (${data.customer.customerId})`,
        image: data.gym?.logo || undefined,
        order_id: orderRes.orderId,
        prefill: {
          name: data.customer.name,
          contact: data.customer.phone ? `+91${data.customer.phone.replace(/\D/g, '').slice(-10)}` : '',
          email: data.customer.email || ''
        },
        theme: {
          color: '#10b981'
        },
        handler: async function (response) {
          try {
            setProcessing(true);
            const verifyRes = await api.verifyOnlinePayment({
              token,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: paymentType === 'renewal' ? selectedPlanId : null,
              amount: renewalAmount,
              type: paymentType,
              paymentMethod: 'Razorpay'
            });

            setPaymentSuccess(verifyRes);
            triggerCelebration();
          } catch (vErr) {
            alert(vErr.message || 'Payment verification failed. Please contact gym reception.');
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert('Payment failed: ' + response.error.description);
        setProcessing(false);
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Unable to initiate online payment.');
      setProcessing(false);
    }
  };

  // 2. Submit UPI Transaction / Reference
  const handleUpiSubmit = async (e) => {
    e.preventDefault();
    if (!renewalAmount || renewalAmount <= 0) {
      alert('Please select a valid renewal plan.');
      return;
    }

    setProcessing(true);
    try {
      const verifyRes = await api.verifyOnlinePayment({
        token,
        planId: paymentType === 'renewal' ? selectedPlanId : null,
        amount: renewalAmount,
        type: paymentType,
        paymentMethod: 'UPI',
        upiRef: upiRef.trim() || `UPI-APP-${Date.now().toString().slice(-6)}`
      });

      setPaymentSuccess(verifyRes);
      triggerCelebration();
    } catch (err) {
      alert(err.message || 'Failed to submit UPI payment.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400">Loading your membership renewal details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full space-y-4">
          <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white">Renewal Link Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'The membership link you clicked is invalid or has expired. Please check with your gym front desk.'}
          </p>
          <div className="pt-2">
            <Link
              to="/portal"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400"
            >
              <span>Go to Member Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { customer, gym, currentMembership, outstandingBalance, plans, paymentConfig } = data;

  // Construct UPI Intent URI
  const upiId = paymentConfig.upiId || 'fitmanage@upi';
  const upiName = paymentConfig.upiName || gym.gymName || 'FitManage Studio';
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${renewalAmount}&cu=INR&tn=${encodeURIComponent(`${customer.customerId} Renewal`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiIntentUrl)}`;

  // SUCCESS SCREEN
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
          
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/40 animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Payment Confirmed!
            </h1>
            <p className="text-xs text-slate-400">
              Your membership has been successfully renewed at <span className="font-bold text-slate-200">{gym.gymName}</span>.
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-slate-400">Receipt Ref</span>
              <span className="text-emerald-400 font-bold">{paymentSuccess.receiptNumber}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Member Name</span>
              <span className="text-white font-bold font-sans">{customer.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Customer ID</span>
              <span className="text-slate-200">{customer.customerId}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Plan Renewed</span>
              <span className="text-white font-bold font-sans">{paymentSuccess.planName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">New Expiry Date</span>
              <span className="text-emerald-400 font-bold">
                {new Date(paymentSuccess.newEndDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-sm">
              <span className="text-slate-400 font-sans font-bold">Amount Paid</span>
              <span className="text-emerald-400 font-black text-base">
                ₹{paymentSuccess.amount?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Digital receipt and membership details have also been sent to your WhatsApp number!</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Receipt</span>
            </button>
            <Link
              to="/portal"
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-emerald-500/25"
            >
              <span>Open Member Portal</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20 px-4 py-3 sm:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-extrabold text-white leading-tight">{gym.gymName}</h1>
              <p className="text-[10px] text-slate-400">{gym.tagline || 'Online Member Renewal & Pay'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>256-Bit Secure Pay</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Member Profile & Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black text-lg flex items-center justify-center uppercase shadow-md">
                {customer.name?.charAt(0) || 'M'}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">{customer.name}</h2>
                <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
                    {customer.customerId}
                  </span>
                  <span>•</span>
                  <span>{customer.phone || 'No phone'}</span>
                </div>
              </div>
            </div>

            {/* Current Status Badge */}
            <div className="sm:text-right">
              {currentMembership ? (
                <div>
                  <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    currentMembership.isExpired 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : currentMembership.daysRemaining <= 3 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {currentMembership.isExpired 
                        ? 'Expired Membership' 
                        : currentMembership.daysRemaining === 0 
                          ? 'Expires Today' 
                          : `${currentMembership.daysRemaining} Days Left`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Valid till: {new Date(currentMembership.endDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  No Active Plan
                </span>
              )}
            </div>
          </div>

          {/* Dues Alert Banner */}
          {outstandingBalance > 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>You have an outstanding dues balance of <strong>₹{outstandingBalance.toLocaleString('en-IN')}</strong></span>
              </div>
              {paymentConfig.allowCustomDues && (
                <button
                  type="button"
                  onClick={() => setPaymentType('dues')}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                    paymentType === 'dues' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  Pay Dues Only
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Selector: Renew Plan vs Clear Dues */}
        {paymentConfig.allowCustomDues && outstandingBalance > 0 && (
          <div className="flex rounded-2xl bg-slate-900 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setPaymentType('renewal')}
              className={`flex-1 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center space-x-1.5 ${
                paymentType === 'renewal' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>Renew Membership Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('dues')}
              className={`flex-1 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center space-x-1.5 ${
                paymentType === 'dues' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Dues (₹{outstandingBalance.toLocaleString('en-IN')})</span>
            </button>
          </div>
        )}

        {/* Plan Selection Cards */}
        {paymentType === 'renewal' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Your Renewal Duration
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono">
                Extends access automatically
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map((p) => {
                const isSelected = selectedPlanId === p._id;
                return (
                  <div
                    key={p._id}
                    onClick={() => setSelectedPlanId(p._id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                      isSelected 
                        ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-slate-950" />
                      </span>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white">{p.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{p.durationDays} Days Unlimited Access</p>
                      {p.description && (
                        <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{p.description}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-mono">Price</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        ₹{p.price?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Prospective Validity Notice */}
            {selectedPlan && (
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Your new valid-thru date will be:</span>
                </div>
                <span className="font-bold text-emerald-400 font-mono text-xs">
                  {computeProspectiveExpiry()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Payment Methods Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Choose Payment Method</span>
            </h3>
            <span className="text-xs font-black text-emerald-400 font-mono text-sm">
              Total: ₹{renewalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Payment Method Switcher (Razorpay vs UPI) */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {paymentConfig.razorpayEnabled && (
              <button
                type="button"
                onClick={() => setPaymentMethod('Razorpay')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all ${
                  paymentMethod === 'Razorpay' 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold shadow-md' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Instant Pay (Razorpay)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">Cards, Netbanking, UPI</span>
              </button>
            )}

            {paymentConfig.upiEnabled && (
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all ${
                  paymentMethod === 'UPI' || !paymentConfig.razorpayEnabled
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold shadow-md' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Direct UPI & QR</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">GPay, PhonePe, Paytm</span>
              </button>
            )}
          </div>

          {/* 1. Razorpay Action View */}
          {paymentMethod === 'Razorpay' && paymentConfig.razorpayEnabled && (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>Pay with Razorpay Gateway</span>
                  <span className="text-emerald-400 font-mono">₹{renewalAmount.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click below to open the secure checkout. Once the payment clears, your membership will be extended immediately and a digital receipt sent to your WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRazorpayPay}
                disabled={processing || renewalAmount <= 0}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Secure Payment...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Pay ₹{renewalAmount.toLocaleString('en-IN')} & Renew Instantly</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 2. Direct UPI Action View */}
          {(paymentMethod === 'UPI' || !paymentConfig.razorpayEnabled) && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                {/* Dynamic High-Res QR Code */}
                <div className="bg-white p-3 rounded-2xl shadow-md shrink-0 flex flex-col items-center">
                  <img
                    src={qrCodeUrl}
                    alt="UPI Payment QR Code"
                    className="w-36 h-36 object-contain"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-700 mt-1">Scan with any UPI App</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300 w-full">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Gym UPI ID / VPA</span>
                    <p className="font-mono font-bold text-white text-sm bg-slate-900 p-2 rounded-xl border border-slate-800 select-all">
                      {upiId}
                    </p>
                  </div>

                  {/* Tap to open UPI app on mobile */}
                  <a
                    href={upiIntentUrl}
                    className="inline-flex w-full items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Open in GPay / PhonePe / Paytm</span>
                  </a>

                  <p className="text-[10px] text-slate-400">
                    Payee: <strong className="text-slate-200">{upiName}</strong> • Amount: <strong className="text-emerald-400">₹{renewalAmount.toLocaleString('en-IN')}</strong>
                  </p>
                </div>
              </div>

              {/* UPI UTR Reference Submission */}
              <form onSubmit={handleUpiSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Enter 12-digit UPI UTR / Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 412356789012"
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing || renewalAmount <= 0}
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/30"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Confirming Payment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>I have Paid ₹{renewalAmount.toLocaleString('en-IN')} - Confirm Renewal</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 space-y-1">
        <p>© {new Date().getFullYear()} {gym.gymName} • Powered by FitManage Cloud</p>
        <p className="text-[10px] text-slate-600">Secure automated renewals & digital receipts dispatch</p>
      </footer>
    </div>
  );
}
