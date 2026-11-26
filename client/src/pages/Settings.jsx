import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Dumbbell, MessageSquare, Plus, Trash2, CheckCircle2, Zap, QrCode, Smartphone, RefreshCw, Clock, Radio, Megaphone, Users, Activity, BarChart2, Calendar, AlertCircle, Send, Edit2, Cloud, ShieldCheck, Key, Globe, CreditCard, Link2, Eye, EyeOff, ExternalLink, Copy } from 'lucide-react';
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

  // WhatsApp QR Linking (Dedicated per Gym)
  const [qrData, setQrData] = useState({ status: 'disconnected', isConnected: false, qrCode: null, linkedPhone: null });
  const [qrRefreshing, setQrRefreshing] = useState(false);

  // Meta WhatsApp Cloud API State
  const [waProvider, setWaProvider] = useState('whatsapp_qr'); // 'whatsapp_qr' | 'meta'
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');
  const [testingMeta, setTestingMeta] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState(null);
  const [metaTestPhone, setMetaTestPhone] = useState('');

  // Online Payment Gateway & Self-Renewal State
  const [pgEnabled, setPgEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [hasRazorpaySecret, setHasRazorpaySecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('');
  const [allowPlanRenewal, setAllowPlanRenewal] = useState(true);
  const [allowCustomDues, setAllowCustomDues] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add plan modal
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDays, setNewPlanDays] = useState(30);
  const [newPlanPrice, setNewPlanPrice] = useState(2000);
  const [newPlanDesc, setNewPlanDesc] = useState('');

  // 1. WhatsApp Broadcast to Members State
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [broadcastMessage, setBroadcastMessage] = useState(
    '🏋️‍♂️ *Important Gym Announcement from {gymName}*\n\nHello *{name}*! We are excited to announce our upcoming special fitness workshop this weekend. Walk-in and join the team!\n\nBest regards,\n_{gymName} Team_'
  );
  const [broadcastRecipientsCount, setBroadcastRecipientsCount] = useState(0);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

  // 2. Member Portal Announcements State
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnTag, setNewAnnTag] = useState('Notice');
  const [newAnnDate, setNewAnnDate] = useState('Today');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [showAddAnn, setShowAddAnn] = useState(false);

  // 3. Studio Occupancy & Peak-Hours State
  const [maxCapacity, setMaxCapacity] = useState(50);
  const [currentMembers, setCurrentMembers] = useState(18);
  const [occupancySlots, setOccupancySlots] = useState([
    { id: 'slot_1', time: '6:00 AM - 8:00 AM', expectedMembers: 30 },
    { id: 'slot_2', time: '8:00 AM - 10:00 AM', expectedMembers: 45 },
    { id: 'slot_3', time: '11:00 AM - 4:00 PM', expectedMembers: 15 },
    { id: 'slot_4', time: '5:00 PM - 7:00 PM', expectedMembers: 48 },
    { id: 'slot_5', time: '7:00 PM - 10:00 PM', expectedMembers: 32 }
  ]);
  const [savingOccupancy, setSavingOccupancy] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('');
  const [newSlotMembers, setNewSlotMembers] = useState(25);
  const [showAddSlot, setShowAddSlot] = useState(false);

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
        setWaProvider(wa.provider || 'whatsapp_qr');
        setAutoWelcome(wa.autoWelcome !== false);
        const meta = wa.meta || {};
        setMetaPhoneId(meta.phoneNumberId || '');
        setMetaAccessToken(meta.accessToken || '');
        setMetaWabaId(meta.businessAccountId || '');

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

        // Announcements
        const existingAnns = res.gym.settings?.announcements;
        if (existingAnns && Array.isArray(existingAnns) && existingAnns.length > 0) {
          setAnnouncements(existingAnns);
        } else {
          setAnnouncements([
            {
              id: 'ann_1',
              title: '🏋️ Summer Strength & Conditioning Boot Camp',
              date: 'Starts Next Monday',
              content: 'Join our certified trainers for high-intensity morning sessions at 6:30 AM. Open to all active members!',
              tag: 'Camp'
            },
            {
              id: 'ann_2',
              title: '💪 New Equipment Zone Added',
              date: 'Updated This Week',
              content: 'Brand new Olympic bumper plates, calibrated barbells, and an isolated cable station are now live in the main weight room.',
              tag: 'Facility'
            },
            {
              id: 'ann_3',
              title: '🕒 Regular Studio Timings',
              date: 'Daily',
              content: 'Monday to Saturday: 6:00 AM – 10:00 PM | Sunday: 7:00 AM – 2:00 PM. Lockers and showers cleaned daily.',
              tag: 'Hours'
            }
          ]);
        }

        // Occupancy
        const occ = res.gym.settings?.occupancy || {};
        setMaxCapacity(Number(occ.maxCapacity) || 50);
        setCurrentMembers(Number(occ.currentMembers !== undefined ? occ.currentMembers : 18));
        if (occ.slots && Array.isArray(occ.slots) && occ.slots.length > 0) {
          setOccupancySlots(occ.slots);
        }
        // Payment Gateway
        const pg = res.gym.settings?.paymentGateway || {};
        setPgEnabled(pg.enabled !== false);
        setRazorpayEnabled(Boolean(pg.razorpayEnabled));
        setRazorpayKeyId(pg.razorpayKeyId || '');
        setRazorpayKeySecret(pg.razorpayKeySecret || '');
        setHasRazorpaySecret(Boolean(pg.hasRazorpaySecret));
        setUpiEnabled(pg.upiEnabled !== false);
        setUpiId(pg.upiId || '');
        setUpiName(pg.upiName || res.gym.gymName || '');
        setAllowPlanRenewal(pg.allowPlanRenewal !== false);
        setAllowCustomDues(pg.allowCustomDues !== false);
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
            provider: waProvider,
            autoWelcome,
            meta: {
              phoneNumberId: metaPhoneId.trim(),
              accessToken: metaAccessToken.trim(),
              businessAccountId: metaWabaId.trim()
            }
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
          },
          announcements,
          occupancy: {
            maxCapacity: Number(maxCapacity) || 50,
            currentMembers: Number(currentMembers) || 0,
            slots: occupancySlots
          },
          paymentGateway: {
            enabled: pgEnabled,
            razorpayEnabled,
            razorpayKeyId: razorpayKeyId.trim(),
            razorpayKeySecret: razorpayKeySecret.trim(),
            upiEnabled,
            upiId: upiId.trim(),
            upiName: upiName.trim(),
            allowPlanRenewal,
            allowCustomDues
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

  const handleTestMeta = async () => {
    if (!metaPhoneId.trim() || !metaAccessToken.trim()) {
      alert('Please enter both Meta Phone Number ID and Access Token in the fields below.');
      return;
    }
    const target = metaTestPhone.trim() || testPhone.trim();
    if (!target) {
      alert('Please enter a recipient 10-digit mobile number for testing.');
      return;
    }
    setTestingMeta(true);
    setMetaTestResult(null);
    try {
      const res = await api.testMetaCloudAPI({
        phoneNumberId: metaPhoneId.trim(),
        accessToken: metaAccessToken.trim(),
        testPhone: target
      });
      setMetaTestResult({
        success: true,
        message: 'Meta Cloud API verified successfully! Test message delivered.',
        details: res.result?.details || `Dispatched via Meta Graph API to +91 ${target}`
      });
    } catch (err) {
      setMetaTestResult({
        success: false,
        message: err.message || 'Meta API verification failed.'
      });
    } finally {
      setTestingMeta(false);
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

  // Fetch broadcast recipient count when target changes
  const fetchBroadcastPreview = async (target) => {
    try {
      const res = await api.getBroadcastPreview(target);
      setBroadcastRecipientsCount(res.count || 0);
    } catch (e) {
      console.warn('Broadcast preview error:', e);
    }
  };

  useEffect(() => {
    fetchBroadcastPreview(broadcastTarget);
  }, [broadcastTarget]);

  // Dispatch broadcast to members
  const handleSendBroadcast = async () => {
    if (waProvider === 'whatsapp_qr' && !qrData.isConnected) {
      alert('Please connect your gym WhatsApp number first by scanning the QR code above.');
      return;
    }
    if (waProvider === 'meta' && (!metaPhoneId.trim() || !metaAccessToken.trim())) {
      alert('Please configure your Meta WhatsApp Phone Number ID and Access Token in the settings above first.');
      return;
    }
    if (!broadcastMessage.trim()) {
      alert('Please enter a message to broadcast.');
      return;
    }
    if (!confirm(`Are you sure you want to broadcast this message to ${broadcastRecipientsCount} members via WhatsApp?`)) {
      return;
    }

    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await api.broadcastWhatsApp({
        target: broadcastTarget,
        message: broadcastMessage
      });
      setBroadcastResult(res);
      alert(res.message);
    } catch (err) {
      alert(err.message || 'Broadcast failed.');
    } finally {
      setBroadcasting(false);
    }
  };

  // Announcements Handlers
  const handleAddAnnouncement = (e) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) {
      alert('Please provide announcement title and content.');
      return;
    }
    const newEntry = {
      id: 'ann_' + Date.now(),
      title: newAnnTitle.trim(),
      tag: newAnnTag.trim() || 'Notice',
      date: newAnnDate.trim() || 'Today',
      content: newAnnContent.trim()
    };
    setAnnouncements([newEntry, ...announcements]);
    setNewAnnTitle('');
    setNewAnnContent('');
    setShowAddAnn(false);
  };

  const handleDeleteAnnouncement = (id) => {
    if (confirm('Delete this announcement? It will be removed from the Member Portal.')) {
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  // Occupancy Steppers & Slot Handlers
  const handleQuickOccupancyStep = async (delta) => {
    const updated = Math.max(0, currentMembers + delta);
    setCurrentMembers(updated);
    try {
      await api.updateOccupancy({
        maxCapacity,
        currentMembers: updated,
        slots: occupancySlots
      });
    } catch (e) {
      console.warn('Quick occupancy step error:', e);
    }
  };

  const handleSaveOccupancyConfig = async () => {
    setSavingOccupancy(true);
    try {
      await api.updateOccupancy({
        maxCapacity: Number(maxCapacity) || 50,
        currentMembers: Number(currentMembers) || 0,
        slots: occupancySlots
      });
      alert('Studio occupancy configuration saved! It is now live on the Member Portal (/portal).');
    } catch (err) {
      alert(err.message || 'Failed to save occupancy: ' + err.message);
    } finally {
      setSavingOccupancy(false);
    }
  };

  const handleAddOccupancySlot = (e) => {
    e.preventDefault();
    if (!newSlotTime.trim()) {
      alert('Please enter a time slot (e.g. 6:00 AM - 8:00 AM)');
      return;
    }
    const newSlot = {
      id: 'slot_' + Date.now(),
      time: newSlotTime.trim(),
      expectedMembers: Number(newSlotMembers) || 20
    };
    setOccupancySlots([...occupancySlots, newSlot]);
    setNewSlotTime('');
    setNewSlotMembers(25);
    setShowAddSlot(false);
  };

  const handleDeleteOccupancySlot = (id) => {
    setOccupancySlots(occupancySlots.filter(s => s.id !== id));
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

        {/* 3. Automated WhatsApp Delivery Gateway */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Automated WhatsApp Gateway</span>
                </h2>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  <span>Dedicated Session: <strong>{gymName || 'Current Gym'}</strong></span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Each gym maintains an isolated, dedicated WhatsApp session. Choose between Direct Phone Pairing or Meta Cloud API.
              </p>
            </div>

            <div className="self-start sm:self-auto flex items-center space-x-2">
              {waProvider === 'whatsapp_qr' ? (
                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  qrData.isConnected 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${qrData.isConnected ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                  <span>{qrData.isConnected ? `Connected (+${qrData.linkedPhone})` : 'Waiting for QR Scan'}</span>
                </span>
              ) : (
                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  metaPhoneId && metaAccessToken
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  <Cloud className="w-3.5 h-3.5 text-blue-600" />
                  <span>{metaPhoneId && metaAccessToken ? 'Meta API Configured' : 'Credentials Needed'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Provider Selection Tabs */}
          <div>
            <label className="block font-semibold text-slate-700 text-xs mb-2">Select WhatsApp Dispatch Gateway Provider</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Option 1: Direct WhatsApp Web QR */}
              <button
                type="button"
                onClick={() => setWaProvider('whatsapp_qr')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  waProvider === 'whatsapp_qr'
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-lg ${waProvider === 'whatsapp_qr' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Direct WhatsApp (Scan QR)</div>
                      <div className="text-[11px] text-slate-500">Free • Dedicated Phone Link • Zero API Costs</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    qrData.isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {qrData.isConnected ? '● Connected' : '○ Disconnected'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
                  Pairs directly with your gym's physical mobile phone using WhatsApp Linked Devices. Automated messages are delivered from your actual gym phone number.
                </p>
              </button>

              {/* Option 2: Meta WhatsApp Cloud API */}
              <button
                type="button"
                onClick={() => setWaProvider('meta')}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  waProvider === 'meta'
                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-lg ${waProvider === 'meta' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Meta WhatsApp Cloud API</div>
                      <div className="text-[11px] text-slate-500">Official Platform • High Speed • High Reliability</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    metaPhoneId && metaAccessToken ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {metaPhoneId && metaAccessToken ? '● Configured' : '○ Setup Needed'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
                  Dispatches via Meta's official Graph API (v21.0). Requires a Meta Developer WhatsApp Business Account. Meta provides 1,000 free conversations every month.
                </p>
              </button>
            </div>
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
                  When enabled, FitManage automatically delivers the welcome WhatsApp message using your selected gateway the instant a member is registered.
                </span>
              </label>
            </div>

            {/* View 1: Direct WhatsApp Web QR Panel */}
            {waProvider === 'whatsapp_qr' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Direct Phone WhatsApp Link (Multi-Device)</h4>
                      <p className="text-[11px] text-slate-500">Dedicated phone session for <strong>{gymName || 'this gym'}</strong>. Sends notes & expiry reminders straight from your gym's real phone.</p>
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
                          <span>Generating Dedicated QR Code...</span>
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
                          <span>Open <strong>WhatsApp</strong> on your gym's phone.</span>
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

                {/* Test WhatsApp Gateway Dispatch */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                  <span className="font-bold text-slate-800 text-xs block">
                    🧪 Verify & Test Direct WhatsApp Dispatch
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
            )}

            {/* View 2: Meta WhatsApp Cloud API Panel */}
            {waProvider === 'meta' && (
              <div className="p-5 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                  <div className="flex items-center space-x-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Meta WhatsApp Cloud API Configuration</h4>
                      <p className="text-[11px] text-slate-500">Official WhatsApp Business Platform via Meta Graph API (v21.0).</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    metaPhoneId && metaAccessToken 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {metaPhoneId && metaAccessToken ? '● Credentials Configured' : '○ Setup Required'}
                  </span>
                </div>

                {/* API Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                      <span>Phone Number ID</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 104859201948271"
                      value={metaPhoneId}
                      onChange={(e) => setMetaPhoneId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Found in Meta Developers → WhatsApp → API Setup → Phone number ID.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                      <span>Business Account ID (WABA ID)</span>
                      <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 102948201948290"
                      value={metaWabaId}
                      onChange={(e) => setMetaWabaId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Found in Meta Developers → WhatsApp → API Setup → WhatsApp Business Account ID.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                      <span>Permanent System User Access Token</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="EAAG..."
                      value={metaAccessToken}
                      onChange={(e) => setMetaAccessToken(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Generate in Meta Business Suite → System Users with <code className="bg-slate-100 px-1 rounded">whatsapp_business_messaging</code> &amp; <code className="bg-slate-100 px-1 rounded">whatsapp_business_management</code> permissions.
                    </p>
                  </div>
                </div>

                {/* Helpful Guide Card */}
                <div className="p-3.5 rounded-xl bg-blue-100/50 border border-blue-200 text-blue-900 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <Globe className="w-4 h-4 text-blue-700" />
                    <span>How Meta WhatsApp Cloud API Works</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Meta Cloud API sends messages straight through Facebook's global infrastructure. Meta provides <strong>1,000 free service conversations each month</strong>.
                    You do not need to keep any phone connected or online once configured.
                  </p>
                </div>

                {/* Test Meta Cloud API Gateway */}
                <div className="p-4 rounded-xl bg-white border border-blue-200 space-y-3">
                  <span className="font-bold text-slate-800 text-xs block">
                    🧪 Verify & Test Meta Cloud API Dispatch
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Send a test WhatsApp message to verify that your Meta Access Token and Phone Number ID are valid and authorized.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="tel"
                      placeholder="Recipient 10-digit mobile number"
                      value={metaTestPhone || testPhone}
                      onChange={(e) => {
                        setMetaTestPhone(e.target.value);
                        setTestPhone(e.target.value);
                      }}
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleTestMeta}
                      disabled={testingMeta || !metaPhoneId.trim() || !metaAccessToken.trim()}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                    >
                      {testingMeta ? 'Verifying with Meta...' : 'Send Meta Test Ping'}
                    </button>
                  </div>

                  {metaTestResult && (
                    <div className={`p-3 rounded-xl text-xs font-semibold ${
                      metaTestResult.success ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      <p>{metaTestResult.message}</p>
                      {metaTestResult.details && <p className="text-[10px] font-normal mt-0.5 opacity-80">{metaTestResult.details}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
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
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Anti-Burst Drip Engine Active (3–5s human delay)</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span>Polite Hours: 9:00 AM – 8:00 PM IST</span>
                </span>
              </div>
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

        {/* 5. Online Payment Gateway & Click-to-Renew Links */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Online Payment Gateway & Click-to-Renew Links</span>
              </h2>
              <p className="text-xs text-slate-400">
                Allow members to renew their membership or settle dues online via Razorpay or direct UPI links.
              </p>
            </div>
            <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
              <input
                type="checkbox"
                checked={pgEnabled}
                onChange={(e) => setPgEnabled(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span className="text-xs font-bold text-slate-800">Enable Online Renewals</span>
            </label>
          </div>

          {pgEnabled && (
            <div className="space-y-6 text-xs">
              {/* Feature checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPlanRenewal}
                    onChange={(e) => setAllowPlanRenewal(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-700">Allow Members to Pick Renewal Plans</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCustomDues}
                    onChange={(e) => setAllowCustomDues(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-700">Allow Members to Clear Outstanding Dues</span>
                </label>
              </div>

              {/* Two Gateway Options: Razorpay vs Direct UPI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Razorpay Gateway */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs">
                          ⚡
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Razorpay Payment Gateway</p>
                          <p className="text-[10px] text-slate-400">Cards, Netbanking, UPI, Wallets</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={razorpayEnabled}
                        onChange={(e) => setRazorpayEnabled(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                    </div>

                    {razorpayEnabled && (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Razorpay Key ID
                          </label>
                          <input
                            type="text"
                            placeholder="rzp_live_... or rzp_test_..."
                            value={razorpayKeyId}
                            onChange={(e) => setRazorpayKeyId(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block font-semibold text-slate-700">
                              Razorpay Key Secret
                            </label>
                            {hasRazorpaySecret && (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Key Saved</span>
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type={showSecret ? "text" : "password"}
                              placeholder={hasRazorpaySecret ? "••••••••••••••••" : "Paste secret key here"}
                              value={razorpayKeySecret}
                              onChange={(e) => setRazorpayKeySecret(e.target.value)}
                              className="w-full p-2.5 pr-9 rounded-xl border border-slate-200 font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecret(!showSecret)}
                              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            FitManage uses cryptographic 256-bit HMAC signatures to automatically renew memberships upon payment.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100">
                    <span>Zero manual intervention</span>
                    <a 
                      href="https://dashboard.razorpay.com/app/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center space-x-0.5"
                    >
                      <span>Razorpay Keys</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* 2. Direct Instant UPI */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-xs">
                          📱
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Direct Instant UPI</p>
                          <p className="text-[10px] text-slate-400">GPay, PhonePe, Paytm, BHIM</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={upiEnabled}
                        onChange={(e) => setUpiEnabled(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                    </div>

                    {upiEnabled && (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Gym UPI ID / VPA
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. gymname@okaxis or 9876543210@paytm"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            UPI Payee Name (Displayed in UPI App)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Fitness Hub Studio"
                            value={upiName}
                            onChange={(e) => setUpiName(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Members clicking the renewal link on their phone can tap "Open UPI App" or scan the QR code to pay instantly.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100">
                    <span>Direct settlement to bank</span>
                    <span className="font-mono text-emerald-600 font-semibold">0% Platform Fee</span>
                  </div>
                </div>
              </div>

              {/* Public Renewal Link Preview */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950 flex items-center space-x-1.5">
                    <Link2 className="w-4 h-4 text-emerald-700" />
                    <span>Self-Service Member Renewal URL Format</span>
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Use placeholder <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-emerald-900">{'{renewalLink}'}</code> in WhatsApp reminders.
                  </p>
                  <p className="font-mono text-[11px] text-slate-600 bg-white/90 p-1.5 rounded-lg border border-emerald-100 break-all select-all">
                    {window.location.origin}/pay/FIT-1001
                  </p>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/pay/FIT-1001`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center space-x-1 border border-slate-200 shadow-sm"
                  >
                    {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Sample'}</span>
                  </button>
                  <a
                    href="/pay/FIT-1001"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 shadow-sm"
                  >
                    <span>Test Checkout</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. WhatsApp Message Templates */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Message Templates</span>
            </h2>
            <p className="text-xs text-slate-400">
              Customize dynamic messages. Placeholders supported: <code>{'{customerName}'}</code>, <code>{'{gymName}'}</code>, <code>{'{planName}'}</code>, <code>{'{expiryDate}'}</code>, <code>{'{daysRemaining}'}</code>, <code>{'{renewalLink}'}</code>.
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

        {/* 6. WhatsApp Member Broadcast Engine */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-600" />
                <span>Direct WhatsApp Broadcast to Members</span>
              </h2>
              <p className="text-xs text-slate-400">
                Instantly dispatch a customized announcement, holiday notice, or offer directly to your members' WhatsApp.
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{broadcastRecipientsCount} Members Targeted</span>
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Target Audience Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Select Target Audience</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'All Registered Members', desc: 'Active, expiring, and expired list' },
                  { id: 'active', label: 'Active Members Only', desc: 'Currently valid & expiring soon' },
                  { id: 'expired', label: 'Expired Members Only', desc: 'Comeback / win-back list' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBroadcastTarget(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      broadcastTarget === opt.id
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-400/50'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700">Broadcast Message Content</label>
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  <span className="text-slate-400">Insert tag:</span>
                  {['{name}', '{gymName}', '{daysRemaining}', '{planName}'].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setBroadcastMessage(prev => prev + ' ' + ph)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono"
                    >
                      {ph}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={5}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type your WhatsApp broadcast message..."
                className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs leading-relaxed"
              />
            </div>

            {/* Broadcast Results Alert */}
            {broadcastResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-1 ${
                broadcastResult.failed === 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{broadcastResult.message}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Total Recipients: {broadcastResult.total} • Successfully Dispatched: {broadcastResult.dispatched} • Failed: {broadcastResult.failed}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400">
                Dispatches sequentially via {waProvider === 'meta' ? 'Meta WhatsApp Cloud API' : 'linked WhatsApp'} with polite pauses to ensure 100% delivery.
              </p>
              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={
                  broadcasting || 
                  broadcastRecipientsCount === 0 || 
                  (waProvider === 'whatsapp_qr' ? !qrData.isConnected : (!metaPhoneId.trim() || !metaAccessToken.trim()))
                }
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{broadcasting ? 'Dispatching to Members...' : `Dispatch Broadcast (${broadcastRecipientsCount})`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 7. Member Portal Announcements Manager */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-emerald-600" />
                <span>Member Portal Announcements & Notices</span>
              </h2>
              <p className="text-xs text-slate-400">
                Post notices, bootcamp events, holiday schedules, and news visible live on the Member Portal (<code>/portal</code>).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddAnn(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1 shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Notice</span>
            </button>
          </div>

          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No active announcements. Click "+ Add Notice" to create one.</p>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 flex items-start justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{ann.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        {ann.tag || 'Notice'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {ann.date}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">{ann.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Delete notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 8. Studio Occupancy & Peak-Hours Customization */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Studio Occupancy & Peak-Hour Time Slots</span>
              </h2>
              <p className="text-xs text-slate-400">
                Set total gym capacity, track live on-floor members, and customize peak hours shown on <code>/portal</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveOccupancyConfig}
              disabled={savingOccupancy}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm self-start sm:self-auto"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{savingOccupancy ? 'Saving...' : 'Save Occupancy'}</span>
            </button>
          </div>

          {/* Live Floor Occupancy Stepper */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 text-xs block">Live Gym Floor Occupancy</span>
                <span className="text-[11px] text-slate-500">
                  Quickly tap + / - at the front desk when members enter or leave.
                </span>
              </div>

              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-slate-700">
                  {currentMembers} / {maxCapacity} Members
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  Math.round((currentMembers / (maxCapacity || 50)) * 100) >= 75
                    ? 'bg-rose-100 text-rose-800'
                    : Math.round((currentMembers / (maxCapacity || 50)) * 100) >= 40
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {Math.round((currentMembers / (maxCapacity || 50)) * 100)}% Filled • {
                    Math.round((currentMembers / (maxCapacity || 50)) * 100) >= 75
                      ? 'Peak Hours'
                      : Math.round((currentMembers / (maxCapacity || 50)) * 100) >= 40
                      ? 'Moderate'
                      : 'Quiet & Open'
                  }
                </span>
              </div>
            </div>

            {/* Stepper Buttons & Max Capacity Input */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold text-slate-600 mr-1">Floor Count:</span>
                <button
                  type="button"
                  onClick={() => handleQuickOccupancyStep(-5)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-mono font-bold text-xs"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickOccupancyStep(-1)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-mono font-bold text-xs"
                >
                  -1
                </button>
                <input
                  type="number"
                  min="0"
                  value={currentMembers}
                  onChange={(e) => setCurrentMembers(Math.max(0, Number(e.target.value)))}
                  className="w-16 p-1 text-center rounded-lg border border-slate-300 font-mono font-bold text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleQuickOccupancyStep(1)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-mono font-bold text-xs"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickOccupancyStep(5)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-mono font-bold text-xs"
                >
                  +5
                </button>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="font-semibold text-slate-600">Total Gym Max Capacity:</span>
                <input
                  type="number"
                  min="5"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(Math.max(1, Number(e.target.value)))}
                  className="w-20 p-1 text-center rounded-lg border border-slate-300 font-mono font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Peak Hours Slot Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-xs block">Configured Time Windows & Expected Members</span>
                <span className="text-[11px] text-slate-500">
                  Status automatically calculates based on total gym capacity ({maxCapacity} members).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSlot(true)}
                className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center space-x-1 border border-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Time Slot</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {occupancySlots.map((slot) => {
                const fill = Math.min(100, Math.round(((Number(slot.expectedMembers) || 0) / (maxCapacity || 50)) * 100));
                const status = fill >= 75 ? 'Peak Hours' : fill >= 40 ? 'Moderate' : 'Quiet & Open';
                const color = fill >= 75 ? 'rose' : fill >= 40 ? 'amber' : 'emerald';
                return (
                  <div key={slot.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-900">{slot.time}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          color === 'rose' ? 'bg-rose-100 text-rose-800' : color === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {status} ({fill}%)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 pl-5">
                        Expected: <strong className="font-mono text-slate-700">{slot.expectedMembers}</strong> members
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteOccupancySlot(slot.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
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

      {/* Add Announcement Modal */}
      {showAddAnn && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddAnn(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <Megaphone className="w-4 h-4 text-emerald-600" />
              <span>Add Member Portal Announcement</span>
            </h3>
            <form onSubmit={handleAddAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Headline / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🏋️ Summer Transformation Camp"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tag / Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Event, Facility, Holiday"
                    value={newAnnTag}
                    onChange={(e) => setNewAnnTag(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date / Badge</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. This Weekend, Dec 1"
                    value={newAnnDate}
                    onChange={(e) => setNewAnnDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the announcement or notice..."
                  value={newAnnContent}
                  onChange={(e) => setNewAnnContent(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddAnn(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Post Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Occupancy Slot Modal */}
      {showAddSlot && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddSlot(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Add Operating Time Slot</span>
            </h3>
            <form onSubmit={handleAddOccupancySlot} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Time Window</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 6:00 AM - 8:00 AM"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expected / Peak Members</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newSlotMembers}
                  onChange={(e) => setNewSlotMembers(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Based on your max gym capacity ({maxCapacity}), this slot will calculate as {
                    Math.round((newSlotMembers / (maxCapacity || 50)) * 100)
                  }% filled.
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSlot(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Add Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
