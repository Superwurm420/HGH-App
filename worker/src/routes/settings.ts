import { Env, AppSetting } from '../types';
import { jsonResponse, errorResponse } from '../router';

/**
 * GET /api/settings
 * Liefert alle öffentlich lesbaren App-Settings.
 */
export async function handleSettings(request: Request, env: Env): Promise<Response> {
  const publicKeys = ['school_name', 'school_short', 'calendar_urls', 'messages', 'school_holidays'];
  const rows = await env.DB.prepare(
    `SELECT key, value FROM app_settings WHERE key IN (${publicKeys.map(() => '?').join(',')})`
  ).bind(...publicKeys).all<AppSetting>();

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
  const publicKeys = ['school_name', 'school_short', 'calendar_urls', 'messages', 'school_holidays'];
  if (!publicKeys.includes(key)) {
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
