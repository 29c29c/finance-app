(() => {
  const F = window.FinanceUI;
  const {
    useState,
    useEffect,
    useMemo,
    useRef,
    createRoot,
    api,
    today,
    currentMonthStr,
    currentYearStr,
    beijingTimestampLabel,
    planSummary,
    escapeCsvValue,
    Notice,
    Auth,
    AppShell,
    PageHeader,
    MonthControl,
    Dashboard,
    LedgerView,
    PlansView,
    StatsView,
    SettingsView,
    LedgerForm,
    PlanForm,
    SerialAdvance,
    BudgetForm,
    DeleteDialog,
    ImportForm,
    AISettingsModal,
    Icon
  } = F;
  const tabs = ['dashboard', 'ledger', 'subscriptions', 'serials', 'stats', 'settings'];
  const getTab = () => tabs.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
  const EMPTY_DATA = {
    subscriptions: [],
    serials: [],
    ledger: [],
    budget: 0
  };
  const EMPTY_ALL = {
    subscriptions: [],
    serials: [],
    ledger_items: [],
    budgets: []
  };
  const DEFAULT_AI = {
    provider: 'deepseek',
    endpointUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-v4-flash',
    hasApiKey: false
  };
  function App() {
    const [token, setToken] = useState(api.token),
      [active, setActive] = useState(getTab);
    const [month, setMonth] = useState(currentMonthStr()),
      [date, setDate] = useState(today()),
      [year, setYear] = useState(currentYearStr()),
      [mode, setMode] = useState('month');
    const [data, setData] = useState(EMPTY_DATA),
      [allData, setAllData] = useState(EMPTY_ALL);
    const [loading, setLoading] = useState(false),
      [loadedMonth, setLoadedMonth] = useState(''),
      [loadError, setLoadError] = useState(''),
      [refreshTime, setRefreshTime] = useState('');
    const [notice, setNotice] = useState(null),
      [modal, setModal] = useState(null),
      [busyId, setBusyId] = useState(null);
    const [settings, setSettings] = useState(DEFAULT_AI),
      [analysis, setAnalysis] = useState({
        loading: false,
        result: null,
        error: ''
      });
    const fetchId = useRef(0),
      analysisId = useRef(0),
      toggleLock = useRef(false),
      toastId = useRef(0);
    const logout = () => {
      fetchId.current++;
      analysisId.current++;
      localStorage.removeItem('token');
      api.token = null;
      setToken(null);
      setModal(null);
      setData(EMPTY_DATA);
      setAllData(EMPTY_ALL);
      setLoadedMonth('');
      setNotice(null);
      setSettings(DEFAULT_AI);
      setAnalysis({
        loading: false,
        result: null,
        error: ''
      });
    };
    const notify = (text, type = 'success') => {
      toastId.current++;
      setNotice({
        text,
        type,
        id: toastId.current
      });
    };
    useEffect(() => {
      if (!notice || notice.type === 'error') return;
      const timer = setTimeout(() => setNotice(null), 4500);
      return () => clearTimeout(timer);
    }, [notice]);
    const refresh = async () => {
      const id = ++fetchId.current;
      setLoading(true);
      setLoadError('');
      try {
        // /data synchronizes monthly subscription entries before the complete export is read.
        const dashboard = await api.get('/api/data?month=' + month);
        if (id !== fetchId.current) return false;
        const exported = await api.get('/api/export/all');
        if (id !== fetchId.current) return false;
        setData(dashboard);
        setAllData(exported);
        setLoadedMonth(month);
        setRefreshTime(beijingTimestampLabel());
        return true;
      } catch (error) {
        if (id !== fetchId.current) return false;
        if (error.status === 401 || error.status === 403) logout();else {
          setLoadError(error.message);
          notify(`数据刷新失败：${error.message}`, 'error');
        }
        return false;
      } finally {
        if (id === fetchId.current) setLoading(false);
      }
    };
    useEffect(() => {
      if (!token) return;
      api.token = token;
      refresh();
      return () => {
        fetchId.current++;
      };
    }, [token, month]);
    useEffect(() => {
      if (!token) return;
      let cancelled = false;
      api.get('/api/ai-settings').then(value => {
        if (!cancelled) setSettings(value);
      }).catch(error => {
        if (!cancelled && error.status !== 401) notify('AI 设置读取失败，可稍后重试', 'error');
      });
      return () => {
        cancelled = true;
      };
    }, [token]);
    useEffect(() => {
      const onHash = () => {
        if (!tabs.includes(location.hash.slice(1))) return;
        setActive(getTab());
        window.scrollTo({
          top: 0
        });
      };
      window.addEventListener('hashchange', onHash);
      return () => window.removeEventListener('hashchange', onHash);
    }, []);
    const navigate = key => {
      setActive(key);
      if (location.hash !== '#' + key) location.hash = key;
      window.scrollTo({
        top: 0,
        behavior: 'instant'
      });
    };
    const mutate = async (action, success) => {
      await action();
      if (await refresh()) notify(success);else notify('已保存，但刷新失败。请刷新数据查看最新记录。', 'error');
    };
    const payload = mode === 'day' ? {
      scope: 'day',
      date
    } : mode === 'year' ? {
      scope: 'year',
      year: Number(year)
    } : {
      scope: 'month',
      month
    };
    const periodKey = mode === 'day' ? date : mode === 'year' ? year : month;
    useEffect(() => {
      const id = ++analysisId.current;
      setAnalysis({
        loading: false,
        result: null,
        error: ''
      });
      if (!token || active !== 'stats') return;
      setAnalysis({
        loading: true,
        result: null,
        error: ''
      });
      api.get('/api/ai-analysis?' + new URLSearchParams(payload)).then(result => {
        if (id === analysisId.current) setAnalysis({
          loading: false,
          result: result.cached ? result : null,
          error: ''
        });
      }).catch(error => {
        if (id === analysisId.current) setAnalysis({
          loading: false,
          result: null,
          error: error.message
        });
      });
      return () => {
        analysisId.current++;
      };
    }, [token, active, mode, periodKey]);
    const analyze = async () => {
      if (!settings.hasApiKey) {
        setModal({
          kind: 'ai'
        });
        return;
      }
      const id = ++analysisId.current;
      const previous = analysis.result;
      setAnalysis({
        loading: true,
        result: previous,
        error: ''
      });
      try {
        const result = await api.post('/api/ai-analysis', payload);
        if (id === analysisId.current) setAnalysis({
          loading: false,
          result,
          error: ''
        });
      } catch (error) {
        if (id === analysisId.current) setAnalysis({
          loading: false,
          result: previous,
          error: error.message
        });
      }
    };
    const summary = useMemo(() => planSummary(data.subscriptions, data.serials, month), [data.subscriptions, data.serials, month]);
    // Keep mounting and the amount input's layout-effect focus inside the tap gesture.
    const openAmountModal = value => ReactDOM.flushSync(() => setModal(value));
    const add = () => openAmountModal({
      kind: 'ledger'
    });
    const edit = item => openAmountModal({
      kind: 'ledger',
      item
    });
    const planForm = (table, item) => openAmountModal({
      kind: 'plan',
      table,
      item
    });
    const deleteRecord = (table, item) => setModal({
      kind: 'delete',
      table,
      item
    });
    const toggle = async subscription => {
      if (toggleLock.current) return;
      toggleLock.current = true;
      setBusyId(subscription.id);
      try {
        await mutate(() => api.put('/api/subscriptions/' + subscription.id, {
          ...subscription,
          is_active: Number(subscription.is_active) ? 0 : 1
        }), Number(subscription.is_active) ? '订阅已暂停' : '订阅已开启');
      } catch (error) {
        notify(error.message, 'error');
      } finally {
        setBusyId(null);
        toggleLock.current = false;
      }
    };
    const download = (content, type, filename) => {
      const url = URL.createObjectURL(new Blob([content], {
        type
      }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const exportData = async format => {
      try {
        const fresh = await api.get('/api/export/all');
        if (format === 'json') download(JSON.stringify(fresh, null, 2), 'application/json', `finance_backup_${today()}.json`);else {
          const rows = fresh.ledger_items.map(item => [item.date, item.category, item.name, item.amount].map(escapeCsvValue).join(','));
          download('\uFEFFDate,Category,Name,Amount\r\n' + rows.join('\r\n'), 'text/csv;charset=utf-8', `ledger_${today()}.csv`);
        }
        notify('导出文件已准备好');
      } catch (error) {
        notify(error.message, 'error');
      }
    };
    if (!token) return <Auth onLogin={value => {
      setToken(value);
      navigate('dashboard');
    }} />;
    const titles = {
      dashboard: ['每一笔，都心中有数。', `${F.monthLabel(month)} · 月度总览`],
      ledger: ['账单明细', '把每一笔日常，记得清清楚楚。'],
      subscriptions: ['固定订阅', '给固定的喜欢，留一份确定的预算。'],
      serials: ['连载计划', '期待下一期，也提前安排好。'],
      stats: ['统计分析', '看见消费习惯，让预算更有方向。'],
      settings: ['数据与设置', '你的财务空间，按你的习惯来。']
    };
    const [title, subtitle] = titles[active];
    const ready = loadedMonth === month;
    return <AppShell active={active} month={month} onMonth={setMonth} onNavigate={navigate} onAdd={add} onLogout={logout} username={localStorage.getItem('finance-username') || '个人账户'}>
      <PageHeader title={title} subtitle={subtitle}>
        {active !== 'settings' && active !== 'stats' && <MonthControl value={month} onChange={setMonth} />}
        {active !== 'settings' && active !== 'stats' && <button className="icon-button mobile-settings" aria-label="数据与设置" onClick={() => navigate('settings')}><Icon name="settings" size={18} /></button>}
        <button className="button primary desktop-add" onClick={add}><Icon name="plus" size={18} />记一笔</button>
      </PageHeader>
      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
      <div aria-live="polite" className="sr-only">{loading ? '正在刷新数据' : ''}</div>
      {!ready ? <section className="panel loading-panel">{loadError ? <><Icon name="alert" size={32} /><h2>暂时无法读取数据</h2><p>{loadError}</p><button className="button primary" onClick={refresh}>重新加载</button></> : <><span className="spinner" /><p>正在整理你的财务记录…</p></>}</section> : <div className={loading ? 'content-refreshing' : ''} aria-busy={loading}>
        {active === 'dashboard' && <Dashboard data={data} month={month} summary={summary} onBudget={() => setModal({
          kind: 'budget'
        })} onNavigate={navigate} onEdit={edit} onAdd={add} />}
        {active === 'ledger' && <LedgerView key={month} items={data.ledger} onEdit={edit} onDelete={item => deleteRecord('ledger_items', item)} onImport={() => setModal({
          kind: 'import'
        })} onAdd={add} />}
        {(active === 'subscriptions' || active === 'serials') && <PlansView key={active} kind={active} data={data} summary={summary} onNavigate={navigate} onAdd={planForm} onEdit={planForm} onDelete={deleteRecord} onToggle={toggle} onAdvance={item => setModal({
          kind: 'advance',
          item
        })} busyId={busyId} />}
        {active === 'stats' && <StatsView allData={allData} month={month} onMonth={setMonth} mode={mode} onMode={setMode} date={date} onDate={setDate} year={year} onYear={setYear} analysis={analysis} onAnalyze={analyze} onAISettings={() => setModal({
          kind: 'ai'
        })} onEdit={edit} onDelete={item => deleteRecord('ledger_items', item)} />}
        {active === 'settings' && <SettingsView settings={settings} onAISettings={() => setModal({
          kind: 'ai'
        })} onJSON={() => exportData('json')} onCSV={() => exportData('csv')} onImport={() => setModal({
          kind: 'import'
        })} onLogout={logout} refreshTime={refreshTime} onRefresh={refresh} loading={loading} />}
      </div>}
      {ready && active !== 'settings' && <footer className="page-footer">
        <span>
          <i />
          {loading ? '正在同步' : '数据已同步'}
        </span>
        <span>{refreshTime} · 北京时间</span>
      </footer>}
      {modal?.kind === 'ledger' && <LedgerForm item={modal.item} onClose={() => setModal(null)} onSave={form => mutate(() => modal.item ? api.put('/api/ledger_items/' + modal.item.id, form) : api.post('/api/ledger_items', form), modal.item ? '账单已更新' : '记账成功')} />}
      {modal?.kind === 'plan' && <PlanForm kind={modal.table} item={modal.item} month={month} onClose={() => setModal(null)} onSave={form => mutate(() => modal.item ? api.put('/api/' + modal.table + '/' + modal.item.id, form) : api.post('/api/' + modal.table, form), '计划已保存')} />}
      {modal?.kind === 'budget' && <BudgetForm amount={data.budget} month={month} onClose={() => setModal(null)} onSave={amount => mutate(() => api.post('/api/budget', {
        month,
        amount
      }), '预算已更新')} />}
      {modal?.kind === 'advance' && <SerialAdvance serial={modal.item} onClose={() => setModal(null)} onSave={form => mutate(() => api.post('/api/serials/' + modal.item.id + '/advance', form), '本期已结算，下一期已安排')} />}
      {modal?.kind === 'delete' && <DeleteDialog item={modal.item} onClose={() => setModal(null)} onDelete={() => mutate(() => api.delete('/api/' + modal.table + '/' + modal.item.id), '记录已删除')} />}
      {modal?.kind === 'import' && <ImportForm onClose={() => setModal(null)} onSave={items => mutate(() => api.post('/api/ledger/import', {
        items
      }), `已导入 ${items.length} 条账单`)} />}
      {modal?.kind === 'ai' && <AISettingsModal settings={settings} onClose={() => setModal(null)} onSave={async form => {
        const result = await api.put('/api/ai-settings', {
          provider: form.provider,
          endpointUrl: form.endpointUrl,
          model: form.model,
          apiKey: form.apiKey
        });
        setSettings(result);
        notify('AI 设置已保存');
      }} />}
    </AppShell>;
  }
  createRoot(document.getElementById('root')).render(<App />);
})();
