/**
 * The secret scanner on the memory write path (RFC 0001 → Safety → No secrets in memory).
 * A secret that reaches memory would replay into every future session, so anything shaped
 * like a credential is replaced with `[REDACTED:<kind>]` before it is stored. Callers get
 * counts only; matched text never leaves this module.
 */

export type RedactionCounts = Record<string, number>;

export interface Redacted {
  text: string;
  counts: RedactionCounts;
}

// Most specific first, so a token is labeled by its provider rather than a generic rule.
const PATTERNS: ReadonlyArray<readonly [kind: string, pattern: RegExp]> = [
  [
    "private-key",
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
  ],
  ["anthropic-key", /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ["openai-key", /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}/g],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/g],
  ["npm-token", /\bnpm_[A-Za-z0-9]{36}\b/g],
  ["pypi-token", /\bpypi-[A-Za-z0-9_-]{50,}/g],
  ["aws-access-key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}/g],
  ["slack-token", /\bxox[abposr]-[A-Za-z0-9-]{10,}/g],
  ["stripe-key", /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ["bearer-token", /(?<=\bBearer\s+)[A-Za-z0-9._~+/-]{20,}=*/gi],
  ["url-password", /(?<=\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s/:@"'<>]+:)[^\s/@"'<>]+(?=@)/g],
  // `password = "…"` and friends. The value must look random (12+ characters with a digit
  // and no dots or brackets), so code such as `token = getToken()` survives.
  [
    "password",
    /(?<=\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)["']?\s*[:=]\s*["']?)(?=[A-Za-z0-9_+/=-]*\d)[A-Za-z0-9_+/=-]{12,}/gi,
  ],
];

// Cheap screen: a line that mentions none of these can't match any pattern above.
const MAYBE_SECRET =
  /PRIVATE KEY|sk-|gh[pousr]_|github_pat_|npm_|pypi-|AKIA|ASIA|AIza|xox|_live_|_test_|eyJ|Bearer|:\/\/[^\s"]*@|passw|pwd|secret|api.?key|token/i;

/** Redacts secrets in a piece of text. */
export function redactText(text: string): Redacted {
  const counts: RedactionCounts = {};
  let out = text;
  for (const [kind, pattern] of PATTERNS) {
    out = out.replace(pattern, () => {
      counts[kind] = (counts[kind] ?? 0) + 1;
      return `[REDACTED:${kind}]`;
    });
  }
  return { text: out, counts };
}

/**
 * Redacts secrets in one JSONL line. Valid JSON is redacted value by value and stays valid
 * JSON; a line with nothing to redact is returned byte for byte. Invalid JSON is redacted
 * as plain text.
 */
export function redactJsonLine(line: string): Redacted {
  if (!MAYBE_SECRET.test(line)) return { text: line, counts: {} };
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return redactText(line);
  }
  const counts: RedactionCounts = {};
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") {
      const redacted = redactText(node);
      for (const [kind, n] of Object.entries(redacted.counts))
        counts[kind] = (counts[kind] ?? 0) + n;
      return redacted.text;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node !== null && typeof node === "object") {
      return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, walk(child)]));
    }
    return node;
  };
  const redacted = walk(value);
  return Object.keys(counts).length === 0
    ? { text: line, counts }
    : { text: JSON.stringify(redacted), counts };
}

export function totalRedactions(counts: RedactionCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}
