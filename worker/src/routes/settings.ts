import { Env, AppSetting } from '../types';
import { jsonResponse, errorResponse } from '../router';

/** Öffentlich lesbare Settings-Schlüssel. */
const PUBLIC_KEYS = ['school_name', 'school_short', 'calendar_urls', 'messages', 'school_holidays'] as const;

/**
 * GET /api/settings
 * Liefert alle öffentlich lesbaren App-Settings.
 */
export async function handleSettings(request: Request, env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT key, value FROM app_settings WHERE key IN (${PUBLIC_KEYS.map(() => '?').join(',')})`
  ).bind(...PUBLIC_KEYS).all<AppSetting>();

  const settings: Record<string, string> = {};
  for (const row of rows.results) {
    settings[row.key] = row.value;
  }

  return jsonResponse({ settings });
}

/**
 * GET /api/settings/:key
 */
export async function handleSettingByKey(request: Request, env: Env, key: string): Promise<Response> {
  if (!(PUBLIC_KEYS as readonly string[]).includes(key)) {
    return errorResponse('Einstellung nicht öffentlich zugänglich.', 403);
  }

  const row = await env.DB.prepare(
    'SELECT key, value FROM app_settings WHERE key = ?'
  ).bind(key).first<AppSetting>();

  if (!row) {
    return errorResponse('Einstellung nicht gefunden.', 404);
  }

  return jsonResponse(row);
}
