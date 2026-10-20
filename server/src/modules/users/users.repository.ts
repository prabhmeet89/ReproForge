import { db } from "../../config/db";

export const usersRepository = {
  /**
   * Finds a user by email, creating the account when it does not exist.
   *
   * `upsert` (instead of find-then-create) keeps this safe when two requests
   * race on the unique email constraint.
   */
  async findOrCreateByEmail(data: {
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<{ id: string; email: string; created: boolean }> {
    const existing = await db.user.findUnique({
      where: { email: data.email },
      select: { id: true, email: true },
    });

    if (existing) {
      return { ...existing, created: false };
    }

    const user = await db.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name || data.email.split("@")[0] || "User",
      },
      select: { id: true, email: true },
    });

    return { ...user, created: true };
  },

  async findById(id: string): Promise<{ id: string; email: string; name: string } | null> {
    return db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
  },
};
