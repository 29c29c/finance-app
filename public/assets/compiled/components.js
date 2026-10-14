function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
    return React.createElement("svg", _extends({
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.7",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    }, props), (paths[name] || paths.receipt).map((d, i) => React.createElement("path", {
      d: d,
      key: i
    })));
  }
  function Brand() {
    return React.createElement("div", {
      className: "brand"
    }, React.createElement("span", {
      className: "brand-icon"
    }, React.createElement(Icon, {
      name: "wallet",
      size: 29
    })), React.createElement("span", null, "\u8D22\u52A1\u6307\u6325\u4E2D\u5FC3"));
  }
  function Notice({
    notice,
    onClose
  }) {
    if (!notice?.text) return null;
    return React.createElement("div", {
      className: `notice ${notice.type || 'info'}`,
      role: notice.type === 'error' ? 'alert' : 'status'
    }, React.createElement(Icon, {
      name: notice.type === 'error' ? 'alert' : 'check',
      size: 18
    }), React.createElement("span", null, notice.text), onClose && React.createElement("button", {
      className: "icon-button",
      "aria-label": "\u5173\u95ED\u63D0\u793A",
      onClick: onClose
    }, React.createElement(Icon, {
      name: "x",
      size: 16
    })));
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
    return React.createElement("div", {
      className: "overlay",
      onClick: e => !busy && e.target === e.currentTarget && onClose()
    }, React.createElement("section", {
      ref: ref,
      tabIndex: -1,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "modal-title",
      className: `modal ${wide ? 'modal-wide' : ''}`
    }, React.createElement("div", {
      className: "sheet-handle"
    }), React.createElement("header", {
      className: "modal-header"
    }, React.createElement("div", null, React.createElement("h2", {
      id: "modal-title"
    }, title), subtitle && React.createElement("p", null, subtitle)), React.createElement("button", {
      type: "button",
      className: "icon-button",
      "aria-label": "\u5173\u95ED\u7A97\u53E3",
      disabled: busy,
      onClick: onClose
    }, React.createElement(Icon, {
      name: "x"
    }))), children));
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
    return React.createElement("div", {
      className: "field"
    }, React.createElement("label", {
      htmlFor: controlId || id
    }, label), React.cloneElement(children, {
      id,
      'aria-describedby': hint ? id + '-hint' : undefined
    }), hint && React.createElement("small", {
      id: id + '-hint'
    }, hint));
  }
  function FormError({
    error
  }) {
    return error ? React.createElement("p", {
      className: "form-error",
      role: "alert"
    }, error) : null;
  }
  function Empty({
    title = '这里还没有记录',
    description,
    action,
    onAction
  }) {
    return React.createElement("div", {
      className: "empty"
    }, React.createElement("span", {
      className: "empty-icon"
    }, React.createElement(Icon, {
      name: "receipt",
      size: 28
    })), React.createElement("h3", null, title), description && React.createElement("p", null, description), action && React.createElement("button", {
      className: "button secondary",
      onClick: onAction
    }, action));
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
    return React.createElement("main", {
      className: "auth-page"
    }, React.createElement("section", {
      className: "auth-story"
    }, React.createElement(Brand, null), React.createElement("div", null, React.createElement(Icon, {
      name: "wallet",
      size: 72
    }), React.createElement("h1", null, "\u6BCF\u4E00\u7B14\uFF0C", React.createElement("br", null), "\u90FD\u5FC3\u4E2D\u6709\u6570\u3002"), React.createElement("p", null, "\u8BB0\u5F55\u65E5\u5E38\uFF0C\u5B89\u6392\u8BA2\u9605\u3002", React.createElement("br", null), "\u628A\u559C\u6B22\u7684\u751F\u6D3B\uFF0C\u653E\u8FDB\u521A\u597D\u7684\u9884\u7B97\u91CC\u3002")), React.createElement("span", null, "\u4F60\u7684\u4E2A\u4EBA\u8D22\u52A1\u7A7A\u95F4")), React.createElement("section", {
      className: "auth-main"
    }, React.createElement("div", {
      className: "auth-form"
    }, React.createElement("div", {
      className: "mobile-brand"
    }, React.createElement(Brand, null)), React.createElement("h2", null, register ? '创建你的账户' : '欢迎回来'), React.createElement("p", null, register ? '使用邀请码，开启你的财务空间。' : '从一笔小小的记录，开始掌握生活。'), React.createElement("form", {
      onSubmit: submit
    }, React.createElement(Field, {
      label: "\u7528\u6237\u540D"
    }, React.createElement("input", {
      className: "input",
      autoComplete: "username",
      value: form.username,
      onChange: e => setForm({
        ...form,
        username: e.target.value
      }),
      placeholder: "\u8F93\u5165\u7528\u6237\u540D",
      required: true,
      minLength: register ? 3 : 1,
      maxLength: 32
    })), React.createElement(Field, {
      label: "\u5BC6\u7801"
    }, React.createElement("input", {
      className: "input",
      type: "password",
      autoComplete: register ? 'new-password' : 'current-password',
      value: form.password,
      onChange: e => setForm({
        ...form,
        password: e.target.value
      }),
      placeholder: register ? '至少 8 位密码' : '输入密码',
      required: true,
      minLength: register ? 8 : 1,
      maxLength: 72
    })), register && React.createElement(Field, {
      label: "\u9080\u8BF7\u7801"
    }, React.createElement("input", {
      className: "input",
      value: form.inviteCode,
      onChange: e => setForm({
        ...form,
        inviteCode: e.target.value
      }),
      placeholder: "\u8F93\u5165\u9080\u8BF7\u7801",
      required: true
    })), React.createElement(FormError, {
      error: error
    }), success && React.createElement("p", {
      className: "text-green",
      role: "status"
    }, success), React.createElement("button", {
      className: "button primary full",
      disabled: busy
    }, busy ? '请稍候…' : register ? '创建账户' : '登录', React.createElement(Icon, {
      name: "chevron",
      size: 16
    }))), React.createElement("button", {
      className: "text-button auth-switch",
      onClick: () => {
        setRegister(!register);
        setSuccess('');
      }
    }, register ? '已有账户？返回登录' : '使用邀请码注册'), React.createElement("p", {
      className: "auth-footnote"
    }, "\u6570\u636E\u4FDD\u5B58\u5728\u4F60\u7684\u670D\u52A1\u5668\uFF0C\u7531\u4F60\u81EA\u5DF1\u638C\u63E1\u3002"))));
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
    return React.createElement(Modal, {
      title: item ? '编辑账单' : '记一笔',
      subtitle: item ? '让每一笔记录都准确。' : '记录这一刻的小小支出。',
      onClose: onClose,
      busy: busy
    }, React.createElement("form", {
      onSubmit: submit,
      className: "expense-form"
    }, React.createElement(Field, {
      label: "\u652F\u51FA\u91D1\u989D",
      controlId: "expense-amount"
    }, React.createElement("div", {
      className: "amount-input"
    }, React.createElement("span", null, "\xA5"), React.createElement("input", {
      id: "expense-amount",
      ref: amountRef,
      "data-autofocus": true,
      className: "input",
      "aria-label": "\u652F\u51FA\u91D1\u989D",
      type: "number",
      inputMode: "decimal",
      min: "0",
      max: "99999999",
      step: "0.01",
      placeholder: "0.00",
      value: form.amount,
      onChange: e => setForm({
        ...form,
        amount: e.target.value
      }),
      required: true
    }))), React.createElement("fieldset", {
      className: "category-picker"
    }, React.createElement("legend", null, "\u652F\u51FA\u5206\u7C7B"), Object.entries(CATEGORIES).map(([key, label]) => React.createElement("button", {
      type: "button",
      key: key,
      "aria-pressed": form.category === key,
      onClick: () => setForm({
        ...form,
        category: key
      }),
      className: form.category === key ? 'selected' : ''
    }, React.createElement("span", {
      className: `category-icon ${key}`
    }, React.createElement(Icon, {
      name: key
    })), React.createElement("span", null, label)))), React.createElement(Field, {
      label: "\u540D\u79F0 / \u5907\u6CE8"
    }, React.createElement("input", {
      className: "input",
      placeholder: "\u8FD9\u7B14\u94B1\u82B1\u5728\u4E86\u54EA\u91CC\uFF1F",
      value: form.name,
      onChange: e => setForm({
        ...form,
        name: e.target.value
      }),
      maxLength: 160
    })), React.createElement(Field, {
      label: "\u8BB0\u8D26\u65E5\u671F"
    }, React.createElement("input", {
      className: "input",
      type: "date",
      required: true,
      value: form.date,
      onChange: e => setForm({
        ...form,
        date: e.target.value
      })
    })), item?.source_type === 'subscription' && React.createElement("p", {
      className: "helper"
    }, "\u8FD9\u6761\u8BB0\u5F55\u7531\u6708\u4ED8\u8BA2\u9605\u81EA\u52A8\u751F\u6210\u3002\u91D1\u989D\u6216\u65E5\u671F\u7684\u6C38\u4E45\u4FEE\u6539\u8BF7\u5230\u300C\u56FA\u5B9A\u8BA2\u9605\u300D\u4E2D\u64CD\u4F5C\u3002"), React.createElement(FormError, {
      error: error
    }), saved && React.createElement("p", {
      className: "text-green",
      role: "status"
    }, saved), React.createElement("div", {
      className: "form-actions"
    }, !item && React.createElement("button", {
      type: "button",
      className: "button secondary",
      disabled: busy,
      onClick: e => submit(e, true)
    }, "\u4FDD\u5B58\u5E76\u7EE7\u7EED\u8BB0"), React.createElement("button", {
      className: "button primary",
      disabled: busy
    }, busy ? '保存中…' : '保存账单', React.createElement(Icon, {
      name: "check",
      size: 17
    })))));
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
    return React.createElement(Modal, {
      title: `${item ? '编辑' : '新增'}${subscription ? '订阅' : '连载计划'}`,
      subtitle: subscription ? '把固定支出，提前安排好。' : '为下一期喜欢的作品，留一点预算。',
      onClose: onClose,
      busy: busy
    }, React.createElement("form", {
      onSubmit: submit
    }, React.createElement(Field, {
      label: subscription ? '订阅名称' : '连载名称'
    }, React.createElement("input", {
      className: "input",
      value: form.name,
      onChange: e => set('name', e.target.value),
      required: true,
      maxLength: 120,
      placeholder: subscription ? '例如 Apple Music' : '例如 三体·漫画第12卷'
    })), React.createElement(Field, {
      label: subscription ? '每期金额' : '预计金额'
    }, React.createElement("input", {
      className: "input",
      type: "number",
      inputMode: "decimal",
      step: "0.01",
      min: "0",
      max: "99999999",
      required: true,
      value: form.price,
      onChange: e => set('price', e.target.value),
      placeholder: "0.00"
    })), subscription ? React.createElement(React.Fragment, null, React.createElement("div", {
      className: "form-grid"
    }, React.createElement(Field, {
      label: "\u652F\u4ED8\u5468\u671F"
    }, React.createElement("select", {
      className: "input",
      value: form.cycle_type,
      onChange: e => set('cycle_type', e.target.value)
    }, React.createElement("option", {
      value: "monthly"
    }, "\u6BCF\u6708"), React.createElement("option", {
      value: "quarterly"
    }, "\u6BCF\u5B63\u5EA6"), React.createElement("option", {
      value: "yearly"
    }, "\u6BCF\u5E74"))), React.createElement(Field, {
      label: "\u7EED\u8BA2\u65E5\u671F"
    }, React.createElement("input", {
      className: "input",
      type: "date",
      value: form.first_payment_date || '',
      onChange: e => set('first_payment_date', e.target.value),
      required: true
    }))), React.createElement("label", {
      className: "check-label"
    }, React.createElement("input", {
      type: "checkbox",
      checked: !!Number(form.is_active),
      onChange: e => set('is_active', e.target.checked ? 1 : 0)
    }), "\u6B63\u5728\u8BA2\u9605"), React.createElement("p", {
      className: "helper"
    }, "\u5F00\u542F\u6708\u4ED8\u8BA2\u9605\u540E\uFF0C\u6240\u9009\u6708\u4EFD\u4F1A\u81EA\u52A8\u751F\u6210\u4E00\u6761\u7EED\u8BA2\u8D26\u5355\uFF1B\u5B63\u5EA6\u3001\u5E74\u4ED8\u53C2\u4E0E\u6708\u5EA6\u9884\u4F30\uFF0C\u5E74\u4ED8\u5728\u7EED\u8BA2\u6708\u63D0\u9192\u3002")) : React.createElement("div", {
      className: "form-grid"
    }, React.createElement(Field, {
      label: "\u9884\u8BA1\u53D1\u552E\u6708\u4EFD"
    }, React.createElement("input", {
      className: "input",
      type: "month",
      value: form.expected_release_date,
      onChange: e => set('expected_release_date', e.target.value),
      required: true
    })), React.createElement(Field, {
      label: "\u8BA1\u5212\u72B6\u6001"
    }, React.createElement("select", {
      className: "input",
      value: form.status,
      onChange: e => set('status', e.target.value)
    }, Object.entries(SERIAL_STATUS_LABELS).map(([key, label]) => React.createElement("option", {
      value: key,
      key: key
    }, label))))), React.createElement(FormError, {
      error: error
    }), React.createElement("button", {
      className: "button primary full",
      disabled: busy
    }, busy ? '保存中…' : '保存计划', React.createElement(Icon, {
      name: "check",
      size: 17
    }))));
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
    return React.createElement(Modal, {
      title: "\u7ED3\u7B97\u672C\u671F",
      subtitle: "\u8BB0\u5165\u672C\u6B21\u652F\u51FA\uFF0C\u5E76\u5B89\u6392\u4E0B\u4E00\u671F\u3002",
      onClose: onClose,
      busy: busy
    }, React.createElement("form", {
      onSubmit: e => {
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
      }
    }, React.createElement("div", {
      className: "form-section"
    }, React.createElement("h3", null, "\u672C\u671F \xB7 ", serial.name), React.createElement("div", {
      className: "form-grid"
    }, React.createElement(Field, {
      label: "\u5B9E\u9645\u91D1\u989D"
    }, React.createElement("input", {
      className: "input",
      type: "number",
      inputMode: "decimal",
      min: "0",
      max: "99999999",
      step: "0.01",
      required: true,
      value: expense.amount,
      onChange: e => setExpense({
        ...expense,
        amount: e.target.value
      })
    })), React.createElement(Field, {
      label: "\u4ED8\u6B3E\u65E5\u671F"
    }, React.createElement("input", {
      className: "input",
      type: "date",
      required: true,
      value: expense.date,
      onChange: e => setExpense({
        ...expense,
        date: e.target.value
      })
    })))), React.createElement("div", {
      className: "form-section next-section"
    }, React.createElement("h3", null, "\u4E0B\u4E00\u671F\u8BA1\u5212"), React.createElement(Field, {
      label: "\u4E0B\u671F\u540D\u79F0"
    }, React.createElement("input", {
      className: "input",
      required: true,
      maxLength: 120,
      value: next.name,
      onChange: e => setNext({
        ...next,
        name: e.target.value
      })
    })), React.createElement("div", {
      className: "form-grid"
    }, React.createElement(Field, {
      label: "\u9884\u8BA1\u91D1\u989D"
    }, React.createElement("input", {
      className: "input",
      type: "number",
      inputMode: "decimal",
      min: "0",
      max: "99999999",
      step: "0.01",
      required: true,
      value: next.price,
      onChange: e => setNext({
        ...next,
        price: e.target.value
      })
    })), React.createElement(Field, {
      label: "\u53D1\u552E\u6708\u4EFD"
    }, React.createElement("input", {
      className: "input",
      type: "month",
      required: true,
      value: next.date,
      onChange: e => setNext({
        ...next,
        date: e.target.value
      })
    })))), React.createElement(FormError, {
      error: error
    }), React.createElement("button", {
      className: "button primary full",
      disabled: busy
    }, busy ? '结算中…' : '确认结算并更新计划')));
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
    return React.createElement(Modal, {
      title: "\u8BBE\u7F6E\u6708\u9884\u7B97",
      subtitle: `${F.monthLabel(month)} · 给支出一个刚好的边界。`,
      onClose: onClose,
      busy: busy
    }, React.createElement("form", {
      onSubmit: e => {
        e.preventDefault();
        run(async () => {
          await onSave(Number(value));
          onClose();
        });
      }
    }, React.createElement(Field, {
      label: "\u6708\u9884\u7B97\u91D1\u989D"
    }, React.createElement("input", {
      className: "input",
      type: "number",
      inputMode: "decimal",
      step: "0.01",
      min: "0",
      max: "99999999",
      required: true,
      placeholder: "\u4F8B\u5982 5000",
      value: value,
      onChange: e => setValue(e.target.value)
    })), React.createElement("p", {
      className: "helper"
    }, "\u9884\u7B97\u8BBE\u4E3A 0 \u65F6\u4E0D\u8BA1\u7B97\u9884\u7B97\u4F7F\u7528\u7387\u3002"), React.createElement(FormError, {
      error: error
    }), React.createElement("button", {
      className: "button primary full",
      disabled: busy
    }, busy ? '保存中…' : '保存预算')));
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
    return React.createElement(Modal, {
      title: "\u5220\u9664\u8FD9\u6761\u8BB0\u5F55\uFF1F",
      onClose: onClose,
      busy: busy
    }, React.createElement("p", {
      className: "helper"
    }, "\u300C", item.name, "\u300D\u5220\u9664\u540E\u65E0\u6CD5\u6062\u590D\u3002", item.source_type === 'subscription' ? '这是自动入账记录，订阅仍开启时会再次生成。' : ''), React.createElement(FormError, {
      error: error
    }), React.createElement("div", {
      className: "form-actions"
    }, React.createElement("button", {
      className: "button secondary",
      disabled: busy,
      onClick: onClose
    }, "\u4FDD\u7559\u8BB0\u5F55"), React.createElement("button", {
      className: "button danger",
      disabled: busy,
      onClick: () => run(async () => {
        await onDelete();
        onClose();
      })
    }, busy ? '删除中…' : '确认删除')));
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
    return React.createElement(Modal, {
      title: "\u6279\u91CF\u5BFC\u5165\u8D26\u5355",
      subtitle: "\u652F\u6301\u5E26\u5F15\u53F7\u7684 CSV\uFF0C\u53EF\u76F4\u63A5\u7C98\u8D34\u5BFC\u51FA\u7684\u8D26\u5355\u3002",
      onClose: onClose,
      busy: busy,
      wide: true
    }, React.createElement("form", {
      onSubmit: e => {
        e.preventDefault();
        run(async () => {
          const items = F.parseLedgerCSV(text);
          await onSave(items);
          onClose();
        });
      }
    }, React.createElement(Field, {
      label: "CSV \u6587\u672C",
      hint: "\u6BCF\u884C\uFF1A\u65E5\u671F, \u5206\u7C7B, \u540D\u79F0, \u91D1\u989D \xB7 \u5206\u7C7B\u652F\u6301 shopping / food / transport / subscription \u6216\u4E2D\u6587\u540D\u79F0\u3002"
    }, React.createElement("textarea", {
      className: "input csv-input",
      value: text,
      onChange: e => setText(e.target.value),
      placeholder: 'Date,Category,Name,Amount\n2026-10-14,food,午餐,28.00',
      required: true
    })), React.createElement(FormError, {
      error: parseError || error
    }), preview.length > 0 && React.createElement("div", {
      className: "import-preview"
    }, React.createElement("strong", null, "\u5DF2\u8BC6\u522B ", preview.length, " \u6761\u8BB0\u5F55"), React.createElement("span", null, "\u5408\u8BA1 \xA5", money(preview.reduce((sum, item) => sum + item.amount, 0)))), React.createElement("button", {
      className: "button primary full",
      disabled: busy || !preview.length
    }, busy ? '导入中…' : `确认导入${preview.length ? ` ${preview.length} 条` : ''}`)));
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
    return React.createElement(Modal, {
      title: "AI \u5206\u6790\u8BBE\u7F6E",
      subtitle: "\u652F\u6301 DeepSeek \u548C OpenAI \u517C\u5BB9\u63A5\u53E3\u3002",
      onClose: onClose,
      busy: busy
    }, React.createElement("form", {
      onSubmit: e => {
        e.preventDefault();
        run(async () => {
          await onSave(form);
          onClose();
        });
      }
    }, React.createElement(Field, {
      label: "\u63D0\u4F9B\u5546"
    }, React.createElement("select", {
      className: "input",
      value: form.provider,
      onChange: e => set('provider', e.target.value)
    }, React.createElement("option", {
      value: "deepseek"
    }, "DeepSeek"), React.createElement("option", {
      value: "openai-compatible"
    }, "OpenAI Compatible"))), React.createElement(Field, {
      label: "\u63A5\u53E3\u5730\u5740"
    }, React.createElement("input", {
      className: "input",
      type: "url",
      required: true,
      value: form.endpointUrl,
      onChange: e => set('endpointUrl', e.target.value)
    })), React.createElement(Field, {
      label: "\u6A21\u578B"
    }, React.createElement("input", {
      className: "input",
      required: true,
      value: form.model,
      onChange: e => set('model', e.target.value),
      maxLength: 100
    })), React.createElement(Field, {
      label: "API Key",
      hint: settings.hasApiKey ? '已保存，留空保留现有 Key。' : 'Key 按账户保存到你的服务器。'
    }, React.createElement("input", {
      className: "input",
      type: "password",
      autoComplete: "off",
      value: form.apiKey,
      onChange: e => set('apiKey', e.target.value),
      placeholder: settings.hasApiKey ? '已配置 · 留空保留' : '输入 API Key',
      maxLength: 500
    })), React.createElement(FormError, {
      error: error
    }), React.createElement("button", {
      className: "button primary full",
      disabled: busy
    }, busy ? '保存中…' : '保存设置')));
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
