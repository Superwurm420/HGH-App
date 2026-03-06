import { Env } from '../types';

/**
 * Schreibt einen Audit-Log-Eintrag in die D1-Datenbank.
 * Fehler werden geloggt aber nicht weitergegeben – Audit darf die App nicht destabilisieren.
 */
export async function logAudit(
  env: Env,
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: string | null,
): Promise<void> {
  try {
    await env.DB.prepare(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, action, entityType, entityId ?? null, details ?? null).run();
  } catch (error) {
    console.error('[audit] Fehler beim Schreiben des Audit-Logs:', error);
  }
}
