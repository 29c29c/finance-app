(() => {
  const F = window.FinanceUI;
  const {
    useState,
    useEffect,
    useRef,
    api,
    today,
    shiftMonth,
    currentMonthStr,
    getNextName,
    CATEGORIES,
    SERIAL_STATUS_LABELS,
    money
  } = F;
  const paths = {
    wallet: ['M3 7V5l15-3v5', 'M3 7h18v14H3z', 'M21 12h-7v5h7', 'M17 14.5h.01'],
    home: ['m3 10 9-7 9 7v11h-6v-7H9v7H3z'],
    receipt: ['M6 3h9l4 4v14H6z', 'M14 3v5h5', 'M9 12h7', 'M9 16h5'],
    calendar: ['M4 5h16v16H4z', 'M8 3v4', 'M16 3v4', 'M4 10h16'],
    book: ['M12 5v16', 'M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z'],
    chart: ['M4 13h4v8H4z', 'M10 7h4v14h-4z', 'M16 3h4v18h-4z'],
    settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'm9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3h4l1-3 3-1 2-3-2-2 1-3-3-2-1-3Z'],
    plus: ['M12 5v14', 'M5 12h14'],
    x: ['m6 6 12 12', 'M18 6 6 18'],
    chevron: ['m9 5 7 7-7 7'],
    left: ['m15 5-7 7 7 7'],
    down: ['m6 9 6 6 6-6'],
    food: ['M4 3v6c0 3 6 3 6 0V3', 'M7 3v18', 'M18 3c-3 3-3 8 0 9v9', 'M18 3v9'],
    shopping: ['M5 7h14l2 14H3z', 'M9 8V6a3 3 0 0 1 6 0v2'],
    subscription: ['M9 18V5l11-2v13', 'M9 14c-7-2-7 7-1 5', 'M20 12c-7-2-7 7-1 5'],
    transport: ['M6 3h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M4 10h16', 'M8 14h.01', 'M16 14h.01', 'm8 18-3 3', 'm16 18 3 3'],
    logout: ['M10 4H4v16h6', 'M8 12h13', 'm17 8 4 4-4 4'],
    download: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 16v5h16v-5'],
    upload: ['M12 16V3', 'm7 8 5-5 5 5', 'M4 16v5h16v-5'],
    search: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z', 'm15 15 6 6'],
    edit: ['m15 3 6 6-12 12H3v-6Z', 'm12 6 6 6'],
    trash: ['M3 6h18', 'M9 6V3h6v3', 'M5 6l1 15h12l1-15', 'M10 10v7', 'M14 10v7'],
    check: ['m5 12 4 4L19 6'],
    sparkles: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'],
    alert: ['M12 3 2 21h20Z', 'M12 9v5', 'M12 17h.01'],
    refresh: ['M20 7a9 9 0 1 0 1 8', 'M20 3v5h-5'],
    user: ['M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M4 21v-2a8 8 0 0 1 16 0v2']
  };
  function Icon({
    name,
    size = 20,
    ...props
  }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{(paths[name] || paths.receipt).map((d, i) => <path d={d} key={i} />)}</svg>;
  }
  function Brand() {
    return <div className="brand">
      <span className="brand-icon"><Icon name="wallet" size={29} /></span>
      <span>财务指挥中心</span>
    </div>;
  }
  function Notice({
    notice,
    onClose
  }) {
    if (!notice?.text) return null;
    return <div className={`notice ${notice.type || 'info'}`} role={notice.type === 'error' ? 'alert' : 'status'}>
      <Icon name={notice.type === 'error' ? 'alert' : 'check'} size={18} />
      <span>{notice.text}</span>
      {onClose && <button className="icon-button" aria-label="关闭提示" onClick={onClose}><Icon name="x" size={16} /></button>}
    </div>;
  }
  function Modal({
    title,
    subtitle,
    children,
    onClose,
    wide = false,
    busy = false
  }) {
    const ref = useRef(null);
    const closeRef = useRef(onClose);
    const busyRef = useRef(busy);
    closeRef.current = onClose;
    busyRef.current = busy;
    useEffect(() => {
      const previous = document.activeElement;
      const overflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const first = ref.current.querySelector('[data-autofocus]') || ref.current.querySelector('input, select, textarea') || ref.current;
      first.focus();
      const handleKey = e => {
        if (e.key === 'Escape' && !busyRef.current) closeRef.current();
        if (e.key !== 'Tab') return;
        const elements = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      };
      document.addEventListener('keydown', handleKey);
      return () => {
        document.body.style.overflow = overflow;
        document.removeEventListener('keydown', handleKey);
        previous?.focus();
      };
    }, []);
    return <div className="overlay" onClick={e => !busy && e.target === e.currentTarget && onClose()}><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`modal ${wide ? 'modal-wide' : ''}`}>
        <div className="sheet-handle" />
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-button" aria-label="关闭窗口" disabled={busy} onClick={onClose}><Icon name="x" /></button>
        </header>
        {children}
      </section></div>;
  }
  function useSubmit() {
    const [busy, setBusy] = useState(false),
      [error, setError] = useState('');
    const lock = useRef(false);
    const run = async action => {
      if (lock.current) return false;
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        await action();
        return true;
      } catch (err) {
        setError(err.message || '保存失败，请重试');
        return false;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    };
    return {
      busy,
      error,
      run
    };
  }
  function Field({
    label,
    children,
    hint,
    controlId
  }) {
    const id = React.useId();
    return <div className="field">
      <label htmlFor={controlId || id}>{label}</label>
      {React.cloneElement(children, {
        id,
        'aria-describedby': hint ? id + '-hint' : undefined
      })}
      {hint && <small id={id + '-hint'}>{hint}</small>}
    </div>;
  }
  function FormError({
    error
  }) {
    return error ? <p className="form-error" role="alert">{error}</p> : null;
  }
  function Empty({
    title = '这里还没有记录',
    description,
    action,
    onAction
  }) {
    return <div className="empty">
      <span className="empty-icon"><Icon name="receipt" size={28} /></span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <button className="button secondary" onClick={onAction}>{action}</button>}
    </div>;
  }
  function Auth({
    onLogin
  }) {
    const [register, setRegister] = useState(false),
      [success, setSuccess] = useState('');
    const [form, setForm] = useState({
      username: '',
      password: '',
      inviteCode: ''
    });
    const {
      busy,
      error,
      run
    } = useSubmit();
    const submit = e => {
      e.preventDefault();
      run(async () => {
        const data = await api.post(register ? '/api/register' : '/api/login', form);
        if (register) {
          setRegister(false);
          setSuccess('注册成功，请登录你的账户');
        } else {
          localStorage.setItem('token', data.token);
          localStorage.setItem('finance-username', form.username);
          api.token = data.token;
          onLogin(data.token);
        }
      });
    };
    return <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div>
          <Icon name="wallet" size={72} />
          <h1>每一笔，<br />都心中有数。</h1>
          <p>记录日常，安排订阅。<br />把喜欢的生活，放进刚好的预算里。</p>
        </div>
        <span>你的个人财务空间</span>
      </section>
      <section className="auth-main"><div className="auth-form">
          <div className="mobile-brand"><Brand /></div>
          <h2>{register ? '创建你的账户' : '欢迎回来'}</h2>
          <p>{register ? '使用邀请码，开启你的财务空间。' : '从一笔小小的记录，开始掌握生活。'}</p>
          <form onSubmit={submit}>
            <Field label="用户名"><input className="input" autoComplete="username" value={form.username} onChange={e => setForm({
                ...form,
                username: e.target.value
              })} placeholder="输入用户名" required minLength={register ? 3 : 1} maxLength={32} /></Field>
            <Field label="密码"><input className="input" type="password" autoComplete={register ? 'new-password' : 'current-password'} value={form.password} onChange={e => setForm({
                ...form,
                password: e.target.value
              })} placeholder={register ? '至少 8 位密码' : '输入密码'} required minLength={register ? 8 : 1} maxLength={72} /></Field>
            {register && <Field label="邀请码"><input className="input" value={form.inviteCode} onChange={e => setForm({
                ...form,
                inviteCode: e.target.value
              })} placeholder="输入邀请码" required /></Field>}
            <FormError error={error} />
            {success && <p className="text-green" role="status">{success}</p>}
            <button className="button primary full" disabled={busy}>
              {busy ? '请稍候…' : register ? '创建账户' : '登录'}
              <Icon name="chevron" size={16} />
            </button>
          </form>
          <button className="text-button auth-switch" onClick={() => {
            setRegister(!register);
            setSuccess('');
          }}>{register ? '已有账户？返回登录' : '使用邀请码注册'}</button>
          <p className="auth-footnote">数据保存在你的服务器，由你自己掌握。</p>
        </div></section>
    </main>;
  }
  function LedgerForm({
    item,
    onClose,
    onSave
  }) {
    const [form, setForm] = useState(() => ({
      date: item?.date || today(),
      category: item?.category || localStorage.getItem('finance-last-category') || 'food',
      name: item?.name || '',
      amount: item ? String(item.amount) : ''
    }));
    const [saved, setSaved] = useState('');
    const amountRef = useRef(null);
    const {
      busy,
      error,
      run
    } = useSubmit();
    const submit = (e, continuing = false) => {
      e.preventDefault();
      if (!e.currentTarget.closest('form').reportValidity()) return;
      setSaved('');
      run(async () => {
        await onSave({
          ...form,
          name: form.name.trim() || CATEGORIES[form.category],
          amount: Number(form.amount)
        });
        localStorage.setItem('finance-last-category', form.category);
        if (continuing) {
          setForm(prev => ({
            ...prev,
            amount: '',
            name: ''
          }));
          setSaved('已保存，再记一笔吧');
          requestAnimationFrame(() => amountRef.current?.focus());
        } else onClose();
      });
    };
    return <Modal title={item ? '编辑账单' : '记一笔'} subtitle={item ? '让每一笔记录都准确。' : '记录这一刻的小小支出。'} onClose={onClose} busy={busy}><form onSubmit={submit} className="expense-form">
        <Field label="支出金额" controlId="expense-amount"><div className="amount-input">
            <span>¥</span>
            <input id="expense-amount" ref={amountRef} data-autofocus className="input" aria-label="支出金额" type="number" inputMode="decimal" min="0" max="99999999" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({
              ...form,
              amount: e.target.value
            })} required />
          </div></Field>
        <fieldset className="category-picker">
          <legend>支出分类</legend>
          {Object.entries(CATEGORIES).map(([key, label]) => <button type="button" key={key} aria-pressed={form.category === key} onClick={() => setForm({
            ...form,
            category: key
          })} className={form.category === key ? 'selected' : ''}>
            <span className={`category-icon ${key}`}><Icon name={key} /></span>
            <span>{label}</span>
          </button>)}
        </fieldset>
        <Field label="名称 / 备注"><input className="input" placeholder="这笔钱花在了哪里？" value={form.name} onChange={e => setForm({
            ...form,
            name: e.target.value
          })} maxLength={160} /></Field>
        <Field label="记账日期"><input className="input" type="date" required value={form.date} onChange={e => setForm({
            ...form,
            date: e.target.value
          })} /></Field>
        {item?.source_type === 'subscription' && <p className="helper">这条记录由月付订阅自动生成。金额或日期的永久修改请到「固定订阅」中操作。</p>}
        <FormError error={error} />
        {saved && <p className="text-green" role="status">{saved}</p>}
        <div className="form-actions">
          {!item && <button type="button" className="button secondary" disabled={busy} onClick={e => submit(e, true)}>保存并继续记</button>}
          <button className="button primary" disabled={busy}>
            {busy ? '保存中…' : '保存账单'}
            <Icon name="check" size={17} />
          </button>
        </div>
      </form></Modal>;
  }
  function PlanForm({
    kind,
    item,
    month,
    onClose,
    onSave
  }) {
    const subscription = kind === 'subscriptions';
    const [form, setForm] = useState(item || (subscription ? {
      name: '',
      price: '',
      cycle_type: 'monthly',
      first_payment_date: today(),
      is_active: 1
    } : {
      name: '',
      price: '',
      expected_release_date: month,
      status: 'planned'
    }));
    const {
      busy,
      error,
      run
    } = useSubmit();
    const set = (key, value) => setForm({
      ...form,
      [key]: value
    });
    const submit = e => {
      e.preventDefault();
      run(async () => {
        await onSave({
          ...form,
          price: Number(form.price)
        });
        onClose();
      });
    };
    return <Modal title={`${item ? '编辑' : '新增'}${subscription ? '订阅' : '连载计划'}`} subtitle={subscription ? '把固定支出，提前安排好。' : '为下一期喜欢的作品，留一点预算。'} onClose={onClose} busy={busy}><form onSubmit={submit}>
        <Field label={subscription ? '订阅名称' : '连载名称'}><input className="input" value={form.name} onChange={e => set('name', e.target.value)} required maxLength={120} placeholder={subscription ? '例如 Apple Music' : '例如 三体·漫画第12卷'} /></Field>
        <Field label={subscription ? '每期金额' : '预计金额'}><input className="input" type="number" inputMode="decimal" step="0.01" min="0" max="99999999" required value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" /></Field>
        {subscription ? <><div className="form-grid">
          <Field label="支付周期"><select className="input" value={form.cycle_type} onChange={e => set('cycle_type', e.target.value)}>
              <option value="monthly">每月</option>
              <option value="quarterly">每季度</option>
              <option value="yearly">每年</option>
            </select></Field>
          <Field label="续订日期"><input className="input" type="date" value={form.first_payment_date || ''} onChange={e => set('first_payment_date', e.target.value)} required /></Field>
        </div><label className="check-label"><input type="checkbox" checked={!!Number(form.is_active)} onChange={e => set('is_active', e.target.checked ? 1 : 0)} />正在订阅</label><p className="helper">开启月付订阅后，所选月份会自动生成一条续订账单；季度、年付参与月度预估，年付在续订月提醒。</p></> : <div className="form-grid">
          <Field label="预计发售月份"><input className="input" type="month" value={form.expected_release_date} onChange={e => set('expected_release_date', e.target.value)} required /></Field>
          <Field label="计划状态"><select className="input" value={form.status} onChange={e => set('status', e.target.value)}>{Object.entries(SERIAL_STATUS_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></Field>
        </div>}
        <FormError error={error} />
        <button className="button primary full" disabled={busy}>
          {busy ? '保存中…' : '保存计划'}
          <Icon name="check" size={17} />
        </button>
      </form></Modal>;
  }
  function SerialAdvance({
    serial,
    onClose,
    onSave
  }) {
    const [expense, setExpense] = useState({
      amount: serial.price,
      date: today()
    });
    const [next, setNext] = useState({
      name: getNextName(serial.name),
      price: serial.price,
      date: shiftMonth(serial.expected_release_date || currentMonthStr(), 1)
    });
    const {
      busy,
      error,
      run
    } = useSubmit();
    return <Modal title="结算本期" subtitle="记入本次支出，并安排下一期。" onClose={onClose} busy={busy}><form onSubmit={e => {
        e.preventDefault();
        run(async () => {
          await onSave({
            expense: {
              ...expense,
              amount: Number(expense.amount),
              category: 'shopping',
              name: serial.name + ' (已付)'
            },
            next: {
              ...next,
              price: Number(next.price)
            }
          });
          onClose();
        });
      }}>
        <div className="form-section">
          <h3>本期 · {serial.name}</h3>
          <div className="form-grid">
            <Field label="实际金额"><input className="input" type="number" inputMode="decimal" min="0" max="99999999" step="0.01" required value={expense.amount} onChange={e => setExpense({
                ...expense,
                amount: e.target.value
              })} /></Field>
            <Field label="付款日期"><input className="input" type="date" required value={expense.date} onChange={e => setExpense({
                ...expense,
                date: e.target.value
              })} /></Field>
          </div>
        </div>
        <div className="form-section next-section">
          <h3>下一期计划</h3>
          <Field label="下期名称"><input className="input" required maxLength={120} value={next.name} onChange={e => setNext({
              ...next,
              name: e.target.value
            })} /></Field>
          <div className="form-grid">
            <Field label="预计金额"><input className="input" type="number" inputMode="decimal" min="0" max="99999999" step="0.01" required value={next.price} onChange={e => setNext({
                ...next,
                price: e.target.value
              })} /></Field>
            <Field label="发售月份"><input className="input" type="month" required value={next.date} onChange={e => setNext({
                ...next,
                date: e.target.value
              })} /></Field>
          </div>
        </div>
        <FormError error={error} />
        <button className="button primary full" disabled={busy}>{busy ? '结算中…' : '确认结算并更新计划'}</button>
      </form></Modal>;
  }
  function BudgetForm({
    amount,
    month,
    onClose,
    onSave
  }) {
    const [value, setValue] = useState(amount || '');
    const {
      busy,
      error,
      run
    } = useSubmit();
    return <Modal title="设置月预算" subtitle={`${F.monthLabel(month)} · 给支出一个刚好的边界。`} onClose={onClose} busy={busy}><form onSubmit={e => {
        e.preventDefault();
        run(async () => {
          await onSave(Number(value));
          onClose();
        });
      }}>
        <Field label="月预算金额"><input className="input" type="number" inputMode="decimal" step="0.01" min="0" max="99999999" required placeholder="例如 5000" value={value} onChange={e => setValue(e.target.value)} /></Field>
        <p className="helper">预算设为 0 时不计算预算使用率。</p>
        <FormError error={error} />
        <button className="button primary full" disabled={busy}>{busy ? '保存中…' : '保存预算'}</button>
      </form></Modal>;
  }
  function DeleteDialog({
    item,
    onClose,
    onDelete
  }) {
    const {
      busy,
      error,
      run
    } = useSubmit();
    return <Modal title="删除这条记录？" onClose={onClose} busy={busy}>
      <p className="helper">「{item.name}」删除后无法恢复。{item.source_type === 'subscription' ? '这是自动入账记录，订阅仍开启时会再次生成。' : ''}</p>
      <FormError error={error} />
      <div className="form-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>保留记录</button>
        <button className="button danger" disabled={busy} onClick={() => run(async () => {
          await onDelete();
          onClose();
        })}>{busy ? '删除中…' : '确认删除'}</button>
      </div>
    </Modal>;
  }
  function ImportForm({
    onClose,
    onSave
  }) {
    const [text, setText] = useState('');
    const {
      busy,
      error,
      run
    } = useSubmit();
    let preview = [],
      parseError = '';
    try {
      if (text.trim()) preview = F.parseLedgerCSV(text);
    } catch (err) {
      parseError = err.message;
    }
    return <Modal title="批量导入账单" subtitle="支持带引号的 CSV，可直接粘贴导出的账单。" onClose={onClose} busy={busy} wide><form onSubmit={e => {
        e.preventDefault();
        run(async () => {
          const items = F.parseLedgerCSV(text);
          await onSave(items);
          onClose();
        });
      }}>
        <Field label="CSV 文本" hint="每行：日期, 分类, 名称, 金额 · 分类支持 shopping / food / transport / subscription 或中文名称。"><textarea className="input csv-input" value={text} onChange={e => setText(e.target.value)} placeholder={'Date,Category,Name,Amount\n2026-10-14,food,午餐,28.00'} required /></Field>
        <FormError error={parseError || error} />
        {preview.length > 0 && <div className="import-preview">
          <strong>已识别 {preview.length} 条记录</strong>
          <span>合计 ¥{money(preview.reduce((sum, item) => sum + item.amount, 0))}</span>
        </div>}
        <button className="button primary full" disabled={busy || !preview.length}>{busy ? '导入中…' : `确认导入${preview.length ? ` ${preview.length} 条` : ''}`}</button>
      </form></Modal>;
  }
  function AISettingsModal({
    settings,
    onClose,
    onSave
  }) {
    const [form, setForm] = useState({
      ...settings,
      apiKey: ''
    });
    const {
      busy,
      error,
      run
    } = useSubmit();
    const set = (key, value) => setForm({
      ...form,
      [key]: value
    });
    return <Modal title="AI 分析设置" subtitle="支持 DeepSeek 和 OpenAI 兼容接口。" onClose={onClose} busy={busy}><form onSubmit={e => {
        e.preventDefault();
        run(async () => {
          await onSave(form);
          onClose();
        });
      }}>
        <Field label="提供商"><select className="input" value={form.provider} onChange={e => set('provider', e.target.value)}>
            <option value="deepseek">DeepSeek</option>
            <option value="openai-compatible">OpenAI Compatible</option>
          </select></Field>
        <Field label="接口地址"><input className="input" type="url" required value={form.endpointUrl} onChange={e => set('endpointUrl', e.target.value)} /></Field>
        <Field label="模型"><input className="input" required value={form.model} onChange={e => set('model', e.target.value)} maxLength={100} /></Field>
        <Field label="API Key" hint={settings.hasApiKey ? '已保存，留空保留现有 Key。' : 'Key 按账户保存到你的服务器。'}><input className="input" type="password" autoComplete="off" value={form.apiKey} onChange={e => set('apiKey', e.target.value)} placeholder={settings.hasApiKey ? '已配置 · 留空保留' : '输入 API Key'} maxLength={500} /></Field>
        <FormError error={error} />
        <button className="button primary full" disabled={busy}>{busy ? '保存中…' : '保存设置'}</button>
      </form></Modal>;
  }
  Object.assign(F, {
    Icon,
    Brand,
    Notice,
    Modal,
    Field,
    FormError,
    Empty,
    Auth,
    LedgerForm,
    PlanForm,
    SerialAdvance,
    BudgetForm,
    DeleteDialog,
    ImportForm,
    AISettingsModal
  });
})();
