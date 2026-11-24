import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Dumbbell, MessageSquare, Plus, Trash2, CheckCircle2, Zap, QrCode, Smartphone, RefreshCw, Clock } from 'lucide-react';
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
  const [welcomeTemplate, setWelcomeTemplate] = useState('');

  // Automated WhatsApp Gateway state (Direct Scan QR WhatsApp)
  const [autoWelcome, setAutoWelcome] = useState(true);

  // Multi-Stage Automated Expiry Follow-ups state
  const [multiStageEnabled, setMultiStageEnabled] = useState(true);
  const [stage7dEnabled, setStage7dEnabled] = useState(true);
  const [stage7dTemplate, setStage7dTemplate] = useState('');
  const [stage1dEnabled, setStage1dEnabled] = useState(true);
  const [stage1dTemplate, setStage1dTemplate] = useState('');
  const [stage0dEnabled, setStage0dEnabled] = useState(true);
  const [stage0dTemplate, setStage0dTemplate] = useState('');
  const [stage3dEnabled, setStage3dEnabled] = useState(true);
  const [stage3dTemplate, setStage3dTemplate] = useState('');
  const [triggeringScan, setTriggeringScan] = useState(false);

  // Test WhatsApp
  const [testPhone, setTestPhone] = useState('');
  const [testingGateway, setTestingGateway] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // WhatsApp QR Linking (Option 3)
  const [qrData, setQrData] = useState({ status: 'disconnected', isConnected: false, qrCode: null, linkedPhone: null });
  const [qrRefreshing, setQrRefreshing] = useState(false);

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
        setWelcomeTemplate(templates.welcome || '');

        const wa = res.gym.settings?.whatsapp || {};
        setAutoWelcome(wa.autoWelcome !== false);

        const mse = res.gym.settings?.multiStageExpiry || {};
        setMultiStageEnabled(mse.enabled !== false);
        const stages = mse.stages || {};
        setStage7dEnabled(stages.stage_7days?.enabled !== false);
        setStage7dTemplate(stages.stage_7days?.template || '');
        setStage1dEnabled(stages.stage_1day?.enabled !== false);
        setStage1dTemplate(stages.stage_1day?.template || '');
        setStage0dEnabled(stages.stage_expiry_day?.enabled !== false);
        setStage0dTemplate(stages.stage_expiry_day?.template || '');
        setStage3dEnabled(stages.stage_3days_after?.enabled !== false);
        setStage3dTemplate(stages.stage_3days_after?.template || '');

        if (res.gym.phone) {
          setTestPhone(res.gym.phone.replace(/\D/g, '').slice(-10));
        }
      }
      setPlans(res.plans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQRStatus = async () => {
    try {
      const data = await api.getWhatsAppQR();
      setQrData(data);
    } catch (e) {
      console.warn('QR poll error:', e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchQRStatus();
    const interval = setInterval(fetchQRStatus, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshQR = async () => {
    setQrRefreshing(true);
    try {
      const data = await api.reconnectWhatsAppQR();
      setQrData(data);
    } catch (e) {
      alert('Failed to refresh QR code.');
    } finally {
      setQrRefreshing(false);
    }
  };

  const handleDisconnectQR = async () => {
    if (!confirm('Are you sure you want to disconnect your linked gym WhatsApp device?')) return;
    try {
      await api.disconnectWhatsAppQR();
      fetchQRStatus();
    } catch (e) {
      alert('Failed to disconnect device.');
    }
  };

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
          whatsapp: {
            provider: 'whatsapp_qr',
            autoWelcome
          },
          whatsappTemplates: {
            expiringSoon: expiringTemplate,
            expired: expiredTemplate,
            welcome: welcomeTemplate
          },
          multiStageExpiry: {
            enabled: multiStageEnabled,
            stages: {
              stage_7days: {
                enabled: stage7dEnabled,
                days: 7,
                template: stage7dTemplate
              },
              stage_1day: {
                enabled: stage1dEnabled,
                days: 1,
                template: stage1dTemplate
              },
              stage_expiry_day: {
                enabled: stage0dEnabled,
                days: 0,
                template: stage0dTemplate
              },
              stage_3days_after: {
                enabled: stage3dEnabled,
                days: -3,
                template: stage3dTemplate
              }
            }
          }
        }
      });
      updateGym(res.gym);
      setSuccessMessage('Gym profile, automated WhatsApp gateway & templates saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!testPhone.trim()) {
      alert('Please enter a 10-digit mobile number for test dispatch.');
      return;
    }
    setTestingGateway(true);
    setTestResult(null);
    try {
      const res = await api.testWhatsAppGateway({ testPhone });
      setTestResult({
        success: true,
        message: res.message,
        details: res.result?.deliveryDetails || 'Dispatched successfully'
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to send test WhatsApp message.'
      });
    } finally {
      setTestingGateway(false);
    }
  };

  const handleManualMultiStageScan = async () => {
    setTriggeringScan(true);
    try {
      const res = await api.scanMultiStageExpiry();
      const count = res.result?.dispatchedCount || 0;
      alert(`Automated Multi-Stage Scan Complete!\n\n${count} reminder message(s) dispatched directly via WhatsApp.`);
    } catch (err) {
      alert(err.message || 'Failed to trigger scan.');
    } finally {
      setTriggeringScan(false);
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

        {/* 3. Direct WhatsApp Link via QR Code */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Direct WhatsApp (Scan QR Code)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Link your gym's WhatsApp phone to send welcome notes & reminders automatically from your number.
              </p>
            </div>
            <span className={`self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              qrData.isConnected 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${qrData.isConnected ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              <span>{qrData.isConnected ? `Connected (+${qrData.linkedPhone})` : 'Waiting for QR Scan'}</span>
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Auto-welcome toggle */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start space-x-3">
              <input
                type="checkbox"
                id="autoWelcomeToggle"
                checked={autoWelcome}
                onChange={(e) => setAutoWelcome(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="autoWelcomeToggle" className="cursor-pointer space-y-0.5">
                <span className="font-bold text-emerald-950 block">
                  Auto-send Welcome Message on Customer Registration
                </span>
                <span className="text-[11px] text-emerald-800 block">
                  When enabled, FitManage automatically delivers the welcome WhatsApp message directly from your linked phone the instant a member is registered.
                </span>
              </label>
            </div>

            {/* Direct Phone WhatsApp Link (Multi-Device) */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Direct Phone WhatsApp Link (Multi-Device)</h4>
                    <p className="text-[11px] text-slate-500">Sends automatic welcome notes and expiry reminders straight from your gym's real phone.</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  qrData.isConnected 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {qrData.isConnected ? '● Connected & Ready' : 'Waiting for QR Scan'}
                </span>
              </div>

              {qrData.isConnected ? (
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-emerald-950 text-sm">Device Paired Successfully</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectQR}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors border border-rose-200"
                    >
                      Disconnect Device
                    </button>
                  </div>
                  <p className="text-xs text-slate-700">
                    Linked Number: <strong className="font-mono text-emerald-800 text-sm">+{qrData.linkedPhone}</strong>
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    🎉 Your WhatsApp is active! As soon as any customer registers, FitManage will automatically deliver the welcome message from your gym's number.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                  {/* QR Display */}
                  <div className="flex flex-col items-center space-y-2">
                    {qrData.qrCode ? (
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md">
                        <img src={qrData.qrCode} alt="WhatsApp QR Code" className="w-48 h-48 rounded-lg" />
                      </div>
                    ) : (
                      <div className="w-48 h-48 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs shadow-sm p-4 text-center">
                        <RefreshCw className="w-6 h-6 animate-spin mb-2 text-emerald-500" />
                        <span>Generating QR Code...</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleRefreshQR}
                      disabled={qrRefreshing}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${qrRefreshing ? 'animate-spin' : ''}`} />
                      <span>{qrRefreshing ? 'Refreshing...' : 'Refresh QR Code'}</span>
                    </button>
                  </div>

                  {/* Step-by-step pairing instructions */}
                  <div className="text-xs space-y-2.5 max-w-sm text-left">
                    <p className="font-bold text-slate-900 text-xs uppercase tracking-wider text-emerald-700">
                      How to Link in 3 Steps:
                    </p>
                    <div className="space-y-2 text-slate-700">
                      <div className="flex items-start space-x-2 bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="font-bold text-slate-900 font-mono">1.</span>
                        <span>Open <strong>WhatsApp</strong> on your phone.</span>
                      </div>
                      <div className="flex items-start space-x-2 bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="font-bold text-slate-900 font-mono">2.</span>
                        <span>Tap <strong>Settings (or ⋮ 3 dots) → Linked Devices</strong>.</span>
                      </div>
                      <div className="flex items-start space-x-2 bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="font-bold text-slate-900 font-mono">3.</span>
                        <span>Tap <strong>Link a Device</strong> and point your camera at this QR code.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Test WhatsApp Gateway Dispatch */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
              <span className="font-bold text-slate-800 text-xs block">
                🧪 Verify & Test WhatsApp Dispatch
              </span>
              <p className="text-[11px] text-slate-500">
                Send a real test message to verify delivery through your linked WhatsApp phone.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="tel"
                  placeholder="Recipient 10-digit mobile number"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  disabled={testingGateway}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  {testingGateway ? 'Sending Test...' : 'Send Test WhatsApp'}
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  testResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  <p>{testResult.message}</p>
                  {testResult.details && <p className="text-[10px] font-normal mt-0.5 opacity-80">{testResult.details}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Automated Multi-Stage Expiry Follow-ups */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Automated Multi-Stage Expiry Follow-ups</span>
              </h2>
              <p className="text-xs text-slate-400">
                Automatically scan & dispatch renewal follow-ups via WhatsApp across 4 critical conversion windows.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleManualMultiStageScan}
                disabled={triggeringScan}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${triggeringScan ? 'animate-spin' : ''}`} />
                <span>{triggeringScan ? 'Scanning...' : 'Test Scan Now'}</span>
              </button>
              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                multiStageEnabled 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${multiStageEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>{multiStageEnabled ? 'Automation Active' : 'Disabled'}</span>
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Master toggle */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start space-x-3">
              <input
                type="checkbox"
                id="multiStageMasterToggle"
                checked={multiStageEnabled}
                onChange={(e) => setMultiStageEnabled(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="multiStageMasterToggle" className="cursor-pointer space-y-0.5">
                <span className="font-bold text-emerald-950 block">
                  Enable Automated Multi-Stage Background Reminders
                </span>
                <span className="text-[11px] text-emerald-800 block">
                  When enabled, FitManage checks your members daily and automatically sends the configured stage message directly from your linked WhatsApp phone without duplicate messaging.
                </span>
              </label>
            </div>

            {/* 4 Stages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Stage 1: 7 Days Before */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="stage7dToggle"
                      checked={stage7dEnabled}
                      onChange={(e) => setStage7dEnabled(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="stage7dToggle" className="font-bold text-slate-900 cursor-pointer">
                      Stage 1: 7 Days Before Expiry
                    </label>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Gentle Heads Up
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Leave empty for default message or customize..."
                  value={stage7dTemplate}
                  onChange={(e) => setStage7dTemplate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs"
                />
              </div>

              {/* Stage 2: 1 Day Before */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="stage1dToggle"
                      checked={stage1dEnabled}
                      onChange={(e) => setStage1dEnabled(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="stage1dToggle" className="font-bold text-slate-900 cursor-pointer">
                      Stage 2: 1 Day Before Expiry
                    </label>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Renewal Offer
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Leave empty for default message or customize..."
                  value={stage1dTemplate}
                  onChange={(e) => setStage1dTemplate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs"
                />
              </div>

              {/* Stage 3: On Expiry Day */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="stage0dToggle"
                      checked={stage0dEnabled}
                      onChange={(e) => setStage0dEnabled(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="stage0dToggle" className="font-bold text-slate-900 cursor-pointer">
                      Stage 3: On Expiry Day
                    </label>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    Action Required
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Leave empty for default message or customize..."
                  value={stage0dTemplate}
                  onChange={(e) => setStage0dTemplate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs"
                />
              </div>

              {/* Stage 4: 3 Days After Expiry */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="stage3dToggle"
                      checked={stage3dEnabled}
                      onChange={(e) => setStage3dEnabled(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="stage3dToggle" className="font-bold text-slate-900 cursor-pointer">
                      Stage 4: 3 Days After Expiry
                    </label>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Comeback Discount
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Leave empty for default message or customize..."
                  value={stage3dTemplate}
                  onChange={(e) => setStage3dTemplate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. WhatsApp Message Templates */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Message Templates</span>
            </h2>
            <p className="text-xs text-slate-400">
              Customize dynamic messages. Placeholders supported: <code>{'{customerName}'}</code>, <code>{'{gymName}'}</code>, <code>{'{planName}'}</code>, <code>{'{expiryDate}'}</code>, <code>{'{daysRemaining}'}</code>.
            </p>
          </div>

          <div className="space-y-4 text-xs">
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
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/25"
            >
              {savingProfile ? 'Saving...' : 'Save Settings & Gateway'}
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
