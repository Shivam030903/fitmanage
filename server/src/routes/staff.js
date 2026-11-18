import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/staff - List gym staff
router.get('/', (req, res) => {
  try {
    const { gymId } = req;
    const staff = db.users.find({ gymId }).map(u => {
      const { password, ...safe } = u;
      return safe;
    });
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve staff.' });
  }
});

// POST /api/staff - Create new staff (owner/admin only)
router.post('/', roleCheck(['owner', 'admin']), async (req, res) => {
  try {
    const { gymId } = req;
    const { name, email, password, role = 'receptionist', phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = db.users.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = db.users.insertOne({
      gymId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: passwordHash,
      role,
      phone: phone || ''
    });

    const { password: _, ...safe } = newUser;
    res.status(201).json({ message: 'Staff member added successfully.', staff: safe });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add staff member.' });
  }
});

// DELETE /api/staff/:id - Remove staff (owner only)
router.delete('/:id', roleCheck(['owner']), (req, res) => {
  try {
    const { gymId, user } = req;
    const { id } = req.params;

    if (id === user._id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const target = db.users.findOne({ gymId, _id: id });
    if (!target) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    db.users.deleteOne({ _id: id });
    res.json({ message: 'Staff member removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove staff member.' });
  }
});

export default router;
