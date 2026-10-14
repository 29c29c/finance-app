(() => {
    const FinanceUI = window.FinanceUI || (window.FinanceUI = {});

    const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
    const formatMoney = (value, digits = 2) => safeNumber(value).toFixed(digits);
    const monthFromDate = (date) => String(date || '').slice(0, 7);
    const yearFromDate = (date) => String(date || '').slice(0, 4);

    const escapeCsvValue = (value) => {
        const raw = String(value ?? '');
        const dangerous = /^[=+\-@]/.test(raw) || raw.startsWith('\t');
        const safe = dangerous ? "'" + raw : raw;
        return `"${safe.replace(/"/g, '""')}"`;
    };

    const getNextName = (name) => {
        const match = name.match(/(\d+)(?!.*\d)/);
        if (match) {
            const num = parseInt(match[0], 10);
            return name.replace(/(\d+)(?!.*\d)/, num + 1);
        }
        return name + ' 下一期';
    };

    const buildCategoryBreakdown = (items) => items.reduce((acc, item) => {
        const key = item.category || 'shopping';
        acc[key] = (acc[key] || 0) + safeNumber(item.amount);
        return acc;
    }, { shopping: 0, food: 0, transport: 0, subscription: 0 });

    const buildNameRanking = (items) => {
        const map = new Map();
        items.forEach((item) => {
            const key = `${item.category || 'shopping'}::${item.name}`;
            if (!map.has(key)) {
                map.set(key, { name: item.name, category: item.category || 'shopping', total: 0, count: 0 });
            }
            const row = map.get(key);
            row.total += safeNumber(item.amount);
            row.count += 1;
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    };

    const buildMonthlyTotals = (items, year) => {
        const bucket = {};
        items.filter((item) => yearFromDate(item.date) === String(year)).forEach((item) => {
            const month = monthFromDate(item.date);
            bucket[month] = (bucket[month] || 0) + safeNumber(item.amount);
        });
        return Object.entries(bucket).sort((a, b) => a[0].localeCompare(b[0])).map(([month, total]) => ({ month, total }));
    };

    const money = (value) => safeNumber(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const monthLabel = (month) => `${String(month).slice(0, 4)}年${Number(String(month).slice(5, 7))}月`;
    const shiftMonth = (month, offset) => {
        const [year, number] = month.split('-').map(Number);
        const date = new Date(Date.UTC(year, number - 1 + offset, 1));
        return date.toISOString().slice(0, 7);
    };
    const renewalInMonth = (subscription, month) => {
        const day = Number(String(subscription.first_payment_date || '').slice(8, 10));
        if (!day) return '';
        const [year, number] = month.split('-').map(Number);
        return `${month}-${String(Math.min(day, new Date(Date.UTC(year, number, 0)).getUTCDate())).padStart(2, '0')}`;
    };
    const planSummary = (subscriptions, serials, month) => {
        const active = subscriptions.filter(s => Number(s.is_active));
        const subscriptionCost = active.reduce((sum, s) => sum + safeNumber(s.price) / (s.cycle_type === 'yearly' ? 12 : s.cycle_type === 'quarterly' ? 3 : 1), 0);
        const pending = serials.filter(s => s.expected_release_date === month && s.status !== 'paid');
        return {
            subscriptionCost,
            serialCost: pending.reduce((sum, s) => sum + safeNumber(s.price), 0),
            pending,
            warnings: active.filter(s => s.cycle_type === 'yearly' && String(s.first_payment_date).slice(5, 7) === month.slice(5, 7)),
        };
    };
    // A small RFC-4180 reader, shared by the import preview and submit flow.
    const parseLedgerCSV = (text) => {
        const rows = [];
        let row = [], cell = '', quoted = false;
        const input = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            if (char === '"') {
                if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
                else if (quoted || !cell.trim()) quoted = !quoted;
                else throw new Error('CSV 引号格式不正确');
            } else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
            else if (char === '\n' && !quoted) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
            else cell += char;
        }
        if (quoted) throw new Error('CSV 引号未闭合');
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        if (rows[0] && /^(date|日期)$/i.test(rows[0][0])) rows.shift();
        if (!rows.length) throw new Error('请先输入 CSV 记录');
        if (rows.length > 500) throw new Error('单次最多导入 500 条记录');
        const categories = { '购物/连载': 'shopping', '食品': 'food', '交通': 'transport', '订阅': 'subscription' };
        return rows.map((columns, index) => {
            const [date, rawCategory, name, rawAmount] = columns;
            const category = categories[rawCategory] || rawCategory;
            const amount = Number(rawAmount);
            const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
            if (columns.length !== 4 || !validDate || !['shopping', 'food', 'transport', 'subscription'].includes(category) || !name || name.length > 160 || !rawAmount || !Number.isFinite(amount) || amount < 0 || amount > 99999999) {
                throw new Error(`第 ${index + 1} 条记录无效，请检查日期、分类、名称和金额`);
            }
            return { date, category, name, amount };
        });
    };

    Object.assign(FinanceUI, {
        safeNumber,
        formatMoney,
        monthFromDate,
        yearFromDate,
        escapeCsvValue,
        getNextName,
        buildCategoryBreakdown,
        buildNameRanking,
        buildMonthlyTotals,
        money,
        monthLabel,
        shiftMonth,
        renewalInMonth,
        planSummary,
        parseLedgerCSV,
    });
})();
