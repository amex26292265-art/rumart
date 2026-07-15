import bcrypt from "bcryptjs";

/**
 * Password hashing via WebCrypto PBKDF2 (SHA-256, 100k iterations).
 *
 * Why not bcryptjs for new hashes: it's pure JS and burns 100ms+ of CPU per
 * hash, which intermittently exceeds the Cloudflare Workers CPU budget and
 * kills signup/login requests. PBKDF2 runs native in the runtime (Workers and
 * Node) in a couple of milliseconds. Legacy `$2…` bcrypt hashes still verify
 * and are transparently upgraded on the next successful login.
 *
 * Format: pbkdf2$<iterations>$<salt b64>$<hash b64>
 */
const ITERATIONS = 100_000;
const KEY_BITS = 256;

async function derive(password: string, salt: Uint8Array, iterations = ITERATIONS): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const fromB64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2$")) {
    const [, iterStr, saltB64, hashB64] = stored.split("$");
    const iterations = Number(iterStr);
    if (!saltB64 || !hashB64 || !Number.isFinite(iterations) || iterations < 1) return false;
    const expected = fromB64(hashB64);
    const actual = await derive(password, fromB64(saltB64), iterations);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  }
  // Legacy bcrypt hash (pre-PBKDF2 accounts).
  if (stored.startsWith("$2")) return bcrypt.compare(password, stored);
  return false;
}

/** True when a stored hash should be upgraded to the current scheme. */
export function needsRehash(stored: string): boolean {
  return !stored.startsWith(`pbkdf2$${ITERATIONS}$`);
}
