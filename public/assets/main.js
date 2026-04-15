import { api } from './api.js';
import { CATEGORIES, CATEGORY_ICONS, SERIAL_STATUSES, TABS } from './constants.js';
import {
  escapeHtml,
  formatMoney,
  today,
  currentMonth,
  nextMonth,
  getNextName,
  groupLedgerByDate,
  buildStats,
  toCsvCell,
} from './utils.js';

const state = {
  token: api.getToken(),
  loading: false,
  currentMonth: currentMonth(),
  activeTab: 'dashboard',
  authMode: 'login',
  authError: '',
  notice: '',
  noticeType: 'info',
  data: {
    subscriptions: [],
    serials: [],
    ledger: [],
    budget: 0,
  },
  quickAddOpen: false,
  advanceSerialId: null,
};

const root = document.getElementById('app');

function setNotice(message, type = 'info') {
  state.notice = message;
  state.noticeType = type;
  render();
}

function clearNotice() {
  state.notice = '';
  state.noticeType = 'info';
}

function getSelectedSerial() {
  return state.data.serials.find((serial) => serial.id === state.advanceSerialId) || null;
}

function renderNotice() {
  if (!state.notice) {
    return '';
  }

  return `<div class="notice notice-${state.noticeType}">${escapeHtml(state.notice)}</div>`;
}

function renderAuth() {
  return `
    <main class="auth-shell">
      <section class="auth-card">
        <div class="auth-brand">
          <p class="eyebrow">Finance App</p>
          <h1>财务指挥中心</h1>
          <p class="muted">拆分后的静态前端会继续调用原有 API，部署方式保持不变。</p>
        </div>
        ${renderNotice()}
        <form id="auth-form" class="stack">
          <label class="field">
            <span>用户名</span>
            <input name="username" maxlength="32" autocomplete="username" required>
          </label>
          <label class="field">
            <span>密码</span>
            <input name="password" type="password" minlength="8" maxlength="72" autocomplete="${state.authMode === 'login' ? 'current-password' : 'new-password'}" required>
          </label>
          ${state.authMode === 'register' ? `
            <label class="field">
              <span>邀请码</span>
              <input name="inviteCode" maxlength="64" required>
            </label>
          ` : ''}
          ${state.authError ? `<p class="error-text">${escapeHtml(state.authError)}</p>` : ''}
          <button class="primary-btn" type="submit">${state.authMode === 'login' ? '登录' : '注册'}</button>
        </form>
        <button class="link-btn" type="button" data-action="toggle-auth-mode">
          ${state.authMode === 'login' ? '使用邀请码注册' : '返回登录'}
        </button>
      </section>
    </main>
  `;
}

function renderWarningBanner(stats) {
  if (stats.warnings.length === 0) {
    return '';
  }

  return `
    <section class="banner danger">
      <div class="banner-title">现金流警告</div>
      <div class="banner-body">
        ${stats.warnings.map((item) => `
          <div>${escapeHtml(item.name)} 本月需扣款 <strong>¥${formatMoney(item.price, 0)}</strong></div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderDashboard(stats) {
  const budget = Number(state.data.budget) || 0;
  const expectedTotal = stats.subscriptionCost + stats.planned;
  const actualTotal = stats.actual.total;

  return `
    <section class="stack">
      ${renderWarningBanner(stats)}
      <div class="card-grid">
        <form id="budget-form" class="card budget-card">
          <p class="eyebrow">本月预算</p>
          <label class="money-input">
            <span>¥</span>
            <input name="amount" type="number" min="0" step="0.01" value="${escapeHtml(String(budget))}">
          </label>
          <button class="secondary-btn" type="submit">保存预算</button>
        </form>
        <article class="card">
          <p class="eyebrow">预期消费</p>
          <div class="hero-value">¥${formatMoney(expectedTotal, 0)}</div>
          <p class="muted">订阅 ${formatMoney(stats.subscriptionCost, 0)} + 连载 ${formatMoney(stats.planned, 0)}</p>
        </article>
        <article class="card ${actualTotal > budget ? 'card-danger' : 'card-success'}">
          <p class="eyebrow">实际支出</p>
          <div class="hero-value">¥${formatMoney(actualTotal, 0)}</div>
          <p class="muted">${actualTotal > budget ? '已超支' : '安全范围'}</p>
        </article>
      </div>
    </section>
  `;
}

function renderSerials() {
  return `
    <section class="card">
      <div class="section-header">
        <div>
          <h2>📦 连载追更</h2>
          <p class="muted">保留原来的“结算并续杯”能力。</p>
        </div>
        <button class="primary-btn small" type="button" data-action="add-serial">+ 新增</button>
      </div>
      <div class="list">
        ${state.data.serials.length === 0 ? '<p class="empty-state">无追更计划</p>' : state.data.serials.map((serial) => `
          <article class="list-item">
            <div>
              <div class="list-title">${escapeHtml(serial.name)}</div>
              <div class="muted">${escapeHtml(serial.expected_release_date)} · ${escapeHtml(SERIAL_STATUSES[serial.status] || serial.status)}</div>
            </div>
            <div class="list-actions">
              <strong>¥${formatMoney(serial.price)}</strong>
              ${serial.status !== 'paid' ? `<button class="secondary-btn small" type="button" data-action="open-advance" data-id="${serial.id}">结算本期</button>` : ''}
              <button class="icon-btn" type="button" data-action="delete-item" data-table="serials" data-id="${serial.id}">删除</button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderSubscriptions() {
  return `
    <section class="card">
      <div class="section-header">
        <div>
          <h2>📅 固定订阅</h2>
          <p class="muted">继续兼容 monthly / yearly / quarterly。</p>
        </div>
        <button class="secondary-btn small" type="button" data-action="add-subscription">+ 新增</button>
      </div>
      <div class="list">
        ${state.data.subscriptions.length === 0 ? '<p class="empty-state">暂无固定订阅</p>' : state.data.subscriptions.map((subscription) => `
          <article class="list-item">
            <div>
              <div class="list-title">${escapeHtml(subscription.name)}</div>
              <div class="muted">${escapeHtml(subscription.cycle_type)}</div>
            </div>
            <div class="list-actions">
              <strong>¥${formatMoney(subscription.price)}</strong>
              <button class="icon-btn" type="button" data-action="delete-item" data-table="subscriptions" data-id="${subscription.id}">删除</button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderSubsTab() {
  return `
    <section class="stack">
      ${renderSerials()}
      ${renderSubscriptions()}
    </section>
  `;
}

function renderLedgerTab(stats) {
  const grouped = groupLedgerByDate(state.data.ledger);

  return `
    <section class="stack">
      ${grouped.length === 0 ? `
        <article class="card empty-panel">
          <div class="empty-mark">🍃</div>
          <p>本月暂无账单</p>
        </article>
      ` : grouped.map(([date, items]) => `
        <article class="card">
          <div class="section-header compact">
            <h2>${escapeHtml(date)}</h2>
            <strong>¥${formatMoney(items.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong>
          </div>
          <div class="chip-list">
            ${items.map((item) => `
              <div class="chip">
                <span>${escapeHtml(CATEGORY_ICONS[item.category] || '💰')}</span>
                <span>${escapeHtml(item.name)}</span>
                <strong>¥${formatMoney(item.amount)}</strong>
                <button class="icon-btn danger-text" type="button" data-action="delete-item" data-table="ledger_items" data-id="${item.id}">×</button>
              </div>
            `).join('')}
          </div>
        </article>
      `).join('')}
      <article class="card">
        <div class="section-header">
          <div>
            <h2>批量导入</h2>
            <p class="muted">格式：日期, 分类, 名称, 金额</p>
          </div>
          <span class="pill">本月支出 ¥${formatMoney(stats.actual.total)}</span>
        </div>
        <form id="import-form" class="stack">
          <textarea name="content" rows="6" placeholder="2026-04-01, food, 午餐, 20&#10;2026-04-02, shopping, 手办, 199"></textarea>
          <button class="secondary-btn" type="submit">导入 CSV 文本</button>
        </form>
      </article>
    </section>
  `;
}

function renderStatsTab(stats) {
  return `
    <article class="card">
      <div class="section-header">
        <div>
          <h2>📊 本月统计</h2>
          <p class="muted">${escapeHtml(state.currentMonth)}</p>
        </div>
        <strong class="hero-value small">¥${formatMoney(stats.actual.total)}</strong>
      </div>
      <div class="stack">
        ${Object.entries(CATEGORIES).map(([key, label]) => {
          const amount = stats.actual.breakdown[key] || 0;
          const percent = stats.actual.total > 0 ? (amount / stats.actual.total) * 100 : 0;
          return `
            <div class="metric-row">
              <div class="metric-header">
                <span>${escapeHtml(CATEGORY_ICONS[key])} ${escapeHtml(label)}</span>
                <span>¥${formatMoney(amount)} · ${formatMoney(percent)}%</span>
              </div>
              <progress max="100" value="${formatMoney(percent)}"></progress>
            </div>
          `;
        }).join('')}
      </div>
    </article>
  `;
}

function renderQuickAddModal() {
  if (!state.quickAddOpen) {
    return '';
  }

  const categoryOptions = Object.entries(CATEGORIES)
    .map(([value, label]) => `<option value="${value}">${escapeHtml(CATEGORY_ICONS[value])} ${escapeHtml(label)}</option>`)
    .join('');

  return `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="section-header">
          <h2>极速记账</h2>
          <button class="icon-btn" type="button" data-action="close-quick-add">关闭</button>
        </div>
        <form id="quick-add-form" class="stack">
          <label class="field">
            <span>金额</span>
            <input name="amount" type="number" min="0" step="0.01" required autofocus>
          </label>
          <label class="field">
            <span>备注</span>
            <input name="name" maxlength="160" placeholder="选填，不填会使用分类名">
          </label>
          <div class="field-row">
            <label class="field">
              <span>日期</span>
              <input name="date" type="date" value="${today()}" required>
            </label>
            <label class="field">
              <span>分类</span>
              <select name="category">${categoryOptions}</select>
            </label>
          </div>
          <button class="primary-btn" type="submit">保存记录</button>
        </form>
      </div>
    </div>
  `;
}

function renderAdvanceModal() {
  const serial = getSelectedSerial();
  if (!serial) {
    return '';
  }

  return `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="section-header">
          <div>
            <h2>结算并续杯</h2>
            <p class="muted">${escapeHtml(serial.name)}</p>
          </div>
          <button class="icon-btn" type="button" data-action="close-advance">关闭</button>
        </div>
        <form id="advance-form" class="stack" data-id="${serial.id}">
          <div class="panel-group">
            <div class="panel">
              <p class="eyebrow">1. 本次消费</p>
              <label class="field">
                <span>金额</span>
                <input name="expenseAmount" type="number" min="0" step="0.01" value="${escapeHtml(String(serial.price || 0))}" required>
              </label>
              <label class="field">
                <span>日期</span>
                <input name="expenseDate" type="date" value="${today()}" required>
              </label>
            </div>
            <div class="panel accent">
              <p class="eyebrow">2. 下一期计划</p>
              <label class="field">
                <span>名称</span>
                <input name="nextName" maxlength="120" value="${escapeHtml(getNextName(serial.name))}" required>
              </label>
              <div class="field-row">
                <label class="field">
                  <span>月份</span>
                  <input name="nextDate" type="month" value="${escapeHtml(nextMonth())}" required>
                </label>
                <label class="field">
                  <span>预估价</span>
                  <input name="nextPrice" type="number" min="0" step="0.01" value="${escapeHtml(String(serial.price || 0))}" required>
                </label>
              </div>
            </div>
          </div>
          <button class="primary-btn" type="submit">确认结算并更新计划</button>
        </form>
      </div>
    </div>
  `;
}

function renderApp() {
  const stats = buildStats(state.data, state.currentMonth);
  const selectedTab = state.activeTab === 'dashboard'
    ? renderDashboard(stats)
    : state.activeTab === 'subs'
      ? renderSubsTab()
      : state.activeTab === 'ledger'
        ? renderLedgerTab(stats)
        : renderStatsTab(stats);

  return `
    <main class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Finance Command Center</p>
          <h1>财务指挥中心</h1>
        </div>
        <div class="topbar-actions">
          <input id="month-picker" type="month" value="${escapeHtml(state.currentMonth)}">
          <button class="secondary-btn small" type="button" data-action="export-json">导出 JSON</button>
          <button class="secondary-btn small" type="button" data-action="export-csv">导出 CSV</button>
          <button class="icon-btn" type="button" data-action="logout">退出</button>
        </div>
      </header>

      ${renderNotice()}

      <nav class="tab-bar">
        ${TABS.map((tab) => `
          <button
            class="tab-btn ${tab.key === state.activeTab ? 'active' : ''}"
            type="button"
            data-action="switch-tab"
            data-tab="${tab.key}"
          >
            ${escapeHtml(tab.label)}
          </button>
        `).join('')}
      </nav>

      ${state.loading ? '<section class="loading-card">加载中...</section>' : selectedTab}

      <button class="fab" type="button" data-action="open-quick-add">＋</button>

      ${renderQuickAddModal()}
      ${renderAdvanceModal()}
    </main>
  `;
}

function render() {
  root.innerHTML = state.token ? renderApp() : renderAuth();
}

function logout(message) {
  api.setToken('');
  state.token = '';
  state.data = { subscriptions: [], serials: [], ledger: [], budget: 0 };
  state.quickAddOpen = false;
  state.advanceSerialId = null;
  if (message) {
    state.notice = message;
    state.noticeType = 'info';
  }
  render();
}

async function handleApiError(error) {
  if (error.status === 401 || error.status === 403) {
    logout(error.message || '登录状态失效，请重新登录');
    return;
  }

  setNotice(error.message || '操作失败，请稍后再试', 'error');
}

async function fetchData(options = {}) {
  if (!state.token) {
    return;
  }

  state.loading = true;
  if (!options.preserveNotice) {
    clearNotice();
  }
  render();

  try {
    const month = encodeURIComponent(state.currentMonth);
    state.data = await api.get(`/api/data?month=${month}`);
  } catch (error) {
    await handleApiError(error);
  } finally {
    state.loading = false;
    render();
  }
}

async function exportJson() {
  try {
    const allData = await api.get('/api/export/all');
    api.downloadJson(`finance_backup_${today()}.json`, allData);
  } catch (error) {
    await handleApiError(error);
  }
}

async function exportCsv() {
  try {
    const allData = await api.get('/api/export/all');
    const lines = [
      ['Date', 'Category', 'Name', 'Amount'],
      ...allData.ledger_items.map((item) => [item.date, item.category, item.name, item.amount]),
    ];
    const csv = lines.map((line) => line.map(toCsvCell).join(',')).join('\n');
    api.downloadText(`ledger_${today()}.csv`, csv, 'text/csv;charset=utf-8');
  } catch (error) {
    await handleApiError(error);
  }
}

async function createSubscription() {
  const name = window.prompt('名称');
  if (!name) return;

  const price = window.prompt('金额', '0');
  if (price === null) return;

  const cycle = window.prompt('周期 (monthly/yearly/quarterly)', 'monthly');
  if (!cycle) return;

  try {
    await api.post('/api/subscriptions', {
      name,
      price,
      cycle_type: cycle,
      first_payment_date: today(),
    });
    await fetchData();
  } catch (error) {
    await handleApiError(error);
  }
}

async function createSerial() {
  const name = window.prompt('名称');
  if (!name) return;

  try {
    await api.post('/api/serials', {
      name,
      price: 0,
      status: 'planned',
      expected_release_date: state.currentMonth,
    });
    await fetchData();
  } catch (error) {
    await handleApiError(error);
  }
}

async function deleteItem(table, id) {
  if (!window.confirm('确认删除这条记录吗？')) {
    return;
  }

  try {
    await api.delete(`/api/${table}/${id}`);
    await fetchData();
  } catch (error) {
    await handleApiError(error);
  }
}

document.addEventListener('click', async (event) => {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) {
    return;
  }

  const { action } = actionTarget.dataset;

  if (action === 'toggle-auth-mode') {
    state.authMode = state.authMode === 'login' ? 'register' : 'login';
    state.authError = '';
    clearNotice();
    render();
    return;
  }

  if (action === 'logout') {
    logout('已退出登录');
    return;
  }

  if (action === 'switch-tab') {
    state.activeTab = actionTarget.dataset.tab;
    render();
    return;
  }

  if (action === 'export-json') {
    await exportJson();
    return;
  }

  if (action === 'export-csv') {
    await exportCsv();
    return;
  }

  if (action === 'open-quick-add') {
    state.quickAddOpen = true;
    render();
    return;
  }

  if (action === 'close-quick-add') {
    state.quickAddOpen = false;
    render();
    return;
  }

  if (action === 'add-subscription') {
    await createSubscription();
    return;
  }

  if (action === 'add-serial') {
    await createSerial();
    return;
  }

  if (action === 'delete-item') {
    await deleteItem(actionTarget.dataset.table, actionTarget.dataset.id);
    return;
  }

  if (action === 'open-advance') {
    state.advanceSerialId = Number(actionTarget.dataset.id);
    render();
    return;
  }

  if (action === 'close-advance') {
    state.advanceSerialId = null;
    render();
  }
});

document.addEventListener('change', async (event) => {
  if (event.target.id === 'month-picker') {
    state.currentMonth = event.target.value;
    await fetchData();
  }
});

document.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (event.target.id === 'auth-form') {
    const formData = new FormData(event.target);
    const payload = {
      username: String(formData.get('username') || ''),
      password: String(formData.get('password') || ''),
    };

    if (state.authMode === 'register') {
      payload.inviteCode = String(formData.get('inviteCode') || '');
    }

    try {
      state.authError = '';
      clearNotice();
      const result = await fetch(state.authMode === 'login' ? '/api/login' : '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await result.json();

      if (!result.ok) {
        state.authError = data.error || '操作失败';
        render();
        return;
      }

      if (state.authMode === 'register') {
        state.authMode = 'login';
        state.authError = '';
        state.notice = '注册成功，请登录';
        state.noticeType = 'success';
        render();
        return;
      }

      api.setToken(data.token);
      state.token = data.token;
      await fetchData();
    } catch (_error) {
      state.authError = '网络异常，请稍后重试';
      render();
    }

    return;
  }

  if (event.target.id === 'budget-form') {
    const amount = new FormData(event.target).get('amount');

    try {
      await api.post('/api/budget', {
        month: state.currentMonth,
        amount: amount === '' ? 0 : Number(amount),
      });
      setNotice('预算已保存', 'success');
      await fetchData({ preserveNotice: true });
    } catch (error) {
      await handleApiError(error);
    }
    return;
  }

  if (event.target.id === 'quick-add-form') {
    const formData = new FormData(event.target);
    const category = String(formData.get('category') || 'shopping');

    try {
      await api.post('/api/ledger_items', {
        date: String(formData.get('date') || today()),
        category,
        name: String(formData.get('name') || '').trim() || CATEGORIES[category],
        amount: Number(formData.get('amount')),
      });
      state.quickAddOpen = false;
      await fetchData();
    } catch (error) {
      await handleApiError(error);
    }
    return;
  }

  if (event.target.id === 'advance-form') {
    const formData = new FormData(event.target);
    const serial = getSelectedSerial();

    if (!serial) {
      return;
    }

    try {
      await api.post(`/api/serials/${serial.id}/advance`, {
        expense: {
          date: String(formData.get('expenseDate')),
          category: 'shopping',
          name: `${serial.name} (已付)`,
          amount: Number(formData.get('expenseAmount')),
        },
        next: {
          name: String(formData.get('nextName')),
          price: Number(formData.get('nextPrice')),
          date: String(formData.get('nextDate')),
        },
      });
      state.advanceSerialId = null;
      await fetchData();
    } catch (error) {
      await handleApiError(error);
    }
    return;
  }

  if (event.target.id === 'import-form') {
    const content = String(new FormData(event.target).get('content') || '').trim();
    const items = content
      ? content.split('\n').map((line) => {
        const [date, category, name, amount] = line.split(',').map((value) => value?.trim() || '');
        return { date, category, name, amount: Number(amount) };
      }).filter((item) => item.date && item.name)
      : [];

    try {
      await api.post('/api/ledger/import', { items });
      setNotice(`已导入 ${items.length} 条记录`, 'success');
      event.target.reset();
      await fetchData({ preserveNotice: true });
    } catch (error) {
      await handleApiError(error);
    }
  }
});

render();

if (state.token) {
  fetchData();
}
