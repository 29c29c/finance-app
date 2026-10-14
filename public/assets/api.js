(() => {
    const FinanceUI = window.FinanceUI || (window.FinanceUI = {});

    const api = {
        token: localStorage.getItem('token'),
        headers() {
            const headers = { 'Content-Type': 'application/json' };
            if (this.token) headers.Authorization = 'Bearer ' + this.token;
            return headers;
        },
        async req(url, method, body) {
            const options = { method, headers: this.headers() };
            if (body !== undefined) options.body = JSON.stringify(body);
            let res;
            try {
                res = await fetch(url, options);
            } catch (_error) {
                throw new Error('连接服务器失败，请检查网络后重试');
            }
            let data = {};
            try { data = await res.json(); } catch (_error) {}
            if (!res.ok) {
                const error = new Error(data.error || '请求失败');
                error.status = res.status;
                throw error;
            }
            return data;
        },
        post(url, body) { return this.req(url, 'POST', body); },
        get(url) { return this.req(url, 'GET'); },
        delete(url) { return this.req(url, 'DELETE'); },
        put(url, body) { return this.req(url, 'PUT', body); }
    };

    FinanceUI.api = api;
})();
