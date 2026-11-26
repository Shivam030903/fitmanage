import { db, getDaysRemaining, getCustomerCurrentMembership } from '../db.js';
import { whatsappService } from './whatsapp.js';
import { whatsappWebService } from './whatsappWeb.js';

/**
 * Automated Multi-Stage Expiry Follow-ups Engine
 * Handles background automated scanning and dispatch of multi-stage reminders:
 * 1. 7 days before (Gentle heads up)
 * 2. 1 day before (Renewal offer)
 * 3. On expiry day (Action required)
 * 4. 3 days after (Comeback discount)
 */

export const DEFAULT_STAGE_CONFIG = {
  enabled: true,
  stages: {
    stage_7days: {
      enabled: true,
      days: 7,
      label: '7 Days Before Expiry (Gentle Heads Up)',
      template: 'Hello {customerName}! 👋\n\nA friendly reminder that your {planName} membership at {gymName} will expire in 7 days on {expiryDate}.\n\nRenew early to maintain uninterrupted access and keep crushing your fitness goals! If you need any help, our front desk team is ready to assist. 💪\n\n_{gymName}_'
    },
    stage_1day: {
      enabled: true,
      days: 1,
      label: '1 Day Before Expiry (Renewal Offer)',
      template: 'Hi {customerName}! ⏰\n\nYour gym membership at {gymName} expires TOMORROW ({expiryDate})!\n\nWe love having you in our fitness family! Renew today to lock in special renewal perks and keep your workout streak alive. 🏋️‍♂️\n\nDrop by reception or reply here to renew!\n_{gymName}_'
    },
    stage_expiry_day: {
      enabled: true,
      days: 0,
      label: 'On Expiry Day (Action Required)',
      template: 'Important Notice, {customerName}! ⚠️\n\nYour {planName} membership at {gymName} expires TODAY ({expiryDate}).\n\nTo ensure uninterrupted gym access and continue your fitness journey without pause, please visit our front desk to renew today! 🚀\n\nStay fit, stay strong!\n_{gymName}_'
    },
    stage_3days_after: {
      enabled: true,
      days: -3,
      label: '3 Days After Expiry (Comeback Discount)',
      template: 'We miss seeing you, {customerName}! 🥺\n\nIt has been 3 days since your membership at {gymName} expired on {expiryDate}.\n\nDon\'t let your hard work fade away! We have a special "Welcome Back" renewal benefit waiting for you. Visit us today and let\'s get back on track! 💖💪\n\n_{gymName}_'
    }
  }
};

export const expiryScheduler = {
  intervalId: null,

  /**
   * Run multi-stage scan across all gyms or a specific gym
   */
  async runExpiryScan(targetGymId = null) {
    console.log(`[Expiry Scheduler] Starting automated multi-stage expiry scan across gyms...`);

    const gyms = targetGymId 
      ? [db.gyms.findById(targetGymId)].filter(Boolean)
      : db.gyms.find({});

    const summary = {
      timestamp: new Date().toISOString(),
      gymsScanned: gyms.length,
      dispatchedCount: 0,
      skippedCount: 0,
      details: []
    };

    for (const gym of gyms) {
      const config = gym.settings?.multiStageExpiry || DEFAULT_STAGE_CONFIG;
      if (config.enabled === false) {
        summary.details.push({ gymId: gym._id, gymName: gym.gymName, skipped: true, reason: 'Automation disabled in settings' });
        continue;
      }

      const waSettings = gym.settings?.whatsapp || {};
      const provider = waSettings.provider || 'whatsapp_qr';
      const isReady = provider === 'meta'
        ? Boolean(waSettings.meta?.phoneNumberId && waSettings.meta?.accessToken)
        : whatsappWebService.getStatus(gym._id).isConnected;

      if (!isReady) {
        summary.details.push({ 
          gymId: gym._id, 
          gymName: gym.gymName, 
          skipped: true, 
          reason: `WhatsApp not connected (${provider === 'meta' ? 'Meta Cloud API credentials missing' : 'QR device not linked'})` 
        });
        continue;
      }

      const stagesConfig = config.stages || DEFAULT_STAGE_CONFIG.stages;
      const customers = db.customers.find({ gymId: gym._id });

      for (const customer of customers) {
        const phone = customer.contacts?.primary;
        if (!phone) continue;

        // Fetch current active or latest membership (excluding cancelled)
        const memberships = db.memberships.find({ gymId: gym._id, customerId: customer.customerId });
        const latestMemb = getCustomerCurrentMembership(memberships);
        if (!latestMemb || !latestMemb.endDate || latestMemb.status === 'cancelled') continue;

        const daysRemaining = getDaysRemaining(latestMemb.endDate);

        // Check each stage match
        for (const [stageKey, stage] of Object.entries(stagesConfig)) {
          if (!stage.enabled) continue;
          if (daysRemaining !== stage.days) continue;

          // Check if this stage reminder was already sent for this specific membership
          const alreadySent = db.reminderLogs.findOne({
            gymId: gym._id,
            customerId: customer.customerId,
            membershipId: latestMemb._id,
            reminderType: stageKey
          });

          if (alreadySent) {
            summary.skippedCount++;
            continue;
          }

          // Hydrate template
          const customerName = customer.name || 'Valued Member';
          const gymTitle = gym.gymName || 'FitManage Club';
          const planName = latestMemb.planName || 'Gym Membership';
          const expiryDate = new Date(latestMemb.endDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });

          const messageText = (stage.template || '')
            .replace(/{customerName}/g, customerName)
            .replace(/{gymName}/g, gymTitle)
            .replace(/{planName}/g, planName)
            .replace(/{expiryDate}/g, expiryDate)
            .replace(/{customerId}/g, customer.customerId || '');

          console.log(`[Expiry Scheduler] Auto-dispatching ${stageKey} to ${customer.name} (+91 ${phone})...`);

          try {
            const result = await whatsappService.sendAutomatedWhatsApp({
              gymId: gym._id,
              customerId: customer.customerId,
              membershipId: latestMemb._id,
              contactNumber: phone,
              reminderType: stageKey,
              message: messageText,
              staffName: 'Auto Multi-Stage Scheduler'
            });

            summary.dispatchedCount++;
            summary.details.push({
              customerName: customer.name,
              customerId: customer.customerId,
              phone,
              stage: stageKey,
              daysRemaining,
              status: result.status,
              sentAt: new Date().toISOString()
            });
          } catch (err) {
            console.error(`[Expiry Scheduler] Error dispatching to ${customer.customerId}:`, err.message);
          }
        }
      }
    }

    console.log(`[Expiry Scheduler] Completed scan: ${summary.dispatchedCount} dispatched, ${summary.skippedCount} already up to date.`);
    return summary;
  },

  /**
   * Start recurring background scan (every 4 hours)
   */
  start() {
    if (this.intervalId) return;

    // Run initial scan after 10 seconds of boot
    setTimeout(() => {
      this.runExpiryScan().catch(err => console.error('[Expiry Scheduler] Initial scan error:', err.message));
    }, 10000);

    // Then run every 4 hours
    this.intervalId = setInterval(() => {
      this.runExpiryScan().catch(err => console.error('[Expiry Scheduler] Recurring scan error:', err.message));
    }, 4 * 60 * 60 * 1000);

    console.log('✅ [Expiry Scheduler] Multi-Stage Expiry Follow-ups scheduler running.');
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};
