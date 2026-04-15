const { ValidationError } = require('../errors');
const { requireEnum, requireMonth, requirePositiveInteger, requireString } = require('./common');

const ALLOWED_PROVIDERS = ['deepseek', 'openai-compatible'];
const ALLOWED_SCOPES = ['day', 'month', 'year'];

function validateAiSettingsPayload(payload) {
  const provider = requireEnum(payload.provider, 'AI 提供商', ALLOWED_PROVIDERS);
  const endpointUrl = requireString(payload.endpointUrl, '接口地址', { minLength: 1, maxLength: 500 });
  const model = requireString(payload.model, '模型', { minLength: 1, maxLength: 100 });
  const rawApiKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
  if (rawApiKey.length > 500) {
    throw new ValidationError('API Key 长度不能超过500位');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(endpointUrl);
  } catch (_error) {
    throw new ValidationError('接口地址格式错误');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new ValidationError('接口地址格式错误');
  }

  return {
    provider,
    endpointUrl: parsedUrl.toString(),
    model,
    apiKey: rawApiKey,
  };
}

function validateAiAnalysisPayload(payload) {
  const scope = requireEnum(payload.scope, '分析范围', ALLOWED_SCOPES);
  const result = { scope };

  if (scope === 'day') {
    result.date = requireString(payload.date, '日期', { minLength: 10, maxLength: 10 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.date)) {
      throw new ValidationError('日期格式错误');
    }
  }

  if (scope === 'month') {
    result.month = requireMonth(payload.month, '月份');
  }

  if (scope === 'year') {
    const year = requirePositiveInteger(payload.year, '年份');
    if (year < 2000 || year > 9999) {
      throw new ValidationError('年份格式错误');
    }
    result.year = year;
  }

  return result;
}

module.exports = {
  validateAiSettingsPayload,
  validateAiAnalysisPayload,
};
