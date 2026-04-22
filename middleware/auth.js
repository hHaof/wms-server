const { verifyAccessToken } = require('../config/tokens');

// DEMO_MODE bypass removed — all requests must carry a valid JWT.
// Previously, DEMO_MODE injected { id: 'demo' } which is not a valid MongoDB
// ObjectId, causing Product.create({ createdBy: 'demo' }) to throw a
// CastError silently swallowed by the frontend's demo-mode 401 handler.

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };