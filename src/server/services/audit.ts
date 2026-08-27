/**
 * Schreibt einen Audit-Log-Eintrag in D1.
 * Fehler werden geloggt, aber nicht weitergegeben — Audit darf die App nie destabilisieren.
 */
export async function logAudit(
  db: D1Database,
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: string | null,
): Promise<void> {
  try {
    await db.prepare(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, action, entityType, entityId ?? null, details ?? null).run();
  } catch (error) {
    console.error('[audit] Fehler beim Schreiben des Audit-Logs:', error);
  }
}
