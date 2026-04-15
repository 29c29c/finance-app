let token = localStorage.getItem('token') || '';

function setToken(nextToken) {
  token = nextToken || '';

  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

function getToken() {
  return token;
}

async function request(url, options = {}) {
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let body = options.body;
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || '请求失败');
    error.status = response.status;
    throw error;
  }

  return data;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  getToken,
  setToken,
  get(url) {
    return request(url);
  },
  post(url, body) {
    return request(url, { method: 'POST', body });
  },
  put(url, body) {
    return request(url, { method: 'PUT', body });
  },
  delete(url) {
    return request(url, { method: 'DELETE' });
  },
  downloadJson(filename, data) {
    downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  },
  downloadText(filename, text, type = 'text/plain;charset=utf-8') {
    downloadBlob(filename, new Blob([text], { type }));
  },
};
