import express from 'express';
import { db } from '../db.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';
import { enrichCustomer } from './customers.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * POST /api/attendance/check-in
 * Validate member access via QR code or manual identifier, record check-in, and sync studio occupancy.
 */
router.post('/check-in', (req, res) => {
  try {
    const { gymId, user } = req;
    const { identifier, source = 'reception_qr' } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Customer ID, Phone, or QR code data is required.' });
    }

    const cleanInput = identifier.trim();
    const cleanPhone = cleanInput.replace(/\D/g, '').slice(-10);

    // Locate customer by customerId, _id, or phone
    const allCustomers = db.customers.find({ gymId });
    const customer = allCustomers.find(c => {
      if (c.customerId && c.customerId.toLowerCase() === cleanInput.toLowerCase()) return true;
      if (c._id === cleanInput) return true;
      const p = (c.contacts?.primary || '').replace(/\D/g, '').slice(-10);
      return cleanPhone.length === 10 && p === cleanPhone;
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        accessGranted: false,
        accessStatus: 'not_found',
        message: `No member record found for identifier: "${cleanInput}". Please check the ID or register customer.`
      });
    }

    const enriched = enrichCustomer(customer, gymId);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const checkInHour = now.getHours();

    let accessGranted = false;
    let accessStatus = 'denied';
    let message = '';
    let alertType = 'error'; // 'success' | 'warning' | 'error'

    const currentStatus = enriched.currentStatus;
    const memb = enriched.currentMembership;
    const balance = enriched.outstandingBalance || 0;

    if (currentStatus === 'active') {
      accessGranted = true;
      if (balance > 0) {
        accessStatus = 'warning_due';
        alertType = 'warning';
        message = `Access Granted! Welcome ${enriched.name}. ⚠️ Note: ₹${balance.toLocaleString('en-IN')} pending balance due.`;
      } else {
        accessStatus = 'granted';
        alertType = 'success';
        message = `Access Granted! Welcome back, ${enriched.name}! 💪`;
      }
    } else if (currentStatus === 'expiring_soon') {
      accessGranted = true;
      accessStatus = 'warning_expiring';
      alertType = 'warning';
      message = `Access Granted! Welcome ${enriched.name}. ⏰ Membership expires in ${enriched.daysRemaining} days (${memb?.endDate}).`;
    } else if (currentStatus === 'upcoming') {
      accessGranted = false;
      accessStatus = 'denied_upcoming';
      alertType = 'error';
      message = `Access Denied: Membership starts on ${memb?.startDate}. Future plan not yet active.`;
    } else if (currentStatus === 'expired') {
      accessGranted = false;
      accessStatus = 'denied_expired';
      alertType = 'error';
      const daysPast = Math.abs(enriched.daysRemaining);
      message = `Access Denied: Membership expired ${daysPast} day${daysPast === 1 ? '' : 's'} ago on ${memb?.endDate || 'N/A'}. Renewal required.`;
    } else if (currentStatus === 'cancelled') {
      accessGranted = false;
      accessStatus = 'denied_cancelled';
      alertType = 'error';
      message = `Access Denied: Membership was cancelled. Please see front desk.`;
    } else {
      accessGranted = false;
      accessStatus = 'denied_unsubscribed';
      alertType = 'error';
      message = `Access Denied: No active membership subscription found for ${enriched.name}.`;
    }

    // Record check-in in attendance collection
    const checkInRecord = db.attendance.insertOne({
      gymId,
      customerId: enriched.customerId,
      customerName: enriched.name,
      customerPhone: enriched.contacts?.primary || '',
      profilePhoto: enriched.profilePhoto || '',
      planName: memb?.planName || 'No Plan',
      planExpiry: memb?.endDate || '',
      membershipStatus: currentStatus,
      accessGranted,
      accessStatus,
      outstandingBalance: balance,
      source,
      date: todayStr,
      time: timeStr,
      checkInTime: now.toISOString(),
      checkInHour,
      checkedInBy: user.name
    });

    // If access was granted, calculate live floor occupancy
    let liveOccupancy = null;
    if (accessGranted) {
      const gym = db.gyms.findById(gymId);
      const occupancyConf = gym?.settings?.occupancy || {};
      const maxCapacity = Number(occupancyConf.maxCapacity) || 50;

      // Count check-ins in the last 90 minutes
      const ninetyMinsAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();
      const recentCheckins = db.attendance.find({ gymId })
        .filter(a => a.accessGranted && a.checkInTime >= ninetyMinsAgo);

      // Unique members on floor
      const uniqueOnFloor = new Set(recentCheckins.map(a => a.customerId)).size;
      const updatedCount = Math.max(1, uniqueOnFloor);

      db.gyms.updateOne(
        { _id: gymId },
        {
          settings: {
            ...gym.settings,
            occupancy: {
              ...occupancyConf,
              currentMembers: updatedCount
            }
          }
        }
      );

      liveOccupancy = {
        currentMembers: updatedCount,
        maxCapacity,
        percentage: Math.min(100, Math.round((updatedCount / maxCapacity) * 100))
      };
    }

    res.json({
      success: true,
      accessGranted,
      accessStatus,
      alertType,
      message,
      customer: enriched,
      currentMembership: memb,
      checkInRecord,
      liveOccupancy
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Failed to process member check-in.' });
  }
});

/**
 * GET /api/attendance
 * List check-in logs with date and status filters
 */
router.get('/', (req, res) => {
  try {
    const { gymId } = req;
    const { date, status, search } = req.query;

    const targetDate = date || new Date().toISOString().split('T')[0];
    let logs = db.attendance.find({ gymId, date: targetDate });

    if (status && status !== 'all') {
      if (status === 'granted') {
        logs = logs.filter(l => l.accessGranted);
      } else if (status === 'denied') {
        logs = logs.filter(l => !l.accessGranted);
      }
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      logs = logs.filter(l => 
        (l.customerName && l.customerName.toLowerCase().includes(q)) ||
        (l.customerId && l.customerId.toLowerCase().includes(q)) ||
        (l.customerPhone && l.customerPhone.includes(q))
      );
    }

    // Sort descending (latest check-in first)
    logs.sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));

    res.json({
      date: targetDate,
      total: logs.length,
      grantedCount: logs.filter(l => l.accessGranted).length,
      deniedCount: logs.filter(l => !l.accessGranted).length,
      logs
    });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ error: 'Failed to retrieve attendance logs.' });
  }
});

/**
 * GET /api/attendance/stats
 * Daily attendance metrics & hourly breakdown for peak-hour chart
 */
router.get('/stats', (req, res) => {
  try {
    const { gymId } = req;
    const todayStr = new Date().toISOString().split('T')[0];

    const todayLogs = db.attendance.find({ gymId, date: todayStr });
    const granted = todayLogs.filter(l => l.accessGranted);
    const denied = todayLogs.filter(l => !l.accessGranted);

    // Hourly check-in distribution (6 AM to 10 PM)
    const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    const hourlyData = hours.map(h => {
      const count = granted.filter(l => l.checkInHour === h).length;
      const label = h > 12 ? `${h - 12} PM` : (h === 12 ? '12 PM' : `${h} AM`);
      return { hour: label, checkIns: count };
    });

    const gym = db.gyms.findById(gymId);
    const occupancy = gym?.settings?.occupancy || { currentMembers: 18, maxCapacity: 50 };

    res.json({
      todayDate: todayStr,
      totalCheckIns: todayLogs.length,
      grantedCount: granted.length,
      deniedCount: denied.length,
      hourlyData,
      liveOccupancy: {
        currentMembers: Number(occupancy.currentMembers) || 0,
        maxCapacity: Number(occupancy.maxCapacity) || 50,
        percentage: Math.min(100, Math.round(((Number(occupancy.currentMembers) || 0) / (Number(occupancy.maxCapacity) || 50)) * 100))
      }
    });
  } catch (err) {
    console.error('Attendance stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve attendance statistics.' });
  }
});

/**
 * DELETE /api/attendance/:id
 * Delete check-in record
 */
router.delete('/:id', roleCheck(['owner', 'admin']), (req, res) => {
  try {
    const { gymId } = req;
    const { id } = req.params;

    const record = db.attendance.findOne({ gymId, _id: id });
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    db.attendance.deleteOne({ _id: id });
    res.json({ message: 'Attendance record removed.' });
  } catch (err) {
    console.error('Delete attendance error:', err);
    res.status(500).json({ error: 'Failed to remove attendance record.' });
  }
});

export default router;