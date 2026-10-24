/**
 * Secret scanner and redactor service.
 *
 * Scans text content for sensitive credentials, API keys, tokens, and
 * private keys, replacing them with [REDACTED:<type>] markers.
 *
 * CRITICAL INVARIANT:
 * Redaction MUST preserve the exact line count and line numbers of the original
 * file. For multi-line secrets (such as PEM private keys), the redaction marker
 * is placed on the first line, and subsequent lines are replaced by empty lines.
 */

export interface SecretFinding {
  type: string;
  line: number;
}

export interface RedactionResult {
  text: string;
  findings: SecretFinding[];
}

export interface SecretPattern {
  type: string;
  // Regex must have a capturing group for the secret value if it's an assignment/header,
  // or match the whole secret.
  regex: RegExp;
  // If true, the pattern spans multiple lines (e.g. PEM private keys).
  isMultiLine?: boolean;
  // Index of the capture group to redact (default 0 = whole match).
  valueGroup?: number;
}

const SECRET_PATTERNS: SecretPattern[] = [
  // 1. PEM private key blocks (multi-line)
  {
    type: "pem_private_key",
    regex: /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g,
    isMultiLine: true,
    valueGroup: 0,
  },
  // 2. AWS access key IDs (AKIA...)
  {
    type: "aws_access_key",
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    valueGroup: 1,
  },
  // 3. AWS secret assignments
  {
    type: "aws_secret_key",
    regex: /(?:aws_secret_access_key|aws_secret_key|aws_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    valueGroup: 1,
  },
  // 4. GitHub tokens
  {
    type: "github_token",
    regex: /\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})\b/g,
    valueGroup: 1,
  },
  // 5. Slack tokens
  {
    type: "slack_token",
    regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g,
    valueGroup: 1,
  },
  // 6. Stripe secret keys
  {
    type: "stripe_secret_key",
    regex: /\b(sk_(?:live|test)_[0-9a-zA-Z]{24,})\b/g,
    valueGroup: 1,
  },
  // 7. Google API keys
  {
    type: "google_api_key",
    regex: /\b(AIza[0-9A-Za-z\-_]{30,40})\b/g,
    valueGroup: 1,
  },
  // 8. JWT-looking strings
  {
    type: "jwt",
    regex: /\b(ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
    valueGroup: 1,
  },
  // 9. Bearer token headers
  {
    type: "bearer_token",
    regex: /Bearer\s+([A-Za-z0-9._~+/-]{16,})/g,
    valueGroup: 1,
  },
  // 10. Credentials inside connection strings (scheme://user:pass@host)
  {
    type: "db_password",
    regex: /(?:[a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^:\s\/]+:([^@\s\/]+)@/g,
    valueGroup: 1,
  },
  // 11. Generic secret assignments: password / secret / token / api_key = "<8+ chars>"
  {
    type: "generic_secret",
    regex: /(?:password|passwd|secret|token|api_key|apikey|auth_token)\s*[:=]\s*["']([^"'\r\n]{8,})["']/gi,
    valueGroup: 1,
  },
];

/**
 * Checks if a relative path matches excluded secret files that must NEVER be stored.
 * Returns true for .env, .env.local, id_rsa, *.pem, *.key, *.p12, etc.
 * Returns false for .env.example, .env.sample, .env.template (which are safe to store).
 */
export function isExcludedSecretFile(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  const basename = (normalized.split("/").pop() || "").toLowerCase();

  // Allow templates/examples
  if (
    basename === ".env.example" ||
    basename === ".env.sample" ||
    basename === ".env.template"
  ) {
    return false;
  }

  // Reject .env and .env.*
  if (basename === ".env" || basename.startsWith(".env.")) {
    return true;
  }

  // Reject private key files
  if (
    basename.endsWith(".pem") ||
    basename.endsWith(".key") ||
    basename.endsWith(".p12") ||
    basename.startsWith("id_rsa") ||
    basename.startsWith("id_ed25519") ||
    basename.startsWith("id_ecdsa") ||
    basename.startsWith("id_dsa")
  ) {
    return true;
  }

  return false;
}

/**
 * Redacts secrets from text content.
 * Returns the redacted text and a list of findings with secret type and 1-based line number.
 *
 * Invariant: Line count of original text === Line count of returned text.
 */
export function redactSecrets(text: string): RedactionResult {
  if (!text) {
    return { text: "", findings: [] };
  }

  const findings: SecretFinding[] = [];

  // Track byte/character replacements: [start, end, replacement, type, line]
  interface Replacement {
    start: number;
    end: number;
    replacement: string;
    type: string;
    line: number;
  }
  const replacements: Replacement[] = [];

  // Helper to compute 1-based line number at a given character offset
  function getLineNumber(offset: number): number {
    let line = 1;
    for (let i = 0; i < offset && i < text.length; i++) {
      if (text.charCodeAt(i) === 10) { // '\n'
        line++;
      }
    }
    return line;
  }

  for (const pattern of SECRET_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(text)) !== null) {
      const matchIndex = match.index;
      let secretStart = matchIndex;
      let secretValue = match[0];

      if (pattern.valueGroup !== undefined && pattern.valueGroup > 0 && match[pattern.valueGroup] !== undefined) {
        secretValue = match[pattern.valueGroup];
        // Find exact start of the captured group within the match
        const groupOffset = match[0].indexOf(secretValue);
        secretStart = matchIndex + groupOffset;
      }

      const secretEnd = secretStart + secretValue.length;
      const line = getLineNumber(secretStart);

      // Handle multi-line PEM vs single-line
      let replacementStr = `[REDACTED:${pattern.type}]`;
      if (pattern.isMultiLine) {
        // Count newlines in the replaced text
        const newlines = (secretValue.match(/\n/g) || []).length;
        // Marker on the first line, followed by the exact number of newlines to keep line numbers identical
        replacementStr = `[REDACTED:${pattern.type}]` + "\n".repeat(newlines);
      }

      replacements.push({
        start: secretStart,
        end: secretEnd,
        replacement: replacementStr,
        type: pattern.type,
        line,
      });

      // Avoid zero-length infinite loops
      if (match[0].length === 0) {
        pattern.regex.lastIndex++;
      }
    }
  }

  // If a generic_secret overlaps with a more specific pattern, drop the generic_secret
  const prioritized = replacements.filter((r) => {
    if (r.type !== "generic_secret") return true;
    const hasSpecificOverlap = replacements.some(
      (other) =>
        other.type !== "generic_secret" &&
        Math.max(r.start, other.start) < Math.min(r.end, other.end)
    );
    return !hasSpecificOverlap;
  });

  // Sort replacements by start offset
  prioritized.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  // Filter overlapping replacements
  const nonOverlapping: Replacement[] = [];
  let lastEnd = -1;
  for (const r of prioritized) {
    if (r.start >= lastEnd) {
      nonOverlapping.push(r);
      lastEnd = r.end;
      findings.push({ type: r.type, line: r.line });
    }
  }

  // Construct final redacted text
  let resultText = "";
  let currentIndex = 0;
  for (const r of nonOverlapping) {
    resultText += text.slice(currentIndex, r.start);
    resultText += r.replacement;
    currentIndex = r.end;
  }
  resultText += text.slice(currentIndex);

  return {
    text: resultText,
    findings,
  };
}
