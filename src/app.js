const path = require('path');
const express = require('express');

const { createDatabase } = require('./db');
const { createAuthMiddleware } = require('./middleware/auth');
const { createRateLimiter } = require('./middleware/rate-limit');
const { applySecurityHeaders } = require('./middleware/security');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { createAuthService } = require('./services/authService');
const { createAiService } = require('./services/aiService');
const { createFinanceService } = require('./services/financeService');
const { createAuthRouter } = require('./routes/auth');
const { createFinanceRouter } = require('./routes/finance');

async function createApp(config) {
  const db = await createDatabase(config);
  const authService = createAuthService({ db, config });
  const aiService = createAiService({ db });
  const financeService = createFinanceService({ db });
  const authenticate = createAuthMiddleware(config);
  const authRateLimiter = createRateLimiter({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    message: '登录或注册尝试过于频繁，请稍后再试',
    keyGenerator: (req) => {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : 'anonymous';
      return `${req.ip}:${req.path}:${username}`;
    },
  });

  const app = express();
  const publicDir = path.join(process.cwd(), 'public');

  if (config.trustProxy !== false) {
    app.set('trust proxy', config.trustProxy);
  }

  app.disable('x-powered-by');
  app.use(applySecurityHeaders(config));
  app.use(express.json({ limit: config.jsonLimit }));
  app.use(
    express.static(publicDir, {
      extensions: ['html'],
      index: false,
      maxAge: config.nodeEnv === 'production' ? '1h' : 0,
    }),
  );

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use('/api', createAuthRouter({ authService, authRateLimiter }));
  app.use('/api', createFinanceRouter({ financeService, aiService, authenticate }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, db };
}

module.exports = {
  createApp,
};
