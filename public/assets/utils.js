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
    });
})();
