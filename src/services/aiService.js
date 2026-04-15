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

  const plannedSubscriptionImpact = scope === 'month'
    ? subscriptions.reduce((sum, item) => {
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

  return {
    scope,
    label,
    incomeTotal: 0,
    incomeNote: '当前数据库仅记录支出，没有独立收入字段；收入统计按 0 处理。',
    budget,
    totalExpense: Number(totalExpense.toFixed(2)),
    totalRecords: scopedLedger.length,
    categoryBreakdown,
    rankings: rankings.slice(0, 15).map((item) => ({
      name: item.name,
      category: item.category,
      categoryLabel: CATEGORY_LABELS[item.category] || item.category,
      total: Number(item.total.toFixed(2)),
      count: item.count,
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

function buildPrompt(summary) {
  const rankings = summary.rankings.length > 0
    ? summary.rankings.map((item, index) => `${index + 1}. ${item.name}（${item.categoryLabel}）¥${item.total}，${item.count}笔`).join('\n')
    : '无支出记录';

  const monthlyLines = summary.monthlySummaries.length > 0
    ? summary.monthlySummaries.map((item) => `${item.month}: ¥${item.total}`).join('\n')
    : '无';

  return [
    '你是一名中文财务消费分析助手，请基于以下数据，输出简洁、可执行的分析。',
    '输出要求：',
    '1. 先给一句总体结论。',
    '2. 再给 3-5 条关键发现，必须结合具体金额、类别、排行项。',
    '3. 再给 3 条可执行建议，建议要贴合这个周期的数据。',
    '4. 如果数据里没有收入，请明确说明“当前仅基于支出数据分析”。',
    '5. 不要编造未提供的数据，不要输出 Markdown 表格。',
    '',
    `分析范围: ${summary.scope}`,
    `周期标签: ${summary.label}`,
    `收入总额: ¥${summary.incomeTotal}`,
    `收入说明: ${summary.incomeNote}`,
    `支出总额: ¥${summary.totalExpense}`,
    `记录笔数: ${summary.totalRecords}`,
    `预算: ${summary.budget === null ? '未设置' : `¥${summary.budget}`}`,
    `订阅已记入实际支出: ¥${summary.actualSubscriptionExpense}`,
    `本月预计订阅影响: ¥${summary.plannedSubscriptionImpact}`,
    `本月预计连载影响: ¥${summary.plannedSerialImpact}`,
    `分类拆分: 购物/连载 ¥${Number(summary.categoryBreakdown.shopping || 0).toFixed(2)}；食品 ¥${Number(summary.categoryBreakdown.food || 0).toFixed(2)}；交通 ¥${Number(summary.categoryBreakdown.transport || 0).toFixed(2)}；订阅 ¥${Number(summary.categoryBreakdown.subscription || 0).toFixed(2)}`,
    '支出排行:',
    rankings,
    '年度月份汇总:',
    monthlyLines,
  ].join('\n');
}

function normalizeStoredSettings(settings) {
  if (!settings) {
    return {
      provider: 'deepseek',
      endpointUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
      hasApiKey: false,
      updatedAt: null,
    };
  }

  return {
    provider: settings.provider || 'deepseek',
    endpointUrl: settings.endpoint_url || 'https://api.deepseek.com/v1/chat/completions',
    model: settings.model || 'deepseek-chat',
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

    async analyze(userId, payload) {
      const normalizedPayload = validateAiAnalysisPayload(payload);
      const settings = await aiRepository.getSettingsByUserId(db, userId);

      if (!settings?.api_key) {
        throw new ValidationError('请先在 AI 设置中填写 API Key');
      }

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

      return {
        analysis: content,
        summary,
        model: settings.model,
        provider: settings.provider,
      };
    },
  };
}

module.exports = {
  createAiService,
};
