const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const { writeAudit } = require('./audit-log');

const refreshTokens = new Map();

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles || [],
      name: user.name || '',
    },
    config.jwtSecret,
    { expiresIn: '15m' }
  );
}

function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = uuidv4();
  refreshTokens.set(refreshToken, {
    userId: user.id,
    email: user.email,
    roles: user.roles || [],
    name: user.name || '',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return { accessToken, refreshToken };
}

function consumeRefreshToken(token) {
  const payload = refreshTokens.get(token);
  if (!payload) return null;
  if (Date.now() > payload.expiresAt) {
    refreshTokens.delete(token);
    return null;
  }
  refreshTokens.delete(token);
  return payload;
}

function findUser(email, password) {
  const normalized = String(email || '').toLowerCase();
  return config.users.find((u) => u.email.toLowerCase() === normalized && u.password === password) || null;
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : '';
  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing token' });
  }
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch (_err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    if (!roles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Insufficient role' });
    }
    return next();
  };
}

function requireServiceToken(req, res, next) {
  if (!config.apiToken) return next();
  const token = req.headers['x-judge-service-token'];
  if (token !== config.apiToken) {
    return res.status(401).json({ success: false, message: 'Invalid service token' });
  }
  return next();
}

function registerAuthRoutes(app) {
  app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const user = findUser(email, password);
    if (!user) {
      writeAudit({ action: 'auth.login_failed', email: email || '', ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const tokens = issueTokens(user);
    writeAudit({ action: 'auth.login', userId: user.id, email: user.email, ip: req.ip });
    return res.json({
      success: true,
      user: { id: user.id, email: user.email, roles: user.roles || [], name: user.name || '' },
      ...tokens,
    });
  });

  app.post('/api/v1/auth/refresh', (req, res) => {
    const { refreshToken } = req.body || {};
    const payload = consumeRefreshToken(refreshToken);
    if (!payload) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const user = {
      id: payload.userId,
      email: payload.email,
      roles: payload.roles,
      name: payload.name,
    };
    const tokens = issueTokens(user);
    writeAudit({ action: 'auth.refresh', userId: user.id, email: user.email, ip: req.ip });
    return res.json({ success: true, ...tokens });
  });

  app.get('/api/v1/users/me', requireAuth, (req, res) => {
    return res.json({
      success: true,
      user: {
        id: req.user.sub,
        email: req.user.email,
        roles: req.user.roles || [],
        name: req.user.name || '',
      },
    });
  });
}

module.exports = {
  registerAuthRoutes,
  requireAuth,
  requireRole,
  requireServiceToken,
  writeAudit,
};
