import { db } from "../../config/db";

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

export interface StoredSession {
  id: string;
  userId: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
}

export const authRepository = {
  async findUserByEmail(email: string): Promise<AuthUser | null> {
    return db.user.findUnique({ where: { email } });
  },

  async findUserById(id: string): Promise<AuthUser | null> {
    return db.user.findUnique({ where: { id } });
  },

  async createUser(data: { email: string; passwordHash: string }): Promise<AuthUser> {
    return db.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        // There is no name field on the signup form yet; the email local part
        // is used as a sensible placeholder.
        name: data.email.split("@")[0] || "User",
      },
    });
  },

  async createSession(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<StoredSession> {
    return db.session.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  },

  async findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    return db.session.findUnique({ where: { tokenHash } });
  },

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await db.session.deleteMany({ where: { tokenHash } });
  },

  async deleteSessionById(id: string): Promise<void> {
    await db.session.deleteMany({ where: { id } });
  },

  /**
   * Extends a session's expiry, used to slide the TTL forward.
   */
  async touchSession(
    id: string,
    data: { expiresAt: Date; lastUsedAt: Date }
  ): Promise<StoredSession | null> {
    return db.session.update({
      where: { id },
      data: { expiresAt: data.expiresAt, lastUsedAt: data.lastUsedAt },
    });
  },

  async deleteExpiredSessions(now: Date): Promise<number> {
    const { count } = await db.session.deleteMany({ where: { expiresAt: { lte: now } } });
    return count;
  },
};
