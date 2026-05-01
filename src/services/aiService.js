const { AppError, ValidationError } = require('../errors');
const aiRepository = require('../repositories/aiRepository');
const financeRepository = require('../repositories/financeRepository');
const { validateAiSettingsPayload, validateAiAnalysisPayload } = require('../validators/aiValidators');

const CATEGORY_LABELS = {
  shopping: '购物/连载',
  food: '食品',
  transport: '交通',
  subscription: '订阅',
};

const DEFAULT_AI_SETTINGS = {
  provider: 'deepseek',
  endpointUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-v4-flash',
};

const DEEPSEEK_MODEL_ALIASES = {
  'deepseek-chat': 'deepseek-v4-flash',
  'deepseek-reasoner': 'deepseek-v4-flash',
};

function normalizeDeepSeekModel(provider, model) {
  if (provider !== 'deepseek') return model;
  return DEEPSEEK_MODEL_ALIASES[model] || model;
}

function getBeijingIsoString() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(now).replace(' ', 'T');
}

function aggregateRankings(ledgerItems) {
  const map = new Map();

  ledgerItems.forEach((item) => {
    const key = `${item.category || 'shopping'}::${item.name}`;
    if (!map.has(key)) {
      map.set(key, {
        name: item.name,
        category: item.category || 'shopping',
        total: 0,
        count: 0,
      });
    }

    const row = map.get(key);
    row.total += Number(item.amount) || 0;
    row.count += 1;
  });

  return [...map.values()].sort((left, right) => right.total - left.total);
}

function buildCategoryBreakdown(ledgerItems) {
  return ledgerItems.reduce((accumulator, item) => {
    const category = item.category || 'shopping';
    accumulator[category] = (accumulator[category] || 0) + (Number(item.amount) || 0);
    return accumulator;
  }, {
    shopping: 0,
    food: 0,
    transport: 0,
    subscription: 0,
  });
}

function filterByMonth(items, month) {
  return items.filter((item) => String(item.date || '').slice(0, 7) === month);
}

function filterByYear(items, year) {
  return items.filter((item) => Number.parseInt(String(item.date || '').slice(0, 4), 10) === year);
}

function filterByDay(items, date) {
  return items.filter((item) => item.date === date);
}

function buildMonthlySummaries(ledgerItems) {
  const bucket = new Map();

  ledgerItems.forEach((item) => {
    const month = String(item.date || '').slice(0, 7);
    if (!bucket.has(month)) {
      bucket.set(month, 0);
    }
    bucket.set(month, bucket.get(month) + (Number(item.amount) || 0));
  });

  return [...bucket.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

function buildDailySummaries(ledgerItems) {
  const bucket = new Map();

  ledgerItems.forEach((item) => {
    const date = item.date;
    if (!bucket.has(date)) {
      bucket.set(date, 0);
    }
    bucket.set(date, bucket.get(date) + (Number(item.amount) || 0));
  });

  return [...bucket.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildTopCategories(categoryBreakdown) {
  return Object.entries(categoryBreakdown)
    .map(([category, total]) => ({
      category,
      categoryLabel: CATEGORY_LABELS[category] || category,
      total: Number((Number(total) || 0).toFixed(2)),
    }))
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total);
}

function getPeriodKey(payload) {
  if (payload.scope === 'day') return payload.date;
  if (payload.scope === 'month') return payload.month;
  return String(payload.year);
}

function buildAnalysisSummary(scope, payload, allData) {
  const ledgerItems = allData.ledger_items || [];
  const subscriptions = allData.subscriptions || [];
  const serials = allData.serials || [];
  const budgets = allData.budgets || [];

  let scopedLedger = [];
  let label = '';
  let budget = null;

  if (scope === 'day') {
    scopedLedger = filterByDay(ledgerItems, payload.date);
    label = payload.date;
    budget = budgets.find((item) => item.month_str === payload.date.slice(0, 7))?.budget_amount ?? null;
  }

  if (scope === 'month') {
    scopedLedger = filterByMonth(ledgerItems, payload.month);
    label = payload.month;
    budget = budgets.find((item) => item.month_str === payload.month)?.budget_amount ?? null;
  }

  if (scope === 'year') {
    scopedLedger = filterByYear(ledgerItems, payload.year);
    label = String(payload.year);
    budget = null;
  }

  const totalExpense = scopedLedger.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const rankings = aggregateRankings(scopedLedger);
  const categoryBreakdown = buildCategoryBreakdown(scopedLedger);
  const monthlySummaries = scope === 'year' ? buildMonthlySummaries(scopedLedger) : [];
  const dailySummaries = scope === 'month' ? buildDailySummaries(scopedLedger) : [];
  const topCategories = buildTopCategories(categoryBreakdown);
  const highestExpense = scopedLedger
    .map((item) => ({
      name: item.name,
      category: item.category || 'shopping',
      categoryLabel: CATEGORY_LABELS[item.category] || item.category,
      amount: Number((Number(item.amount) || 0).toFixed(2)),
      date: item.date,
    }))
    .sort((left, right) => right.amount - left.amount)[0] || null;

  const plannedSubscriptionImpact = scope === 'month'
    ? subscriptions.reduce((sum, item) => {
      if (!Number(item.is_active)) return sum;
      if (item.cycle_type === 'yearly') return sum + ((Number(item.price) || 0) / 12);
      if (item.cycle_type === 'quarterly') return sum + ((Number(item.price) || 0) / 3);
      return sum + (Number(item.price) || 0);
    }, 0)
    : 0;

  const plannedSerialImpact = scope === 'month'
    ? serials
      .filter((item) => item.expected_release_date === payload.month && item.status !== 'paid')
      .reduce((sum, item) => sum + (Number(item.price) || 0), 0)
    : 0;

  const highestSpendDay = dailySummaries
    .map((item) => ({ ...item, total: Number(item.total.toFixed(2)) }))
    .sort((left, right) => right.total - left.total)[0] || null;
  const highestSpendMonth = monthlySummaries
    .map((item) => ({ ...item, total: Number(item.total.toFixed(2)) }))
    .sort((left, right) => right.total - left.total)[0] || null;
  const averagePerRecord = scopedLedger.length > 0 ? totalExpense / scopedLedger.length : 0;
  const activeDays = new Set(scopedLedger.map((item) => item.date)).size;
  const activeMonths = new Set(scopedLedger.map((item) => String(item.date || '').slice(0, 7))).size;

  return {
    scope,
    label,
    periodKey: getPeriodKey({ scope, ...payload }),
    incomeTotal: 0,
    incomeNote: '当前数据库仅记录支出，没有独立收入字段；收入统计按 0 处理。',
    budget,
    totalExpense: Number(totalExpense.toFixed(2)),
    totalRecords: scopedLedger.length,
    averagePerRecord: Number(averagePerRecord.toFixed(2)),
    activeDays,
    activeMonths,
    categoryBreakdown,
    topCategories,
    highestExpense,
    highestSpendDay,
    highestSpendMonth,
    rankings: rankings.slice(0, 15).map((item) => ({
      name: item.name,
      category: item.category,
      categoryLabel: CATEGORY_LABELS[item.category] || item.category,
      total: Number(item.total.toFixed(2)),
      count: item.count,
    })),
    dailySummaries: dailySummaries.map((item) => ({
      date: item.date,
      total: Number(item.total.toFixed(2)),
    })),
    monthlySummaries: monthlySummaries.map((item) => ({
      month: item.month,
      total: Number(item.total.toFixed(2)),
    })),
    plannedSubscriptionImpact: Number(plannedSubscriptionImpact.toFixed(2)),
    plannedSerialImpact: Number(plannedSerialImpact.toFixed(2)),
    actualSubscriptionExpense: Number((categoryBreakdown.subscription || 0).toFixed(2)),
  };
}

function formatRankings(rankings) {
  return rankings.length > 0
    ? rankings.map((item, index) => `${index + 1}. ${item.name}（${item.categoryLabel}）¥${item.total}，${item.count}笔`).join('\n')
    : '无支出记录';
}

function formatTopCategories(topCategories) {
  return topCategories.length > 0
    ? topCategories.map((item, index) => `${index + 1}. ${item.categoryLabel} ¥${item.total}`).join('\n')
    : '无';
}

function formatDailySummaries(dailySummaries) {
  return dailySummaries.length > 0
    ? dailySummaries.map((item) => `${item.date}: ¥${item.total}`).join('\n')
    : '无';
}

function formatMonthlySummaries(monthlySummaries) {
  return monthlySummaries.length > 0
    ? monthlySummaries.map((item) => `${item.month}: ¥${item.total}`).join('\n')
    : '无';
}

function buildDayPrompt(summary) {
  const rankings = formatRankings(summary.rankings);
  const topCategories = formatTopCategories(summary.topCategories);

  return [
    '你是一名中文日消费复盘助手，请只围绕“单日支出”做分析。',
    '分析重点：',
    '1. 判断今天支出是否集中、是否存在冲动型或大额单笔消费。',
    '2. 识别今天最值得关注的 1-3 笔支出，以及这些支出对当天结构的影响。',
    '3. 判断今天的消费重心落在哪些类别，是否偏离常规。',
    '4. 给出今天结束后可执行的 3 条建议，偏向明天就能执行的控制动作。',
    '5. 不要写月度或年度趋势判断，除非数据里明确给出当天与月预算的关系。',
    '6. 如果没有收入数据，要明确说明“当前仅基于支出数据分析”。',
    '',
    `日期: ${summary.label}`,
    `收入说明: ${summary.incomeNote}`,
    `当日支出总额: ¥${summary.totalExpense}`,
    `当日记录笔数: ${summary.totalRecords}`,
    `单笔平均金额: ¥${summary.averagePerRecord}`,
    `当月预算: ${summary.budget === null ? '未设置' : `¥${summary.budget}`}`,
    `当日订阅已入账金额: ¥${summary.actualSubscriptionExpense}`,
    `最大单笔: ${summary.highestExpense ? `${summary.highestExpense.date} ${summary.highestExpense.name}（${summary.highestExpense.categoryLabel}）¥${summary.highestExpense.amount}` : '无'}`,
    '当日类别分布:',
    topCategories,
    '当日名称排行:',
    rankings,
  ].join('\n');
}

function buildMonthPrompt(summary) {
  const rankings = formatRankings(summary.rankings);
  const topCategories = formatTopCategories(summary.topCategories);
  const dailyLines = formatDailySummaries(summary.dailySummaries);

  return [
    '你是一名中文月度消费分析助手，请只围绕“单月支出”做分析。',
    '分析重点：',
    '1. 判断本月支出是否接近或超过预算，说明主要原因。',
    '2. 分析本月类别结构、 recurring 支出压力（订阅）与计划支出压力（连载）。',
    '3. 找出本月最高支出日、最大单笔、最主要的消费项目，并解释它们对全月的影响。',
    '4. 给出 3 条下个月可执行的优化建议，优先针对预算、订阅和高频支出。',
    '5. 必须结合本月的类别、金额、排行、单日峰值来分析，不要写成日度复盘或年度趋势。',
    '6. 如果没有收入数据，要明确说明“当前仅基于支出数据分析”。',
    '',
    `月份: ${summary.label}`,
    `收入说明: ${summary.incomeNote}`,
    `本月支出总额: ¥${summary.totalExpense}`,
    `本月预算: ${summary.budget === null ? '未设置' : `¥${summary.budget}`}`,
    `本月记录笔数: ${summary.totalRecords}`,
    `有支出天数: ${summary.activeDays}`,
    `单笔平均金额: ¥${summary.averagePerRecord}`,
    `订阅已记入实际支出: ¥${summary.actualSubscriptionExpense}`,
    `本月预计订阅影响: ¥${summary.plannedSubscriptionImpact}`,
    `本月预计连载影响: ¥${summary.plannedSerialImpact}`,
    `最高支出日: ${summary.highestSpendDay ? `${summary.highestSpendDay.date} ¥${summary.highestSpendDay.total}` : '无'}`,
    `最大单笔: ${summary.highestExpense ? `${summary.highestExpense.date} ${summary.highestExpense.name}（${summary.highestExpense.categoryLabel}）¥${summary.highestExpense.amount}` : '无'}`,
    '本月类别分布:',
    topCategories,
    '本月按日汇总:',
    dailyLines,
    '本月名称排行:',
    rankings,
  ].join('\n');
}

function buildYearPrompt(summary) {
  const rankings = formatRankings(summary.rankings);
  const topCategories = formatTopCategories(summary.topCategories);
  const monthlyLines = formatMonthlySummaries(summary.monthlySummaries);

  return [
    '你是一名中文年度消费分析助手，请只围绕“单年支出”做分析。',
    '分析重点：',
    '1. 总结全年消费水平、月度波动和高峰月份，识别年度趋势。',
    '2. 分析全年主要消费类别和高额项目，判断长期支出结构是否健康。',
    '3. 找出全年最值得关注的月份和项目，解释其背后的可能原因。',
    '4. 给出 3 条面向下一年度或接下来几个季度的规划建议，偏向结构优化和预算安排。',
    '5. 不要把分析写成日度或单月复盘，要突出趋势、季节性和长期 recurring 支出影响。',
    '6. 如果没有收入数据，要明确说明“当前仅基于支出数据分析”。',
    '',
    `年份: ${summary.label}`,
    `收入说明: ${summary.incomeNote}`,
    `年度支出总额: ¥${summary.totalExpense}`,
    `年度记录笔数: ${summary.totalRecords}`,
    `活跃月份数: ${summary.activeMonths}`,
    `年度单笔平均金额: ¥${summary.averagePerRecord}`,
    `最高支出月份: ${summary.highestSpendMonth ? `${summary.highestSpendMonth.month} ¥${summary.highestSpendMonth.total}` : '无'}`,
    `年度最大单笔: ${summary.highestExpense ? `${summary.highestExpense.date} ${summary.highestExpense.name}（${summary.highestExpense.categoryLabel}）¥${summary.highestExpense.amount}` : '无'}`,
    '年度类别分布:',
    topCategories,
    '年度月份汇总:',
    monthlyLines,
    '年度名称排行:',
    rankings,
  ].join('\n');
}

function buildPrompt(summary) {
  if (summary.scope === 'day') {
    return buildDayPrompt(summary);
  }

  if (summary.scope === 'month') {
    return buildMonthPrompt(summary);
  }

  return buildYearPrompt(summary);
}

function normalizeCachedAnalysis(cache) {
  if (!cache) {
    return {
      cached: false,
    };
  }

  return {
    cached: true,
    analysis: cache.analysis,
    summary: JSON.parse(cache.summary_json),
    model: cache.model,
    provider: cache.provider,
    updatedAt: cache.updated_at,
  };
}

function buildAiCachePayload(settings, summary, analysis) {
  return {
    scope: summary.scope,
    period_key: summary.periodKey,
    provider: settings.provider,
    model: settings.model,
    analysis,
    summary_json: JSON.stringify(summary),
    updated_at: getBeijingIsoString(),
  };
}

function loadAndValidatePayload(payload) {
  return validateAiAnalysisPayload(payload);
}

function normalizeStoredSettings(settings) {
  if (!settings) {
    return {
      ...DEFAULT_AI_SETTINGS,
      hasApiKey: false,
      updatedAt: null,
    };
  }

  return {
    provider: settings.provider || DEFAULT_AI_SETTINGS.provider,
    endpointUrl: settings.endpoint_url || DEFAULT_AI_SETTINGS.endpointUrl,
    model: normalizeDeepSeekModel(
      settings.provider || DEFAULT_AI_SETTINGS.provider,
      settings.model || DEFAULT_AI_SETTINGS.model,
    ),
    hasApiKey: Boolean(settings.api_key),
    updatedAt: settings.updated_at || null,
  };
}

function createAiService({ db, fetchImpl = (...args) => global.fetch(...args) }) {
  return {
    async getSettings(userId) {
      const settings = await aiRepository.getSettingsByUserId(db, userId);
      return normalizeStoredSettings(settings);
    },

    async saveSettings(userId, payload) {
      const normalized = validateAiSettingsPayload(payload);
      const existing = await aiRepository.getSettingsByUserId(db, userId);
      const apiKey = normalized.apiKey || existing?.api_key || '';

      if (!apiKey) {
        throw new ValidationError('请填写 API Key');
      }

      await aiRepository.upsertSettings(db, userId, {
        provider: normalized.provider,
        endpoint_url: normalized.endpointUrl,
        model: normalized.model,
        api_key: apiKey,
        updated_at: getBeijingIsoString(),
      });

      return this.getSettings(userId);
    },

    async getCachedAnalysis(userId, payload) {
      const normalizedPayload = loadAndValidatePayload(payload);
      const cache = await aiRepository.getCachedAnalysis(
        db,
        userId,
        normalizedPayload.scope,
        getPeriodKey(normalizedPayload),
      );

      return normalizeCachedAnalysis(cache);
    },

    async analyze(userId, payload) {
      const normalizedPayload = loadAndValidatePayload(payload);
      const settings = await aiRepository.getSettingsByUserId(db, userId);

      if (!settings?.api_key) {
        throw new ValidationError('请先在 AI 设置中填写 API Key');
      }

      settings.model = normalizeDeepSeekModel(settings.provider, settings.model);
      const allData = await financeRepository.getExportData(db, userId);
      const summary = buildAnalysisSummary(normalizedPayload.scope, normalizedPayload, allData);
      const prompt = buildPrompt(summary);

      const response = await fetchImpl(settings.endpoint_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.api_key}`,
        },
        body: JSON.stringify({
          model: settings.model,
          temperature: 0.6,
          messages: [
            {
              role: 'system',
              content: '你是审慎、务实的中文财务消费分析助手。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(`AI 分析请求失败: ${errorText || response.status}`, 502);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new AppError('AI 返回内容为空', 502);
      }

      const cachePayload = buildAiCachePayload(settings, summary, content);
      await aiRepository.upsertCachedAnalysis(db, userId, cachePayload);

      return {
        analysis: content,
        summary,
        model: settings.model,
        provider: settings.provider,
        updatedAt: cachePayload.updated_at,
      };
    },
  };
}

module.exports = {
  createAiService,
};
