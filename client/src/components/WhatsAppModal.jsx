import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare, Phone, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function WhatsAppModal({ isOpen, onClose, customer, initialTemplate = 'expiringSoon' }) {
  const { gym } = useAuth();
  const [selectedContact, setSelectedContact] = useState('primary');
  const [templateType, setTemplateType] = useState(initialTemplate);
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (initialTemplate) {
      setTemplateType(initialTemplate);
    }
  }, [initialTemplate]);

  if (!isOpen || !customer) return null;

  const contacts = customer.contacts || {};
  const primaryNumber = contacts.primary || '';
  const secondaryNumber = contacts.secondary || '';
  const emergencyNumber = contacts.emergency || '';

  // Get active selected phone number
  let targetPhone = primaryNumber;
  if (selectedContact === 'secondary' && secondaryNumber) targetPhone = secondaryNumber;
  if (selectedContact === 'emergency' && emergencyNumber) targetPhone = emergencyNumber;

  // Compute template variables
  const customerName = customer.name || 'Valued Member';
  const gymName = gym?.gymName || 'FitZone Pro Club';
  const planName = customer.currentMembership?.planName || 'Gym Membership';
  const expiryDate = customer.currentMembership?.endDate 
    ? new Date(customer.currentMembership.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Upcoming';
  const daysRemaining = customer.daysRemaining !== undefined ? customer.daysRemaining : 0;
  const pendingAmount = customer.outstandingBalance || 0;

  // Build default message texts
  const templates = {
    expiringSoon: `Hello ${customerName}! 👋\n\nYour gym membership at ${gymName} is expiring on ${expiryDate} (${daysRemaining} days left).\n\nWe would love to continue having you with us! Please contact us or visit the reception to renew your membership.\n\nThank you for being a part of our fitness family! 💪`,
    expired: `Hello ${customerName}!\n\nYour gym membership at ${gymName} has expired. We hope you enjoyed your fitness journey with us.\n\nWould you like to renew your membership? We have exciting renewal benefits waiting for you at the front desk.\n\nRegards,\n${gymName} Team 🏋️‍♂️`,
    paymentDue: `Hello ${customerName}! 👋\n\nThis is a friendly reminder from ${gymName} regarding your pending balance of ₹${pendingAmount.toLocaleString('en-IN')} for your ${planName} membership.\n\nPlease clear this at the reception desk at your earliest convenience. Thank you! 🙏`,
    welcome: `Welcome to ${gymName}, ${customerName}! 🎉\n\nYour ${planName} membership is active until ${expiryDate}.\n\nLet's smash your fitness goals! If you need any assistance with equipment or workout plans, our trainers are always here to help. 🚀`,
    custom: customText
  };

  const currentMessage = templateType === 'custom' ? customText : templates[templateType] || templates.expiringSoon;

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open WhatsApp click-to-chat
  const handleSendWhatsApp = async () => {
    if (!targetPhone) {
      alert('Please enter or select a valid phone number.');
      return;
    }

    setLogging(true);
    try {
      // Record reminder in backend per PRD
      await api.logReminder({
        customerId: customer.customerId,
        membershipId: customer.currentMembership?._id || null,
        contactNumber: targetPhone,
        reminderType: templateType,
        message: currentMessage
      });
    } catch (e) {
      console.error('Failed to log reminder to DB:', e);
    } finally {
      setLogging(false);
    }

    // Clean Indian 10-digit number
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
                <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
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

        {/* 1. Contact Selector (Primary, Secondary, Emergency) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Select Contact Number
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Primary */}
            <button
              type="button"
              onClick={() => setSelectedContact('primary')}
              disabled={!primaryNumber}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedContact === 'primary'
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                  : primaryNumber ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                <span>Primary</span>
                <Phone className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="text-xs text-slate-600 font-mono mt-0.5 truncate">
                {primaryNumber ? `+91 ${primaryNumber}` : 'Not provided'}
              </div>
            </button>

            {/* Secondary */}
            <button
              type="button"
              onClick={() => setSelectedContact('secondary')}
              disabled={!secondaryNumber}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedContact === 'secondary'
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                  : secondaryNumber ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                <span>Secondary</span>
                <Phone className="w-3 h-3 text-slate-500" />
              </div>
              <div className="text-xs text-slate-600 font-mono mt-0.5 truncate">
                {secondaryNumber ? `+91 ${secondaryNumber}` : 'Not provided'}
              </div>
            </button>

            {/* Emergency */}
            <button
              type="button"
              onClick={() => setSelectedContact('emergency')}
              disabled={!emergencyNumber}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedContact === 'emergency'
                  ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                  : emergencyNumber ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                <span>Emergency</span>
                <AlertTriangle className="w-3 h-3 text-amber-500" />
              </div>
              <div className="text-xs text-slate-600 font-mono mt-0.5 truncate">
                {emergencyNumber ? `+91 ${emergencyNumber}` : 'Not provided'}
              </div>
            </button>
          </div>
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
              { id: 'paymentDue', label: 'Payment Due' },
              { id: 'welcome', label: 'Welcome' },
              { id: 'custom', label: 'Custom' }
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
              {templateType === 'custom' ? 'Write Message' : 'Message Preview'}
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
              placeholder="Type your WhatsApp message..."
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

        {/* Note on Click-to-Chat */}
        <p className="text-[11px] text-slate-500">
          💡 Clicking <strong className="text-slate-700">Open WhatsApp</strong> will launch WhatsApp Web or App with pre-filled message. Your staff simply presses <strong className="text-slate-700">Send</strong>!
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={!targetPhone || logging}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Open WhatsApp (+91 {targetPhone || 'None'})</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
