(() => {
  const F = window.FinanceUI;
  const {
    useState,
    useMemo,
    Icon,
    Brand,
    Empty,
    money,
    monthLabel,
    CATEGORIES,
    SERIAL_STATUS_LABELS,
    safeNumber,
    buildCategoryBreakdown,
    buildNameRanking,
    buildMonthlyTotals,
    renewalInMonth
  } = F;
  const NAV = [['dashboard', '总览', 'home'], ['ledger', '账单明细', 'receipt'], ['subscriptions', '固定订阅', 'calendar'], ['serials', '连载计划', 'book'], ['stats', '统计分析', 'chart']];
  function AppShell({
    active,
    onNavigate,
    onAdd,
    onLogout,
    username,
    month,
    onMonth,
    children
  }) {
    const plans = active === 'subscriptions' || active === 'serials';
    return <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="主要导航">{NAV.map(([key, label, icon]) => <button key={key} className={`nav-item ${active === key ? 'active' : ''}`} aria-current={active === key ? 'page' : undefined} onClick={() => onNavigate(key)}>
            <Icon name={icon} fill={active === 'dashboard' && key === 'dashboard' ? 'currentColor' : 'none'} />
            <span>{label}</span>
          </button>)}</nav>
        <div className="sidebar-bottom">
          <button className={`nav-item ${active === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}>
            <Icon name="settings" />
            <span>数据与设置</span>
          </button>
          <div className="profile">
            <span className="avatar"><Icon name="user" size={19} /></span>
            <span>{username}</span>
            <button className="icon-button" aria-label="退出登录" onClick={onLogout}><Icon name="logout" size={18} /></button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="mobile-header">
          <Brand />
          {active !== 'stats' && active !== 'settings' ? <MonthControl value={month} onChange={onMonth} /> : <button className="icon-button" onClick={() => onNavigate('settings')} aria-label="数据与设置"><Icon name="settings" /></button>}
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      </div>
      <nav className="bottom-nav" aria-label="移动端导航">
        <button className={active === 'dashboard' ? 'active' : ''} onClick={() => onNavigate('dashboard')} aria-current={active === 'dashboard' ? 'page' : undefined}>
          <Icon name="home" fill={active === 'dashboard' ? 'currentColor' : 'none'} />
          <span>总览</span>
        </button>
        <button className={active === 'ledger' ? 'active' : ''} onClick={() => onNavigate('ledger')} aria-current={active === 'ledger' ? 'page' : undefined}>
          <Icon name="receipt" />
          <span>账单</span>
        </button>
        <button className="quick-add" aria-label="记一笔" onClick={onAdd}><span><Icon name="plus" size={25} /></span></button>
        <button className={plans ? 'active' : ''} onClick={() => onNavigate('subscriptions')} aria-current={plans ? 'page' : undefined}>
          <Icon name="calendar" />
          <span>计划</span>
        </button>
        <button className={active === 'stats' ? 'active' : ''} onClick={() => onNavigate('stats')} aria-current={active === 'stats' ? 'page' : undefined}>
          <Icon name="chart" />
          <span>统计</span>
        </button>
      </nav>
    </div>;
  }
  function PageHeader({
    title,
    subtitle,
    children
  }) {
    return <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-actions">{children}</div>
    </header>;
  }
  function MonthControl({
    value,
    onChange
  }) {
    return <div className="month-control">
      <Icon name="calendar" size={17} />
      <input type="month" aria-label="查看月份" value={value} onChange={e => e.target.value && onChange(e.target.value)} />
    </div>;
  }
  function PanelHeading({
    title,
    action,
    onAction
  }) {
    return <div className="panel-heading">
      <h2>{title}</h2>
      {action && <button className="text-button" onClick={onAction}>
        {action}
        <Icon name="chevron" size={15} />
      </button>}
    </div>;
  }
  function TransactionRow({
    item,
    onEdit,
    onDelete,
    compact = false
  }) {
    return <div className="transaction-row">
      <button className="transaction-detail" onClick={() => onEdit(item)} aria-label={`编辑 ${item.name}`}>
        <span className={`category-icon ${item.category}`}><Icon name={item.category} size={22} /></span>
        <span className="transaction-name">
          <strong>{item.name}</strong>
          <small>{Number(item.date.slice(5, 7))}月{Number(item.date.slice(8))}日 · {CATEGORIES[item.category]}{item.source_type === 'subscription' ? ' · 自动入账' : ''}</small>
        </span>
        <span className="transaction-amount">¥ {money(item.amount)}</span>
        <Icon name="chevron" size={16} />
      </button>
      {!compact && <button className="icon-button row-delete" onClick={() => onDelete(item)} aria-label={`删除 ${item.name}`}><Icon name="trash" size={17} /></button>}
    </div>;
  }
  const colors = {
    food: '#dba16d',
    shopping: '#245c43',
    subscription: '#83ab9a',
    transport: '#bacfc5'
  };
  function Distribution({
    items,
    title = '支出分布'
  }) {
    const breakdown = useMemo(() => buildCategoryBreakdown(items), [items]);
    const total = items.reduce((sum, item) => sum + safeNumber(item.amount), 0);
    let offset = 0;
    return <section className="panel distribution">
      <PanelHeading title={title} />
      <div className="donut" role="img" aria-label={total ? `总支出 ${money(total)} 元，${Object.keys(CATEGORIES).map(key => `${CATEGORIES[key]} ${money(breakdown[key])} 元`).join('，')}` : '暂无支出数据'}>
        <svg viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="62" fill="none" stroke="#eef2ef" strokeWidth="23" />
          {Object.keys(CATEGORIES).map(key => {
            const percent = total ? breakdown[key] / total * 100 : 0;
            const start = offset;
            offset += percent;
            return <circle key={key} cx="80" cy="80" r="62" fill="none" stroke={colors[key]} strokeWidth="23" pathLength="100" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-start} transform="rotate(-90 80 80)" />;
          })}
        </svg>
        <div>
          <strong>¥{money(total)}</strong>
          <span>已入账支出</span>
        </div>
      </div>
      <div className="chart-legend">{Object.entries(CATEGORIES).map(([key, label]) => <div key={key}>
          <span className="legend-label">
            <i style={{
              background: colors[key]
            }} />
            {label}
          </span>
          <strong>¥{money(breakdown[key])}</strong>
          <small>{total ? (breakdown[key] / total * 100).toFixed(1) : '0.0'}%</small>
        </div>)}</div>
    </section>;
  }
  function Metric({
    label,
    value,
    note,
    icon
  }) {
    return <div className="metric">
      {icon && <Icon name={icon} size={22} />}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </div>;
  }
  function Dashboard({
    data,
    month,
    summary,
    onBudget,
    onNavigate,
    onEdit,
    onAdd
  }) {
    const total = data.ledger.reduce((sum, item) => sum + safeNumber(item.amount), 0);
    const budget = safeNumber(data.budget),
      percent = budget ? total / budget * 100 : 0,
      over = budget > 0 && total > budget;
    const recorded = data.ledger.filter(item => item.source_type === 'subscription');
    const days = new Set(data.ledger.map(item => item.date)).size;
    const upcoming = data.subscriptions.filter(s => Number(s.is_active) && (s.cycle_type === 'monthly' || summary.warnings.some(w => w.id === s.id)) && (month !== F.currentMonthStr() || renewalInMonth(s, month) >= F.today())).sort((a, b) => renewalInMonth(a, month).localeCompare(renewalInMonth(b, month)));
    return <div className="view-enter">
      <div className="overview-grid">
        <section className={`panel budget-panel ${over ? 'over-budget' : ''}`}>
          <div className="budget-label">
            <span>本月支出</span>
            <button className="text-button" onClick={onBudget}>
              {budget ? '调整预算' : '设置预算'}
              <Icon name="edit" size={14} />
            </button>
          </div>
          <div className={`big-money ${money(total).length > 11 ? 'long-number' : ''}`}>
            <span>¥</span>
            {money(total)}
          </div>
          <div className="budget-caption">月预算 <strong>{budget ? `¥ ${money(budget)}` : '尚未设置'}</strong></div>
          <div className="progress" role="progressbar" aria-label="月预算使用率" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, percent)} aria-valuetext={budget ? `${percent.toFixed(1)}%` : '尚未设置预算'}><span style={{
              width: `${Math.min(100, percent)}%`
            }} /></div>
          <div className="budget-foot">
            <div>
              <span>{over ? '预算超出' : '预算剩余'}</span>
              <strong>{budget ? `¥ ${money(Math.abs(budget - total))}` : '—'}</strong>
            </div>
            <div>
              <span>预算使用</span>
              <strong>{budget ? `${percent.toFixed(1)}%` : '—'}</strong>
            </div>
          </div>
        </section>
        <section className="forecast-panel">
          <span>本月预期支出</span>
          <div className={`forecast-money ${money(summary.subscriptionCost + summary.serialCost).length > 11 ? 'long-number' : ''}`}>
            <span>¥</span>
            {money(summary.subscriptionCost + summary.serialCost)}
          </div>
          <div className="forecast-row">
            <Icon name="calendar" />
            <span>订阅月均</span>
            <strong>¥ {money(summary.subscriptionCost)}</strong>
          </div>
          <div className="forecast-row">
            <Icon name="book" />
            <span>待购连载</span>
            <strong>¥ {money(summary.serialCost)}</strong>
          </div>
          <small>订阅按月折算 + 本月未结算连载</small>
        </section>
      </div>
      <div className="summary-strip">
        <Metric label="日均支出" value={`¥ ${money(days ? total / days : 0)}`} icon="chart" />
        <Metric label="已记账" value={`${data.ledger.length} 笔`} icon="receipt" />
        <Metric label="订阅入账" value={`${recorded.length} 笔`} icon="calendar" />
      </div>
      {summary.warnings.length > 0 && <div className="warning-band">
        <Icon name="alert" />
        <div>
          <strong>本月有年付订阅续订</strong>
          <p>{summary.warnings.map(s => `${s.name} · ¥${money(s.price)}`).join('；')}</p>
        </div>
        <button className="text-button" onClick={() => onNavigate('subscriptions')}>查看<Icon name="chevron" size={15} /></button>
      </div>}
      <div className="content-grid">
        <section className="panel recent-panel">
          <PanelHeading title="最近账单" action="查看全部" onAction={() => onNavigate('ledger')} />
          {data.ledger.length ? [...data.ledger].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 4).map(item => <TransactionRow key={item.id} item={item} onEdit={onEdit} compact />) : <Empty title="从第一笔开始" description="记录一顿午餐，或一件喜欢的小物。" action="记一笔" onAction={onAdd} />}
        </section>
        <Distribution items={data.ledger} />
      </div>
      <section className="panel upcoming-panel">
        <PanelHeading title="本月待办" action="查看计划" onAction={() => onNavigate('subscriptions')} />
        <div className="upcoming-list">
          {upcoming.slice(0, 1).map(s => <button className="upcoming-item" key={s.id} onClick={() => onNavigate('subscriptions')}>
            <span className="category-icon neutral"><Icon name="calendar" /></span>
            <span>
              <strong>{s.name} 续订</strong>
              <small>{renewalInMonth(s, month)} · ¥{money(s.price)}</small>
            </span>
            <span className="status-tag">{s.cycle_type === 'monthly' ? '自动入账' : '年付提醒'}</span>
          </button>)}
          {summary.pending.slice(0, 1).map(s => <button className="upcoming-item" key={s.id} onClick={() => onNavigate('serials')}>
            <span className="category-icon shopping"><Icon name="book" /></span>
            <span>
              <strong>{s.name}</strong>
              <small>{s.expected_release_date} · ¥{money(s.price)}</small>
            </span>
            <span className="status-tag green">{SERIAL_STATUS_LABELS[s.status]}</span>
          </button>)}
          {!upcoming.length && !summary.pending.length && <p className="quiet-empty">本月没有续订提醒或待购连载，轻松一点。</p>}
        </div>
      </section>
      <p className="data-note">日均按有支出的日期计算。预期支出单独展示，不叠加到实际账单。</p>
    </div>;
  }
  function LedgerView({
    items,
    onEdit,
    onDelete,
    onImport,
    onAdd
  }) {
    const [query, setQuery] = useState(''),
      [category, setCategory] = useState('all'),
      [limit, setLimit] = useState(30);
    const filtered = useMemo(() => items.filter(item => (category === 'all' || item.category === category) && String(item.name || '').toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [items, category, query]);
    const groups = filtered.slice(0, limit).reduce((acc, item) => {
      (acc[item.date] ||= []).push(item);
      return acc;
    }, {});
    return <div className="view-enter">
      <section className="panel ledger-tools">
        <div className="ledger-toolbar">
          <div className="search-input">
            <Icon name="search" size={18} />
            <input aria-label="搜索账单" placeholder="搜索账单名称…" value={query} onChange={e => {
              setQuery(e.target.value);
              setLimit(30);
            }} />
          </div>
          <button className="button secondary" onClick={onImport}><Icon name="upload" size={17} />批量导入</button>
        </div>
        <div className="filter-tabs" aria-label="按分类筛选">{[['all', '全部'], ...Object.entries(CATEGORIES)].map(([key, label]) => <button key={key} aria-pressed={category === key} className={category === key ? 'active' : ''} onClick={() => {
            setCategory(key);
            setLimit(30);
          }}>{label}</button>)}</div>
      </section>
      <div className="ledger-summary">
        <span>{query || category !== 'all' ? '筛选结果' : '本月记录'} <strong>{filtered.length} 笔</strong></span>
        <span>合计 <strong>¥ {money(filtered.reduce((sum, item) => sum + safeNumber(item.amount), 0))}</strong></span>
      </div>
      {Object.entries(groups).map(([date, rows]) => <section className="panel ledger-day" key={date}>
        <div className="day-heading">
          <h2>
            {date === F.today() ? '今天' : date === new Date(Date.parse(F.today()) - 86400000).toISOString().slice(0, 10) ? '昨天' : `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`}
            <span>{new Date(date + 'T12:00:00+08:00').toLocaleDateString('zh-CN', {
                weekday: 'long',
                timeZone: F.BEIJING_TZ
              })}</span>
          </h2>
          <span>¥ {money(rows.reduce((sum, item) => sum + safeNumber(item.amount), 0))}</span>
        </div>
        {rows.map(item => <TransactionRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />)}
      </section>)}
      {!filtered.length && <section className="panel"><Empty title={items.length ? '没有找到相符的账单' : '本月还没有账单'} description={items.length ? '换一个关键词或分类试试。' : '每一笔记录，都是生活的一个小脚印。'} action={!items.length ? '记第一笔' : undefined} onAction={onAdd} /></section>}
      {filtered.length > limit && <button className="button secondary load-more" onClick={() => setLimit(limit + 30)}>加载更多 · 还剩 {filtered.length - limit} 笔</button>}
    </div>;
  }
  const cycles = {
    monthly: '月',
    quarterly: '季度',
    yearly: '年'
  };
  function PlansView({
    kind,
    data,
    summary,
    onNavigate,
    onAdd,
    onEdit,
    onDelete,
    onToggle,
    onAdvance,
    busyId
  }) {
    const subscriptions = kind === 'subscriptions';
    const items = subscriptions ? data.subscriptions : data.serials;
    const [filter, setFilter] = useState('all');
    const visible = items.filter(s => filter === 'all' || (subscriptions ? Number(s.is_active) === (filter === 'active' ? 1 : 0) : s.status === filter));
    return <div className="view-enter">
      <div className="plan-tabs segmented">
        <button className={subscriptions ? 'active' : ''} onClick={() => {
          setFilter('all');
          onNavigate('subscriptions');
        }}><Icon name="calendar" size={17} />固定订阅</button>
        <button className={!subscriptions ? 'active' : ''} onClick={() => {
          setFilter('all');
          onNavigate('serials');
        }}><Icon name="book" size={17} />连载计划</button>
      </div>
      <div className="plan-summary">
        <Metric label={subscriptions ? '订阅月均支出' : '本月待购金额'} value={`¥ ${money(subscriptions ? summary.subscriptionCost : summary.serialCost)}`} />
        <Metric label={subscriptions ? '正在订阅' : '本月待购'} value={`${subscriptions ? items.filter(s => Number(s.is_active)).length : summary.pending.length} 项`} />
        <button className="button primary" onClick={() => onAdd(kind)}>
          <Icon name="plus" size={18} />
          {subscriptions ? '新增订阅' : '新增连载'}
        </button>
      </div>
      <section className="panel plans-panel">
        <div className="filter-tabs">{(subscriptions ? [['all', '全部订阅'], ['active', '订阅中'], ['inactive', '已暂停']] : [['all', '全部计划'], ...Object.entries(SERIAL_STATUS_LABELS)]).map(([key, label]) => <button key={key} className={filter === key ? 'active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
        {visible.map(s => <div className="plan-row" key={s.id}>
          <span className={`category-icon ${subscriptions ? 'neutral' : 'shopping'}`}><Icon name={subscriptions ? 'calendar' : 'book'} size={23} /></span>
          <div className="plan-info">
            <strong>{s.name}</strong>
            <small>{subscriptions ? `每${cycles[s.cycle_type]} · 续订 ${s.first_payment_date || '未设置'}` : `${s.expected_release_date} · ${SERIAL_STATUS_LABELS[s.status]}`}</small>
            {subscriptions && <span className={`plan-state ${Number(s.is_active) ? 'text-green' : ''}`}>
              <i />
              {Number(s.is_active) ? '订阅中' : '已暂停'}
              {Number(s.is_active) && s.cycle_type === 'monthly' ? ' · 自动入账' : ''}
            </span>}
          </div>
          <div className="plan-price">¥ {money(s.price)}{subscriptions && <small>/ {cycles[s.cycle_type]}</small>}</div>
          <div className="plan-actions">
            {subscriptions ? <button type="button" className={`switch ${Number(s.is_active) ? 'on' : ''}`} role="switch" aria-checked={!!Number(s.is_active)} aria-label={`${Number(s.is_active) ? '暂停' : '开启'} ${s.name}`} disabled={busyId === s.id} onClick={() => onToggle(s)}><span /></button> : s.status !== 'paid' && <button className="button subtle" onClick={() => onAdvance(s)}>结算本期</button>}
            <button className="icon-button" aria-label={`编辑 ${s.name}`} onClick={() => onEdit(kind, s)}><Icon name="edit" size={17} /></button>
            <button className="icon-button row-delete" aria-label={`删除 ${s.name}`} onClick={() => onDelete(kind, s)}><Icon name="trash" size={17} /></button>
          </div>
        </div>)}
        {!visible.length && <Empty title={items.length ? '这个状态下暂无计划' : subscriptions ? '给固定支出一个家' : '下一期喜欢的作品，提前安排'} description={subscriptions ? '统一管理服务续订，知道每个月的固定花费。' : '记录发售月份与价格，结算后自动推进下一期。'} action={items.length ? undefined : subscriptions ? '新增订阅' : '新增连载'} onAction={() => onAdd(kind)} />}
      </section>
      <p className="data-note">{subscriptions ? '月付订阅在查看月份时按续订日自动入账；季度、年付按月折算到预估金额。' : '「结算本期」会生成实际账单，并将当前计划更新为下一期。'}</p>
    </div>;
  }
  function StatsView({
    allData,
    month,
    onMonth,
    mode,
    onMode,
    date,
    onDate,
    year,
    onYear,
    analysis,
    onAnalyze,
    onAISettings,
    onEdit,
    onDelete
  }) {
    const [expanded, setExpanded] = useState(false);
    const ledger = allData.ledger_items || [];
    const items = useMemo(() => ledger.filter(item => mode === 'day' ? item.date === date : mode === 'year' ? String(item.date || '').slice(0, 4) === String(year) : String(item.date || '').slice(0, 7) === month), [ledger, month, date, year, mode]);
    const total = items.reduce((sum, item) => sum + safeNumber(item.amount), 0);
    const rankings = useMemo(() => buildNameRanking(items), [items]);
    const monthly = useMemo(() => buildMonthlyTotals(ledger, year), [ledger, year]);
    const max = Math.max(...monthly.map(row => row.total), 0);
    const maxMonth = monthly.find(row => row.total === max);
    const budget = (allData.budgets || []).find(row => row.month_str === month)?.budget_amount || 0;
    const days = new Set(items.map(item => item.date)).size;
    const label = mode === 'day' ? date : mode === 'year' ? `${year} 年` : monthLabel(month);
    return <div className="view-enter">
      <div className="stats-toolbar">
        <div className="segmented">{[['day', '按日'], ['month', '按月'], ['year', '按年']].map(([key, label]) => <button key={key} className={mode === key ? 'active' : ''} aria-pressed={mode === key} onClick={() => {
            setExpanded(false);
            onMode(key);
          }}>{label}</button>)}</div>
        {mode === 'day' ? <input className="input period-input" type="date" aria-label="统计日期" value={date} onChange={e => e.target.value && onDate(e.target.value)} /> : mode === 'year' ? <select className="input period-input" aria-label="统计年份" value={year} onChange={e => onYear(e.target.value)}>{[...new Set([String(year), F.currentYearStr(), ...ledger.map(item => String(item.date || '').slice(0, 4)).filter(Boolean)])].sort().reverse().map(y => <option key={y} value={y}>{y} 年</option>)}</select> : <MonthControl value={month} onChange={onMonth} />}
      </div>
      <section className="stats-metrics">
        <Metric label={mode === 'day' ? '当日支出' : mode === 'year' ? '年度支出' : '本月支出'} value={`¥ ${money(total)}`} note={label} />
        <Metric label="记账笔数" value={`${items.length} 笔`} note="已入账记录" />
        <Metric label={mode === 'year' ? '月均支出' : mode === 'day' ? '订阅支出' : '日均支出'} value={`¥ ${money(mode === 'year' ? total / 12 : mode === 'day' ? items.filter(i => i.category === 'subscription').reduce((sum, i) => sum + safeNumber(i.amount), 0) : days ? total / days : 0)}`} note={mode === 'year' ? '按 12 个月平均' : mode === 'day' ? '已入账订阅' : '按有支出的日期平均'} />
        <Metric label={mode === 'year' ? '最高支出月份' : mode === 'day' ? '最大一笔支出' : '本月预算'} value={mode === 'year' ? maxMonth ? `${Number(maxMonth.month.slice(5))} 月` : '—' : `¥ ${money(mode === 'day' ? Math.max(...items.map(i => safeNumber(i.amount)), 0) : budget)}`} note={mode === 'year' ? `¥ ${money(max)}` : mode === 'month' ? budget ? total > budget ? '已超出预算' : '预算范围内' : '尚未设置' : '单笔记录'} />
      </section>
      <div className="content-grid stats-grid">
        <section className="panel rankings">
          <PanelHeading title="支出排行" action={rankings.length > 10 ? expanded ? '收起排行' : '展开全部' : undefined} onAction={() => setExpanded(!expanded)} />
          <p className="section-note">同名称、同分类合并统计</p>
          {(expanded ? rankings : rankings.slice(0, 10)).map((row, i) => <div className="ranking-row" key={`${row.category}-${row.name}`}>
            <span className="ranking-number">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <strong>{row.name}</strong>
              <small>{CATEGORIES[row.category]} · {row.count} 笔</small>
            </div>
            <strong>¥ {money(row.total)}</strong>
          </div>)}
          {!rankings.length && <Empty title="这一时段暂无支出" description="试试切换日期，查看其他时段的记录。" />}
        </section>
        <Distribution items={items} title="分类统计" />
      </div>
      {mode === 'year' && <section className="panel monthly-chart">
        <PanelHeading title="每月支出" />
        <div className="bar-chart">{Array.from({
            length: 12
          }, (_, i) => {
            const key = `${year}-${String(i + 1).padStart(2, '0')}`,
              amount = monthly.find(r => r.month === key)?.total || 0;
            return <div className="bar-column" key={key} role="img" aria-label={`${i + 1}月支出 ${money(amount)} 元`}>
            <span title={`¥${money(amount)}`}>¥{amount.toFixed(0)}</span>
            <div className="bar-track"><i style={{
                  height: `${max ? amount / max * 100 : 0}%`
                }} /></div>
            <small>{i + 1}月</small>
          </div>;
          })}</div>
      </section>}
      {mode === 'day' && items.length > 0 && <section className="panel">
        <PanelHeading title="当日记录" />
        {[...items].sort((a, b) => b.amount - a.amount).map(item => <TransactionRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />)}
      </section>}
      <section className="panel ai-panel">
        <div className="ai-heading">
          <span className="category-icon shopping"><Icon name="sparkles" size={23} /></span>
          <div>
            <h2>换个角度，看看你的消费</h2>
            <p>AI 分析 · {label} · 仅基于支出数据</p>
          </div>
          <button className="button primary" disabled={analysis.loading} onClick={onAnalyze}>
            <Icon name="sparkles" size={17} />
            {analysis.loading ? '分析中…' : analysis.result ? '重新分析' : '分析当前支出'}
          </button>
        </div>
        {analysis.error && <p className="form-error" role="alert">{analysis.error}</p>}
        {analysis.result ? <div className="ai-result">
          <div className="ai-meta">{analysis.result.provider} / {analysis.result.model}{analysis.result.updatedAt && <span>更新于 {analysis.result.updatedAt.replace('T', ' ')}</span>}</div>
          <p>{analysis.result.analysis}</p>
        </div> : <div className="ai-empty">
          <p>{analysis.loading ? '正在读取分析…' : '发现支出习惯，为下一个月留一点余地。'}</p>
          <button className="text-button" onClick={onAISettings}>配置 AI 模型<Icon name="chevron" size={15} /></button>
        </div>}
      </section>
    </div>;
  }
  function SettingsView({
    settings,
    onAISettings,
    onJSON,
    onCSV,
    onImport,
    onLogout,
    refreshTime,
    onRefresh,
    loading
  }) {
    return <div className="view-enter settings-grid">
      <section className="panel">
        <PanelHeading title="你的数据，由你掌握" />
        <p className="section-note">备份、导出或批量添加你的消费记录。</p>
        {[['download', '完整数据备份', '导出 JSON，包含账单、订阅、连载和预算。', onJSON], ['receipt', '导出账单表格', '导出全部账单 CSV，可在表格软件中打开。', onCSV], ['upload', '批量导入账单', '粘贴 CSV 文本，一次添加多条记录。', onImport]].map(([icon, title, description, onClick]) => <button key={title} className="setting-row" onClick={onClick}>
          <span className="category-icon neutral"><Icon name={icon} /></span>
          <span>
            <strong>{title}</strong>
            <small>{description}</small>
          </span>
          <Icon name="chevron" size={17} />
        </button>)}
      </section>
      <section className="panel">
        <PanelHeading title="AI 消费分析" />
        <div className="settings-ai">
          <span className="category-icon shopping"><Icon name="sparkles" /></span>
          <div>
            <strong>{settings.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI Compatible'}</strong>
            <small>{settings.model}</small>
          </div>
          <span className={`status-tag ${settings.hasApiKey ? 'green' : ''}`}>{settings.hasApiKey ? '已配置' : '未配置'}</span>
        </div>
        <p className="helper">对所选日期、月份或年份的支出生成分析。可在统计页面查看已保存的结果。</p>
        <button className="button secondary full" onClick={onAISettings}><Icon name="settings" size={17} />接口与模型设置</button>
      </section>
      <section className="panel sync-panel">
        <PanelHeading title="账户与同步" />
        <div>
          <span>最近刷新 · 北京时间</span>
          <strong>{refreshTime || '尚未刷新'}</strong>
        </div>
        <div className="form-actions">
          <button className="button secondary" disabled={loading} onClick={onRefresh}>
            <Icon name="refresh" size={17} />
            {loading ? '刷新中…' : '刷新数据'}
          </button>
          <button className="button secondary" onClick={onLogout}><Icon name="logout" size={17} />退出登录</button>
        </div>
      </section>
    </div>;
  }
  Object.assign(F, {
    AppShell,
    PageHeader,
    MonthControl,
    Dashboard,
    LedgerView,
    PlansView,
    StatsView,
    SettingsView
  });
})();
