const { AppError, NotFoundError } = require('../errors');

function notFoundHandler(req, _res, next) {
  next(new NotFoundError('资源不存在'));
}

function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error.type === 'entity.too.large') {
    res.status(413).json({ error: '请求体过大' });
    return;
  }

  if (error instanceof SyntaxError && Object.prototype.hasOwnProperty.call(error, 'body')) {
    res.status(400).json({ error: 'JSON 格式错误' });
    return;
  }

  const normalizedError = error instanceof AppError
    ? error
    : new AppError('服务器内部错误', 500, { expose: false });

  if (normalizedError.status >= 500) {
    console.error(error);
  }

  res.status(normalizedError.status).json({
    error: normalizedError.expose ? normalizedError.message : '服务器内部错误',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
