import express from 'express';
import { db } from '../db.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

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
          ...settings
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

export default router;
