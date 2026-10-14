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
    return React.createElement("div", {
      className: "app-shell"
    }, React.createElement("a", {
      className: "skip-link",
      href: "#main-content"
    }, "\u8DF3\u5230\u4E3B\u8981\u5185\u5BB9"), React.createElement("aside", {
      className: "sidebar"
    }, React.createElement(Brand, null), React.createElement("nav", {
      "aria-label": "\u4E3B\u8981\u5BFC\u822A"
    }, NAV.map(([key, label, icon]) => React.createElement("button", {
      key: key,
      className: `nav-item ${active === key ? 'active' : ''}`,
      "aria-current": active === key ? 'page' : undefined,
      onClick: () => onNavigate(key)
    }, React.createElement(Icon, {
      name: icon,
      fill: active === 'dashboard' && key === 'dashboard' ? 'currentColor' : 'none'
    }), React.createElement("span", null, label)))), React.createElement("div", {
      className: "sidebar-bottom"
    }, React.createElement("button", {
      className: `nav-item ${active === 'settings' ? 'active' : ''}`,
      onClick: () => onNavigate('settings')
    }, React.createElement(Icon, {
      name: "settings"
    }), React.createElement("span", null, "\u6570\u636E\u4E0E\u8BBE\u7F6E")), React.createElement("div", {
      className: "profile"
    }, React.createElement("span", {
      className: "avatar"
    }, React.createElement(Icon, {
      name: "user",
      size: 19
    })), React.createElement("span", null, username), React.createElement("button", {
      className: "icon-button",
      "aria-label": "\u9000\u51FA\u767B\u5F55",
      onClick: onLogout
    }, React.createElement(Icon, {
      name: "logout",
      size: 18
    }))))), React.createElement("div", {
      className: "workspace"
    }, React.createElement("header", {
      className: "mobile-header"
    }, React.createElement(Brand, null), active !== 'stats' && active !== 'settings' ? React.createElement(MonthControl, {
      value: month,
      onChange: onMonth
    }) : React.createElement("button", {
      className: "icon-button",
      onClick: () => onNavigate('settings'),
      "aria-label": "\u6570\u636E\u4E0E\u8BBE\u7F6E"
    }, React.createElement(Icon, {
      name: "settings"
    }))), React.createElement("main", {
      id: "main-content",
      className: "main-content",
      tabIndex: -1
    }, children)), React.createElement("nav", {
      className: "bottom-nav",
      "aria-label": "\u79FB\u52A8\u7AEF\u5BFC\u822A"
    }, React.createElement("button", {
      className: active === 'dashboard' ? 'active' : '',
      onClick: () => onNavigate('dashboard'),
      "aria-current": active === 'dashboard' ? 'page' : undefined
    }, React.createElement(Icon, {
      name: "home",
      fill: active === 'dashboard' ? 'currentColor' : 'none'
    }), React.createElement("span", null, "\u603B\u89C8")), React.createElement("button", {
      className: active === 'ledger' ? 'active' : '',
      onClick: () => onNavigate('ledger'),
      "aria-current": active === 'ledger' ? 'page' : undefined
    }, React.createElement(Icon, {
      name: "receipt"
    }), React.createElement("span", null, "\u8D26\u5355")), React.createElement("button", {
      className: "quick-add",
      "aria-label": "\u8BB0\u4E00\u7B14",
      onClick: onAdd
    }, React.createElement("span", null, React.createElement(Icon, {
      name: "plus",
      size: 25
    }))), React.createElement("button", {
      className: plans ? 'active' : '',
      onClick: () => onNavigate('subscriptions'),
      "aria-current": plans ? 'page' : undefined
    }, React.createElement(Icon, {
      name: "calendar"
    }), React.createElement("span", null, "\u8BA1\u5212")), React.createElement("button", {
      className: active === 'stats' ? 'active' : '',
      onClick: () => onNavigate('stats'),
      "aria-current": active === 'stats' ? 'page' : undefined
    }, React.createElement(Icon, {
      name: "chart"
    }), React.createElement("span", null, "\u7EDF\u8BA1"))));
  }
  function PageHeader({
    title,
    subtitle,
    children
  }) {
    return React.createElement("header", {
      className: "page-header"
    }, React.createElement("div", null, React.createElement("h1", null, title), React.createElement("p", null, subtitle)), React.createElement("div", {
      className: "header-actions"
    }, children));
  }
  function MonthControl({
    value,
    onChange
  }) {
    return React.createElement("div", {
      className: "month-control"
    }, React.createElement(Icon, {
      name: "calendar",
      size: 17
    }), React.createElement("input", {
      type: "month",
      "aria-label": "\u67E5\u770B\u6708\u4EFD",
      value: value,
      onChange: e => e.target.value && onChange(e.target.value)
    }));
  }
  function PanelHeading({
    title,
    action,
    onAction
  }) {
    return React.createElement("div", {
      className: "panel-heading"
    }, React.createElement("h2", null, title), action && React.createElement("button", {
      className: "text-button",
      onClick: onAction
    }, action, React.createElement(Icon, {
      name: "chevron",
      size: 15
    })));
  }
  function TransactionRow({
    item,
    onEdit,
    onDelete,
    compact = false
  }) {
    return React.createElement("div", {
      className: "transaction-row"
    }, React.createElement("button", {
      className: "transaction-detail",
      onClick: () => onEdit(item),
      "aria-label": `编辑 ${item.name}`
    }, React.createElement("span", {
      className: `category-icon ${item.category}`
    }, React.createElement(Icon, {
      name: item.category,
      size: 22
    })), React.createElement("span", {
      className: "transaction-name"
    }, React.createElement("strong", null, item.name), React.createElement("small", null, Number(item.date.slice(5, 7)), "\u6708", Number(item.date.slice(8)), "\u65E5 \xB7 ", CATEGORIES[item.category], item.source_type === 'subscription' ? ' · 自动入账' : '')), React.createElement("span", {
      className: "transaction-amount"
    }, "\xA5 ", money(item.amount)), React.createElement(Icon, {
      name: "chevron",
      size: 16
    })), !compact && React.createElement("button", {
      className: "icon-button row-delete",
      onClick: () => onDelete(item),
      "aria-label": `删除 ${item.name}`
    }, React.createElement(Icon, {
      name: "trash",
      size: 17
    })));
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
    return React.createElement("section", {
      className: "panel distribution"
    }, React.createElement(PanelHeading, {
      title: title
    }), React.createElement("div", {
      className: "donut",
      role: "img",
      "aria-label": total ? `总支出 ${money(total)} 元，${Object.keys(CATEGORIES).map(key => `${CATEGORIES[key]} ${money(breakdown[key])} 元`).join('，')}` : '暂无支出数据'
    }, React.createElement("svg", {
      viewBox: "0 0 160 160"
    }, React.createElement("circle", {
      cx: "80",
      cy: "80",
      r: "62",
      fill: "none",
      stroke: "#eef2ef",
      strokeWidth: "23"
    }), Object.keys(CATEGORIES).map(key => {
      const percent = total ? breakdown[key] / total * 100 : 0;
      const start = offset;
      offset += percent;
      return React.createElement("circle", {
        key: key,
        cx: "80",
        cy: "80",
        r: "62",
        fill: "none",
        stroke: colors[key],
        strokeWidth: "23",
        pathLength: "100",
        strokeDasharray: `${percent} ${100 - percent}`,
        strokeDashoffset: -start,
        transform: "rotate(-90 80 80)"
      });
    })), React.createElement("div", null, React.createElement("strong", null, "\xA5", money(total)), React.createElement("span", null, "\u5DF2\u5165\u8D26\u652F\u51FA"))), React.createElement("div", {
      className: "chart-legend"
    }, Object.entries(CATEGORIES).map(([key, label]) => React.createElement("div", {
      key: key
    }, React.createElement("span", {
      className: "legend-label"
    }, React.createElement("i", {
      style: {
        background: colors[key]
      }
    }), label), React.createElement("strong", null, "\xA5", money(breakdown[key])), React.createElement("small", null, total ? (breakdown[key] / total * 100).toFixed(1) : '0.0', "%")))));
  }
  function Metric({
    label,
    value,
    note,
    icon
  }) {
    return React.createElement("div", {
      className: "metric"
    }, icon && React.createElement(Icon, {
      name: icon,
      size: 22
    }), React.createElement("div", null, React.createElement("span", null, label), React.createElement("strong", null, value), note && React.createElement("small", null, note)));
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
    return React.createElement("div", {
      className: "view-enter"
    }, React.createElement("div", {
      className: "overview-grid"
    }, React.createElement("section", {
      className: `panel budget-panel ${over ? 'over-budget' : ''}`
    }, React.createElement("div", {
      className: "budget-label"
    }, React.createElement("span", null, "\u672C\u6708\u652F\u51FA"), React.createElement("button", {
      className: "text-button",
      onClick: onBudget
    }, budget ? '调整预算' : '设置预算', React.createElement(Icon, {
      name: "edit",
      size: 14
    }))), React.createElement("div", {
      className: `big-money ${money(total).length > 11 ? 'long-number' : ''}`
    }, React.createElement("span", null, "\xA5"), money(total)), React.createElement("div", {
      className: "budget-caption"
    }, "\u6708\u9884\u7B97 ", React.createElement("strong", null, budget ? `¥ ${money(budget)}` : '尚未设置')), React.createElement("div", {
      className: "progress",
      role: "progressbar",
      "aria-label": "\u6708\u9884\u7B97\u4F7F\u7528\u7387",
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": Math.min(100, percent),
      "aria-valuetext": budget ? `${percent.toFixed(1)}%` : '尚未设置预算'
    }, React.createElement("span", {
      style: {
        width: `${Math.min(100, percent)}%`
      }
    })), React.createElement("div", {
      className: "budget-foot"
    }, React.createElement("div", null, React.createElement("span", null, over ? '预算超出' : '预算剩余'), React.createElement("strong", null, budget ? `¥ ${money(Math.abs(budget - total))}` : '—')), React.createElement("div", null, React.createElement("span", null, "\u9884\u7B97\u4F7F\u7528"), React.createElement("strong", null, budget ? `${percent.toFixed(1)}%` : '—')))), React.createElement("section", {
      className: "forecast-panel"
    }, React.createElement("span", null, "\u672C\u6708\u9884\u671F\u652F\u51FA"), React.createElement("div", {
      className: `forecast-money ${money(summary.subscriptionCost + summary.serialCost).length > 11 ? 'long-number' : ''}`
    }, React.createElement("span", null, "\xA5"), money(summary.subscriptionCost + summary.serialCost)), React.createElement("div", {
      className: "forecast-row"
    }, React.createElement(Icon, {
      name: "calendar"
    }), React.createElement("span", null, "\u8BA2\u9605\u6708\u5747"), React.createElement("strong", null, "\xA5 ", money(summary.subscriptionCost))), React.createElement("div", {
      className: "forecast-row"
    }, React.createElement(Icon, {
      name: "book"
    }), React.createElement("span", null, "\u5F85\u8D2D\u8FDE\u8F7D"), React.createElement("strong", null, "\xA5 ", money(summary.serialCost))), React.createElement("small", null, "\u8BA2\u9605\u6309\u6708\u6298\u7B97 + \u672C\u6708\u672A\u7ED3\u7B97\u8FDE\u8F7D"))), React.createElement("div", {
      className: "summary-strip"
    }, React.createElement(Metric, {
      label: "\u65E5\u5747\u652F\u51FA",
      value: `¥ ${money(days ? total / days : 0)}`,
      icon: "chart"
    }), React.createElement(Metric, {
      label: "\u5DF2\u8BB0\u8D26",
      value: `${data.ledger.length} 笔`,
      icon: "receipt"
    }), React.createElement(Metric, {
      label: "\u8BA2\u9605\u5165\u8D26",
      value: `${recorded.length} 笔`,
      icon: "calendar"
    })), summary.warnings.length > 0 && React.createElement("div", {
      className: "warning-band"
    }, React.createElement(Icon, {
      name: "alert"
    }), React.createElement("div", null, React.createElement("strong", null, "\u672C\u6708\u6709\u5E74\u4ED8\u8BA2\u9605\u7EED\u8BA2"), React.createElement("p", null, summary.warnings.map(s => `${s.name} · ¥${money(s.price)}`).join('；'))), React.createElement("button", {
      className: "text-button",
      onClick: () => onNavigate('subscriptions')
    }, "\u67E5\u770B", React.createElement(Icon, {
      name: "chevron",
      size: 15
    }))), React.createElement("div", {
      className: "content-grid"
    }, React.createElement("section", {
      className: "panel recent-panel"
    }, React.createElement(PanelHeading, {
      title: "\u6700\u8FD1\u8D26\u5355",
      action: "\u67E5\u770B\u5168\u90E8",
      onAction: () => onNavigate('ledger')
    }), data.ledger.length ? [...data.ledger].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 4).map(item => React.createElement(TransactionRow, {
      key: item.id,
      item: item,
      onEdit: onEdit,
      compact: true
    })) : React.createElement(Empty, {
      title: "\u4ECE\u7B2C\u4E00\u7B14\u5F00\u59CB",
      description: "\u8BB0\u5F55\u4E00\u987F\u5348\u9910\uFF0C\u6216\u4E00\u4EF6\u559C\u6B22\u7684\u5C0F\u7269\u3002",
      action: "\u8BB0\u4E00\u7B14",
      onAction: onAdd
    })), React.createElement(Distribution, {
      items: data.ledger
    })), React.createElement("section", {
      className: "panel upcoming-panel"
    }, React.createElement(PanelHeading, {
      title: "\u672C\u6708\u5F85\u529E",
      action: "\u67E5\u770B\u8BA1\u5212",
      onAction: () => onNavigate('subscriptions')
    }), React.createElement("div", {
      className: "upcoming-list"
    }, upcoming.slice(0, 1).map(s => React.createElement("button", {
      className: "upcoming-item",
      key: s.id,
      onClick: () => onNavigate('subscriptions')
    }, React.createElement("span", {
      className: "category-icon neutral"
    }, React.createElement(Icon, {
      name: "calendar"
    })), React.createElement("span", null, React.createElement("strong", null, s.name, " \u7EED\u8BA2"), React.createElement("small", null, renewalInMonth(s, month), " \xB7 \xA5", money(s.price))), React.createElement("span", {
      className: "status-tag"
    }, s.cycle_type === 'monthly' ? '自动入账' : '年付提醒'))), summary.pending.slice(0, 1).map(s => React.createElement("button", {
      className: "upcoming-item",
      key: s.id,
      onClick: () => onNavigate('serials')
    }, React.createElement("span", {
      className: "category-icon shopping"
    }, React.createElement(Icon, {
      name: "book"
    })), React.createElement("span", null, React.createElement("strong", null, s.name), React.createElement("small", null, s.expected_release_date, " \xB7 \xA5", money(s.price))), React.createElement("span", {
      className: "status-tag green"
    }, SERIAL_STATUS_LABELS[s.status]))), !upcoming.length && !summary.pending.length && React.createElement("p", {
      className: "quiet-empty"
    }, "\u672C\u6708\u6CA1\u6709\u7EED\u8BA2\u63D0\u9192\u6216\u5F85\u8D2D\u8FDE\u8F7D\uFF0C\u8F7B\u677E\u4E00\u70B9\u3002"))), React.createElement("p", {
      className: "data-note"
    }, "\u65E5\u5747\u6309\u6709\u652F\u51FA\u7684\u65E5\u671F\u8BA1\u7B97\u3002\u9884\u671F\u652F\u51FA\u5355\u72EC\u5C55\u793A\uFF0C\u4E0D\u53E0\u52A0\u5230\u5B9E\u9645\u8D26\u5355\u3002"));
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
    return React.createElement("div", {
      className: "view-enter"
    }, React.createElement("section", {
      className: "panel ledger-tools"
    }, React.createElement("div", {
      className: "ledger-toolbar"
    }, React.createElement("div", {
      className: "search-input"
    }, React.createElement(Icon, {
      name: "search",
      size: 18
    }), React.createElement("input", {
      "aria-label": "\u641C\u7D22\u8D26\u5355",
      placeholder: "\u641C\u7D22\u8D26\u5355\u540D\u79F0\u2026",
      value: query,
      onChange: e => {
        setQuery(e.target.value);
        setLimit(30);
      }
    })), React.createElement("button", {
      className: "button secondary",
      onClick: onImport
    }, React.createElement(Icon, {
      name: "upload",
      size: 17
    }), "\u6279\u91CF\u5BFC\u5165")), React.createElement("div", {
      className: "filter-tabs",
      "aria-label": "\u6309\u5206\u7C7B\u7B5B\u9009"
    }, [['all', '全部'], ...Object.entries(CATEGORIES)].map(([key, label]) => React.createElement("button", {
      key: key,
      "aria-pressed": category === key,
      className: category === key ? 'active' : '',
      onClick: () => {
        setCategory(key);
        setLimit(30);
      }
    }, label)))), React.createElement("div", {
      className: "ledger-summary"
    }, React.createElement("span", null, query || category !== 'all' ? '筛选结果' : '本月记录', " ", React.createElement("strong", null, filtered.length, " \u7B14")), React.createElement("span", null, "\u5408\u8BA1 ", React.createElement("strong", null, "\xA5 ", money(filtered.reduce((sum, item) => sum + safeNumber(item.amount), 0))))), Object.entries(groups).map(([date, rows]) => React.createElement("section", {
      className: "panel ledger-day",
      key: date
    }, React.createElement("div", {
      className: "day-heading"
    }, React.createElement("h2", null, date === F.today() ? '今天' : date === new Date(Date.parse(F.today()) - 86400000).toISOString().slice(0, 10) ? '昨天' : `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`, React.createElement("span", null, new Date(date + 'T12:00:00+08:00').toLocaleDateString('zh-CN', {
      weekday: 'long',
      timeZone: F.BEIJING_TZ
    }))), React.createElement("span", null, "\xA5 ", money(rows.reduce((sum, item) => sum + safeNumber(item.amount), 0)))), rows.map(item => React.createElement(TransactionRow, {
      key: item.id,
      item: item,
      onEdit: onEdit,
      onDelete: onDelete
    })))), !filtered.length && React.createElement("section", {
      className: "panel"
    }, React.createElement(Empty, {
      title: items.length ? '没有找到相符的账单' : '本月还没有账单',
      description: items.length ? '换一个关键词或分类试试。' : '每一笔记录，都是生活的一个小脚印。',
      action: !items.length ? '记第一笔' : undefined,
      onAction: onAdd
    })), filtered.length > limit && React.createElement("button", {
      className: "button secondary load-more",
      onClick: () => setLimit(limit + 30)
    }, "\u52A0\u8F7D\u66F4\u591A \xB7 \u8FD8\u5269 ", filtered.length - limit, " \u7B14"));
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
    return React.createElement("div", {
      className: "view-enter"
    }, React.createElement("div", {
      className: "plan-tabs segmented"
    }, React.createElement("button", {
      className: subscriptions ? 'active' : '',
      onClick: () => {
        setFilter('all');
        onNavigate('subscriptions');
      }
    }, React.createElement(Icon, {
      name: "calendar",
      size: 17
    }), "\u56FA\u5B9A\u8BA2\u9605"), React.createElement("button", {
      className: !subscriptions ? 'active' : '',
      onClick: () => {
        setFilter('all');
        onNavigate('serials');
      }
    }, React.createElement(Icon, {
      name: "book",
      size: 17
    }), "\u8FDE\u8F7D\u8BA1\u5212")), React.createElement("div", {
      className: "plan-summary"
    }, React.createElement(Metric, {
      label: subscriptions ? '订阅月均支出' : '本月待购金额',
      value: `¥ ${money(subscriptions ? summary.subscriptionCost : summary.serialCost)}`
    }), React.createElement(Metric, {
      label: subscriptions ? '正在订阅' : '本月待购',
      value: `${subscriptions ? items.filter(s => Number(s.is_active)).length : summary.pending.length} 项`
    }), React.createElement("button", {
      className: "button primary",
      onClick: () => onAdd(kind)
    }, React.createElement(Icon, {
      name: "plus",
      size: 18
    }), subscriptions ? '新增订阅' : '新增连载')), React.createElement("section", {
      className: "panel plans-panel"
    }, React.createElement("div", {
      className: "filter-tabs"
    }, (subscriptions ? [['all', '全部订阅'], ['active', '订阅中'], ['inactive', '已暂停']] : [['all', '全部计划'], ...Object.entries(SERIAL_STATUS_LABELS)]).map(([key, label]) => React.createElement("button", {
      key: key,
      className: filter === key ? 'active' : '',
      "aria-pressed": filter === key,
      onClick: () => setFilter(key)
    }, label))), visible.map(s => React.createElement("div", {
      className: "plan-row",
      key: s.id
    }, React.createElement("span", {
      className: `category-icon ${subscriptions ? 'neutral' : 'shopping'}`
    }, React.createElement(Icon, {
      name: subscriptions ? 'calendar' : 'book',
      size: 23
    })), React.createElement("div", {
      className: "plan-info"
    }, React.createElement("strong", null, s.name), React.createElement("small", null, subscriptions ? `每${cycles[s.cycle_type]} · 续订 ${s.first_payment_date || '未设置'}` : `${s.expected_release_date} · ${SERIAL_STATUS_LABELS[s.status]}`), subscriptions && React.createElement("span", {
      className: `plan-state ${Number(s.is_active) ? 'text-green' : ''}`
    }, React.createElement("i", null), Number(s.is_active) ? '订阅中' : '已暂停', Number(s.is_active) && s.cycle_type === 'monthly' ? ' · 自动入账' : '')), React.createElement("div", {
      className: "plan-price"
    }, "\xA5 ", money(s.price), subscriptions && React.createElement("small", null, "/ ", cycles[s.cycle_type])), React.createElement("div", {
      className: "plan-actions"
    }, subscriptions ? React.createElement("button", {
      type: "button",
      className: `switch ${Number(s.is_active) ? 'on' : ''}`,
      role: "switch",
      "aria-checked": !!Number(s.is_active),
      "aria-label": `${Number(s.is_active) ? '暂停' : '开启'} ${s.name}`,
      disabled: busyId === s.id,
      onClick: () => onToggle(s)
    }, React.createElement("span", null)) : s.status !== 'paid' && React.createElement("button", {
      className: "button subtle",
      onClick: () => onAdvance(s)
    }, "\u7ED3\u7B97\u672C\u671F"), React.createElement("button", {
      className: "icon-button",
      "aria-label": `编辑 ${s.name}`,
      onClick: () => onEdit(kind, s)
    }, React.createElement(Icon, {
      name: "edit",
      size: 17
    })), React.createElement("button", {
      className: "icon-button row-delete",
      "aria-label": `删除 ${s.name}`,
      onClick: () => onDelete(kind, s)
    }, React.createElement(Icon, {
      name: "trash",
      size: 17
    }))))), !visible.length && React.createElement(Empty, {
      title: items.length ? '这个状态下暂无计划' : subscriptions ? '给固定支出一个家' : '下一期喜欢的作品，提前安排',
      description: subscriptions ? '统一管理服务续订，知道每个月的固定花费。' : '记录发售月份与价格，结算后自动推进下一期。',
      action: items.length ? undefined : subscriptions ? '新增订阅' : '新增连载',
      onAction: () => onAdd(kind)
    })), React.createElement("p", {
      className: "data-note"
    }, subscriptions ? '月付订阅在查看月份时按续订日自动入账；季度、年付按月折算到预估金额。' : '「结算本期」会生成实际账单，并将当前计划更新为下一期。'));
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
    return React.createElement("div", {
      className: "view-enter"
    }, React.createElement("div", {
      className: "stats-toolbar"
    }, React.createElement("div", {
      className: "segmented"
    }, [['day', '按日'], ['month', '按月'], ['year', '按年']].map(([key, label]) => React.createElement("button", {
      key: key,
      className: mode === key ? 'active' : '',
      "aria-pressed": mode === key,
      onClick: () => {
        setExpanded(false);
        onMode(key);
      }
    }, label))), mode === 'day' ? React.createElement("input", {
      className: "input period-input",
      type: "date",
      "aria-label": "\u7EDF\u8BA1\u65E5\u671F",
      value: date,
      onChange: e => e.target.value && onDate(e.target.value)
    }) : mode === 'year' ? React.createElement("select", {
      className: "input period-input",
      "aria-label": "\u7EDF\u8BA1\u5E74\u4EFD",
      value: year,
      onChange: e => onYear(e.target.value)
    }, [...new Set([String(year), F.currentYearStr(), ...ledger.map(item => String(item.date || '').slice(0, 4)).filter(Boolean)])].sort().reverse().map(y => React.createElement("option", {
      key: y,
      value: y
    }, y, " \u5E74"))) : React.createElement(MonthControl, {
      value: month,
      onChange: onMonth
    })), React.createElement("section", {
      className: "stats-metrics"
    }, React.createElement(Metric, {
      label: mode === 'day' ? '当日支出' : mode === 'year' ? '年度支出' : '本月支出',
      value: `¥ ${money(total)}`,
      note: label
    }), React.createElement(Metric, {
      label: "\u8BB0\u8D26\u7B14\u6570",
      value: `${items.length} 笔`,
      note: "\u5DF2\u5165\u8D26\u8BB0\u5F55"
    }), React.createElement(Metric, {
      label: mode === 'year' ? '月均支出' : mode === 'day' ? '订阅支出' : '日均支出',
      value: `¥ ${money(mode === 'year' ? total / 12 : mode === 'day' ? items.filter(i => i.category === 'subscription').reduce((sum, i) => sum + safeNumber(i.amount), 0) : days ? total / days : 0)}`,
      note: mode === 'year' ? '按 12 个月平均' : mode === 'day' ? '已入账订阅' : '按有支出的日期平均'
    }), React.createElement(Metric, {
      label: mode === 'year' ? '最高支出月份' : mode === 'day' ? '最大一笔支出' : '本月预算',
      value: mode === 'year' ? maxMonth ? `${Number(maxMonth.month.slice(5))} 月` : '—' : `¥ ${money(mode === 'day' ? Math.max(...items.map(i => safeNumber(i.amount)), 0) : budget)}`,
      note: mode === 'year' ? `¥ ${money(max)}` : mode === 'month' ? budget ? total > budget ? '已超出预算' : '预算范围内' : '尚未设置' : '单笔记录'
    })), React.createElement("div", {
      className: "content-grid stats-grid"
    }, React.createElement("section", {
      className: "panel rankings"
    }, React.createElement(PanelHeading, {
      title: "\u652F\u51FA\u6392\u884C",
      action: rankings.length > 10 ? expanded ? '收起排行' : '展开全部' : undefined,
      onAction: () => setExpanded(!expanded)
    }), React.createElement("p", {
      className: "section-note"
    }, "\u540C\u540D\u79F0\u3001\u540C\u5206\u7C7B\u5408\u5E76\u7EDF\u8BA1"), (expanded ? rankings : rankings.slice(0, 10)).map((row, i) => React.createElement("div", {
      className: "ranking-row",
      key: `${row.category}-${row.name}`
    }, React.createElement("span", {
      className: "ranking-number"
    }, String(i + 1).padStart(2, '0')), React.createElement("div", null, React.createElement("strong", null, row.name), React.createElement("small", null, CATEGORIES[row.category], " \xB7 ", row.count, " \u7B14")), React.createElement("strong", null, "\xA5 ", money(row.total)))), !rankings.length && React.createElement(Empty, {
      title: "\u8FD9\u4E00\u65F6\u6BB5\u6682\u65E0\u652F\u51FA",
      description: "\u8BD5\u8BD5\u5207\u6362\u65E5\u671F\uFF0C\u67E5\u770B\u5176\u4ED6\u65F6\u6BB5\u7684\u8BB0\u5F55\u3002"
    })), React.createElement(Distribution, {
      items: items,
      title: "\u5206\u7C7B\u7EDF\u8BA1"
    })), mode === 'year' && React.createElement("section", {
      className: "panel monthly-chart"
    }, React.createElement(PanelHeading, {
      title: "\u6BCF\u6708\u652F\u51FA"
    }), React.createElement("div", {
      className: "bar-chart"
    }, Array.from({
      length: 12
    }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`,
        amount = monthly.find(r => r.month === key)?.total || 0;
      return React.createElement("div", {
        className: "bar-column",
        key: key,
        role: "img",
        "aria-label": `${i + 1}月支出 ${money(amount)} 元`
      }, React.createElement("span", {
        title: `¥${money(amount)}`
      }, "\xA5", amount.toFixed(0)), React.createElement("div", {
        className: "bar-track"
      }, React.createElement("i", {
        style: {
          height: `${max ? amount / max * 100 : 0}%`
        }
      })), React.createElement("small", null, i + 1, "\u6708"));
    }))), mode === 'day' && items.length > 0 && React.createElement("section", {
      className: "panel"
    }, React.createElement(PanelHeading, {
      title: "\u5F53\u65E5\u8BB0\u5F55"
    }), [...items].sort((a, b) => b.amount - a.amount).map(item => React.createElement(TransactionRow, {
      key: item.id,
      item: item,
      onEdit: onEdit,
      onDelete: onDelete
    }))), React.createElement("section", {
      className: "panel ai-panel"
    }, React.createElement("div", {
      className: "ai-heading"
    }, React.createElement("span", {
      className: "category-icon shopping"
    }, React.createElement(Icon, {
      name: "sparkles",
      size: 23
    })), React.createElement("div", null, React.createElement("h2", null, "\u6362\u4E2A\u89D2\u5EA6\uFF0C\u770B\u770B\u4F60\u7684\u6D88\u8D39"), React.createElement("p", null, "AI \u5206\u6790 \xB7 ", label, " \xB7 \u4EC5\u57FA\u4E8E\u652F\u51FA\u6570\u636E")), React.createElement("button", {
      className: "button primary",
      disabled: analysis.loading,
      onClick: onAnalyze
    }, React.createElement(Icon, {
      name: "sparkles",
      size: 17
    }), analysis.loading ? '分析中…' : analysis.result ? '重新分析' : '分析当前支出')), analysis.error && React.createElement("p", {
      className: "form-error",
      role: "alert"
    }, analysis.error), analysis.result ? React.createElement("div", {
      className: "ai-result"
    }, React.createElement("div", {
      className: "ai-meta"
    }, analysis.result.provider, " / ", analysis.result.model, analysis.result.updatedAt && React.createElement("span", null, "\u66F4\u65B0\u4E8E ", analysis.result.updatedAt.replace('T', ' '))), React.createElement("p", null, analysis.result.analysis)) : React.createElement("div", {
      className: "ai-empty"
    }, React.createElement("p", null, analysis.loading ? '正在读取分析…' : '发现支出习惯，为下一个月留一点余地。'), React.createElement("button", {
      className: "text-button",
      onClick: onAISettings
    }, "\u914D\u7F6E AI \u6A21\u578B", React.createElement(Icon, {
      name: "chevron",
      size: 15
    })))));
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
    return React.createElement("div", {
      className: "view-enter settings-grid"
    }, React.createElement("section", {
      className: "panel"
    }, React.createElement(PanelHeading, {
      title: "\u4F60\u7684\u6570\u636E\uFF0C\u7531\u4F60\u638C\u63E1"
    }), React.createElement("p", {
      className: "section-note"
    }, "\u5907\u4EFD\u3001\u5BFC\u51FA\u6216\u6279\u91CF\u6DFB\u52A0\u4F60\u7684\u6D88\u8D39\u8BB0\u5F55\u3002"), [['download', '完整数据备份', '导出 JSON，包含账单、订阅、连载和预算。', onJSON], ['receipt', '导出账单表格', '导出全部账单 CSV，可在表格软件中打开。', onCSV], ['upload', '批量导入账单', '粘贴 CSV 文本，一次添加多条记录。', onImport]].map(([icon, title, description, onClick]) => React.createElement("button", {
      key: title,
      className: "setting-row",
      onClick: onClick
    }, React.createElement("span", {
      className: "category-icon neutral"
    }, React.createElement(Icon, {
      name: icon
    })), React.createElement("span", null, React.createElement("strong", null, title), React.createElement("small", null, description)), React.createElement(Icon, {
      name: "chevron",
      size: 17
    })))), React.createElement("section", {
      className: "panel"
    }, React.createElement(PanelHeading, {
      title: "AI \u6D88\u8D39\u5206\u6790"
    }), React.createElement("div", {
      className: "settings-ai"
    }, React.createElement("span", {
      className: "category-icon shopping"
    }, React.createElement(Icon, {
      name: "sparkles"
    })), React.createElement("div", null, React.createElement("strong", null, settings.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI Compatible'), React.createElement("small", null, settings.model)), React.createElement("span", {
      className: `status-tag ${settings.hasApiKey ? 'green' : ''}`
    }, settings.hasApiKey ? '已配置' : '未配置')), React.createElement("p", {
      className: "helper"
    }, "\u5BF9\u6240\u9009\u65E5\u671F\u3001\u6708\u4EFD\u6216\u5E74\u4EFD\u7684\u652F\u51FA\u751F\u6210\u5206\u6790\u3002\u53EF\u5728\u7EDF\u8BA1\u9875\u9762\u67E5\u770B\u5DF2\u4FDD\u5B58\u7684\u7ED3\u679C\u3002"), React.createElement("button", {
      className: "button secondary full",
      onClick: onAISettings
    }, React.createElement(Icon, {
      name: "settings",
      size: 17
    }), "\u63A5\u53E3\u4E0E\u6A21\u578B\u8BBE\u7F6E")), React.createElement("section", {
      className: "panel sync-panel"
    }, React.createElement(PanelHeading, {
      title: "\u8D26\u6237\u4E0E\u540C\u6B65"
    }), React.createElement("div", null, React.createElement("span", null, "\u6700\u8FD1\u5237\u65B0 \xB7 \u5317\u4EAC\u65F6\u95F4"), React.createElement("strong", null, refreshTime || '尚未刷新')), React.createElement("div", {
      className: "form-actions"
    }, React.createElement("button", {
      className: "button secondary",
      disabled: loading,
      onClick: onRefresh
    }, React.createElement(Icon, {
      name: "refresh",
      size: 17
    }), loading ? '刷新中…' : '刷新数据'), React.createElement("button", {
      className: "button secondary",
      onClick: onLogout
    }, React.createElement(Icon, {
      name: "logout",
      size: 17
    }), "\u9000\u51FA\u767B\u5F55"))));
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
