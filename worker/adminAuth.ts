type AdminUser = {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'chef' | 'developer';
  active: number;
};

export type { AdminUser };
const encoder = new TextEncoder();
const ITERATIONS = 100_000;
export const MAX_PASSWORD_LENGTH = 1024;

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
}
export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_PASSWORD_LENGTH;
}
async function derive(password: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  // Keep each derivation within the Workers Web Crypto iteration limit.
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256));
}
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${ITERATIONS}$${encode(salt)}$${encode(await derive(password, salt))}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [algorithm, iterations, salt, expected, extra] = stored.split('$');
    if (algorithm !== 'pbkdf2-sha256' || iterations !== String(ITERATIONS) || extra !== undefined) return false;
    const saltBytes = decode(salt);
    const expectedBytes = decode(expected);
    if (saltBytes.length !== 16 || expectedBytes.length !== 32) return false;
    const actual = await derive(password, saltBytes);
    let difference = 0;
    for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expectedBytes[index];
    return difference === 0;
  } catch { return false; }
}
export async function loadUser(db: D1Database, username: string): Promise<AdminUser | null> {
  return db.prepare('SELECT id, username, password_hash, role, active FROM users WHERE username = ?').bind(username).first<AdminUser>();
}
export async function loadAdmin(db: D1Database): Promise<AdminUser | null> {
  return loadUser(db, 'admin');
}
export async function loadSessionUser(db: D1Database, token: string): Promise<AdminUser | null> {
  try {
    if (token.length > 2048) return null;
    const claims = JSON.parse(new TextDecoder().decode(decode(token.split('.')[0])));
    if (typeof claims.sub !== 'string' || claims.sub.length > 128) return null;
    // Claims are untrusted here. Callers must verify the signature and allowed role.
    return db.prepare('SELECT id, username, password_hash, role, active FROM users WHERE id = ?').bind(claims.sub).first<AdminUser>();
  } catch { return null; }
}
async function sessionKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function createAdminSession(user: AdminUser, secret: string, scope: 'admin' | 'chef' = 'admin'): Promise<string> {
  const payload = encode(encoder.encode(JSON.stringify({ sub: user.id, scope, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, nonce: crypto.randomUUID() })));
  const signature = await crypto.subtle.sign('HMAC', await sessionKey(secret), encoder.encode(`${payload}.${user.password_hash}.${user.role}`));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}
export async function verifyAdminSession(token: string, user: AdminUser, secret: string, allowedRoles: readonly AdminUser['role'][] = ['admin'], scope: 'admin' | 'chef' = 'admin'): Promise<boolean> {
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra !== undefined || token.length > 2048 || !allowedRoles.includes(user.role) || user.active !== 1) return false;
    const claims = JSON.parse(new TextDecoder().decode(decode(payload)));
    if (claims.sub !== user.id || !Number.isSafeInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return false;
    if (user.role !== 'developer' && claims.scope !== scope) return false;
    // Binding the signature to the stored hash invalidates all sessions on password change.
    return await crypto.subtle.verify('HMAC', await sessionKey(secret), decode(signature), encoder.encode(`${payload}.${user.password_hash}.${user.role}`));
  } catch { return false; }
}
