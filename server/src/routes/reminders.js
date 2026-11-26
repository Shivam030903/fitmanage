import express from 'express';
import { db, calculateMembershipStatus, getDaysRemaining } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { enrichCustomer } from './customers.js';
import { whatsappService } from '../services/whatsapp.js';

import { expiryScheduler, DEFAULT_STAGE_CONFIG } from '../services/expiryScheduler.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/reminders - Get all pending reminders grouped by urgency & logs
router.get('/', (req, res) => {
  try {
    const { gymId } = req;
    const { type } = req.query; // 'expiring', 'expired', 'payment', 'all'

    const gym = db.gyms.findById(gymId);
    const customers = db.customers.find({ gymId });
    const enriched = customers.map(c => enrichCustomer(c, gymId));

    const reminderQueue = [];

    enriched.forEach(customer => {
      const memb = customer.currentMembership;
      const daysLeft = customer.daysRemaining;
      const status = customer.currentStatus;

      // 1. Expiring Soon (0 to 7 days left)
      if (status === 'expiring_soon' || (memb && daysLeft <= 7 && daysLeft > 0)) {
        let urgency = 'medium';
        let triggerLabel = '7 days before expiry';
        if (daysLeft <= 1) {
          urgency = 'critical';
          triggerLabel = 'Expiring Tomorrow!';
        } else if (daysLeft <= 3) {
          urgency = 'high';
          triggerLabel = '3 days before expiry';
        }

        reminderQueue.push({
          id: `rem_exp_${customer.customerId}`,
          type: 'expiring_soon',
          urgency,
          triggerLabel,
          customer,
          membership: memb,
          daysRemaining: daysLeft,
          expiryDate: memb?.endDate,
          primaryPhone: customer.contacts?.primary,
          recommendedTemplate: 'expiringSoon'
        });
      }

      // 2. Expiring Today
      if (memb && daysLeft === 0) {
        reminderQueue.push({
          id: `rem_today_${customer.customerId}`,
          type: 'expiry_today',
          urgency: 'critical',
          triggerLabel: 'Expires Today',
          customer,
          membership: memb,
          daysRemaining: 0,
          expiryDate: memb?.endDate,
          primaryPhone: customer.contacts?.primary,
          recommendedTemplate: 'expiringSoon'
        });
      }

      // 3. Expired Members
      if (status === 'expired') {
        const daysPast = Math.abs(daysLeft);
        reminderQueue.push({
          id: `rem_past_${customer.customerId}`,
          type: 'expired',
          urgency: daysPast <= 7 ? 'high' : 'low',
          triggerLabel: `Expired ${daysPast} day${daysPast === 1 ? '' : 's'} ago`,
          customer,
          membership: memb,
          daysRemaining: daysLeft,
          expiryDate: memb?.endDate,
          primaryPhone: customer.contacts?.primary,
          recommendedTemplate: 'expired'
        });
      }
    });

    // Fetch reminder logs
    const logs = db.reminderLogs.find({ gymId })
      .map(log => {
        const cust = db.customers.findOne({ gymId, customerId: log.customerId });
        return {
          ...log,
          customerName: cust ? cust.name : 'Unknown Member'
        };
      })
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    // Attach last reminder date to queue items
    const queueWithLogs = reminderQueue.map(item => {
      const lastLog = logs.find(l => l.customerId === item.customer.customerId);
      return {
        ...item,
        lastReminderSent: lastLog ? lastLog.sentAt : null,
        lastReminderType: lastLog ? lastLog.reminderType : null
      };
    });

    // Filter if requested
    let filteredQueue = queueWithLogs;
    if (type && type !== 'all') {
      filteredQueue = filteredQueue.filter(item => item.type === type);
    }

    // Sort queue by urgency
    const urgencyWeight = { critical: 1, high: 2, medium: 3, low: 4 };
    filteredQueue.sort((a, b) => (urgencyWeight[a.urgency] || 5) - (urgencyWeight[b.urgency] || 5));

    res.json({
      queue: filteredQueue,
      totalInQueue: filteredQueue.length,
      logs: logs.slice(0, 50),
      templates: gym?.settings?.whatsappTemplates || {}
    });
  } catch (err) {
    console.error('Error fetching reminders:', err);
    res.status(500).json({ error: 'Failed to retrieve reminders.' });
  }
});

// POST /api/reminders - Log reminder initiation or dispatch automated WhatsApp
router.post('/', async (req, res) => {
  try {
    const { gymId, user } = req;
    const { customerId, membershipId, contactNumber, reminderType, message, sendAutomated } = req.body;

    if (!customerId || !contactNumber) {
      return res.status(400).json({ error: 'Customer ID and contact number are required.' });
    }

    if (sendAutomated) {
      const waResult = await whatsappService.sendAutomatedWhatsApp({
        gymId,
        customerId,
        membershipId: membershipId || null,
        contactNumber,
        reminderType: reminderType || 'custom',
        message: message || '',
        staffName: user.name
      });
      return res.status(201).json({
        message: 'Reminder sent automatically via WhatsApp gateway.',
        result: waResult
      });
    }

    const logEntry = db.reminderLogs.insertOne({
      gymId,
      customerId,
      membershipId: membershipId || null,
      contactNumber,
      reminderType: reminderType || 'custom',
      message: message || '',
      sentAt: new Date().toISOString(),
      status: 'initiated',
      createdBy: user.name
    });

    res.status(201).json({
      message: 'Reminder logged successfully.',
      log: logEntry
    });
  } catch (err) {
    console.error('Error logging reminder:', err);
    res.status(500).json({ error: 'Failed to log reminder.' });
  }
});

// POST /api/reminders/scan-multi-stage - Trigger automated multi-stage scan now
router.post('/scan-multi-stage', async (req, res) => {
  try {
    const { gymId } = req;
    const result = await expiryScheduler.runExpiryScan(gymId, { force: true });
    res.json({
      message: 'Automated multi-stage expiry scan completed.',
      result
    });
  } catch (err) {
    console.error('Multi-stage scan error:', err);
    res.status(500).json({ error: 'Failed to run multi-stage scan: ' + err.message });
  }
});

// GET /api/reminders/multi-stage-config - Retrieve gym multi-stage expiry configuration
router.get('/multi-stage-config', (req, res) => {
  try {
    const { gymId } = req;
    const gym = db.gyms.findById(gymId);
    const config = gym?.settings?.multiStageExpiry || DEFAULT_STAGE_CONFIG;
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve multi-stage config.' });
  }
});

export default router;
