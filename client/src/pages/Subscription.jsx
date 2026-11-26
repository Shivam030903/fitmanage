import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Users, 
  Smartphone, 
  QrCode, 
  Clock, 
  ArrowRight, 
  Receipt, 
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

export default function Subscription() {
  const { gym, updateGym } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [processingPlan, setProcessingPlan] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await api.getSubscription();
      setSubData(res);
      if (res.subscription) {
        setBillingCycle(res.subscription.billingCycle || 'monthly');
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

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

  const handleSubscribe = async (planKey) => {
    setProcessingPlan(planKey);
    setSuccessMessage('');
    try {
      // 1. Create order
      const orderRes = await api.createSubscriptionOrder({
        planId: planKey,
        billingCycle
      });

      // 2. Load Razorpay SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      if (orderRes.isDemo) {
        // Simulated subscription confirmation
        const verifyRes = await api.verifySubscription({
          planId: planKey,
          billingCycle,
          razorpay_order_id: orderRes.orderId,
          razorpay_payment_id: `sub_pay_demo_${Date.now().toString().slice(-6)}`,
          razorpay_signature: 'demo_sig',
          isDemo: true
        });

        triggerCelebration();
        setSuccessMessage(verifyRes.message);
        if (verifyRes.subscription) {
          updateGym({
            ...gym,
            subscription: verifyRes.subscription
          });
        }
        fetchSubscription();
        return;
      }

      // Open Razorpay Checkout Modal
      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: 'FitManage Cloud',
        description: `FitManage ${orderRes.planName} SaaS Plan (${billingCycle})`,
        image: 'https://fitmanage-p8bc.onrender.com/favicon.ico',
        order_id: orderRes.orderId,
        prefill: {
          name: gym?.gymName || 'Gym Owner',
          email: gym?.email || '',
          contact: gym?.phone ? `+91${gym.phone.replace(/\D/g, '').slice(-10)}` : ''
        },
        theme: {
          color: '#10b981'
        },
        handler: async function (response) {
          try {
            setProcessingPlan(planKey);
            const verifyRes = await api.verifySubscription({
              planId: planKey,
              billingCycle,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            triggerCelebration();
            setSuccessMessage(verifyRes.message);
            if (verifyRes.subscription) {
              updateGym({
                ...gym,
                subscription: verifyRes.subscription
              });
            }
            fetchSubscription();
          } catch (vErr) {
            alert(vErr.message || 'Subscription verification failed.');
          } finally {
            setProcessingPlan(null);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingPlan(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert('Payment failed: ' + response.error.description);
        setProcessingPlan(null);
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Subscription payment error.');
      setProcessingPlan(null);
    }
  };

  if (loading && !subData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading SaaS billing plans...</p>
      </div>
    );
  }

  const currentSub = subData?.subscription || gym?.subscription;
  const currentMembersCount = subData?.currentMembersCount || 0;
  const memberLimit = currentSub?.memberLimit || 500;
  const plans = subData?.plans || {};

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
          <Sparkles className="w-4 h-4" />
          <span>SaaS Platform Subscription & Billing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Choose the Perfect Fitness OS Plan
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Scale your gym with automated WhatsApp renewals, multi-staff access, and instant QR attendance check-in.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center space-x-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Current Subscription Status Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Gym Plan</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold capitalize ${
                currentSub?.status === 'trial' 
                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                  : currentSub?.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                {currentSub?.planName || 'Pro'} {currentSub?.status === 'trial' ? 'Trial' : 'Active'}
              </span>
            </div>

            <h2 className="text-xl font-black text-slate-900">
              {currentSub?.status === 'trial' ? (
                <span>14-Day Free Trial ({currentSub?.daysRemaining} Days Left)</span>
              ) : currentSub?.status === 'active' ? (
                <span>{currentSub?.planName} Plan • Renews in {currentSub?.daysRemaining} Days</span>
              ) : (
                <span className="text-rose-600">Subscription Expired</span>
              )}
            </h2>

            <p className="text-xs text-slate-500">
              {currentSub?.status === 'trial'
                ? 'You currently have access to all Pro features. Upgrade before your trial ends to maintain uninterrupted automated follow-ups.'
                : `Active billing cycle: ${currentSub?.billingCycle || 'monthly'}. Instant self-service membership renewals active.`}
            </p>
          </div>

          {/* Member Quota Meter */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 min-w-[260px] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Member Capacity</span>
              </span>
              <span className="font-mono font-bold text-slate-900">
                {currentMembersCount} / {memberLimit >= 10000 ? '∞ Unlimited' : memberLimit}
              </span>
            </div>

            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{
                  width: `${memberLimit >= 10000 ? 15 : Math.min(100, Math.round((currentMembersCount / memberLimit) * 100))}%`
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              {memberLimit >= 10000 
                ? 'No member cap on your Pro plan' 
                : `${Math.max(0, memberLimit - currentMembersCount)} member slots remaining`}
            </p>
          </div>
        </div>
      </div>

      {/* Billing Cycle Switcher */}
      <div className="flex items-center justify-center">
        <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 inline-flex items-center text-xs">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold uppercase">
              2 Mos Free
            </span>
          </button>
        </div>
      </div>

      {/* SaaS Pricing Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Starter Tier */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-6 hover:border-slate-300 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Essential</span>
                <h3 className="text-xl font-black text-slate-900">Starter</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                🌱
              </div>
            </div>

            <p className="text-xs text-slate-500 min-h-[32px]">
              Perfect for new boutique gyms, personal training studios, and kickboxing clubs.
            </p>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-black text-slate-900">
                  ₹{billingCycle === 'yearly' ? '7,990' : '799'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  /{billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>
              {billingCycle === 'yearly' && (
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Equivalent to ₹665/month</p>
              )}
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 pt-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-900">Up to 100 active members</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Direct WhatsApp QR Device Link</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Member Self-Service Portal (<code>/portal</code>)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Basic Revenue & Analytics Reports</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Single Staff / Owner login</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSubscribe('starter')}
            disabled={processingPlan !== null || (currentSub?.plan === 'starter' && currentSub?.status === 'active')}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            {processingPlan === 'starter' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : currentSub?.plan === 'starter' && currentSub?.status === 'active' ? (
              <span>Current Plan</span>
            ) : (
              <>
                <span>Choose Starter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* 2. Growth Tier (Most Popular) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 flex flex-col justify-between space-y-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
            Most Popular
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Scale Up</span>
                <h3 className="text-xl font-black text-slate-900">Growth</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                🚀
              </div>
            </div>

            <p className="text-xs text-slate-500 min-h-[32px]">
              For established fitness clubs requiring multi-stage follow-ups & official Meta WhatsApp.
            </p>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-black text-slate-900">
                  ₹{billingCycle === 'yearly' ? '19,990' : '1,999'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  /{billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>
              {billingCycle === 'yearly' && (
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Equivalent to ₹1,665/month</p>
              )}
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 pt-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-900">Up to 500 active members</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-emerald-700">Official Meta WhatsApp Cloud API</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Auto Multi-Stage Expiry Engine (7d, 1d, 0d, -3d)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Anti-Burst Drip & Polite Hours Protection</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Click-to-Renew Razorpay & UPI links</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Up to 3 Staff & Admin Accounts</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSubscribe('growth')}
            disabled={processingPlan !== null || (currentSub?.plan === 'growth' && currentSub?.status === 'active')}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/25"
          >
            {processingPlan === 'growth' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : currentSub?.plan === 'growth' && currentSub?.status === 'active' ? (
              <span>Current Plan</span>
            ) : (
              <>
                <span>Upgrade to Growth</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* 3. Pro Enterprise Tier */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-6 hover:border-slate-300 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">All-Inclusive</span>
                <h3 className="text-xl font-black text-slate-900">Pro</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                👑
              </div>
            </div>

            <p className="text-xs text-slate-500 min-h-[32px]">
              Unlimited capacity with QR camera check-in, live occupancy meter, and multi-staff roles.
            </p>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-black text-slate-900">
                  ₹{billingCycle === 'yearly' ? '34,990' : '3,499'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  /{billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>
              {billingCycle === 'yearly' && (
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Equivalent to ₹2,915/month</p>
              )}
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 pt-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-900">Unlimited Active Members</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-purple-700">Reception QR Camera Check-in Scanner</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Live Studio Occupancy & Peak-Hours</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Both QR & Meta Cloud API Gateways</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlimited Staff & Receptionist Accounts</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Priority VIP Support & Onboarding</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSubscribe('pro')}
            disabled={processingPlan !== null || (currentSub?.plan === 'pro' && currentSub?.status === 'active')}
            className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            {processingPlan === 'pro' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : currentSub?.plan === 'pro' && currentSub?.status === 'active' ? (
              <span>Current Plan</span>
            ) : (
              <>
                <span>Upgrade to Pro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Invoices & Billing History Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Platform Billing Invoices & Receipts</span>
            </h3>
            <p className="text-xs text-slate-400">Download and view your past FitManage subscription invoices</p>
          </div>
        </div>

        {subData?.billingHistory && subData.billingHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-2.5">Invoice Ref</th>
                  <th className="pb-2.5">Plan</th>
                  <th className="pb-2.5">Billing Cycle</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Amount Paid</th>
                  <th className="pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subData.billingHistory.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50">
                    <td className="py-3 font-mono font-bold text-slate-900">{inv.transactionReference}</td>
                    <td className="py-3 font-semibold text-slate-700">{inv.planName}</td>
                    <td className="py-3 capitalize text-slate-600">{inv.billingCycle}</td>
                    <td className="py-3 text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 font-mono font-bold text-emerald-600">₹{inv.amount?.toLocaleString('en-IN')}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No paid subscription invoices yet. Your trial is active.
          </div>
        )}
      </div>
    </div>
  );
}
