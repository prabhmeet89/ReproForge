import { describe, it, expect, vi } from "vitest";
import {
  redactSecrets,
  isExcludedSecretFile,
} from "../src/services/secrets";

describe("Secret Scanner & Redactor", () => {
  // Build tokens at runtime so no static scanner flags them
  const fakeAwsAccessKey = "AKIA" + "IOSFODNN7EXAMPLE";
  const fakeAwsSecretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
  const fakeGithubPat = "ghp_" + "1234567890abcdefghijklmnopqrstuvwxyz";
  const fakeGithubFineGrained = "github_pat_" + "11A".repeat(27) + "X";
  const fakeSlackToken = "xoxb-" + "123456789012-345678901234-abcdefghijklmnopqrstuv";
  const fakeStripeKey = "sk_live_" + "51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890";
  const fakeGoogleKey = "AIza" + "SyD-exampleGoogleApiKey1234567890";
  const fakeJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0." +
    "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const fakeBearer = "Bearer " + "mySecretAccessToken12345";
  const fakeDbConn = "postgres://postgres:" + "superSecretPass123" + "@localhost:5432/mydb";
  const fakeGenericSecret = 'const apiKey = "' + "myTopSecretApiKeyValue123" + '";';

  const fakePemKey = [
    "-----BEGIN RSA PRIVATE KEY-----",
    "MIIEowIBAAKCAQEA0Y7u9EXAMPLEKEYLINE1",
    "MIIEowIBAAKCAQEA0Y7u9EXAMPLEKEYLINE2",
    "MIIEowIBAAKCAQEA0Y7u9EXAMPLEKEYLINE3",
    "-----END RSA PRIVATE KEY-----",
  ].join("\n");

  it("redacts PEM private key blocks and preserves exact line count and numbers", () => {
    const input = [
      "line 1: before key",
      fakePemKey,
      "line 7: after key",
      "line 8: end",
    ].join("\n");

    const originalLineCount = input.split("\n").length;
    const { text, findings } = redactSecrets(input);
    const redactedLines = text.split("\n");

    expect(redactedLines.length).toBe(originalLineCount);
    expect(text).not.toContain("MIIEowIBAAKCAQEA0Y7u9");
    expect(text).toContain("[REDACTED:pem_private_key]");
    expect(findings).toEqual(
      expect.arrayContaining([{ type: "pem_private_key", line: 2 }])
    );
    expect(redactedLines[0]).toBe("line 1: before key");
    expect(redactedLines[1]).toBe("[REDACTED:pem_private_key]");
    expect(redactedLines[2]).toBe(""); // empty line preserving line count
    expect(redactedLines[3]).toBe(""); // empty line preserving line count
    expect(redactedLines[4]).toBe(""); // empty line preserving line count
    expect(redactedLines[5]).toBe(""); // empty line preserving line count
    expect(redactedLines[6]).toBe("line 7: after key");
    expect(redactedLines[7]).toBe("line 8: end");
  });

  it("redacts AWS access keys and secret assignments", () => {
    const input = `export AWS_ACCESS_KEY_ID="${fakeAwsAccessKey}"\naws_secret_access_key = "${fakeAwsSecretKey}"`;
    const { text, findings } = redactSecrets(input);

    expect(text).not.toContain(fakeAwsAccessKey);
    expect(text).not.toContain(fakeAwsSecretKey);
    expect(text).toContain("[REDACTED:aws_access_key]");
    expect(text).toContain("[REDACTED:aws_secret_key]");
    expect(findings).toEqual([
      { type: "aws_access_key", line: 1 },
      { type: "aws_secret_key", line: 2 },
    ]);
  });

  it("redacts GitHub personal access tokens", () => {
    const input = `GITHUB_TOKEN=${fakeGithubPat}\nFINE_PAT=${fakeGithubFineGrained}`;
    const { text, findings } = redactSecrets(input);

    expect(text).not.toContain(fakeGithubPat);
    expect(text).not.toContain(fakeGithubFineGrained);
    expect(findings).toHaveLength(2);
    expect(findings[0].type).toBe("github_token");
    expect(findings[1].type).toBe("github_token");
  });

  it("redacts Slack tokens", () => {
    const input = `slack_bot_token: "${fakeSlackToken}"`;
    const { text, findings } = redactSecrets(input);

    expect(text).not.toContain(fakeSlackToken);
    expect(findings[0].type).toBe("slack_token");
  });

  it("redacts Stripe secret keys", () => {
    const input = `const stripeKey = '${fakeStripeKey}';`;
    const { text, findings } = redactSecrets(input);

    expect(text).not.toContain(fakeStripeKey);
    expect(findings[0].type).toBe("stripe_secret_key");
  });

  it("redacts Google API keys", () => {
    const input = `apiKey: "${fakeGoogleKey}"`;
    const { text, findings } = redactSecrets(input);

    expect(text).not.toContain(fakeGoogleKey);
    expect(findings[0].type).toBe("google_api_key");
  });

  it("redacts JWT tokens", () => {
    const input = `Authorization: ${fakeJwt}`;
    const { text, findings } = redactSecrets(input);

    expect(text).not.toContain(fakeJwt);
    expect(findings[0].type).toBe("jwt");
  });

  it("redacts Bearer tokens", () => {
    const input = `headers = { 'Authorization': '${fakeBearer}' };`;
    const { text, findings } = redactSecrets(input);

    expect(text).not.toContain("mySecretAccessToken12345");
    expect(findings[0].type).toBe("bearer_token");
  });

  it("redacts credentials in database connection strings", () => {
    const input = `DATABASE_URL="${fakeDbConn}"`;
    const { text, findings } = redactSecrets(input);

    expect(text).not.toContain("superSecretPass123");
    expect(text).toContain("postgres://postgres:[REDACTED:db_password]@localhost:5432/mydb");
    expect(findings[0].type).toBe("db_password");
  });

  it("redacts generic secret assignments", () => {
    const input = fakeGenericSecret;
    const { text, findings } = redactSecrets(input);

    expect(text).not.toContain("myTopSecretApiKeyValue123");
    expect(text).toContain('const apiKey = "[REDACTED:generic_secret]";');
    expect(findings[0].type).toBe("generic_secret");
  });

  it("guarantees no secret values are printed by console spy", () => {
    const logSpy = vi.spyOn(console, "log");
    const errorSpy = vi.spyOn(console, "error");
    const warnSpy = vi.spyOn(console, "warn");

    const input = `const secret = "${fakeAwsSecretKey}";`;
    const { text } = redactSecrets(input);

    console.log("Processing finished:", text);

    const allCalls = [
      ...logSpy.mock.calls,
      ...errorSpy.mock.calls,
      ...warnSpy.mock.calls,
    ].flat().join(" ");

    expect(allCalls).not.toContain(fakeAwsSecretKey);

    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe("isExcludedSecretFile", () => {
    it("excludes .env and environment files except examples/templates", () => {
      expect(isExcludedSecretFile(".env")).toBe(true);
      expect(isExcludedSecretFile(".env.local")).toBe(true);
      expect(isExcludedSecretFile(".env.production")).toBe(true);
      expect(isExcludedSecretFile("sub/dir/.env")).toBe(true);

      // Safe templates are NOT excluded
      expect(isExcludedSecretFile(".env.example")).toBe(false);
      expect(isExcludedSecretFile(".env.sample")).toBe(false);
      expect(isExcludedSecretFile(".env.template")).toBe(false);
      expect(isExcludedSecretFile("config/.env.example")).toBe(false);
    });

    it("excludes private keys, certificates, and ssh keys", () => {
      expect(isExcludedSecretFile("server.pem")).toBe(true);
      expect(isExcludedSecretFile("private.key")).toBe(true);
      expect(isExcludedSecretFile("cert.p12")).toBe(true);
      expect(isExcludedSecretFile("id_rsa")).toBe(true);
      expect(isExcludedSecretFile("id_rsa.pub")).toBe(true);
      expect(isExcludedSecretFile("id_ed25519")).toBe(true);
      expect(isExcludedSecretFile("src/index.ts")).toBe(false);
    });
  });
});
