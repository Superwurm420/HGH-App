import { requestJson, requestText } from '../src/services/http/http-client.js';

const originalFetch = globalThis.fetch;

function okResponse(payload, asText = false) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => (asText ? payload : JSON.stringify(payload)),
  };
}

globalThis.fetch = async (url, options = {}) => {
  if (String(url).includes('json-ok')) return okResponse({ ok: true });
  if (String(url).includes('text-ok')) return okResponse('hello', true);
  if (String(url).includes('http-fail')) return { ok: false, status: 500, text: async () => '' };
  if (String(url).includes('network-fail')) throw new Error('offline');
  if (String(url).includes('head-check')) {
    if (options.method !== 'HEAD') throw new Error('expected HEAD request');
    return okResponse('', true);
  }
  return okResponse({});
};

const json = await requestJson('https://example.test/json-ok');
if (!json.ok) throw new Error('requestJson should return parsed json data');

const text = await requestText('https://example.test/text-ok');
if (text !== 'hello') throw new Error(`requestText mismatch: ${text}`);

await requestText('https://example.test/head-check', { method: 'HEAD' });

let httpError = null;
try {
  await requestJson('https://example.test/http-fail');
} catch (error) {
  httpError = error;
}
if (!httpError || httpError.code !== 'NETWORK_HTTP') {
  throw new Error(`Expected NETWORK_HTTP, got ${httpError?.code}`);
}

let networkError = null;
try {
  await requestJson('https://example.test/network-fail', { retries: 1 });
} catch (error) {
  networkError = error;
}
if (!networkError || networkError.code !== 'NETWORK_FETCH') {
  throw new Error(`Expected NETWORK_FETCH, got ${networkError?.code}`);
}

globalThis.fetch = originalFetch;
console.log('http-client tests passed');
