import express from 'express';
import { db, calculateMembershipStatus, getDaysRemaining } from '../db.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';
import { whatsappService } from '../services/whatsapp.js';
import { whatsappWebService } from '../services/whatsappWeb.js';

const router = express.Router();
router.use(authMiddleware);

// Helper to compute membership status for all customers of a gym
function getCustomersWithStatus(gymId) {
  const customers = db.customers.find({ gymId });
  return customers.map(c => {
    const memberships = db.memberships.find({ gymId, customerId: c.customerId })
      .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
    const currentMemb = memberships[0] || null;
    let status = 'unsubscribed';
    let daysRemaining = 0;
    if (currentMemb && currentMemb.endDate) {
      status = calculateMembershipStatus(currentMemb.startDate, currentMemb.endDate, currentMemb.status === 'cancelled');
      daysRemaining = getDaysRemaining(currentMemb.endDate);
    }
    return {
      ...c,
      currentMembership: currentMemb,
      status,
      daysRemaining
    };
  });
}

// GET /api/settings - Get gym settings & plans
router.get('/', (req, res) => {
  try {
    const { gymId } = req;
    const gym = db.gyms.findById(gymId);
    const plans = db.plans.find({ gymId });

    res.json({
      gym,
      plans
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

// PUT /api/settings/profile - Update gym info (owner/admin only)
router.put('/profile', roleCheck(['owner', 'admin']), (req, res) => {
  try {
    const { gymId } = req;
    const { gymName, tagline, address, phone, email, gstin, settings } = req.body;

    const existing = db.gyms.findById(gymId);
    if (!existing) {
      return res.status(404).json({ error: 'Gym not found.' });
    }

    const updated = db.gyms.updateOne(
      { _id: gymId },
      {
        gymName: gymName || existing.gymName,
        tagline: tagline !== undefined ? tagline : existing.tagline,
        address: address !== undefined ? address : existing.address,
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? email : existing.email,
        gstin: gstin !== undefined ? gstin : existing.gstin,
        settings: {
          ...existing.settings,
          ...settings,
          whatsapp: {
            ...(existing.settings?.whatsapp || {}),
            ...(settings?.whatsapp || {}),
            meta: {
              ...(existing.settings?.whatsapp?.meta || {}),
              ...(settings?.whatsapp?.meta || {})
            }
          },
          whatsappTemplates: {
            ...(existing.settings?.whatsappTemplates || {}),
            ...(settings?.whatsappTemplates || {})
          },
          multiStageExpiry: {
            ...(existing.settings?.multiStageExpiry || {}),
            ...(settings?.multiStageExpiry || {})
          },
          announcements: settings?.announcements !== undefined ? settings.announcements : (existing.settings?.announcements || []),
          occupancy: {
            ...(existing.settings?.occupancy || {}),
            ...(settings?.occupancy || {})
          }
        }
      }
    );

    res.json({ message: 'Gym profile updated successfully.', gym: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update gym profile.' });
  }
});

// POST /api/settings/plans - Add new membership plan
router.post('/plans', roleCheck(['owner', 'admin']), (req, res) => {
  try {
    const { gymId } = req;
    const { name, durationDays, price, description = '' } = req.body;

    if (!name || !durationDays || price === undefined) {
      return res.status(400).json({ error: 'Plan name, duration (days), and price are required.' });
    }

    const newPlan = db.plans.insertOne({
      gymId,
      name: name.trim(),
      durationDays: Number(durationDays),
      price: Number(price),
      description: description.trim(),
      active: true
    });

    res.status(201).json({ message: 'Membership plan created.', plan: newPlan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add plan.' });
  }
});

// PUT /api/settings/plans/:id - Update plan
router.put('/plans/:id', roleCheck(['owner', 'admin']), (req, res) => {
  try {
    const { gymId } = req;
    const { id } = req.params;
    const { name, durationDays, price, description, active } = req.body;

    const plan = db.plans.findOne({ gymId, _id: id });
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    const updated = db.plans.updateOne(
      { _id: id },
      {
        name: name !== undefined ? name : plan.name,
        durationDays: durationDays !== undefined ? Number(durationDays) : plan.durationDays,
        price: price !== undefined ? Number(price) : plan.price,
        description: description !== undefined ? description : plan.description,
        active: active !== undefined ? Boolean(active) : plan.active
      }
    );

    res.json({ message: 'Plan updated.', plan: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plan.' });
  }
});

// DELETE /api/settings/plans/:id - Delete plan
router.delete('/plans/:id', roleCheck(['owner', 'admin']), (req, res) => {
  try {
    const { gymId } = req;
    const { id } = req.params;

    db.plans.deleteOne({ gymId, _id: id });
    res.json({ message: 'Plan deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete plan.' });
  }
});

// POST /api/settings/test-whatsapp - Send test WhatsApp message
router.post('/test-whatsapp', roleCheck(['owner', 'admin']), async (req, res) => {
  try {
    const { gymId, user } = req;
    const { testPhone } = req.body;

    if (!testPhone) {
      return res.status(400).json({ error: 'Phone number is required for test message.' });
    }

    const result = await whatsappService.testWhatsAppGateway({
      gymId,
      testPhone,
      staffName: user.name
    });

    res.json({ message: 'Test WhatsApp message dispatched.', result });
  } catch (err) {
    console.error('Test WhatsApp Error:', err);
    res.status(500).json({ error: 'Failed to dispatch test message: ' + err.message });
  }
});

// GET /api/settings/whatsapp-qr - Get WhatsApp Web QR connection status for this specific gym
router.get('/whatsapp-qr', (req, res) => {
  const { gymId } = req;
  res.json(whatsappWebService.getStatus(gymId));
});

// POST /api/settings/whatsapp-qr/reconnect - Refresh QR code for this specific gym
router.post('/whatsapp-qr/reconnect', (req, res) => {
  const { gymId } = req;
  whatsappWebService.init(gymId);
  res.json(whatsappWebService.getStatus(gymId));
});

// POST /api/settings/whatsapp-qr/disconnect - Disconnect linked WhatsApp device for this specific gym
router.post('/whatsapp-qr/disconnect', async (req, res) => {
  const { gymId } = req;
  const result = await whatsappWebService.logout(gymId);
  res.json(result);
});

// POST /api/settings/test-meta - Verify Meta WhatsApp Cloud API credentials
router.post('/test-meta', roleCheck(['owner', 'admin']), async (req, res) => {
  try {
    const { gymId, user } = req;
    const { phoneNumberId, accessToken, testPhone } = req.body;

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ error: 'Meta Phone Number ID and Access Token are required.' });
    }
    if (!testPhone) {
      return res.status(400).json({ error: 'Test recipient phone number is required.' });
    }

    const testMsg = `🚀 *FitManage Meta WhatsApp Cloud API Test*\n\nYour Meta Business Cloud API configuration is valid and active!\n\nVerified by: ${user.name}\nTime: ${new Date().toLocaleTimeString('en-IN')}`;

    const result = await whatsappService.sendMetaWhatsApp({
      phoneNumberId,
      accessToken,
      toPhone: testPhone,
      message: testMsg
    });

    res.json({ message: 'Meta Cloud API test message sent successfully!', result });
  } catch (err) {
    console.error('Test Meta Error:', err);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/settings/broadcast-preview - Count & sample recipients
router.get('/broadcast-preview', (req, res) => {
  try {
    const { gymId } = req;
    const { target = 'all' } = req.query;
    const customersWithStatus = getCustomersWithStatus(gymId);

    const filtered = customersWithStatus.filter(c => {
      const hasPhone = Boolean((c.contacts?.primary || '').trim());
      if (!hasPhone) return false;
      if (target === 'active') return c.status === 'active' || c.status === 'expiring_soon';
      if (target === 'expiring') return c.status === 'expiring_soon';
      if (target === 'expired') return c.status === 'expired' || c.status === 'unsubscribed';
      return true; // 'all'
    });

    res.json({
      target,
      count: filtered.length,
      sampleRecipients: filtered.slice(0, 5).map(c => ({
        customerId: c.customerId,
        name: c.name,
        phone: c.contacts?.primary,
        status: c.status
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to preview broadcast: ' + err.message });
  }
});

// POST /api/settings/broadcast - Dispatch broadcast to all selected members via configured gateway
router.post('/broadcast', roleCheck(['owner', 'admin']), async (req, res) => {
  try {
    const { gymId, user } = req;
    const { target = 'all', message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Broadcast message content cannot be empty.' });
    }

    const gym = db.gyms.findById(gymId) || { gymName: 'FitManage Gym' };
    const waSettings = gym?.settings?.whatsapp || {};
    const provider = waSettings.provider || 'whatsapp_qr';

    if (provider === 'meta') {
      if (!waSettings.meta?.phoneNumberId || !waSettings.meta?.accessToken) {
        return res.status(400).json({ 
          error: 'Meta Cloud API is selected as your WhatsApp provider, but Phone Number ID or Access Token is missing in Settings.' 
        });
      }
    } else {
      const qrStatus = whatsappWebService.getStatus(gymId);
      if (!qrStatus.isConnected) {
        return res.status(400).json({ 
          error: `WhatsApp device is not linked for ${gym.gymName}. Please scan the QR code in Settings to connect your gym WhatsApp number first.` 
        });
      }
    }

    const customersWithStatus = getCustomersWithStatus(gymId);
    const recipients = customersWithStatus.filter(c => {
      const phone = (c.contacts?.primary || '').replace(/\D/g, '').slice(-10);
      if (!phone || phone.length !== 10) return false;
      if (target === 'active') return c.status === 'active' || c.status === 'expiring_soon';
      if (target === 'expiring') return c.status === 'expiring_soon';
      if (target === 'expired') return c.status === 'expired' || c.status === 'unsubscribed';
      return true;
    });

    if (recipients.length === 0) {
      return res.status(400).json({ error: `No members found matching target '${target}'.` });
    }

    let dispatched = 0;
    let failed = 0;
    const errors = [];

    for (const member of recipients) {
      const cleanPhone = (member.contacts?.primary || '').replace(/\D/g, '').slice(-10);
      const days = member.daysRemaining || 0;
      const planName = member.currentMembership?.planName || 'Gym Membership';
      const endDate = member.currentMembership?.endDate || 'N/A';

      // Variable interpolation
      const personalizedMsg = message
        .replace(/{name}/gi, member.name)
        .replace(/{customerName}/gi, member.name)
        .replace(/{gymName}/gi, gym.gymName)
        .replace(/{daysRemaining}/gi, days.toString())
        .replace(/{planName}/gi, planName)
        .replace(/{endDate}/gi, endDate);

      try {
        const sendRes = await whatsappService.sendAutomatedWhatsApp({
          gymId,
          customerId: member.customerId,
          contactNumber: cleanPhone,
          message: personalizedMsg,
          reminderType: 'broadcast',
          staffName: user.name
        });

        if (sendRes.success) {
          dispatched++;
        } else {
          failed++;
          errors.push({ name: member.name, phone: cleanPhone, error: sendRes.details });
        }

        // Anti-Burst Drip Engine: Polite 2 to 3.5s randomized delay between sends to protect phone reputation
        const broadcastDripDelay = Math.floor(2000 + Math.random() * 1500);
        await new Promise(r => setTimeout(r, broadcastDripDelay));
      } catch (sendErr) {
        failed++;
        errors.push({ name: member.name, phone: cleanPhone, error: sendErr.message });
      }
    }

    res.json({
      success: true,
      message: `Broadcast completed: ${dispatched} message(s) dispatched successfully.${failed > 0 ? ` (${failed} failed)` : ''}`,
      total: recipients.length,
      dispatched,
      failed,
      errors: errors.slice(0, 5)
    });
  } catch (err) {
    console.error('Broadcast Error:', err);
    res.status(500).json({ error: 'Broadcast failed: ' + err.message });
  }
});

// GET /api/settings/occupancy - Get current occupancy config & calculated status
router.get('/occupancy', (req, res) => {
  try {
    const { gymId } = req;
    const gym = db.gyms.findById(gymId);
    const occupancy = gym?.settings?.occupancy || {
      maxCapacity: 50,
      currentMembers: 18,
      slots: [
        { id: 'slot_1', time: '6:00 AM - 8:00 AM', expectedMembers: 30 },
        { id: 'slot_2', time: '8:00 AM - 10:00 AM', expectedMembers: 45 },
        { id: 'slot_3', time: '11:00 AM - 4:00 PM', expectedMembers: 15 },
        { id: 'slot_4', time: '5:00 PM - 7:00 PM', expectedMembers: 48 },
        { id: 'slot_5', time: '7:00 PM - 10:00 PM', expectedMembers: 32 }
      ]
    };

    const maxCap = Number(occupancy.maxCapacity) || 50;
    const cur = Number(occupancy.currentMembers !== undefined ? occupancy.currentMembers : 18);
    const percent = Math.min(100, Math.round((cur / maxCap) * 100));
    let status = 'Quiet & Open';
    let color = 'emerald';
    if (percent >= 75) {
      status = 'Peak Hours';
      color = 'rose';
    } else if (percent >= 40) {
      status = 'Moderate';
      color = 'amber';
    }

    const calculatedSlots = (occupancy.slots || []).map(s => {
      const exp = Number(s.expectedMembers) || 0;
      const fill = Math.min(100, Math.round((exp / maxCap) * 100));
      let slotStatus = 'Quiet & Open';
      let slotColor = 'emerald';
      if (fill >= 75) {
        slotStatus = 'Peak Hours';
        slotColor = 'rose';
      } else if (fill >= 40) {
        slotStatus = 'Moderate';
        slotColor = 'amber';
      }
      return {
        ...s,
        fill,
        status: slotStatus,
        color: slotColor
      };
    });

    res.json({
      maxCapacity: maxCap,
      currentMembers: cur,
      percentage: percent,
      status,
      color,
      slots: calculatedSlots
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch occupancy: ' + err.message });
  }
});

// PUT /api/settings/occupancy - Update occupancy settings / current on-floor count
router.put('/occupancy', roleCheck(['owner', 'admin', 'trainer']), (req, res) => {
  try {
    const { gymId } = req;
    const { maxCapacity, currentMembers, slots } = req.body;
    const existing = db.gyms.findById(gymId);
    if (!existing) return res.status(404).json({ error: 'Gym not found.' });

    const currentConf = existing.settings?.occupancy || {};
    const updatedOccupancy = {
      maxCapacity: maxCapacity !== undefined ? Math.max(1, Number(maxCapacity)) : (currentConf.maxCapacity || 50),
      currentMembers: currentMembers !== undefined ? Math.max(0, Number(currentMembers)) : (currentConf.currentMembers !== undefined ? currentConf.currentMembers : 18),
      slots: slots !== undefined ? slots : (currentConf.slots || [
        { id: 'slot_1', time: '6:00 AM - 8:00 AM', expectedMembers: 30 },
        { id: 'slot_2', time: '8:00 AM - 10:00 AM', expectedMembers: 45 },
        { id: 'slot_3', time: '11:00 AM - 4:00 PM', expectedMembers: 15 },
        { id: 'slot_4', time: '5:00 PM - 7:00 PM', expectedMembers: 48 },
        { id: 'slot_5', time: '7:00 PM - 10:00 PM', expectedMembers: 32 }
      ])
    };

    db.gyms.updateOne(
      { _id: gymId },
      {
        settings: {
          ...existing.settings,
          occupancy: updatedOccupancy
        }
      }
    );

    const maxCap = updatedOccupancy.maxCapacity;
    const cur = updatedOccupancy.currentMembers;
    const percent = Math.min(100, Math.round((cur / maxCap) * 100));
    let status = 'Quiet & Open';
    let color = 'emerald';
    if (percent >= 75) {
      status = 'Peak Hours';
      color = 'rose';
    } else if (percent >= 40) {
      status = 'Moderate';
      color = 'amber';
    }

    const calculatedSlots = updatedOccupancy.slots.map(s => {
      const exp = Number(s.expectedMembers) || 0;
      const fill = Math.min(100, Math.round((exp / maxCap) * 100));
      let slotStatus = 'Quiet & Open';
      let slotColor = 'emerald';
      if (fill >= 75) {
        slotStatus = 'Peak Hours';
        slotColor = 'rose';
      } else if (fill >= 40) {
        slotStatus = 'Moderate';
        slotColor = 'amber';
      }
      return {
        ...s,
        fill,
        status: slotStatus,
        color: slotColor
      };
    });

    res.json({
      message: 'Studio occupancy updated successfully.',
      occupancy: {
        ...updatedOccupancy,
        percentage: percent,
        status,
        color,
        slots: calculatedSlots
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update occupancy: ' + err.message });
  }
});

export default router;
