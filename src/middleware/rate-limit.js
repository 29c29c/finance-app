function createRateLimiter({ windowMs, max, message, keyGenerator }) {
  const hits = new Map();

  function cleanup(now) {
    for (const [key, record] of hits.entries()) {
      if (record.resetAt <= now) {
        hits.delete(key);
      }
    }
  }

  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 1000) {
      cleanup(now);
    }

    const key = keyGenerator ? keyGenerator(req) : req.ip;
    const existing = hits.get(key);
    const bucket = existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    hits.set(key, bucket);

    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ error: message || '请求过于频繁，请稍后再试' });
      return;
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
};
