const path = require('path');

function parseInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseTrustProxy(value) {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  return value;
}

function loadConfig(overrides = {}) {
  const env = { ...process.env, ...overrides };
  const config = {
    port: typeof env.PORT === 'number' ? env.PORT : parseInteger(env.PORT, 3000),
    jwtSecret: env.JWT_SECRET || '',
    adminInviteCode: env.ADMIN_INVITE_CODE || '',
    dbFile: env.DB_FILE ? path.resolve(env.DB_FILE) : path.join(process.cwd(), 'finance.db'),
    nodeEnv: env.NODE_ENV || 'development',
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    rateLimitWindowMs: parseInteger(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    rateLimitMax: parseInteger(env.RATE_LIMIT_MAX, 10),
    jsonLimit: env.JSON_LIMIT || '1mb',
  };

  const missing = [];
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (!config.adminInviteCode) missing.push('ADMIN_INVITE_CODE');

  if (missing.length > 0) {
    throw new Error(`缺少必需环境变量: ${missing.join(', ')}`);
  }

  return config;
}

module.exports = {
  loadConfig,
};
