const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function isAdminAuthConfigured(): boolean {
  return Boolean(ADMIN_USER && ADMIN_PASSWORD);
}

export function isValidBasicAuth(authHeader: string | null): boolean {
  if (!isAdminAuthConfigured() || !authHeader?.startsWith('Basic ')) return false;

  const encoded = authHeader.slice('Basic '.length).trim();

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator === -1) return false;

    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    return user === ADMIN_USER && password === ADMIN_PASSWORD;
  } catch {
    return false;
  }
}
