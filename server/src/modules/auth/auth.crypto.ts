import crypto from "crypto";
import argon2, { HashOptions } from "argon2";

/**
 * Argon2id parameters. These are the OWASP-recommended baseline for argon2id
 * (m=64MiB, t=3 passes, p=4 lanes).
 */
const ARGON2_OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

/**
 * Hashes a plaintext password with argon2id.
 *
 * The returned string is a self-describing hash: it encodes the algorithm,
 * its parameters and the salt, so parameters can be upgraded later without
 * invalidating existing hashes.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against a stored hash.
 *
 * Returns false instead of throwing when the stored value is not a valid
 * argon2 hash (e.g. the placeholder hash on the demo user).
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}

/**
 * A pre-computed hash of a random throwaway password.
 *
 * When a login is attempted for an email that does not exist we verify against
 * this instead of returning early, so the response takes the same time either
 * way. Without it, an attacker could tell registered emails from unregistered
 * ones just by measuring how long the request took.
 */
let dummyHashPromise: Promise<string> | null = null;

export function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword(crypto.randomBytes(32).toString("hex"));
  }
  return dummyHashPromise;
}

/**
 * Generates the raw session token that is handed to the browser.
 *
 * 32 random bytes → 43 characters of base64url. This value is never stored.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hashes a session token for storage.
 *
 * The database only ever holds this hash, never the raw token. A dump of the
 * database therefore does not hand out usable sessions.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
