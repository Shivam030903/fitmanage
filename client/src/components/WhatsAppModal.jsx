import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare, Phone, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function WhatsAppModal({ isOpen, onClose, customer, initialTemplate = 'expiringSoon' }) {
  const { gym } = useAuth();
  const [templateType, setTemplateType] = useState(initialTemplate);
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [qrStatus, setQrStatus] = useState({ isConnected: false, linkedPhone: null, loading: true });

  useEffect(() => {
    if (initialTemplate) {
      setTemplateType(initialTemplate);
    }
  }, [initialTemplate]);

  // Fetch live WhatsApp connection state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      setSending(false);
      api.getWhatsAppQR()
        .then((res) => {
          if (res) {
            setQrStatus({
              isConnected: Boolean(res.isConnected),
              linkedPhone: res.linkedPhone || null,
              loading: false
            });
          }
        })
        .catch(() => {
          setQrStatus({ isConnected: false, linkedPhone: null, loading: false });
        });
    }
  }, [isOpen]);

  if (!isOpen || !customer) return null;

  const contacts = customer.contacts || {};
  const primaryNumber = contacts.primary || '';
  const targetPhone = primaryNumber;

  // Active Gateway Status (QR vs Meta)
  const waConfig = gym?.settings?.whatsapp || {};
  const isMeta = waConfig.provider === 'meta';
  const isMetaReady = isMeta && Boolean(waConfig.meta?.phoneNumberId && waConfig.meta?.accessToken);
  const isGatewayReady = isMeta ? isMetaReady : qrStatus.isConnected;

  // Compute template variables
  const customerName = customer.name || 'Valued Member';
  const gymName = gym?.gymName || 'FitZone Pro Club';
  const planName = customer.currentMembership?.planName || 'Gym Membership';
  const expiryDate = customer.currentMembership?.endDate 
    ? new Date(customer.currentMembership.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Upcoming';
  const daysRemaining = customer.daysRemaining !== undefined ? customer.daysRemaining : 0;

  // Custom gym template hydration
  const customTemplates = gym?.settings?.whatsappTemplates || {};
  const hydrate = (tpl, defaultFallback) => {
    const raw = (tpl && tpl.trim()) ? tpl : defaultFallback;
    return raw
      .replace(/{customerName}/g, customerName)
      .replace(/{gymName}/g, gymName)
      .replace(/{planName}/g, planName)
      .replace(/{expiryDate}/g, expiryDate)
      .replace(/{daysRemaining}/g, String(daysRemaining))
      .replace(/{customerId}/g, customer.customerId || '');
  };

  const defaultExpiringSoon = `Hello {customerName}! 👋\n\nYour gym membership at {gymName} is expiring on {expiryDate} ({daysRemaining} days left).\n\nWe would love to continue having you with us! Please contact us or visit the reception to renew your membership.\n\nThank you for being a part of our fitness family! 💪`;
  const defaultExpired = `Hello {customerName}!\n\nYour gym membership at {gymName} has expired. We hope you enjoyed your fitness journey with us.\n\nWould you like to renew your membership? We have exciting renewal benefits waiting for you at the front desk.\n\nRegards,\n{gymName} Team 🏋️‍♂️`;
  const defaultWelcome = `Welcome to {gymName}, {customerName}! 🎉\n\nYour {planName} membership is active until {expiryDate}.\n\nLet's smash your fitness goals! If you need any assistance with equipment or workout plans, our trainers are always here to help. 🚀`;

  const templates = {
    expiringSoon: hydrate(customTemplates.expiringSoon, defaultExpiringSoon),
    expired: hydrate(customTemplates.expired, defaultExpired),
    welcome: hydrate(customTemplates.welcome, defaultWelcome),
    custom: customText
  };

  const currentMessage = templateType === 'custom' ? customText : templates[templateType] || templates.expiringSoon;

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dispatch directly via configured WhatsApp gateway (Direct QR or Meta Cloud API)
  const handleSendWhatsApp = async () => {
    if (!targetPhone) {
      alert('Please enter or select a valid phone number.');
      return;
    }

    setFeedback(null);

    // If configured WhatsApp gateway is ready:
    if (isGatewayReady) {
      setSending(true);
      try {
        const res = await api.logReminder({
          customerId: customer.customerId,
          membershipId: customer.currentMembership?._id || null,
          contactNumber: targetPhone,
          reminderType: templateType,
          message: currentMessage,
          sendAutomated: true
        });

        if (res.result?.status === 'DELIVERED_AUTOMATIC') {
          const via = isMeta ? 'Meta Cloud API' : `linked phone (+${qrStatus.linkedPhone})`;
          setFeedback({
            type: 'success',
            message: `Message dispatched directly via ${via} to +91 ${targetPhone}!`
          });
          setTimeout(() => {
            onClose();
          }, 1500);
        } else if (res.result?.status === 'DEVICE_NOT_LINKED') {
          setFeedback({
            type: 'error',
            message: 'WhatsApp device is not linked. Redirecting to WhatsApp Web...'
          });
          setTimeout(() => {
            openWhatsAppWebFallback();
          }, 1200);
        } else {
          setFeedback({
            type: 'error',
            message: res.result?.details || res.message || 'Delivery error.'
          });
        }
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err.message || 'Failed to dispatch message directly.'
        });
      } finally {
        setSending(false);
      }
      return;
    }

    // Direct Gateway not configured/connected: fallback to web redirect
    openWhatsAppWebFallback();
  };

  // WhatsApp Web redirect fallback
  const openWhatsAppWebFallback = async () => {
    setSending(true);
    try {
      await api.logReminder({
        customerId: customer.customerId,
        membershipId: customer.currentMembership?._id || null,
        contactNumber: targetPhone,
        reminderType: templateType,
        message: currentMessage,
        sendAutomated: false
      });
    } catch (e) {
      console.error('Failed to log reminder:', e);
    } finally {
      setSending(false);
    }

    const cleanNum = targetPhone.replace(/\D/g, '').slice(-10);
    const intlPhone = cleanNum.startsWith('91') ? cleanNum : `91${cleanNum}`;
    const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(currentMessage)}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <span>WhatsApp Reminder</span>
                <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-mono">
                  {customer.customerId}
                </span>
              </h3>
              <p className="text-xs text-slate-500">{customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Recipient Phone Display + Connection Status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <Phone className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-900 block leading-tight">
                Recipient Mobile
              </span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                +91 {primaryNumber || 'Not provided'}
              </span>
            </div>
          </div>
          {isMeta ? (
            isMetaReady ? (
              <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-300 flex items-center space-x-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Meta Cloud API</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                Meta API Incomplete (Web Fallback)
              </span>
            )
          ) : qrStatus.isConnected ? (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 flex items-center space-x-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Direct Link (+{qrStatus.linkedPhone})</span>
            </span>
          ) : (
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
              Web Redirect (Device Unlinked)
            </span>
          )}
        </div>

        {/* 2. Template Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Message Template
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'expiringSoon', label: 'Expiring Soon' },
              { id: 'expired', label: 'Expired' },
              { id: 'welcome', label: 'Welcome' },
              { id: 'custom', label: 'Custom Message' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateType(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  templateType === t.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Message Preview / Custom Text Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              {templateType === 'custom' ? 'Write Custom Message' : 'Message Preview'}
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-slate-600 hover:text-emerald-600 font-medium flex items-center space-x-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy message'}</span>
            </button>
          </div>

          {templateType === 'custom' ? (
            <textarea
              rows={5}
              placeholder="Type your custom WhatsApp message here..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
            />
          ) : (
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-slate-800 whitespace-pre-line font-sans max-h-40 overflow-y-auto leading-relaxed">
              {currentMessage}
            </div>
          )}
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in ${
            feedback.type === 'success' 
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Direct sending or fallback notice */}
        {qrStatus.isConnected ? (
          <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Direct WhatsApp Connect Active:</strong> FitManage will send this message directly from your gym's linked WhatsApp number (<strong>+{qrStatus.linkedPhone}</strong>) in the background — no browser redirect needed.
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            💡 WhatsApp device is not connected. Clicking below will open WhatsApp Web. To enable 1-click background sending, scan the QR code in <a href="/settings" className="text-emerald-700 font-bold underline">Settings</a>.
          </p>
        )}

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!targetPhone || sending || feedback?.type === 'success'}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isMeta ? 'Sending via Meta Cloud API...' : `Sending via +${qrStatus.linkedPhone || 'WhatsApp'}...`}</span>
                </>
              ) : feedback?.type === 'success' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Delivered Successfully!</span>
                </>
              ) : isGatewayReady ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Directly via {isMeta ? 'Meta API' : 'WhatsApp'} (+91 {targetPhone || 'None'})</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Open in WhatsApp Web (+91 {targetPhone || 'None'})</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
            >
              Cancel
            </button>
          </div>

          {qrStatus.isConnected && (
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={openWhatsAppWebFallback}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline flex items-center justify-center space-x-1 mx-auto"
              >
                <span>Or open in WhatsApp Web / App</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
