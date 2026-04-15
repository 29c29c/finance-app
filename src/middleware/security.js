function applySecurityHeaders(_config) {
  return (req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "connect-src 'self'",
        "font-src 'self'",
        "img-src 'self' data: blob:",
        "object-src 'none'",
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com",
        "style-src 'self' 'unsafe-inline'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
  };
}

module.exports = {
  applySecurityHeaders,
};
