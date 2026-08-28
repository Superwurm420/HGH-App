import { getCloudflareContext } from '@opennextjs/cloudflare';

import { DEFAULT_ADMIN_USER } from '@/lib/admin-defaults';

import './types';

/**
 * Liefert die Cloudflare-Bindings (D1, R2, Vars) des aktuellen Requests.
 *
 * Wird sowohl von Route Handlers als auch direkt von Server Components genutzt.
 * Die asynchrone Variante ist die robustere: sie funktioniert auch dort, wo der
 * Kontext noch nicht synchron bereitsteht (z. B. `next dev` beim ersten Request).
 */
export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

/** Datenbank-Binding als Kurzform — der mit Abstand häufigste Zugriff. */
export async function getDb(): Promise<D1Database> {
  return (await getEnv()).DB;
}

/** Der konfigurierte Admin-Benutzername (Fallback für die Ersteinrichtung). */
export function adminUsername(env: CloudflareEnv): string {
  return env.ADMIN_USER?.trim() || DEFAULT_ADMIN_USER;
}
