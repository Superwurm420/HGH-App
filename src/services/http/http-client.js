import { ERROR_CODES } from '../../config/error-codes.js';

const DEFAULT_TIMEOUT_MS = 7000;

function withTimeout(timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  return { signal: controller.signal, dispose: () => clearTimeout(timer) };
}

async function request(url, {
  method = 'GET',
  cache = 'no-cache',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  headers = {},
  retries = 0,
} = {}) {
  const target = String(url);
  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    const timeoutHandle = withTimeout(timeoutMs);
    try {
      const res = await fetch(target, {
        method,
        cache,
        headers,
        signal: timeoutHandle?.signal,
      });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} for ${target}`);
        err.code = ERROR_CODES.NETWORK_HTTP;
        err.status = res.status;
        throw err;
      }
      return res;
    } catch (error) {
      lastError = error;
      if (error?.name === 'AbortError') {
        const timeoutError = new Error(`Timeout after ${timeoutMs}ms for ${target}`);
        timeoutError.code = ERROR_CODES.NETWORK_TIMEOUT;
        lastError = timeoutError;
      } else if (!error?.code) {
        error.code = ERROR_CODES.NETWORK_FETCH;
      }
      attempt += 1;
      if (attempt > retries) break;
    } finally {
      timeoutHandle?.dispose();
    }
  }

  throw lastError;
}

export async function requestJson(url, options = {}) {
  const res = await request(url, options);
  return res.json();
}

export async function requestText(url, options = {}) {
  const res = await request(url, options);
  return res.text();
}
