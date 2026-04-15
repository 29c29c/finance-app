(() => {
    const FinanceUI = window.FinanceUI;
    const {
        useState,
        useEffect,
        useRef,
        api,
        today,
        nextMonth,
        getNextName,
        CATEGORIES,
        CAT_ICONS,
    } = FinanceUI;

    function Notice({ notice }) {
        if (!notice?.text) return null;
        const className = notice.type === 'error'
            ? 'bg-red-50 text-red-600 border-red-100'
            : notice.type === 'success'
                ? 'bg-green-50 text-green-600 border-green-100'
                : 'bg-blue-50 text-blue-600 border-blue-100';
        return <div className={`mb-4 border rounded-xl px-4 py-3 text-sm ${className}`}>{notice.text}</div>;
    }

    function Auth({ onLogin }) {
        const [isRegister, setIsRegister] = useState(false);
        const [form, setForm] = useState({ username: '', password: '', inviteCode: '' });
        const [error, setError] = useState('');
        const submit = async (e) => {
            e.preventDefault();
            setError('');
            try {
                const data = await api.req(isRegister ? '/api/register' : '/api/login', 'POST', form);
                if (isRegister) {
                    setIsRegister(false);
                    alert('注册成功');
                } else {
                    localStorage.setItem('token', data.token);
                    api.token = data.token;
                    onLogin();
                }
            } catch (err) {
                setError(err.message);
            }
        };
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                    <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{isRegister ? '注册指挥中心' : '登录'}</h2>
                    <form onSubmit={submit} className="space-y-4">
                        <input className="input" placeholder="用户名" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                        <input className="input" type="password" placeholder="密码" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                        {isRegister && <input className="input" placeholder="邀请码" value={form.inviteCode} onChange={e => setForm({ ...form, inviteCode: e.target.value })} required />}
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button className="btn btn-primary w-full py-3" type="submit">{isRegister ? '注册' : '登录'}</button>
                        <p className="text-center text-sm text-blue-600 cursor-pointer mt-4" onClick={() => setIsRegister(!isRegister)}>
                            {isRegister ? '去登录' : '使用邀请码注册'}
                        </p>
                    </form>
                </div>
            </div>
        );
    }

    function QuickAdd({ onClose, onSave }) {
        const [amount, setAmount] = useState('');
        const [note, setNote] = useState('');
        const [date, setDate] = useState(today());
        const inputRef = useRef(null);

        useEffect(() => inputRef.current?.focus(), []);

        const handleSave = (cat) => {
            if (!amount) return inputRef.current?.focus();
            onSave({ date, category: cat, name: note || CATEGORIES[cat], amount: parseFloat(amount) });
            onClose();
        };

        return (
            <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-box">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-700">⚡ 极速记账</h3>
                        <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">金额</label>
                            <input ref={inputRef} type="number" className="input input-lg" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            <input type="text" className="input flex-1" placeholder="备注 (选填)" value={note} onChange={e => setNote(e.target.value)} />
                            <input type="date" className="input w-32" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            {Object.entries(CATEGORIES).map(([key, label]) => (
                                <button key={key} type="button" onClick={() => handleSave(key)} className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-100 active:bg-blue-50 active:border-blue-500 transition-all">
                                    <span className="text-3xl mb-1">{CAT_ICONS[key]}</span>
                                    <span className="text-xs font-medium text-gray-600">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    function SerialAdvance({ serial, onClose, onConfirm }) {
        const [expense, setExpense] = useState({ amount: serial.price, date: today() });
        const [next, setNext] = useState({ name: getNextName(serial.name), price: serial.price, date: nextMonth() });

        const handleSubmit = () => {
            onConfirm(serial.id, {
                expense: { ...expense, category: 'shopping', name: serial.name + ' (已付)' },
                next
            });
            onClose();
        };

        return (
            <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-box">
                    <h3 className="text-lg font-bold mb-4 text-blue-600">📖 结算并续杯</h3>
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300">
                            <div className="text-xs font-bold text-gray-500 mb-2 uppercase">1. 确认本次消费</div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <div className="text-sm font-medium">{serial.name}</div>
                                    <div className="text-xs text-gray-400">记入账单</div>
                                </div>
                                <input type="number" className="input w-24 text-right" value={expense.amount} onChange={e => setExpense({ ...expense, amount: parseFloat(e.target.value || '0') })} />
                            </div>
                            <input type="date" className="input mt-3" value={expense.date} onChange={e => setExpense({ ...expense, date: e.target.value })} />
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div className="text-xs font-bold text-blue-500 mb-2 uppercase">2. 预订下一期 (可修改)</div>
                            <div className="space-y-3">
                                <input className="input border-blue-200" value={next.name} onChange={e => setNext({ ...next, name: e.target.value })} placeholder="下期名称" />
                                <div className="flex gap-2">
                                    <input type="month" className="input border-blue-200" value={next.date} onChange={e => setNext({ ...next, date: e.target.value })} />
                                    <input type="number" className="input border-blue-200 w-24 text-right" value={next.price} onChange={e => setNext({ ...next, price: parseFloat(e.target.value || '0') })} placeholder="预估价" />
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSubmit} className="btn btn-primary w-full py-3 text-lg">确认结算 & 更新计划</button>
                    </div>
                </div>
            </div>
        );
    }

    function EditLedgerModal({ item, onClose, onSave }) {
        const [form, setForm] = useState({ category: item.category, name: item.name, amount: item.amount });

        const submit = (e) => {
            e.preventDefault();
            onSave({ ...item, ...form, amount: parseFloat(form.amount || '0') });
        };

        return (
            <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-box">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-700">编辑当日记录</h3>
                        <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
                    </div>
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">日期</label>
                            <input className="input bg-gray-50" value={item.date} readOnly />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">支出类型</label>
                            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                {Object.entries(CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">名称</label>
                            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">金额</label>
                            <input type="number" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                        </div>
                        <button className="btn btn-primary w-full py-3" type="submit">保存修改</button>
                    </form>
                </div>
            </div>
        );
    }

    function AISettingsModal({ settings, saving, onClose, onChange, onSave }) {
        return (
            <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-box">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-700">AI 设置</h3>
                            <p className="text-xs text-gray-400 mt-1">优先支持 DeepSeek，也兼容 OpenAI 风格接口。</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">提供商</label>
                            <select className="input" value={settings.provider} onChange={e => onChange('provider', e.target.value)}>
                                <option value="deepseek">DeepSeek</option>
                                <option value="openai-compatible">OpenAI Compatible</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">接口地址</label>
                            <input className="input" value={settings.endpointUrl} onChange={e => onChange('endpointUrl', e.target.value)} placeholder="https://api.deepseek.com/v1/chat/completions" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">模型</label>
                            <input className="input" value={settings.model} onChange={e => onChange('model', e.target.value)} placeholder="deepseek-chat" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">API Key {settings.hasApiKey && <span className="text-green-500">（已保存，可留空不改）</span>}</label>
                            <input type="password" className="input" value={settings.apiKey} onChange={e => onChange('apiKey', e.target.value)} placeholder={settings.hasApiKey ? '留空则保持原 Key' : '请输入 API Key'} />
                        </div>
                        {settings.updatedAt && <p className="text-xs text-gray-400">最近更新：{settings.updatedAt}（北京时间）</p>}
                        <button className="btn btn-primary w-full py-3" type="button" onClick={onSave} disabled={saving}>{saving ? '保存中...' : '保存 AI 设置'}</button>
                    </div>
                </div>
            </div>
        );
    }

    function AIAnalysisModal({ state, scopeLabel, onClose }) {
        return (
            <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                <div className="modal-box-lg">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-700">AI 分析</h3>
                            <p className="text-xs text-gray-400 mt-1">{scopeLabel}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
                    </div>
                    {state.loading && <div className="text-sm text-blue-500">正在分析中...</div>}
                    {state.error && <div className="text-sm text-red-500">{state.error}</div>}
                    {state.result && (
                        <div className="space-y-4">
                            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
                                调用模型：{state.result.provider} / {state.result.model}
                            </div>
                            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm leading-7 whitespace-pre-wrap">{state.result.analysis}</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function DataMenu({ onExportJSON, onExportCSV, onOpenAISettings }) {
        const [open, setOpen] = useState(false);
        return (
            <div className="relative">
                <button onClick={() => setOpen(!open)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                    <i data-lucide="database"></i>
                </button>
                {open && (
                    <div className="absolute right-0 top-10 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-20">
                        <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase">数据管理</div>
                        <button onClick={() => { onExportJSON(); setOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">📥 备份全站数据 (.json)</button>
                        <button onClick={() => { onExportCSV(); setOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">📊 导出账单表格 (.csv)</button>
                        <button onClick={() => { onOpenAISettings(); setOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">🤖 AI Key / 模型设置</button>
                    </div>
                )}
            </div>
        );
    }

    Object.assign(FinanceUI, {
        Notice,
        Auth,
        QuickAdd,
        SerialAdvance,
        EditLedgerModal,
        AISettingsModal,
        AIAnalysisModal,
        DataMenu,
    });
})();
