class AppError extends Error {
  constructor(message, status = 500, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.expose = options.expose !== false;
    this.code = options.code || 'APP_ERROR';
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, { code: 'VALIDATION_ERROR' });
  }
}

class AuthenticationError extends AppError {
  constructor(message = '未授权访问') {
    super(message, 401, { code: 'AUTHENTICATION_ERROR' });
  }
}

class AuthorizationError extends AppError {
  constructor(message = '访问被拒绝') {
    super(message, 403, { code: 'AUTHORIZATION_ERROR' });
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, { code: 'CONFLICT_ERROR' });
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, { code: 'NOT_FOUND' });
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
};
