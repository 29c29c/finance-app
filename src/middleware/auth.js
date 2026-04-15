const jwt = require('jsonwebtoken');

function createAuthMiddleware(config) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ error: '未登录或登录已过期' });
      return;
    }

    jwt.verify(token, config.jwtSecret, (error, user) => {
      if (error) {
        res.status(403).json({ error: '登录状态无效，请重新登录' });
        return;
      }

      req.user = user;
      next();
    });
  };
}

module.exports = {
  createAuthMiddleware,
};
