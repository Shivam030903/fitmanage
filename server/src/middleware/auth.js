import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fitmanage_super_secret_jwt_key_2026';

export function authMiddleware(req, res, next) {
  try {
    let token = null;

    // Check Authorization header: Bearer <token>, x-auth-token, or query param
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.users.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User account not found or deactivated.' });
    }

    const gym = user.gymId ? db.gyms.findById(user.gymId) : null;

    req.user = user;
    req.gym = gym;
    req.gymId = user.gymId;
    req.role = user.role;
    req.isSuperAdmin = user.role === 'superadmin' || Boolean(user.isSuperAdmin);

    // If gym is locked, block write/read operations except subscription billing and profile read
    if (gym && gym.isLocked && !req.isSuperAdmin) {
      const allowedPaths = ['/api/subscription', '/api/auth/me', '/api/auth/logout'];
      const currentUrl = req.originalUrl || req.url || '';
      const isAllowed = allowedPaths.some(p => currentUrl.startsWith(p));

      if (!isAllowed) {
        return res.status(403).json({
          error: `Your gym account has been locked. Reason: ${gym.lockReason || 'Subscription lapsed'}. Please renew your platform subscription to resume operations.`,
          isLocked: true,
          lockReason: gym.lockReason || 'Subscription lapsed'
        });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function roleCheck(allowedRoles = []) {
  return (req, res, next) => {
    // SuperAdmin always has full master access
    if (req.isSuperAdmin) {
      return next();
    }
    if (!req.role || !allowedRoles.includes(req.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions for this action.' });
    }
    next();
  };
}
