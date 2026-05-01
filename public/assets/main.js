(() => {
    const FinanceUI = window.FinanceUI;
    const {
        useState,
        useEffect,
        useMemo,
        createRoot,
        api,
        today,
        currentMonthStr,
        currentYearStr,
        beijingTimestampLabel,
        CATEGORIES,
        CAT_ICONS,
        SERIAL_STATUS_LABELS,
        monthFromDate,
        yearFromDate,
        safeNumber,
        formatMoney,
        buildCategoryBreakdown,
        buildNameRanking,
        buildMonthlyTotals,
        escapeCsvValue,
        Notice,
        Auth,
        QuickAdd,
        SerialAdvance,
        EditLedgerModal,
        AISettingsModal,
        DataMenu,
    } = FinanceUI;

    function App() {
        const [token, setToken] = useState(localStorage.getItem('token'));
        const [loading, setLoading] = useState(true);
        const [currentMonth, setCurrentMonth] = useState(currentMonthStr());
        const [currentDate, setCurrentDate] = useState(today());
        const [currentYear, setCurrentYear] = useState(currentYearStr());
        const [data, setData] = useState({ subscriptions: [], serials: [], ledger: [], budget: 0 });
        const [allData, setAllData] = useState({ subscriptions: [], serials: [], ledger_items: [], budgets: [] });
        const [activeTab, setActiveTab] = useState('dashboard');
        const [statsMode, setStatsMode] = useState('month');
        const [showQuickAdd, setShowQuickAdd] = useState(false);
        const [advancingSerial, setAdvancingSerial] = useState(null);
        const [editingLedgerItem, setEditingLedgerItem] = useState(null);
        const [notice, setNotice] = useState({ text: '', type: 'info' });
        const [refreshTime, setRefreshTime] = useState('');
        const [showAISettings, setShowAISettings] = useState(false);
        const [savingAISettings, setSavingAISettings] = useState(false);
        const [aiSettings, setAiSettings] = useState({
            provider: 'deepseek',
            endpointUrl: 'https://api.deepseek.com/v1/chat/completions',
            model: 'deepseek-v4-flash',
            apiKey: '',
            hasApiKey: false,
            updatedAt: null,
        });
        const [aiAnalysis, setAiAnalysis] = useState({ loading: false, error: '', result: null, scope: '', periodKey: '' });
        const [showMonthRankingAll, setShowMonthRankingAll] = useState(false);
        const [showYearRankingAll, setShowYearRankingAll] = useState(false);

        useEffect(() => {
            if (token) {
                fetchData();
                fetchAISettings();
            } else {
                setLoading(false);
            }
        }, [token, currentMonth]);

        useEffect(() => { lucide.createIcons(); }, [activeTab, data, allData, showAISettings, aiAnalysis, editingLedgerItem]);

        const showError = (error) => setNotice({ text: error.message || '操作失败', type: 'error' });
        const showSuccess = (text) => setNotice({ text, type: 'success' });

        const fetchAISettings = async () => {
            api.token = token;
            try {
                const res = await api.get('/api/ai-settings');
                setAiSettings((prev) => ({
                    ...prev,
                    provider: res.provider || 'deepseek',
                    endpointUrl: res.endpointUrl || 'https://api.deepseek.com/v1/chat/completions',
                    model: res.model || 'deepseek-v4-flash',
                    apiKey: '',
                    hasApiKey: !!res.hasApiKey,
                    updatedAt: res.updatedAt || null,
                }));
            } catch (_error) {}
        };

        const fetchData = async () => {
            setLoading(true);
            api.token = token;
            try {
                const [dashboard, exported] = await Promise.all([
                    api.get('/api/data?month=' + currentMonth),
                    api.get('/api/export/all?month=' + currentMonth),
                ]);
                setData(dashboard);
                setAllData(exported);
                setRefreshTime(beijingTimestampLabel());
            } catch (error) {
                showError(error);
                if (error.status === 401 || error.status === 403) {
                    localStorage.removeItem('token');
                    api.token = '';
                    setToken(null);
                }
            }
            setLoading(false);
        };

        const ledgerItems = allData.ledger_items || [];
        const dayLedger = useMemo(() => ledgerItems.filter(item => item.date === currentDate), [ledgerItems, currentDate]);
        const monthLedger = useMemo(() => ledgerItems.filter(item => monthFromDate(item.date) === currentMonth), [ledgerItems, currentMonth]);
        const yearLedger = useMemo(() => ledgerItems.filter(item => yearFromDate(item.date) === String(currentYear)), [ledgerItems, currentYear]);
        const groupedLedger = useMemo(() => {
            const groups = {};
            data.ledger.forEach(item => {
                if (!groups[item.date]) groups[item.date] = [];
                groups[item.date].push(item);
            });
            return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
        }, [data.ledger]);

        const subStats = useMemo(() => {
            let cost = 0;
            const warnings = [];
            (allData.subscriptions || []).forEach(sub => {
                if (!Number(sub.is_active)) return;
                let price = safeNumber(sub.price);
                if (sub.cycle_type === 'yearly') {
                    price /= 12;
                    if (String(sub.first_payment_date || '').slice(5, 7) === currentMonth.slice(5, 7)) warnings.push(sub);
                } else if (sub.cycle_type === 'quarterly') {
                    price /= 3;
                }
                cost += price;
            });
            return { cost, warnings };
        }, [allData.subscriptions, currentMonth]);

        const plannedSerialCost = useMemo(() =>
            (allData.serials || [])
                .filter(s => s.expected_release_date === currentMonth && s.status !== 'paid')
                .reduce((sum, item) => sum + safeNumber(item.price), 0)
        , [allData.serials, currentMonth]);

        const actual = useMemo(() => {
            const breakdown = buildCategoryBreakdown(data.ledger);
            const total = data.ledger.reduce((sum, item) => sum + safeNumber(item.amount), 0);
            return { total, breakdown };
        }, [data.ledger]);

        const dayRanking = useMemo(() => buildNameRanking(dayLedger), [dayLedger]);
        const monthRanking = useMemo(() => buildNameRanking(monthLedger), [monthLedger]);
        const yearRanking = useMemo(() => buildNameRanking(yearLedger), [yearLedger]);
        const yearMonthlyTotals = useMemo(() => buildMonthlyTotals(ledgerItems, currentYear), [ledgerItems, currentYear]);
        const yearTotal = useMemo(() => yearLedger.reduce((sum, item) => sum + safeNumber(item.amount), 0), [yearLedger]);
        const monthBudget = useMemo(() => {
            const row = (allData.budgets || []).find(item => item.month_str === currentMonth);
            return row ? safeNumber(row.budget_amount) : safeNumber(data.budget);
        }, [allData.budgets, currentMonth, data.budget]);
        const dayBreakdown = useMemo(() => buildCategoryBreakdown(dayLedger), [dayLedger]);
        const monthBreakdown = useMemo(() => buildCategoryBreakdown(monthLedger), [monthLedger]);
        const yearBreakdown = useMemo(() => buildCategoryBreakdown(yearLedger), [yearLedger]);
        const maxYearMonth = useMemo(() => yearMonthlyTotals.reduce((max, item) => !max || item.total > max.total ? item : max, null), [yearMonthlyTotals]);
        const actualSubscriptionLedger = useMemo(() =>
            monthLedger.filter(item => item.category === 'subscription')
        , [monthLedger]);

        const refreshAll = async (successMessage) => {
            await fetchData();
            if (successMessage) showSuccess(successMessage);
        };

        const handleQuickAdd = async (item) => {
            try {
                await api.post('/api/ledger_items', item);
                await refreshAll('记账成功');
            } catch (error) {
                showError(error);
            }
        };

        const handleAdvanceSerial = async (id, payload) => {
            try {
                await api.post('/api/serials/' + id + '/advance', payload);
                await refreshAll('连载已结算并续杯');
            } catch (error) {
                showError(error);
            }
        };

        const deleteLedgerItem = async (id) => {
            if (!confirm('确认删除这条记录吗?')) return;
            try {
                await api.delete('/api/ledger_items/' + id);
                await refreshAll('记录已删除');
            } catch (error) {
                showError(error);
            }
        };

        const updateLedgerItem = async (item) => {
            try {
                await api.put('/api/ledger_items/' + item.id, {
                    date: item.date,
                    category: item.category,
                    name: item.name,
                    amount: item.amount,
                });
                setEditingLedgerItem(null);
                await refreshAll('记录已更新');
            } catch (error) {
                showError(error);
            }
        };

        const saveSubscription = async (subscription, patch, successMessage) => {
            const payload = {
                name: patch.name ?? subscription.name,
                price: patch.price ?? subscription.price,
                cycle_type: patch.cycle_type ?? subscription.cycle_type,
                first_payment_date: patch.first_payment_date ?? subscription.first_payment_date,
                is_active: patch.is_active ?? Number(subscription.is_active || 0),
            };
            await api.put('/api/subscriptions/' + subscription.id, payload);
            await refreshAll(successMessage);
        };

        const toggleSubscription = async (subscription, checked) => {
            if (checked && !subscription.first_payment_date) {
                showError(new Error('请先填写续订时间，再打开订阅开关'));
                return;
            }
            try {
                await saveSubscription(subscription, { is_active: checked ? 1 : 0 }, checked ? '订阅已开启自动续订入账' : '订阅已关闭');
            } catch (error) {
                showError(error);
            }
        };

        const updateSubscriptionRenewalDate = async (subscription, renewalDate) => {
            if (!renewalDate) {
                showError(new Error('续订时间不能为空'));
                return;
            }
            try {
                await saveSubscription(subscription, { first_payment_date: renewalDate }, '续订时间已更新');
            } catch (error) {
                showError(error);
            }
        };

        const exportJSON = async () => {
            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'finance_backup_' + today() + '.json';
            a.click();
            URL.revokeObjectURL(url);
        };

        const exportCSV = async () => {
            let csv = 'Date,Category,Name,Amount\n';
            (allData.ledger_items || []).forEach(i => {
                csv += [
                    escapeCsvValue(i.date),
                    escapeCsvValue(i.category),
                    escapeCsvValue(i.name),
                    escapeCsvValue(i.amount),
                ].join(',') + '\n';
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ledger_' + today() + '.csv';
            a.click();
            URL.revokeObjectURL(url);
        };

        const saveAISettings = async () => {
            setSavingAISettings(true);
            try {
                const res = await api.put('/api/ai-settings', {
                    provider: aiSettings.provider,
                    endpointUrl: aiSettings.endpointUrl,
                    model: aiSettings.model,
                    apiKey: aiSettings.apiKey,
                });
                setAiSettings({
                    provider: res.provider,
                    endpointUrl: res.endpointUrl,
                    model: res.model,
                    apiKey: '',
                    hasApiKey: !!res.hasApiKey,
                    updatedAt: res.updatedAt || null,
                });
                setShowAISettings(false);
                showSuccess('AI 设置已保存');
            } catch (error) {
                showError(error);
            }
            setSavingAISettings(false);
        };

        const currentAnalysisPayload = statsMode === 'day'
            ? { scope: 'day', date: currentDate }
            : statsMode === 'month'
                ? { scope: 'month', month: currentMonth }
                : { scope: 'year', year: Number(currentYear) };
        const currentAnalysisPeriodKey = statsMode === 'day' ? currentDate : statsMode === 'month' ? currentMonth : String(currentYear);
        const currentAnalysisLabel = statsMode === 'day' ? currentDate : statsMode === 'month' ? currentMonth : currentYear + ' 年';

        useEffect(() => {
            if (!token || activeTab !== 'stats') return;

            const payload = currentAnalysisPayload;
            const scope = payload.scope;
            const periodKey = currentAnalysisPeriodKey;
            const params = new URLSearchParams();
            Object.entries(payload).forEach(([key, value]) => params.set(key, String(value)));

            let cancelled = false;
            setAiAnalysis({ loading: true, error: '', result: null, scope, periodKey });

            (async () => {
                api.token = token;
                try {
                    const cached = await api.get('/api/ai-analysis?' + params.toString());
                    if (cancelled) return;
                    setAiAnalysis({
                        loading: false,
                        error: '',
                        result: cached.cached ? cached : null,
                        scope,
                        periodKey,
                    });
                } catch (error) {
                    if (cancelled) return;
                    setAiAnalysis({
                        loading: false,
                        error: error.message || '',
                        result: null,
                        scope,
                        periodKey,
                    });
                }
            })();

            return () => {
                cancelled = true;
            };
        }, [token, activeTab, statsMode, currentDate, currentMonth, currentYear]);

        const openAIAnalysis = async () => {
            if (!aiSettings.hasApiKey) {
                setShowAISettings(true);
                showError(new Error('请先配置 AI API Key'));
                return;
            }
            const payload = currentAnalysisPayload;
            const scope = payload.scope;
            const periodKey = currentAnalysisPeriodKey;
            const params = new URLSearchParams();
            Object.entries(payload).forEach(([key, value]) => params.set(key, String(value)));

            setAiAnalysis({ loading: true, error: '', result: null, scope, periodKey });
            let cachedResult = null;
            try {
                const cached = await api.get('/api/ai-analysis?' + params.toString());
                if (cached.cached) {
                    cachedResult = cached;
                    setAiAnalysis({ loading: true, error: '', result: cached, scope, periodKey });
                }
            } catch (_error) {}
            try {
                const result = await api.post('/api/ai-analysis', payload);
                setAiAnalysis({ loading: false, error: '', result, scope, periodKey });
            } catch (error) {
                setAiAnalysis({ loading: false, error: error.message, result: cachedResult, scope, periodKey });
            }
        };

        const handleImport = async () => {
            const text = document.getElementById('importArea').value;
            const trimmed = text.trim();
            const items = trimmed
                ? trimmed.split('\n').map(line => {
                    const [d, c, n, a] = line.split(',').map(s => s.trim());
                    return (d && a) ? { date: d, category: c, name: n, amount: parseFloat(a) } : null;
                }).filter(Boolean)
                : [];
            try {
                await api.post('/api/ledger/import', { items });
                document.getElementById('importArea').value = '';
                await refreshAll('导入成功');
            } catch (error) {
                showError(error);
            }
        };

        const dayTotal = dayLedger.reduce((sum, item) => sum + safeNumber(item.amount), 0);
        const monthTotal = monthLedger.reduce((sum, item) => sum + safeNumber(item.amount), 0);
        const monthAveragePerDay = monthLedger.length ? monthTotal / new Set(monthLedger.map(item => item.date)).size : 0;
        const monthRankingToShow = showMonthRankingAll ? monthRanking : monthRanking.slice(0, 10);
        const yearRankingToShow = showYearRankingAll ? yearRanking : yearRanking.slice(0, 10);

        if (!token) return <Auth onLogin={() => setToken(localStorage.getItem('token'))} />;
        if (loading) return <div className="flex justify-center items-center h-screen text-blue-500">加载中...</div>;

        return (
            <div className="max-w-4xl mx-auto p-4 pb-24 md:pb-10">
                <div className="flex justify-between items-start mb-6 gap-3">
                    <div>
                        <h1 className="text-xl font-black text-gray-800 tracking-tight">财务指挥中心</h1>
                        <p className="text-xs text-gray-400">{currentMonth}</p>
                        <p className="text-xs text-gray-400 mt-1">最近刷新：{refreshTime || '未刷新'}（北京时间）</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <DataMenu onExportJSON={exportJSON} onExportCSV={exportCSV} onOpenAISettings={() => setShowAISettings(true)} />
                        <input type="month" className="bg-white border rounded px-2 py-1 text-sm" value={currentMonth} onChange={e => setCurrentMonth(e.target.value)} />
                        <button onClick={() => { localStorage.removeItem('token'); api.token = ''; setToken(null); }} className="p-2 text-gray-400 hover:text-red-500"><i data-lucide="log-out" className="w-5 h-5"></i></button>
                    </div>
                </div>

                <Notice notice={notice} />

                <div className="bg-white p-1 rounded-xl shadow-sm flex mb-6 overflow-x-auto">
                    {['dashboard', 'subs', 'ledger', 'stats'].map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} className={'flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ' + (activeTab === t ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50')}>
                            {t === 'dashboard' ? '仪表盘' : t === 'subs' ? '订阅/连载' : t === 'ledger' ? '账单明细' : '统计'}
                        </button>
                    ))}
                </div>

                {activeTab === 'dashboard' && (
                    <div className="space-y-4 animate-fade-in">
                        {subStats.warnings.length > 0 && (
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                                <div className="bg-red-100 p-2 rounded-full text-red-600"><i data-lucide="alert-triangle" className="w-5 h-5"></i></div>
                                <div>
                                    <h3 className="font-bold text-red-800">现金流警告</h3>
                                    <div className="text-sm text-red-600 mt-1">
                                        {subStats.warnings.map(s => <div key={s.id}>{s.name} 本月需扣款 <b>¥{formatMoney(s.price)}</b></div>)}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="card border-t-4 border-blue-500">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">本月预算</div>
                                <div className="flex items-baseline mt-2">
                                    <span className="text-2xl font-bold">¥</span>
                                    <input
                                        type="number"
                                        className="text-3xl font-black w-full outline-none"
                                        value={data.budget}
                                        onBlur={e => api.post('/api/budget', { month: currentMonth, amount: parseFloat(e.target.value || '0') }).then(() => refreshAll('预算已保存')).catch(showError)}
                                        onChange={e => setData({ ...data, budget: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="card border-t-4 border-yellow-500">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">预期消费</div>
                                <div className="mt-2 text-3xl font-black">¥{formatMoney(subStats.cost + plannedSerialCost, 0)}</div>
                                <div className="text-xs text-gray-400 mt-1">订阅 {formatMoney(subStats.cost, 0)} + 连载 {formatMoney(plannedSerialCost, 0)}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                    已计入订阅：{formatMoney(actualSubscriptionLedger.reduce((sum, item) => sum + safeNumber(item.amount), 0), 0)}/{formatMoney(subStats.cost, 0)}
                                </div>
                            </div>
                            <div className={'card border-t-4 ' + (actual.total > data.budget ? 'border-red-500' : 'border-green-500')}>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">实际支出</div>
                                <div className={'mt-2 text-3xl font-black ' + (actual.total > data.budget ? 'text-red-600' : 'text-green-600')}>¥{formatMoney(actual.total, 0)}</div>
                                <div className="text-xs text-gray-400 mt-1">{actual.total > data.budget ? '已超支' : '安全范围'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'subs' && (
                    <div className="space-y-6">
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-lg">📦 连载追更</h2>
                                <button onClick={() => {
                                    const name = prompt('名称'); if (!name) return;
                                    api.post('/api/serials', { name, price: 0, status: 'planned', expected_release_date: currentMonth }).then(() => refreshAll('连载已新增')).catch(showError);
                                }} className="btn btn-primary text-xs">+ 新增</button>
                            </div>
                            <div className="space-y-3">
                                {data.serials.map(s => (
                                    <div key={s.id} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-100">
                                        <div>
                                            <div className="font-medium">{s.name}</div>
                                            <div className="text-xs text-gray-400">{s.expected_release_date} · {SERIAL_STATUS_LABELS[s.status] || s.status}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="font-bold">¥{formatMoney(s.price)}</div>
                                            {s.status !== 'paid' && <button onClick={() => setAdvancingSerial(s)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium hover:bg-blue-100">结算本期</button>}
                                            <button onClick={() => confirm('删?') && api.delete('/api/serials/' + s.id).then(() => refreshAll('连载已删除')).catch(showError)} className="text-gray-300 hover:text-red-500"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                                        </div>
                                    </div>
                                ))}
                                {data.serials.length === 0 && <p className="text-center text-gray-300 py-4">无追更计划</p>}
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-lg">📅 固定订阅</h2>
                                <button onClick={() => {
                                    const name = prompt('名称'); if (!name) return;
                                    const price = prompt('金额');
                                    if (price === null) return;
                                    const cycle = prompt('周期 (monthly/yearly/quarterly)', 'monthly');
                                    if (!cycle) return;
                                    const renewalDate = prompt('续订时间 (YYYY-MM-DD)', today());
                                    if (!renewalDate) return;
                                    api.post('/api/subscriptions', { name, price, cycle_type: cycle, first_payment_date: renewalDate, is_active: 1 }).then(() => refreshAll('订阅已新增')).catch(showError);
                                }} className="btn btn-ghost text-xs border">+ 新增</button>
                            </div>
                            {data.subscriptions.map(s => (
                                <div key={s.id} className="py-3 border-b last:border-0 border-gray-100">
                                    <div className="flex justify-between items-start gap-3">
                                        <div>
                                            <div className="font-medium">{s.name}</div>
                                            <div className="text-xs text-gray-400 mt-1">{s.cycle_type} · 续订 {s.first_payment_date || '未设置'}</div>
                                            <div className="text-xs mt-2 inline-flex items-center px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                                                {Number(s.is_active) ? '订阅中' : '未订阅'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="font-bold">¥{formatMoney(s.price)}</div>
                                            <button onClick={() => confirm('删?') && api.delete('/api/subscriptions/' + s.id).then(() => refreshAll('订阅已删除')).catch(showError)} className="text-gray-300 hover:text-red-500"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-col md:flex-row md:items-center gap-3">
                                        <label className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>续订时间</span>
                                            <input
                                                type="date"
                                                className="input text-sm py-1.5"
                                                value={s.first_payment_date || ''}
                                                onChange={e => {
                                                    const renewalDate = e.target.value;
                                                    if (!renewalDate) return;
                                                    updateSubscriptionRenewalDate(s, renewalDate);
                                                }}
                                            />
                                        </label>
                                        <label className="flex items-center gap-3 text-sm text-gray-600">
                                            <span>订阅开关</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleSubscription(s, !Number(s.is_active))}
                                                className={'relative inline-flex h-7 w-12 items-center rounded-full transition-colors ' + (Number(s.is_active) ? 'bg-blue-600' : 'bg-gray-300')}
                                            >
                                                <span className={'inline-block h-5 w-5 transform rounded-full bg-white transition-transform ' + (Number(s.is_active) ? 'translate-x-6' : 'translate-x-1')}></span>
                                            </button>
                                            <span className="text-xs text-gray-400">
                                                {s.cycle_type === 'monthly'
                                                    ? '开启后每月续订日自动记入实际账单'
                                                    : s.cycle_type === 'yearly'
                                                        ? '开启后继续在仪表盘提醒年度大额消费'
                                                        : '开启后参与预期消费计算'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="card">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h2 className="font-bold text-lg">📊 统计中心</h2>
                                    <p className="text-xs text-gray-400 mt-1">在这里切换日 / 月 / 年视图，并可发起 AI 分析。</p>
                                </div>
                                <button onClick={openAIAnalysis} className="btn btn-primary text-sm">🤖 AI 分析当前{statsMode === 'day' ? '日' : statsMode === 'month' ? '月' : '年'}支出</button>
                            </div>

                            <div className="bg-gray-100 rounded-xl p-1 flex gap-2 mt-4">
                                {[
                                    ['day', '按日'],
                                    ['month', '按月'],
                                    ['year', '按年'],
                                ].map(([key, label]) => (
                                    <button key={key} onClick={() => setStatsMode(key)} className={'flex-1 py-2 rounded-lg text-sm font-medium ' + (statsMode === key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500')}>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-4">
                                {statsMode === 'day' && <input type="date" className="input max-w-xs" value={currentDate} onChange={e => setCurrentDate(e.target.value)} />}
                                {statsMode === 'month' && <input type="month" className="input max-w-xs" value={currentMonth} onChange={e => setCurrentMonth(e.target.value)} />}
                                {statsMode === 'year' && <input type="number" className="input max-w-xs" min="2000" max="9999" value={currentYear} onChange={e => setCurrentYear(e.target.value.slice(0, 4))} />}
                            </div>
                        </div>

                        {statsMode === 'day' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="card border-t-4 border-blue-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">当日支出</div>
                                        <div className="mt-2 text-3xl font-black">¥{formatMoney(dayTotal, 2)}</div>
                                        <div className="text-xs text-gray-400 mt-1">{currentDate}</div>
                                    </div>
                                    <div className="card border-t-4 border-purple-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">当日笔数</div>
                                        <div className="mt-2 text-3xl font-black">{dayLedger.length}</div>
                                        <div className="text-xs text-gray-400 mt-1">北京时间</div>
                                    </div>
                                    <div className="card border-t-4 border-green-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">当日订阅支出</div>
                                        <div className="mt-2 text-3xl font-black">¥{formatMoney(dayBreakdown.subscription, 2)}</div>
                                        <div className="text-xs text-gray-400 mt-1">仅统计已入账订阅</div>
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg">🏅 当日支出排行</h3>
                                        <span className="text-xs text-gray-400">按名称聚合</span>
                                    </div>
                                    <div className="space-y-3">
                                        {dayRanking.length === 0 && <p className="text-center text-gray-300 py-4">当天暂无支出记录</p>}
                                        {dayRanking.map((item, index) => (
                                            <div key={`${item.category}-${item.name}`} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                                                    <div>
                                                        <div className="font-medium">{item.name}</div>
                                                        <div className="text-xs text-gray-400">{CATEGORIES[item.category] || item.category} · {item.count}笔</div>
                                                    </div>
                                                </div>
                                                <div className="font-bold">¥{formatMoney(item.total, 2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg">🧾 当日记录</h3>
                                        <span className="text-xs text-gray-400">可修改支出类型、金额、名称</span>
                                    </div>
                                    <div className="space-y-3">
                                        {dayLedger.length === 0 && <p className="text-center text-gray-300 py-4">当天暂无记录</p>}
                                        {dayLedger.sort((a, b) => safeNumber(b.amount) - safeNumber(a.amount)).map(item => (
                                            <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-100">
                                                <div>
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-xs text-gray-400">{CATEGORIES[item.category] || item.category}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="font-bold">¥{formatMoney(item.amount, 2)}</div>
                                                    <button onClick={() => setEditingLedgerItem(item)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium hover:bg-blue-100">编辑</button>
                                                    <button onClick={() => deleteLedgerItem(item.id)} className="text-gray-300 hover:text-red-500"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {statsMode === 'month' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="card border-t-4 border-blue-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">本月支出</div>
                                        <div className="mt-2 text-3xl font-black">¥{formatMoney(monthTotal, 2)}</div>
                                        <div className="text-xs text-gray-400 mt-1">{currentMonth}</div>
                                    </div>
                                    <div className="card border-t-4 border-yellow-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">预算</div>
                                        <div className="mt-2 text-3xl font-black">¥{formatMoney(monthBudget, 2)}</div>
                                        <div className="text-xs text-gray-400 mt-1">{monthTotal > monthBudget ? '已超支' : '预算内'}</div>
                                    </div>
                                    <div className="card border-t-4 border-purple-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">日均支出</div>
                                        <div className="mt-2 text-3xl font-black">¥{formatMoney(monthAveragePerDay, 2)}</div>
                                        <div className="text-xs text-gray-400 mt-1">按有支出日期平均</div>
                                    </div>
                                    <div className="card border-t-4 border-green-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">预计影响</div>
                                        <div className="mt-2 text-3xl font-black">¥{formatMoney(subStats.cost + plannedSerialCost, 2)}</div>
                                        <div className="text-xs text-gray-400 mt-1">订阅 + 连载计划</div>
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg">📎 本月分类统计</h3>
                                        <span className="text-xs text-gray-400">仅按已入账支出统计</span>
                                    </div>
                                    <div className="space-y-4">
                                        {Object.entries(CATEGORIES).map(([key, label]) => {
                                            const amount = monthBreakdown[key] || 0;
                                            const percent = monthTotal > 0 ? (amount / monthTotal * 100).toFixed(1) : '0.0';
                                            return (
                                                <div key={key}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xl">{CAT_ICONS[key]}</span>
                                                            <span className="font-medium text-gray-700">{label}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold">¥{formatMoney(amount, 2)}</div>
                                                            <div className="text-xs text-gray-400">{percent}%</div>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: percent + '%' }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg">🏅 当月支出排行</h3>
                                        {monthRanking.length > 10 && (
                                            <button onClick={() => setShowMonthRankingAll(!showMonthRankingAll)} className="text-xs text-blue-600 font-medium">
                                                {showMonthRankingAll ? '收起' : '展开全部'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {monthRanking.length === 0 && <p className="text-center text-gray-300 py-4">本月暂无支出排行</p>}
                                        {monthRankingToShow.map((item, index) => (
                                            <div key={`${item.category}-${item.name}`} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                                                    <div>
                                                        <div className="font-medium">{item.name}</div>
                                                        <div className="text-xs text-gray-400">{CATEGORIES[item.category] || item.category} · {item.count}笔</div>
                                                    </div>
                                                </div>
                                                <div className="font-bold">¥{formatMoney(item.total, 2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {statsMode === 'year' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="card border-t-4 border-blue-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">年度总支出</div>
                                        <div className="mt-2 text-3xl font-black">¥{formatMoney(yearTotal, 2)}</div>
                                        <div className="text-xs text-gray-400 mt-1">{currentYear} 年</div>
                                    </div>
                                    <div className="card border-t-4 border-yellow-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">月均支出</div>
                                        <div className="mt-2 text-3xl font-black">¥{formatMoney(yearTotal / 12, 2)}</div>
                                        <div className="text-xs text-gray-400 mt-1">按 12 个月平均</div>
                                    </div>
                                    <div className="card border-t-4 border-purple-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">最高支出月份</div>
                                        <div className="mt-2 text-2xl font-black">{maxYearMonth ? maxYearMonth.month : '--'}</div>
                                        <div className="text-xs text-gray-400 mt-1">{maxYearMonth ? `¥${formatMoney(maxYearMonth.total, 2)}` : '暂无数据'}</div>
                                    </div>
                                    <div className="card border-t-4 border-green-500">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">年度笔数</div>
                                        <div className="mt-2 text-3xl font-black">{yearLedger.length}</div>
                                        <div className="text-xs text-gray-400 mt-1">已入账记录</div>
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg">🗓️ 年度月度支出</h3>
                                        <span className="text-xs text-gray-400">按月份汇总</span>
                                    </div>
                                    <div className="space-y-3">
                                        {yearMonthlyTotals.length === 0 && <p className="text-center text-gray-300 py-4">本年度暂无支出</p>}
                                        {yearMonthlyTotals.map(item => {
                                            const percent = maxYearMonth && maxYearMonth.total > 0 ? (item.total / maxYearMonth.total * 100).toFixed(1) : '0.0';
                                            return (
                                                <div key={item.month}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="font-medium text-gray-700">{item.month}</div>
                                                        <div className="text-right">
                                                            <div className="font-bold">¥{formatMoney(item.total, 2)}</div>
                                                            <div className="text-xs text-gray-400">{percent}%</div>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: percent + '%' }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg">🏅 年度支出排行</h3>
                                        {yearRanking.length > 10 && (
                                            <button onClick={() => setShowYearRankingAll(!showYearRankingAll)} className="text-xs text-blue-600 font-medium">
                                                {showYearRankingAll ? '收起' : '展开全部'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {yearRanking.length === 0 && <p className="text-center text-gray-300 py-4">本年度暂无排行</p>}
                                        {yearRankingToShow.map((item, index) => (
                                            <div key={`${item.category}-${item.name}`} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                                                    <div>
                                                        <div className="font-medium">{item.name}</div>
                                                        <div className="text-xs text-gray-400">{CATEGORIES[item.category] || item.category} · {item.count}笔</div>
                                                    </div>
                                                </div>
                                                <div className="font-bold">¥{formatMoney(item.total, 2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg">📎 年度分类统计</h3>
                                        <span className="text-xs text-gray-400">按已入账支出汇总</span>
                                    </div>
                                    <div className="space-y-4">
                                        {Object.entries(CATEGORIES).map(([key, label]) => {
                                            const amount = yearBreakdown[key] || 0;
                                            const percent = yearTotal > 0 ? (amount / yearTotal * 100).toFixed(1) : '0.0';
                                            return (
                                                <div key={key}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xl">{CAT_ICONS[key]}</span>
                                                            <span className="font-medium text-gray-700">{label}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold">¥{formatMoney(amount, 2)}</div>
                                                            <div className="text-xs text-gray-400">{percent}%</div>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: percent + '%' }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">🤖 AI 分析结果</h3>
                                    <p className="text-xs text-gray-400 mt-1">{currentAnalysisLabel}</p>
                                </div>
                            </div>
                            {aiAnalysis.loading && <div className="text-sm text-blue-500">正在读取分析结果...</div>}
                            {aiAnalysis.error && <div className="text-sm text-red-500 mb-4">{aiAnalysis.error}</div>}
                            {aiAnalysis.result && (
                                <div className="space-y-4">
                                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
                                        调用模型：{aiAnalysis.result.provider} / {aiAnalysis.result.model}
                                        {aiAnalysis.result.updatedAt ? ' · 更新时间 ' + aiAnalysis.result.updatedAt + '（北京时间）' : ''}
                                    </div>
                                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm leading-7 whitespace-pre-wrap">{aiAnalysis.result.analysis}</div>
                                </div>
                            )}
                            {!aiAnalysis.loading && !aiAnalysis.error && !aiAnalysis.result && (
                                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500">
                                    还未分析
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ledger' && (
                    <div className="space-y-6">
                        {groupedLedger.map(([date, items]) => {
                            const dailyTotal = items.reduce((sum, i) => sum + safeNumber(i.amount), 0);
                            return (
                                <div key={date} className="bg-white p-4 rounded-xl shadow-sm">
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                                        <span className="font-bold text-gray-700 flex items-center gap-2">
                                            <i data-lucide="calendar" className="w-4 h-4 text-gray-400"></i>
                                            {date}
                                        </span>
                                        <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-sm">¥{formatMoney(dailyTotal, 2)}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {items.map(item => (
                                            <span key={item.id} className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                                                <span className="text-lg leading-none">{CAT_ICONS[item.category] || '💰'}</span>
                                                <span className="font-medium text-gray-700">{item.name}</span>
                                                <span className="text-gray-400 font-mono text-xs">¥{formatMoney(item.amount, 2)}</span>
                                                <button onClick={() => setEditingLedgerItem(item)} className="text-blue-500 text-xs">编辑</button>
                                                <button onClick={() => deleteLedgerItem(item.id)} className="ml-1 text-gray-300 hover:text-red-500 text-lg leading-none focus:outline-none">&times;</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {data.ledger.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <div className="text-4xl mb-2">🍃</div>
                                本月暂无账单
                            </div>
                        )}

                        <div className="bg-white p-5 rounded-xl shadow-sm mt-8 border border-dashed border-gray-300">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">批量导入</h3>
                            <textarea id="importArea" className="input text-xs font-mono h-20" placeholder={'格式: 2026-04-01, food, 午餐, 20\n换行分隔'}></textarea>
                            <button onClick={handleImport} className="btn btn-ghost text-xs w-full mt-2">导入 CSV 文本</button>
                        </div>
                    </div>
                )}

                <div className="fab">
                    <button onClick={() => setShowQuickAdd(true)} className="fab-btn">
                        <i data-lucide="plus"></i>
                    </button>
                </div>

                {showQuickAdd && <QuickAdd onClose={() => setShowQuickAdd(false)} onSave={handleQuickAdd} />}
                {advancingSerial && <SerialAdvance serial={advancingSerial} onClose={() => setAdvancingSerial(null)} onConfirm={handleAdvanceSerial} />}
                {editingLedgerItem && <EditLedgerModal item={editingLedgerItem} onClose={() => setEditingLedgerItem(null)} onSave={updateLedgerItem} />}
                {showAISettings && <AISettingsModal settings={aiSettings} saving={savingAISettings} onClose={() => setShowAISettings(false)} onChange={(key, value) => setAiSettings({ ...aiSettings, [key]: value })} onSave={saveAISettings} />}
            </div>
        );
    }

    const root = createRoot(document.getElementById('root'));
    root.render(<App />);
})();
