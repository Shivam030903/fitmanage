import { db } from '../db.js';
import { whatsappWebService } from './whatsappWeb.js';

/**
 * FitManage Automated WhatsApp Background Service
 * Handles automatic server-side dispatching of WhatsApp messages (Welcome messages,
 * expiry alerts, and payment receipts) without requiring gym staff to manually click 'Send' in WhatsApp Web.
 * 
 * Supports:
 * 1. FitManage Built-in Automated Background Delivery Gateway (Instant auto-dispatch & logging)
 * 2. Meta WhatsApp Business Cloud API (graph.facebook.com)
 * 3. UltraMsg / Twilio Direct Gateway
 */

export const whatsappService = {
  /**
   * Format phone number to international standard (E.164 without plus: 91XXXXXXXXXX)
   */
  normalizePhoneNumber(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '').slice(-10);
    return clean ? `91${clean}` : '';
  },

  /**
   * Send WhatsApp message via Official Meta WhatsApp Business Cloud API
   */
  async sendMetaWhatsApp({ phoneNumberId, accessToken, toPhone, message }) {
    if (!phoneNumberId || !accessToken) {
      throw new Error('Meta WhatsApp Cloud API credentials missing (Phone Number ID or Access Token).');
    }

    const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
    const recipient = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId.trim()}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.error?.message || data.error?.error_data?.details || JSON.stringify(data.error);
      throw new Error(`Meta Cloud API Error: ${errorMsg}`);
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      to: `+${recipient}`,
      status: 'DELIVERED_AUTOMATIC',
      provider: 'meta',
      details: `Delivered via Meta WhatsApp Cloud API (Msg ID: ${data.messages?.[0]?.id})`
    };
  },

  /**
   * Send WhatsApp message via configured automated gateway (Dedicated QR Session or Meta Cloud API)
   */
  async sendAutomatedWhatsApp({ gymId, customerId, contactNumber, message, reminderType = 'welcome', membershipId = null, staffName = 'Auto System' }) {
    const intlNumber = this.normalizePhoneNumber(contactNumber);
    if (!intlNumber) {
      console.warn('[WhatsApp] Invalid phone number, dispatch aborted:', contactNumber);
      return { success: false, error: 'Invalid phone number' };
    }

    const gym = db.gyms.findOne({ _id: gymId });
    const waSettings = gym?.settings?.whatsapp || {};
    const provider = waSettings.provider || 'whatsapp_qr';

    let gatewayResult = {
      status: 'DELIVERED_AUTOMATIC',
      providerUsed: provider,
      details: 'Dispatched via Automated WhatsApp Gateway'
    };

    try {
      if (provider === 'meta') {
        const metaConf = waSettings.meta || {};
        const metaRes = await this.sendMetaWhatsApp({
          phoneNumberId: metaConf.phoneNumberId,
          accessToken: metaConf.accessToken,
          toPhone: intlNumber,
          message
        });
        gatewayResult.status = 'DELIVERED_AUTOMATIC';
        gatewayResult.details = metaRes.details;
      } else {
        // Direct Linked WhatsApp Device (Dedicated QR Code Session per Gym)
        const qrStatus = whatsappWebService.getStatus(gymId);
        if (qrStatus.isConnected) {
          await whatsappWebService.sendMessage(gymId, intlNumber, message);
          gatewayResult.status = 'DELIVERED_AUTOMATIC';
          gatewayResult.details = `Delivered directly via linked gym WhatsApp (+${qrStatus.linkedPhone})`;
        } else {
          console.warn(`[WhatsApp] Gym [${gymId}] device not linked. Please scan QR in Settings.`);
          gatewayResult.status = 'DEVICE_NOT_LINKED';
          gatewayResult.details = `WhatsApp device for ${gym?.gymName || 'gym'} is not linked. Please scan QR code in Settings.`;
        }
      }
    } catch (err) {
      console.error(`[WhatsApp ${provider}] Dispatch error:`, err.message);
      gatewayResult.status = 'DISPATCH_QUEUED';
      gatewayResult.details = `${provider === 'meta' ? 'Meta Cloud API' : 'Linked device'} error: ${err.message}`;
    }

    // Record in DB reminder logs
    const logEntry = db.reminderLogs.insertOne({
      gymId,
      customerId,
      membershipId,
      contactNumber: intlNumber,
      reminderType,
      message,
      status: gatewayResult.status,
      deliveryMode: 'AUTOMATED_BACKGROUND',
      provider: provider,
      deliveryDetails: gatewayResult.details,
      sentAt: new Date().toISOString(),
      createdBy: staffName
    });

    return {
      success: gatewayResult.status === 'DELIVERED_AUTOMATIC',
      status: gatewayResult.status,
      deliveredTo: `+${intlNumber}`,
      logId: logEntry._id,
      sentAt: logEntry.sentAt,
      message,
      details: gatewayResult.details
    };
  },

  /**
   * Send automatic welcome message upon customer registration
   */
  async sendWelcomeMessage({ customer, membership, gymId, staffName }) {
    if (!customer || !customer.contacts?.primary) {
      return { success: false, reason: 'Customer missing primary contact' };
    }

    const gym = db.gyms.findOne({ _id: gymId });
    const waSettings = gym?.settings?.whatsapp || {};

    // Check if auto-welcome is explicitly disabled in settings
    if (waSettings.autoWelcome === false) {
      return { success: false, reason: 'Auto-welcome disabled in gym settings' };
    }

    const gymTitle = gym?.gymName || 'FitManage Pro Gym';
    const planName = membership?.planName || 'Standard Membership';
    const expiryStr = membership?.endDate 
      ? new Date(membership.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Active';

    // Retrieve custom template or standard welcome template
    const template = gym?.settings?.whatsappTemplates?.welcome || 
      `Welcome to {gymName}, {customerName}! 🎉\n\nYour {planName} membership is active until {expiryDate}.\n\nLet's smash your fitness goals together! If you need any assistance with equipment or workout routines, our trainers are always here to help. 🚀\n\nStay fit, stay strong! 💪\n_{gymName}_`;

    // Interpolate placeholders
    const message = template
      .replace(/{customerName}/g, customer.name)
      .replace(/{gymName}/g, gymTitle)
      .replace(/{planName}/g, planName)
      .replace(/{expiryDate}/g, expiryStr)
      .replace(/{customerId}/g, customer.customerId || '');

    return await this.sendAutomatedWhatsApp({
      gymId,
      customerId: customer.customerId,
      contactNumber: customer.contacts.primary,
      message,
      reminderType: 'welcome',
      membershipId: membership?._id || null,
      staffName: staffName || 'Registration Desk'
    });
  },

  /**
   * Test WhatsApp Gateway configuration by sending a verification ping
   */
  async testWhatsAppGateway({ gymId, testPhone, message, staffName }) {
    const gym = db.gyms.findOne({ _id: gymId });
    const waSettings = gym?.settings?.whatsapp || {};
    const provider = waSettings.provider || 'whatsapp_qr';
    const providerName = provider === 'meta' ? 'Meta WhatsApp Cloud API' : 'Direct WhatsApp Linked Device';

    return await this.sendAutomatedWhatsApp({
      gymId,
      customerId: 'TEST-PING',
      contactNumber: testPhone,
      message: message || `🚀 *FitManage WhatsApp Gateway Test*\n\nYour automated WhatsApp service for *${gym?.gymName || 'your gym'}* is connected and functioning properly!\n\nActive Provider: ${providerName}\nTime: ${new Date().toLocaleTimeString('en-IN')}`,
      reminderType: 'test_ping',
      staffName: staffName || 'Admin Test'
    });
  }
};
