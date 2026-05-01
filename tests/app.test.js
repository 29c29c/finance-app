const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { startServer } = require('../src/server');

let runtime;
let baseUrl;
let tempDir;
let primaryToken = '';
let subscriptionId = 0;
let serialId = 0;
let originalFetch;

async function request(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${url}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  return { status: response.status, data };
}

test.before(async () => {
  originalFetch = global.fetch;
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finance-app-'));
  runtime = await startServer({
    PORT: 0,
    JWT_SECRET: 'test-jwt-secret-1234567890',
    ADMIN_INVITE_CODE: 'invite-123',
    DB_FILE: path.join(tempDir, 'finance.db'),
    NODE_ENV: 'test',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX: 3,
  });
  baseUrl = `http://127.0.0.1:${runtime.server.address().port}`;
});

test.after(async () => {
  global.fetch = originalFetch;
  if (runtime) {
    await runtime.close();
  }

  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('registers and logs in with compatible empty database', async () => {
  const registerResponse = await request('/api/register', {
    method: 'POST',
    body: {
      username: 'user_one',
      password: 'password123',
      inviteCode: 'invite-123',
    },
  });

  assert.equal(registerResponse.status, 200);
  assert.equal(registerResponse.data.message, '注册成功');

  const loginResponse = await request('/api/login', {
    method: 'POST',
    body: {
      username: 'user_one',
      password: 'password123',
    },
  });

  assert.equal(loginResponse.status, 200);
  assert.ok(loginResponse.data.token);
  primaryToken = loginResponse.data.token;

  const dataResponse = await request('/api/data?month=2026-04', { token: primaryToken });
  assert.equal(dataResponse.status, 200);
  assert.deepEqual(dataResponse.data, {
    subscriptions: [],
    serials: [],
    ledger: [],
    budget: 0,
  });
});

test('supports CRUD, budget, import, export, and serial advance flows', async () => {
  const subscriptionResponse = await request('/api/subscriptions', {
    method: 'POST',
    token: primaryToken,
    body: {
      name: 'Netflix',
      price: 30,
      cycle_type: 'monthly',
      first_payment_date: '2026-04-01',
      is_active: 1,
    },
  });
  assert.equal(subscriptionResponse.status, 200);
  subscriptionId = subscriptionResponse.data.id;

  const serialResponse = await request('/api/serials', {
    method: 'POST',
    token: primaryToken,
    body: {
      name: '漫画 1',
      price: 20,
      status: 'planned',
      expected_release_date: '2026-04',
    },
  });
  assert.equal(serialResponse.status, 200);
  serialId = serialResponse.data.id;

  const ledgerResponse = await request('/api/ledger_items', {
    method: 'POST',
    token: primaryToken,
    body: {
      date: '2026-04-02',
      category: 'food',
      name: '午餐',
      amount: 18,
    },
  });
  assert.equal(ledgerResponse.status, 200);

  const budgetResponse = await request('/api/budget', {
    method: 'POST',
    token: primaryToken,
    body: {
      month: '2026-04',
      amount: 500,
    },
  });
  assert.equal(budgetResponse.status, 200);
  assert.equal(budgetResponse.data.success, true);

  const importResponse = await request('/api/ledger/import', {
    method: 'POST',
    token: primaryToken,
    body: {
      items: [
        { date: '2026-04-03', category: 'shopping', name: '手办', amount: 199 },
      ],
    },
  });
  assert.equal(importResponse.status, 200);
  assert.equal(importResponse.data.imported, 1);

  const advanceResponse = await request(`/api/serials/${serialId}/advance`, {
    method: 'POST',
    token: primaryToken,
    body: {
      expense: {
        date: '2026-04-04',
        category: 'shopping',
        name: '漫画 1 (已付)',
        amount: 20,
      },
      next: {
        name: '漫画 2',
        price: 22,
        date: '2026-05',
      },
    },
  });
  assert.equal(advanceResponse.status, 200);
  assert.equal(advanceResponse.data.success, true);

  const dashboardResponse = await request('/api/data?month=2026-04', { token: primaryToken });
  assert.equal(dashboardResponse.status, 200);
  assert.equal(dashboardResponse.data.subscriptions.length, 1);
  assert.equal(dashboardResponse.data.serials.length, 1);
  assert.equal(dashboardResponse.data.serials[0].name, '漫画 2');
  assert.equal(dashboardResponse.data.budget, 500);
  assert.equal(dashboardResponse.data.ledger.length, 4);
  assert.ok(dashboardResponse.data.ledger.some((item) => item.category === 'subscription' && item.name === 'Netflix' && item.date === '2026-04-01'));

  const subscriptionOffResponse = await request(`/api/subscriptions/${subscriptionId}`, {
    method: 'PUT',
    token: primaryToken,
    body: {
      name: 'Netflix',
      price: 30,
      cycle_type: 'monthly',
      first_payment_date: '2026-04-01',
      is_active: 0,
    },
  });
  assert.equal(subscriptionOffResponse.status, 200);

  const dashboardAfterOffResponse = await request('/api/data?month=2026-04', { token: primaryToken });
  assert.equal(dashboardAfterOffResponse.status, 200);
  assert.equal(dashboardAfterOffResponse.data.ledger.length, 3);
  assert.equal(dashboardAfterOffResponse.data.ledger.some((item) => item.category === 'subscription' && item.name === 'Netflix'), false);

  const yearlySubscriptionResponse = await request('/api/subscriptions', {
    method: 'POST',
    token: primaryToken,
    body: {
      name: '域名续费',
      price: 120,
      cycle_type: 'yearly',
      first_payment_date: '2026-04-20',
      is_active: 1,
    },
  });
  assert.equal(yearlySubscriptionResponse.status, 200);

  const dashboardAfterYearlyResponse = await request('/api/data?month=2026-04', { token: primaryToken });
  assert.equal(dashboardAfterYearlyResponse.status, 200);
  assert.equal(dashboardAfterYearlyResponse.data.ledger.length, 3);
  assert.equal(dashboardAfterYearlyResponse.data.ledger.some((item) => item.category === 'subscription' && item.name === '域名续费'), false);

  const exportResponse = await request('/api/export/all', { token: primaryToken });
  assert.equal(exportResponse.status, 200);
  assert.ok(exportResponse.data.export_date);
  assert.equal(exportResponse.data.ledger_items.length, 3);
  assert.equal(exportResponse.data.budgets.length, 1);
  assert.equal(exportResponse.data.subscriptions.length, 2);
});

test('isolates data between users', async () => {
  const registerResponse = await request('/api/register', {
    method: 'POST',
    body: {
      username: 'user_two',
      password: 'password123',
      inviteCode: 'invite-123',
    },
  });
  assert.equal(registerResponse.status, 200);

  const loginResponse = await request('/api/login', {
    method: 'POST',
    body: {
      username: 'user_two',
      password: 'password123',
    },
  });
  assert.equal(loginResponse.status, 200);
  const userTwoToken = loginResponse.data.token;

  const dashboardResponse = await request('/api/data?month=2026-04', { token: userTwoToken });
  assert.equal(dashboardResponse.status, 200);
  assert.equal(dashboardResponse.data.subscriptions.length, 0);
  assert.equal(dashboardResponse.data.ledger.length, 0);

  const deleteResponse = await request(`/api/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    token: userTwoToken,
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteResponse.data.deleted, 0);

  const advanceResponse = await request(`/api/serials/${serialId}/advance`, {
    method: 'POST',
    token: userTwoToken,
    body: {
      expense: {
        date: '2026-04-05',
        category: 'shopping',
        name: '越权',
        amount: 10,
      },
      next: {
        name: '不会成功',
        price: 10,
        date: '2026-06',
      },
    },
  });
  assert.equal(advanceResponse.status, 404);
});

test('rejects invalid payloads and invalid auth state', async () => {
  const invalidLedgerResponse = await request('/api/ledger_items', {
    method: 'POST',
    token: primaryToken,
    body: {
      date: '2026-13-40',
      category: 'food',
      name: '异常数据',
      amount: 9.9,
    },
  });
  assert.equal(invalidLedgerResponse.status, 400);

  const unauthorizedResponse = await request('/api/data?month=2026-04');
  assert.equal(unauthorizedResponse.status, 401);

  const forbiddenResponse = await request('/api/data?month=2026-04', {
    token: 'invalid-token',
  });
  assert.equal(forbiddenResponse.status, 403);
});

test('rate limits repeated failed login attempts', async () => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await request('/api/login', {
      method: 'POST',
      body: {
        username: 'rate_limit_target',
        password: 'wrong-password',
      },
    });
    assert.equal(response.status, 401);
  }

  const limitedResponse = await request('/api/login', {
    method: 'POST',
    body: {
      username: 'rate_limit_target',
      password: 'wrong-password',
    },
  });
  assert.equal(limitedResponse.status, 429);
});

test('stores AI settings and caches latest analyses by scope and period', async () => {
  const settingsResponse = await request('/api/ai-settings', {
    method: 'PUT',
    token: primaryToken,
    body: {
      provider: 'deepseek',
      endpointUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-v4-flash',
      apiKey: 'deepseek-test-key',
    },
  });

  assert.equal(settingsResponse.status, 200);
  assert.equal(settingsResponse.data.provider, 'deepseek');
  assert.equal(settingsResponse.data.hasApiKey, true);

  const localFetch = originalFetch;
  let aiCallIndex = 0;
  global.fetch = async (url, options) => {
    if (String(url).startsWith(baseUrl)) {
      return localFetch(url, options);
    }

    aiCallIndex += 1;
    const contents = [
      '月度分析 v1：本月支出集中在购物类，建议控制高频高额消费。',
      '日度分析：今天的消费集中在少数几笔大额支出。',
      '月度分析 v2：这是覆盖后的最新月度分析。',
    ];

    return {
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: contents[aiCallIndex - 1] || '默认分析内容',
              },
            },
          ],
        };
      },
    };
  };

  const analysisResponse = await request('/api/ai-analysis', {
    method: 'POST',
    token: primaryToken,
    body: {
      scope: 'month',
      month: '2026-04',
    },
  });

  assert.equal(analysisResponse.status, 200);
  assert.equal(analysisResponse.data.provider, 'deepseek');
  assert.equal(analysisResponse.data.model, 'deepseek-v4-flash');
  assert.match(analysisResponse.data.analysis, /月度分析 v1/);
  assert.equal(analysisResponse.data.summary.scope, 'month');
  assert.equal(analysisResponse.data.summary.label, '2026-04');

  const cachedMonthResponse = await request('/api/ai-analysis?scope=month&month=2026-04', {
    method: 'GET',
    token: primaryToken,
  });
  assert.equal(cachedMonthResponse.status, 200);
  assert.equal(cachedMonthResponse.data.cached, true);
  assert.match(cachedMonthResponse.data.analysis, /月度分析 v1/);
  assert.equal(cachedMonthResponse.data.summary.scope, 'month');

  const dayAnalysisResponse = await request('/api/ai-analysis', {
    method: 'POST',
    token: primaryToken,
    body: {
      scope: 'day',
      date: '2026-04-02',
    },
  });
  assert.equal(dayAnalysisResponse.status, 200);
  assert.match(dayAnalysisResponse.data.analysis, /日度分析/);
  assert.equal(dayAnalysisResponse.data.summary.scope, 'day');

  const cachedDayResponse = await request('/api/ai-analysis?scope=day&date=2026-04-02', {
    method: 'GET',
    token: primaryToken,
  });
  assert.equal(cachedDayResponse.status, 200);
  assert.equal(cachedDayResponse.data.cached, true);
  assert.match(cachedDayResponse.data.analysis, /日度分析/);
  assert.equal(cachedDayResponse.data.summary.scope, 'day');

  const overwrittenMonthResponse = await request('/api/ai-analysis', {
    method: 'POST',
    token: primaryToken,
    body: {
      scope: 'month',
      month: '2026-04',
    },
  });
  assert.equal(overwrittenMonthResponse.status, 200);
  assert.match(overwrittenMonthResponse.data.analysis, /月度分析 v2/);

  const cachedOverwrittenMonthResponse = await request('/api/ai-analysis?scope=month&month=2026-04', {
    method: 'GET',
    token: primaryToken,
  });
  assert.equal(cachedOverwrittenMonthResponse.status, 200);
  assert.equal(cachedOverwrittenMonthResponse.data.cached, true);
  assert.match(cachedOverwrittenMonthResponse.data.analysis, /月度分析 v2/);

  global.fetch = localFetch;
});

test('handles concurrent dashboard and export requests with subscription sync', async () => {
  const [dashboardResponse, exportResponse] = await Promise.all([
    request('/api/data?month=2026-04', { token: primaryToken }),
    request('/api/export/all?month=2026-04', { token: primaryToken }),
  ]);

  assert.equal(dashboardResponse.status, 200);
  assert.equal(exportResponse.status, 200);
  assert.ok(Array.isArray(dashboardResponse.data.ledger));
  assert.ok(Array.isArray(exportResponse.data.ledger_items));
});
