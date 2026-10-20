import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import { db } from "../src/config/db";
import { env } from "../src/config/env";

const VALID_PASSWORD = "correct-horse-battery-staple";
const TEST_EMAIL = "user@example.com";

/** Extracts the session cookie from a Set-Cookie header. */
function getSessionCookie(res: request.Response): string {
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  if (!cookies || cookies.length === 0) {
    throw new Error("Expected a Set-Cookie header");
  }
  return cookies[0];
}

function getCookieValue(setCookie: string): string {
  return setCookie.split(";")[0];
}

describe("Auth API", () => {
  beforeEach(async () => {
    await db.session.deleteMany();
    await db.user.deleteMany();
  });

  describe("POST /api/auth/signup", () => {
    it("should create a user and return id, email and createdAt", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBe(TEST_EMAIL);
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it("should set an HttpOnly, SameSite=Lax session cookie", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      const setCookie = getSessionCookie(res);
      expect(setCookie).toContain(`${env.SESSION_COOKIE_NAME}=`);
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/SameSite=Lax/i);
      expect(setCookie).toMatch(/Path=\//i);
    });

    it("should store a hash in the database, never the plaintext password", async () => {
      await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      const user = await db.user.findUnique({ where: { email: TEST_EMAIL } });

      expect(user).not.toBeNull();
      expect(user!.passwordHash).not.toBe(VALID_PASSWORD);
      // argon2id hashes are self-describing and start with $argon2id$
      expect(user!.passwordHash).toMatch(/^\$argon2id\$/);
    });

    it("should store only the SHA-256 hash of the session token, not the token itself", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      const rawToken = getCookieValue(getSessionCookie(res)).split("=")[1];
      const session = await db.session.findFirst();

      expect(session).not.toBeNull();
      expect(session!.tokenHash).not.toBe(rawToken);
      expect(session!.tokenHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
    });

    it("should return 409 for a duplicate email", async () => {
      await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: "another-valid-password" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should treat a differently-cased email as a duplicate", async () => {
      await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "USER@EXAMPLE.COM", password: "another-valid-password" });

      expect(res.status).toBe(409);
    });

    it("should return 422 for a weak password (under 10 characters)", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: "short" });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const passwordError = res.body.errors.find((e: any) => e.field === "password");
      expect(passwordError).toBeDefined();
    });

    it("should return 422 when the password equals the email", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "same@example.com", password: "same@example.com" });

      expect(res.status).toBe(422);
      const passwordError = res.body.errors.find((e: any) => e.field === "password");
      expect(passwordError).toBeDefined();
    });

    it("should return 422 for an invalid email", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "not-an-email", password: VALID_PASSWORD });

      expect(res.status).toBe(422);
    });

    it("should return 422 for unexpected extra fields (strict schema)", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD, role: "admin" });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });
    });

    it("should log in with correct credentials and set a session cookie", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(TEST_EMAIL);
      expect(res.body.data.passwordHash).toBeUndefined();

      const setCookie = getSessionCookie(res);
      expect(setCookie).toContain(`${env.SESSION_COOKIE_NAME}=`);
      expect(setCookie).toMatch(/HttpOnly/i);
    });

    it("should give identical responses for an unknown email and a wrong password", async () => {
      const unknownEmail = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: VALID_PASSWORD });

      const wrongPassword = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: "definitely-the-wrong-password" });

      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.status).toBe(401);

      // Same message, same body, byte for byte.
      expect(unknownEmail.body).toEqual(wrongPassword.body);
      expect(unknownEmail.body.message).toBe("Invalid email or password");
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return 401 without a cookie", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return the current user with a valid cookie", async () => {
      const signup = await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      const cookie = getCookieValue(getSessionCookie(signup));

      const res = await request(app).get("/api/auth/me").set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(TEST_EMAIL);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it("should return 401 for a garbage cookie", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `${env.SESSION_COOKIE_NAME}=not-a-real-token`);

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should delete the session so /me returns 401 afterwards", async () => {
      const signup = await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      const cookie = getCookieValue(getSessionCookie(signup));

      const before = await request(app).get("/api/auth/me").set("Cookie", cookie);
      expect(before.status).toBe(200);

      const logout = await request(app).post("/api/auth/logout").set("Cookie", cookie);
      expect(logout.status).toBe(200);
      expect(logout.body.success).toBe(true);

      const after = await request(app).get("/api/auth/me").set("Cookie", cookie);
      expect(after.status).toBe(401);

      // The session row is really gone.
      expect(await db.session.count()).toBe(0);
    });

    it("should be idempotent — logging out twice is not an error", async () => {
      const first = await request(app).post("/api/auth/logout");
      expect(first.status).toBe(200);
      expect(first.body.success).toBe(true);

      const second = await request(app).post("/api/auth/logout");
      expect(second.status).toBe(200);
      expect(second.body.success).toBe(true);
    });
  });

  describe("Expired sessions", () => {
    it("should reject an expired session with 401 and delete the row", async () => {
      const signup = await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      const cookie = getCookieValue(getSessionCookie(signup));

      // Force the session to have expired.
      await db.session.updateMany({
        where: {},
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      const res = await request(app).get("/api/auth/me").set("Cookie", cookie);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);

      // The expired row is cleaned up.
      expect(await db.session.count()).toBe(0);
    });
  });

  describe("CSRF protection", () => {
    it("should return 403 for a POST with a foreign Origin header", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .set("Origin", "https://evil.example.com")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow a POST with the configured client Origin", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .set("Origin", env.CLIENT_URL)
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      expect(res.status).toBe(201);
    });

    it("should not block a GET with a foreign Origin", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Origin", "https://evil.example.com");

      // 401 (not authenticated), but not 403 — GET is not state changing.
      expect(res.status).toBe(401);
    });
  });

  describe("Secret leakage", () => {
    it("should never include passwordHash in any response", async () => {
      const signup = await request(app)
        .post("/api/auth/signup")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      const login = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

      const cookie = getCookieValue(getSessionCookie(signup));
      const me = await request(app).get("/api/auth/me").set("Cookie", cookie);

      for (const res of [signup, login, me]) {
        expect(JSON.stringify(res.body)).not.toContain("passwordHash");
        expect(JSON.stringify(res.body)).not.toContain(VALID_PASSWORD);
      }
    });

    it("should never echo the password back in an error response", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: "wrong-password-entirely" });

      expect(JSON.stringify(res.body)).not.toContain("wrong-password-entirely");
    });
  });
});
