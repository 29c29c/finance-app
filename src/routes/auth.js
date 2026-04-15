const express = require('express');

const { asyncHandler } = require('../utils/async-handler');

function createAuthRouter({ authService, authRateLimiter }) {
  const router = express.Router();

  router.post(
    '/register',
    authRateLimiter,
    asyncHandler(async (req, res) => {
      const result = await authService.register(req.body);
      res.json(result);
    }),
  );

  router.post(
    '/login',
    authRateLimiter,
    asyncHandler(async (req, res) => {
      const result = await authService.login(req.body);
      res.json(result);
    }),
  );

  return router;
}

module.exports = {
  createAuthRouter,
};
