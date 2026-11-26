import express from 'express';
import { db, getGymSubscription } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { whatsappService } from '../services/whatsapp.js';

const router = express.Router();
router.use(authMiddleware);

// Helper to generate next unique Lead ID
function generateLeadId(gymId) {
  const existing = db.leads.find({ gymId });
  let maxNum = 100;
  for (const l of existing) {
    if (l.leadId && l.leadId.startsWith('LEAD-')) {
      const num = parseInt(l.leadId.replace('LEAD-', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `LEAD-${maxNum + 1}`;
}

// Helper to generate next Customer ID
function generateCustomerId(gymId) {
  const existing = db.customers.find({ gymId });
  let maxNum = 1000;
  for (const c of existing) {
    if (c.customerId && c.customerId.startsWith('FIT-')) {
      const num = parseInt(c.customerId.replace('FIT-', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `FIT-${maxNum + 1}`;
}

/**
 * GET /api/leads
 * List leads with search, filtering, and conversion funnel stats.
 */
router.get('/', (req, res) => {
  try {
    const { gymId } = req;
    const { search, status, goal, source } = req.query;

    let leads = db.leads.find({ gymId });
    const totalInquiries = leads.length;

    // Funnel stats
    const trialBookedCount = leads.filter(l => l.status === 'trial_booked' || l.status === 'trial_completed').length;
    const convertedCount = leads.filter(l => l.status === 'converted').length;
    const lostCount = leads.filter(l => l.status === 'lost').length;
    const conversionRate = totalInquiries > 0 ? Math.round((convertedCount / totalInquiries) * 100) : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const followUpsDue = leads.filter(l => l.status !== 'converted' && l.status !== 'lost' && l.followUpDate && l.followUpDate <= todayStr).length;

    // Filters
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      leads = leads.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.leadId?.toLowerCase().includes(q) ||
        l.trialPass?.passCode?.toLowerCase().includes(q)
      );
    }

    if (status && status !== 'all') {
      leads = leads.filter(l => l.status === status);
    }

    if (goal && goal !== 'all') {
      leads = leads.filter(l => l.fitnessGoal === goal);
    }

    if (source && source !== 'all') {
      leads = leads.filter(l => l.source === source);
    }

    // Sort descending by creation date
    leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      leads,
      stats: {
        totalInquiries,
        trialBookedCount,
        convertedCount,
        lostCount,
        conversionRate,
        followUpsDue
      }
    });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Failed to retrieve leads.' });
  }
});

/**
 * POST /api/leads
 * Register walk-in inquiry & generate 1-Day Free Trial Pass.
 */
router.post('/', async (req, res) => {
  try {
    const { gymId, user } = req;
    const {
      name,
      phone,
      gender = 'Male',
      email = '',
      fitnessGoal = 'General Fitness',
      budget = '',
      source = 'Walk-in Reception',
      notes = '',
      followUpDate = '',
      sendTrialPassNow = true
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Lead name is required.' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Mobile number is required.' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    const leadId = generateLeadId(gymId);
    const passCode = `PASS-${Date.now().toString().slice(-6)}`;
    const validUntil = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Default follow-up date = 3 days after inquiry for Day 3 offer
    const defaultFollowUp = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newLead = db.leads.insertOne({
      gymId,
      leadId,
      name: name.trim(),
      phone: cleanPhone,
      email: email.trim(),
      gender,
      fitnessGoal,
      budget: budget.trim(),
      source,
      status: 'trial_booked',
      notes: notes.trim(),
      followUpDate: followUpDate || defaultFollowUp,
      assignedTo: user.name || 'Reception',
      trialPass: {
        passCode,
        validDate: validUntil,
        isUsed: false,
        usedAt: null
      },
      history: [
        {
          date: new Date().toISOString(),
          type: 'created',
          note: `Walk-in inquiry recorded by ${user.name}. 1-Day Trial Pass generated (${passCode}).`
        }
      ],
      createdAt: new Date().toISOString()
    });

    const gym = db.gyms.findById(gymId);
    const gymTitle = gym?.gymName || 'FitManage Club';

    // Auto-dispatch Day 1 Trial Pass via WhatsApp
    if (sendTrialPassNow) {
      const formattedValidDate = new Date(validUntil).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      const passMsg = `Hello ${name.trim()}! 👋\n\nThank you for visiting *${gymTitle}* today!\n\nHere is your exclusive *Free 1-Day Workout Trial Pass* 🏋️‍♂️\n\n🎫 *Guest Pass Code:* ${passCode}\n📅 *Valid Through:* ${formattedValidDate}\n🎯 *Fitness Goal:* ${fitnessGoal}\n\nSimply show this pass code at our reception to begin your workout. Let's make your fitness transformation happen together! 💪🔥\n\n_${gymTitle}_`;

      whatsappService.sendAutomatedWhatsApp({
        gymId,
        customerId: leadId,
        contactNumber: cleanPhone,
        reminderType: 'trial_pass',
        message: passMsg,
        staffName: user.name || 'Front Desk'
      }).catch(err => {
        console.warn('[Leads] Automated WhatsApp guest pass warning:', err.message);
      });
    }

    res.status(201).json({
      message: `Lead registered! Free 1-Day Trial Pass (${passCode}) issued.`,
      lead: newLead
    });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ error: 'Failed to create lead inquiry.' });
  }
});

/**
 * PUT /api/leads/:id
 * Update lead details, status, follow-up date, and notes.
 */
router.put('/:id', (req, res) => {
  try {
    const { gymId, user } = req;
    const { id } = req.params;
    const {
      name,
      phone,
      gender,
      email,
      fitnessGoal,
      budget,
      source,
      status,
      notes,
      followUpDate,
      assignedTo
    } = req.body;

    const lead = db.leads.findOne({ gymId, _id: id }) || db.leads.findOne({ gymId, leadId: id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : lead.phone;

    const updated = db.leads.updateOne(
      { _id: lead._id },
      {
        name: name !== undefined ? name.trim() : lead.name,
        phone: cleanPhone,
        gender: gender !== undefined ? gender : lead.gender,
        email: email !== undefined ? email.trim() : lead.email,
        fitnessGoal: fitnessGoal !== undefined ? fitnessGoal : lead.fitnessGoal,
        budget: budget !== undefined ? budget.trim() : lead.budget,
        source: source !== undefined ? source : lead.source,
        status: status !== undefined ? status : lead.status,
        notes: notes !== undefined ? notes.trim() : lead.notes,
        followUpDate: followUpDate !== undefined ? followUpDate : lead.followUpDate,
        assignedTo: assignedTo !== undefined ? assignedTo : lead.assignedTo
      }
    );

    res.json({
      message: 'Lead updated successfully.',
      lead: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lead.' });
  }
});

/**
 * POST /api/leads/:id/log-interaction
 * Log call, WhatsApp, or visit note to lead interaction history.
 */
router.post('/:id/log-interaction', (req, res) => {
  try {
    const { gymId, user } = req;
    const { id } = req.params;
    const { note, type = 'call' } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: 'Interaction note is required.' });
    }

    const lead = db.leads.findOne({ gymId, _id: id }) || db.leads.findOne({ gymId, leadId: id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const newEntry = {
      date: new Date().toISOString(),
      type,
      note: note.trim(),
      staffName: user.name || 'Staff'
    };

    const history = Array.isArray(lead.history) ? [...lead.history, newEntry] : [newEntry];
    const updated = db.leads.updateOne({ _id: lead._id }, { history });

    res.json({ message: 'Interaction note logged.', history: updated.history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log interaction.' });
  }
});

/**
 * POST /api/leads/:id/send-pass
 * Re-send Day 1 Free Trial Pass via WhatsApp.
 */
router.post('/:id/send-pass', async (req, res) => {
  try {
    const { gymId, user } = req;
    const { id } = req.params;

    const lead = db.leads.findOne({ gymId, _id: id }) || db.leads.findOne({ gymId, leadId: id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const gym = db.gyms.findById(gymId);
    const gymTitle = gym?.gymName || 'FitManage Club';
    const passCode = lead.trialPass?.passCode || `PASS-${Date.now().toString().slice(-6)}`;
    const validDate = lead.trialPass?.validDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const formattedDate = new Date(validDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const passMsg = `Hello ${lead.name}! 👋\n\nHere is your *Free 1-Day Workout Pass* at *${gymTitle}*! 🏋️‍♂️\n\n🎫 *Pass Code:* ${passCode}\n📅 *Valid Through:* ${formattedDate}\n🎯 *Fitness Goal:* ${lead.fitnessGoal || 'Strength'}\n\nShow this code at reception to start your workout. Let's crush your fitness goals! 💪🔥\n\n_${gymTitle}_`;

    const result = await whatsappService.sendAutomatedWhatsApp({
      gymId,
      customerId: lead.leadId,
      contactNumber: lead.phone,
      reminderType: 'trial_pass_resend',
      message: passMsg,
      staffName: user.name || 'Reception Staff'
    });

    // Update history
    const historyEntry = {
      date: new Date().toISOString(),
      type: 'whatsapp',
      note: `Day 1 Free Trial Pass sent via WhatsApp (${passCode}).`
    };
    db.leads.updateOne({ _id: lead._id }, {
      history: [...(lead.history || []), historyEntry]
    });

    res.json({ message: `Day 1 Free Trial Pass sent to ${lead.name} (+91 ${lead.phone})!`, result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send trial pass: ' + err.message });
  }
});

/**
 * POST /api/leads/:id/send-offer
 * Send Day 3 Follow-up WhatsApp conversion offer.
 */
router.post('/:id/send-offer', async (req, res) => {
  try {
    const { gymId, user } = req;
    const { id } = req.params;
    const { customDiscount = '15% Off' } = req.body;

    const lead = db.leads.findOne({ gymId, _id: id }) || db.leads.findOne({ gymId, leadId: id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const gym = db.gyms.findById(gymId);
    const gymTitle = gym?.gymName || 'FitManage Club';

    const offerMsg = `Hi ${lead.name}! ⏰\n\nHope you had an amazing trial session at *${gymTitle}*!\n\nReady to stay consistent and achieve your *${lead.fitnessGoal || 'fitness'}* goals? If you sign up for your membership this week, we have an exclusive *${customDiscount} Joining Offer* reserved for you! 🚀\n\nVisit our reception desk or reply here to secure your special rate.\n\nStay fit, stay strong! 🏋️‍♂️💪\n_${gymTitle}_`;

    const result = await whatsappService.sendAutomatedWhatsApp({
      gymId,
      customerId: lead.leadId,
      contactNumber: lead.phone,
      reminderType: 'trial_offer_day3',
      message: offerMsg,
      staffName: user.name || 'Sales Follow-up'
    });

    // Update history
    const historyEntry = {
      date: new Date().toISOString(),
      type: 'whatsapp',
      note: `Day 3 Follow-up special joining offer (${customDiscount}) sent via WhatsApp.`
    };
    db.leads.updateOne({ _id: lead._id }, {
      status: lead.status === 'trial_booked' ? 'contacted' : lead.status,
      history: [...(lead.history || []), historyEntry]
    });

    res.json({ message: `Day 3 Follow-up Offer sent to ${lead.name} via WhatsApp!`, result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send follow-up offer: ' + err.message });
  }
});

/**
 * POST /api/leads/:id/convert
 * 1-Click convert Lead into Customer with optional membership & upfront payment.
 */
router.post('/:id/convert', async (req, res) => {
  try {
    const { gymId, user } = req;
    const { id } = req.params;
    const {
      planName,
      startDate = new Date().toISOString().split('T')[0],
      durationDays = 30,
      amount = 0,
      paymentMethod = 'UPI'
    } = req.body;

    const lead = db.leads.findOne({ gymId, _id: id }) || db.leads.findOne({ gymId, leadId: id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead record not found.' });
    }

    // Check SaaS Platform Subscription Member Limit
    const gym = req.gym || db.gyms.findById(gymId);
    const sub = getGymSubscription(gym);
    const currentMembersCount = db.customers.find({ gymId }).length;

    if (sub && currentMembersCount >= sub.memberLimit) {
      return res.status(403).json({
        error: `Member limit reached (${currentMembersCount}/${sub.memberLimit} on ${sub.planName} plan). Upgrade your platform subscription to add more members.`,
        isLimitReached: true,
        currentCount: currentMembersCount,
        limit: sub.memberLimit,
        plan: sub.plan
      });
    }

    const customerId = generateCustomerId(gymId);

    // 1. Create active customer document
    const newCustomer = db.customers.insertOne({
      gymId,
      customerId,
      name: lead.name,
      gender: lead.gender || 'Male',
      dateOfBirth: '',
      profilePhoto: '',
      contacts: {
        primary: lead.phone
      },
      address: '',
      notes: `Converted from walk-in lead (${lead.leadId}). Goal: ${lead.fitnessGoal}. Notes: ${lead.notes || 'None'}`,
      convertedFromLeadId: lead.leadId,
      createdAt: new Date().toISOString()
    });

    // 2. If initial membership chosen, activate it
    let newMembership = null;
    let newPayment = null;

    if (planName) {
      const startObj = new Date(startDate);
      const endObj = new Date(startObj.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);
      const endDate = endObj.toISOString().split('T')[0];

      newMembership = db.memberships.insertOne({
        gymId,
        customerId,
        planName,
        startDate,
        endDate,
        amount: Number(amount) || 0,
        status: 'active',
        notes: `Initial membership upon conversion from lead (${lead.leadId})`,
        createdBy: user.name,
        createdAt: new Date().toISOString()
      });

      if (Number(amount) > 0) {
        newPayment = db.payments.insertOne({
          gymId,
          customerId,
          membershipId: newMembership._id,
          totalAmount: Number(amount),
          amountPaid: Number(amount),
          pendingAmount: 0,
          paymentMethod: paymentMethod || 'UPI',
          paymentDate: startDate,
          transactionReference: `PAY-${Date.now().toString().slice(-6)}`,
          notes: 'Joining membership payment cleared upfront',
          receivedBy: user.name,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 3. Update lead status to 'converted'
    const conversionHistory = {
      date: new Date().toISOString(),
      type: 'converted',
      note: `🎉 Successfully converted to gym member (${customerId}) by ${user.name}.`
    };

    db.leads.updateOne(
      { _id: lead._id },
      {
        status: 'converted',
        convertedToCustomerId: customerId,
        convertedAt: new Date().toISOString(),
        history: [...(lead.history || []), conversionHistory]
      }
    );

    // 4. Send Welcome WhatsApp message to new member
    const gymTitle = gym?.gymName || 'FitManage Club';
    const welcomeMsg = `Welcome to the ${gymTitle} family, ${lead.name}! 🎉🏋️‍♂️\n\nYour membership is officially active! (Member ID: *${customerId}*).\n\nWe are committed to helping you crush your *${lead.fitnessGoal || 'fitness'}* goals. Our certified trainers and front desk team are here to support you at every rep.\n\nLet's get to work! 💪🔥\n\n_${gymTitle}_`;

    whatsappService.sendAutomatedWhatsApp({
      gymId,
      customerId,
      contactNumber: lead.phone,
      reminderType: 'welcome',
      message: welcomeMsg,
      staffName: user.name || 'System'
    }).catch(err => console.warn('[Leads] Welcome dispatch warning:', err.message));

    res.status(201).json({
      success: true,
      message: `🎉 Success! ${lead.name} is now an active member (${customerId})!`,
      customer: newCustomer,
      membership: newMembership,
      payment: newPayment
    });
  } catch (err) {
    console.error('Error converting lead:', err);
    res.status(500).json({ error: 'Failed to convert lead to member: ' + err.message });
  }
});

/**
 * DELETE /api/leads/:id
 * Remove lead inquiry.
 */
router.delete('/:id', (req, res) => {
  try {
    const { gymId } = req;
    const { id } = req.params;

    const lead = db.leads.findOne({ gymId, _id: id }) || db.leads.findOne({ gymId, leadId: id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    db.leads.deleteOne({ _id: lead._id });
    res.json({ message: 'Lead record removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lead.' });
  }
});

export default router;
