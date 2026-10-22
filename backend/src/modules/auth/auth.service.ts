import { env } from "../../config/env";
import { AppError } from "../../utils/appError";
import {
  authRepository,
  AuthUser,
} from "./auth.repository";
import {
  generateSessionToken,
  getDummyHash,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "./auth.crypto";
import { LoginInput, SignupInput } from "./auth.schema";

/** The one and only message a failed login may produce. */
const INVALID_CREDENTIALS = "Invalid email or password";

const SESSION_TTL_MS = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

/** A session's expiry is pushed forward at most once per hour. */
const SESSION_EXTEND_INTERVAL_MS = 60 * 60 * 1000;

/** The public shape of a user. Never includes passwordHash. */
export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResult {
  user: PublicUser;
  /** The raw session token — only ever sent to the client in the cookie. */
  sessionToken: string;
  expiresAt: Date;
}

function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

export const authService = {
  /**
   * Creates a user, signs them in, and returns the raw session token.
   */
  async signup(input: SignupInput): Promise<AuthResult> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw AppError.conflict("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);

    let user: AuthUser;
    try {
      user = await authRepository.createUser({
        email: input.email,
        passwordHash,
      });
    } catch (error: any) {
      // Two signups for the same email can race past the check above; the
      // unique constraint is the real guard.
      if (error?.code === "P2002") {
        throw AppError.conflict("An account with this email already exists");
      }
      throw error;
    }

    const session = await createSessionFor(user.id);

    return { user: toPublicUser(user), ...session };
  },

  /**
   * Verifies credentials and starts a session.
   *
   * An unknown email and a wrong password produce the exact same message and
   * take the same amount of time, so neither reveals whether an email is
   * registered.
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await authRepository.findUserByEmail(input.email);

    if (!user) {
      // Hash a dummy password so the timing matches the "user exists" path.
      const dummyHash = await getDummyHash();
      await verifyPassword(input.password, dummyHash);
      throw new AppError(INVALID_CREDENTIALS, 401);
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError(INVALID_CREDENTIALS, 401);
    }

    const session = await createSessionFor(user.id);

    return { user: toPublicUser(user), ...session };
  },

  /**
   * Ends the session. Idempotent — logging out twice is not an error.
   */
  async logout(token: string | undefined): Promise<void> {
    if (!token) return;

    const tokenHash = hashSessionToken(token);
    const session = await authRepository.findSessionByTokenHash(tokenHash);
    if (!session) return;

    await authRepository.deleteSessionById(session.id);
  },

  /**
   * Loads the user behind a session token.
   *
   * Returns null for a missing, unknown or expired token. An expired session
   * row is deleted on the way out.
   */
  async getUserBySessionToken(token: string | undefined): Promise<PublicUser | null> {
    if (!token) return null;

    const tokenHash = hashSessionToken(token);
    const session = await authRepository.findSessionByTokenHash(tokenHash);
    if (!session) return null;

    const now = new Date();

    if (session.expiresAt.getTime() <= now.getTime()) {
      // Expired sessions are rejected and removed.
      await authRepository.deleteSessionById(session.id);
      return null;
    }

    const user = await authRepository.findUserById(session.userId);
    if (!user) return null;

    // Slide the expiry forward, but no more than once per hour.
    const lastUsed = session.lastUsedAt?.getTime() ?? 0;
    if (now.getTime() - lastUsed >= SESSION_EXTEND_INTERVAL_MS) {
      await authRepository.touchSession(session.id, {
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        lastUsedAt: now,
      });
    }

    return toPublicUser(user);
  },
};

async function createSessionFor(userId: string): Promise<{
  sessionToken: string;
  expiresAt: Date;
}> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await authRepository.createSession({
    userId,
    tokenHash: hashSessionToken(sessionToken),
    expiresAt,
  });

  return { sessionToken, expiresAt };
}
