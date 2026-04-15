const { ValidationError } = require('../errors');
const {
  requireString,
  requireFiniteNumber,
  requireEnum,
  requireMonth,
  requireDate,
  requirePositiveInteger,
} = require('./common');

const ALLOWED_CATEGORIES = ['shopping', 'food', 'transport', 'subscription'];
const ALLOWED_SERIAL_STATUS = ['planned', 'ordered', 'paid', 'delayed'];
const ALLOWED_CYCLES = ['monthly', 'yearly', 'quarterly'];

function validateDashboardQuery(query) {
  return {
    month: requireMonth(query.month),
  };
}

function validateSubscriptionPayload(payload) {
  const rawActive = payload.is_active;
  let isActive = false;
  if (rawActive !== undefined) {
    if (typeof rawActive === 'boolean') {
      isActive = rawActive;
    } else if (rawActive === 0 || rawActive === 1 || rawActive === '0' || rawActive === '1') {
      isActive = Number(rawActive) === 1;
    } else {
      throw new ValidationError('订阅开关不合法');
    }
  }

  return {
    name: requireString(payload.name, '名称', { minLength: 1, maxLength: 120 }),
    price: requireFiniteNumber(payload.price, '金额', { min: 0, max: 99999999 }),
    cycle_type: requireEnum(payload.cycle_type, '周期', ALLOWED_CYCLES),
    first_payment_date: requireDate(payload.first_payment_date, '首次支付日期'),
    is_active: isActive ? 1 : 0,
  };
}

function validateSerialPayload(payload) {
  return {
    name: requireString(payload.name, '名称', { minLength: 1, maxLength: 120 }),
    price: requireFiniteNumber(payload.price, '金额', { min: 0, max: 99999999 }),
    status: requireEnum(payload.status, '状态', ALLOWED_SERIAL_STATUS),
    expected_release_date: requireMonth(payload.expected_release_date, '预计发售月份'),
  };
}

function validateLedgerPayload(payload) {
  return {
    date: requireDate(payload.date, '日期'),
    category: requireEnum(payload.category, '分类', ALLOWED_CATEGORIES),
    name: requireString(payload.name, '名称', { minLength: 1, maxLength: 160 }),
    amount: requireFiniteNumber(payload.amount, '金额', { min: 0, max: 99999999 }),
  };
}

function validateBudgetPayload(payload) {
  return {
    month: requireMonth(payload.month),
    amount: requireFiniteNumber(payload.amount, '预算金额', { min: 0, max: 99999999 }),
  };
}

function validateImportPayload(payload) {
  if (!Array.isArray(payload.items)) {
    throw new ValidationError('导入数据格式错误');
  }

  if (payload.items.length > 500) {
    throw new ValidationError('单次最多导入500条记录');
  }

  return {
    items: payload.items.map(validateLedgerPayload),
  };
}

function validateAdvancePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('结算参数不合法');
  }

  return {
    expense: validateLedgerPayload(payload.expense),
    next: {
      name: requireString(payload.next?.name, '下期名称', { minLength: 1, maxLength: 120 }),
      price: requireFiniteNumber(payload.next?.price, '下期金额', { min: 0, max: 99999999 }),
      date: requireMonth(payload.next?.date, '下期月份'),
    },
  };
}

function validateRecordId(recordId) {
  return requirePositiveInteger(recordId, '记录ID');
}

module.exports = {
  validateDashboardQuery,
  validateSubscriptionPayload,
  validateSerialPayload,
  validateLedgerPayload,
  validateBudgetPayload,
  validateImportPayload,
  validateAdvancePayload,
  validateRecordId,
};
