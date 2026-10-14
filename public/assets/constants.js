(() => {
    const FinanceUI = window.FinanceUI || (window.FinanceUI = {});
    const { useState, useEffect, useMemo, useRef } = React;
    const { createRoot } = ReactDOM;

    const BEIJING_TZ = 'Asia/Shanghai';
    const CATEGORIES = { shopping: '购物/连载', food: '食品', transport: '交通', subscription: '订阅' };
    const CAT_ICONS = { shopping: '🛍️', food: '🍔', transport: '🚗', subscription: '📅' };
    const SERIAL_STATUS_LABELS = { planned: '待购入', ordered: '已预订', paid: '已付款', delayed: '已延期' };

    const getParts = (date = new Date()) => {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: BEIJING_TZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).formatToParts(date);
        return parts.reduce((acc, item) => {
            if (item.type !== 'literal') acc[item.type] = item.value;
            return acc;
        }, {});
    };

    const today = () => {
        const parts = getParts();
        return `${parts.year}-${parts.month}-${parts.day}`;
    };

    const currentMonthStr = () => today().slice(0, 7);
    const currentYearStr = () => today().slice(0, 4);
    const beijingTimestampLabel = () => {
        const parts = getParts();
        return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
    };

    const nextMonth = () => {
        const [year, month] = currentMonthStr().split('-').map(Number);
        const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
        return `${next.year}-${String(next.month).padStart(2, '0')}`;
    };

    Object.assign(FinanceUI, {
        useState,
        useEffect,
        useMemo,
        useRef,
        createRoot,
        BEIJING_TZ,
        CATEGORIES,
        CAT_ICONS,
        SERIAL_STATUS_LABELS,
        getParts,
        today,
        currentMonthStr,
        currentYearStr,
        beijingTimestampLabel,
        nextMonth,
    });
})();
