import { db } from "../../config/db";

/**
 * Phase 2 has no authentication yet (that lands in Phase 3), but `Project` and
 * `BugReport` both require an owner. Until auth exists, every row is owned by
 * a single demo user that is created on demand.
 */
export const DEMO_USER_EMAIL = "demo@reproforge.local";

export const usersRepository = {
  /**
   * Returns the id of the demo owner, creating it on first use.
   *
   * `upsert` (instead of find-then-create) keeps this safe when two requests
   * race on the unique email constraint.
   */
  async getOrCreateDemoUserId(): Promise<string> {
    const user = await db.user.upsert({
      where: { email: DEMO_USER_EMAIL },
      update: {},
      create: {
        email: DEMO_USER_EMAIL,
        // Placeholder only — there is no login flow yet, so this is never
        // verified against. It must never be returned in an API response.
        passwordHash: "not-a-real-hash",
        name: "Demo User",
      },
      select: { id: true },
    });

    return user.id;
  },
};
