/**
 * The secret scanner on the memory write path (RFC 0001 → Safety → No secrets in memory).
 * A secret that reaches memory would replay into every future session, so anything shaped
 * like a credential is replaced with `[REDACTED:<kind>]` before it is stored. Callers get
 * counts only; matched text never leaves this module.
 *
 * Transcripts hold untrusted text (web pages, files, command output), so every pattern runs
 * in linear time: one that backtracked quadratically would let such text stall capture.
 */

export type RedactionCounts = Record<string, number>;

export interface Redacted {
  text: string;
  counts: RedactionCounts;
}

// Most specific first, so a token is labeled by its provider rather than a generic rule.
const PATTERNS: ReadonlyArray<readonly [kind: string, pattern: RegExp]> = [
  // A key's body can't contain another BEGIN line, so text full of BEGIN lines stays linear.
  [
    "private-key",
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----(?:(?!-----BEGIN )[\s\S])*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
  ],
  // A key cut off before its END line: the BEGIN line and the base64 lines after it. A BEGIN
  // line with no key material after it, as in docs and code, is left alone.
  ["private-key", /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----(?:\r?\n[A-Za-z0-9+/=]+(?=\r?\n|$))+/g],
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
  ["bearer-token", /(?<=\bBearer\s{1,8})[A-Za-z0-9._~+/-]{20,}=*/gi],
  ["url-password", /(?<=\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s/:@"'<>]+:)[^\s/@"'<>]+(?=@)/g],
];

// A name ending in one of these words names a secret: `DB_PASSWORD`, `apiKey`, `JWT_SECRET`,
// `aws_secret_access_key`, `TOKEN_2`. Names that merely contain one, such as `tokenizer`,
// `max_tokens` or `tokenRegistryKey`, don't.
const SECRET_WORD = String.raw`(?:password|passwd|passphrase|secret|token|credential|(?:api|access|private|secret|signing|encryption|master)[_-]?key)(?:[_-]?\d+)?`;
const SECRET_NAME = new RegExp(`${SECRET_WORD}$`, "i");

// `DB_PASSWORD=…`, `apiKey: "…"`: a secret's name, then `=` or `:`, then the value (group 1),
// which is redacted only if it looks like a secret. Matching forward from the name, with
// bounded gaps, keeps this linear.
const ASSIGNMENT = new RegExp(
  String.raw`${SECRET_WORD}["']?\s{0,8}[:=]\s{0,8}["']?([^\s"'\x60,;(){}[\]<>]+)`,
  "gi",
);

/**
 * A value that looks random: 12 or more characters with a digit, but not a number, not an
 * identifier made of short words (`token_store_v2`), and none of the whitespace, quotes,
 * brackets, dots, `:`, `$` or `%` of code, paths and URLs. So `token = getToken()` and
 * `secret = process.env.SECRET` survive.
 */
function looksLikeSecret(value: string): boolean {
  return (
    /^[^\s"'\x60,;(){}[\]<>.:$%\\]{12,}$/.test(value) &&
    /\d/.test(value) &&
    !/^\d+$/.test(value) &&
    !/^[a-z][a-z0-9]{0,11}(?:_[a-z0-9]{1,12})+$/.test(value)
  );
}

// Cheap screen: a line that mentions none of these can't match any rule here.
const MAYBE_SECRET = new RegExp(
  String.raw`PRIVATE KEY|sk-|gh[pousr]_|github_pat_|npm_|pypi-|AKIA|ASIA|AIza|xox|_live_|_test_|eyJ|Bearer|:\/\/[^\s"/@]*@|${SECRET_WORD}`,
  "i",
);

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
  out = out.replace(ASSIGNMENT, (match, value: string) => {
    if (!looksLikeSecret(value)) return match;
    counts.password = (counts.password ?? 0) + 1;
    return `${match.slice(0, match.length - value.length)}[REDACTED:password]`;
  });
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
  // `key` is the name of the property the node is in, so `{"password": "…"}` is caught too.
  const walk = (node: unknown, key?: string): unknown => {
    if (typeof node === "string") {
      const redacted = redactText(node);
      for (const [kind, n] of Object.entries(redacted.counts))
        counts[kind] = (counts[kind] ?? 0) + n;
      const named = key !== undefined && SECRET_NAME.test(key);
      if (named && redacted.text === node && looksLikeSecret(node)) {
        counts.password = (counts.password ?? 0) + 1;
        return "[REDACTED:password]";
      }
      return redacted.text;
    }
    if (Array.isArray(node)) return node.map((child) => walk(child, key));
    if (node !== null && typeof node === "object") {
      return Object.fromEntries(
        Object.entries(node).map(([name, child]) => [name, walk(child, name)]),
      );
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
