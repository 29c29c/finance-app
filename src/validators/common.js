const { ValidationError } = require('../errors');

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function requireString(value, fieldName, options = {}) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName}格式错误`);
  }

  const trimmed = value.trim();
  if (options.minLength && trimmed.length < options.minLength) {
    throw new ValidationError(`${fieldName}长度不能少于${options.minLength}位`);
  }

  if (options.maxLength && trimmed.length > options.maxLength) {
    throw new ValidationError(`${fieldName}长度不能超过${options.maxLength}位`);
  }

  return trimmed;
}

function requireFiniteNumber(value, fieldName, options = {}) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new ValidationError(`${fieldName}必须是有效数字`);
  }

  if (options.min !== undefined && number < options.min) {
    throw new ValidationError(`${fieldName}不能小于${options.min}`);
  }

  if (options.max !== undefined && number > options.max) {
    throw new ValidationError(`${fieldName}不能大于${options.max}`);
  }

  return Number(number.toFixed(2));
}

function requireEnum(value, fieldName, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(`${fieldName}不合法`);
  }

  return value;
}

function requireMonth(value, fieldName = '月份') {
  const month = requireString(value, fieldName, { minLength: 7, maxLength: 7 });
  if (!MONTH_PATTERN.test(month)) {
    throw new ValidationError(`${fieldName}格式错误`);
  }

  return month;
}

function requireDate(value, fieldName = '日期') {
  const date = requireString(value, fieldName, { minLength: 10, maxLength: 10 });
  if (!DATE_PATTERN.test(date)) {
    throw new ValidationError(`${fieldName}格式错误`);
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ValidationError(`${fieldName}格式错误`);
  }

  return date;
}

function requirePositiveInteger(value, fieldName) {
  const number = Number.parseInt(value, 10);
  if (!Number.isInteger(number) || number <= 0) {
    throw new ValidationError(`${fieldName}不合法`);
  }

  return number;
}

module.exports = {
  requireString,
  requireFiniteNumber,
  requireEnum,
  requireMonth,
  requireDate,
  requirePositiveInteger,
};
