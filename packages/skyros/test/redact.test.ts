import { describe, expect, it } from "vitest";
import { redactJsonLine, redactText, totalRedactions } from "../src/redact.ts";

// Fake secrets are assembled at runtime, so this file never contains a credential-shaped
// string for secret scanners to flag.
const fake = {
  anthropic: ["sk-", "ant-", "api03-", "x".repeat(40)].join(""),
  openai: ["sk-", "proj-", "y".repeat(40)].join(""),
  github: ["gh", "p_", "a1".repeat(18)].join(""),
  githubPat: ["github_", "pat_", "b2".repeat(30)].join(""),
  npm: ["npm", "_", "c3".repeat(18)].join(""),
  pypi: ["pypi", "-", "AgEI", "d".repeat(60)].join(""),
  aws: ["AK", "IA", "ABCDEFGHIJ234567"].join(""),
  awsSecret: ["wJalrXUtnFEMI", "/K7MDENG/", "bPxRfiCYEXAMPLEKEY"].join(""),
  google: ["AI", "za", "e".repeat(35)].join(""),
  slack: ["xo", "xb-", "1234567890-abcdefghij"].join(""),
  stripe: ["sk", "_live_", "f".repeat(24)].join(""),
  jwt: ["ey", "JhbGciOiJIUzI1NiJ9.", "ey", "JzdWIiOiIxMjM0NTY3ODkwIn0.", "g".repeat(43)].join(""),
  privateKey: [
    "-----BEGIN ",
    "PRIVATE KEY-----\nMIIE",
    "h".repeat(64),
    "\n-----END ",
    "PRIVATE KEY-----",
  ].join(""),
  // Random-looking, as a generated password or key is.
  password: ["Xk29", "fjQ0", "pLm3zQ"].join(""),
};
const REDACTED = "[REDACTED:password]";

describe("redactText", () => {
  it.each([
    ["anthropic-key", fake.anthropic],
    ["openai-key", fake.openai],
    ["github-token", fake.github],
    ["github-token", fake.githubPat],
    ["npm-token", fake.npm],
    ["pypi-token", fake.pypi],
    ["aws-access-key", fake.aws],
    ["google-api-key", fake.google],
    ["slack-token", fake.slack],
    ["stripe-key", fake.stripe],
    ["jwt", fake.jwt],
    ["private-key", fake.privateKey],
  ])("redacts a %s", (kind, secret) => {
    const { text, counts } = redactText(`before ${secret} after`);
    expect(text).toBe(`before [REDACTED:${kind}] after`);
    expect(counts).toEqual({ [kind]: 1 });
  });

  it("redacts a private key cut off before its END line", () => {
    const cut = fake.privateKey.slice(0, fake.privateKey.indexOf("\n-----END"));
    expect(redactText(`key:\n${cut}\n(output truncated)`).text).toBe(
      "key:\n[REDACTED:private-key]\n(output truncated)",
    );
  });

  it("redacts only the password in a URL", () => {
    expect(redactText("postgres://admin:Sup3rSecret@db.example.com:5432/app").text).toBe(
      "postgres://admin:[REDACTED:url-password]@db.example.com:5432/app",
    );
  });

  it("redacts bearer tokens", () => {
    expect(redactText("Authorization: bearer abcdefghijklmnopqrstuvwxyz0123").text).toBe(
      "Authorization: bearer [REDACTED:bearer-token]",
    );
  });

  it.each([
    [`password = "${fake.password}"`, `password = "${REDACTED}"`],
    [`API_KEY: ${fake.password}`, `API_KEY: ${REDACTED}`],
    [`DB_PASSWORD=${fake.password}`, `DB_PASSWORD=${REDACTED}`],
    [`export JWT_SECRET=${fake.password}`, `export JWT_SECRET=${REDACTED}`],
    [`MY_API_KEY=${fake.password}`, `MY_API_KEY=${REDACTED}`],
    [`SECRET_KEY=${fake.password}`, `SECRET_KEY=${REDACTED}`],
    [`aws_secret_access_key = ${fake.awsSecret}`, `aws_secret_access_key = ${REDACTED}`],
    [`dbPassword = '${fake.password}'`, `dbPassword = '${REDACTED}'`],
    [`{"client_secret": "${fake.password}"}`, `{"client_secret": "${REDACTED}"}`],
  ])("redacts a random-looking value assigned to a secret's name: %s", (line, expected) => {
    expect(redactText(line)).toEqual({ text: expected, counts: { password: 1 } });
  });

  it("leaves code and ordinary values alone", () => {
    for (const code of [
      "token = getToken()",
      "const secret = process.env.SECRET",
      "password: string",
      "apiKey = config.apiKey",
      "max_tokens=4096",
      "tokenizer_path = models/tok-v2-3.json",
      "token_url: https://auth.example.com/oauth2/token",
      "DB_PASSWORD=$DB_PASSWORD_2",
      // Names that only contain a secret's word, and values that are numbers or identifiers.
      "tokenRegistryKey = tokenregistry2",
      "input_tokens: 123456789012",
      "session_token: 123456789012",
      'nowTickSecret = "nowtick_secret_v2"',
      "PWD=/home/user2/projects",
    ]) {
      expect(redactText(code).text).toBe(code);
    }
  });

  it("leaves ordinary text alone", () => {
    const text = "We use sk-learn, read about the AKIA prefix at https://example.com/path@v2.";
    expect(redactText(text)).toEqual({ text, counts: {} });
  });

  it("counts every redaction", () => {
    const { counts } = redactText(`${fake.github} and ${fake.github} and ${fake.npm}`);
    expect(counts).toEqual({ "github-token": 2, "npm-token": 1 });
    expect(totalRedactions(counts)).toBe(3);
  });

  // Untrusted text reaches the scanner, so no input may make it backtrack for long. These
  // took from 3 to 156 seconds with the first version of the patterns.
  it.each([
    ["spaces after a secret's name", `password${" ".repeat(200_000)}`],
    ["newlines after a secret's name", `secret${"\n".repeat(60_000)}`],
    ["BEGIN lines with no END", "-----BEGIN PRIVATE KEY-----\n".repeat(20_000)],
    ["spaces after Bearer", `Bearer${" ".repeat(200_000)}`],
    ["repeated assignments", "token=".repeat(50_000)],
    ["repeated URL schemes", "x://u:".repeat(50_000)],
  ])("stays fast on %s", (_, text) => {
    const start = performance.now();
    redactText(text);
    redactJsonLine(JSON.stringify({ text }));
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe("redactJsonLine", () => {
  it("returns a line with nothing to redact byte for byte, JSON escapes included", () => {
    // JSON \uXXXX escapes, built from char codes so no tool can turn them into characters.
    const u = (hex: string) => `${String.fromCharCode(92)}u${hex}`;
    const line = `{"type":"user","message":{"content":"caf${u("00e9")} ${u("2019")} token budget"}}`;
    expect(line).toContain(`${String.fromCharCode(92)}u00e9`);
    expect(redactJsonLine(line)).toEqual({ text: line, counts: {} });
  });

  it("redacts nested strings and keeps the line valid JSON", () => {
    const line = JSON.stringify({
      type: "user",
      message: { content: [{ type: "text", text: `use ${fake.github} please` }] },
    });
    const { text, counts } = redactJsonLine(line);
    expect(text).not.toContain(fake.github);
    expect(JSON.parse(text).message.content[0].text).toBe("use [REDACTED:github-token] please");
    expect(counts).toEqual({ "github-token": 1 });
  });

  it("redacts a private key whose newlines JSON escapes", () => {
    const { text } = redactJsonLine(JSON.stringify({ toolResult: `key:\n${fake.privateKey}\n` }));
    expect(JSON.parse(text).toolResult).toBe("key:\n[REDACTED:private-key]\n");
  });

  it.each([
    [{ password: fake.password }, { password: REDACTED }],
    [{ env: { DB_PASSWORD: fake.password } }, { env: { DB_PASSWORD: REDACTED } }],
    [{ api_key: fake.password }, { api_key: REDACTED }],
    [{ refresh_token: [fake.password] }, { refresh_token: [REDACTED] }],
  ])("redacts a value whose property names a secret: %j", (value, expected) => {
    const { text, counts } = redactJsonLine(JSON.stringify(value));
    expect(JSON.parse(text)).toEqual(expected);
    expect(counts).toEqual({ password: 1 });
  });

  it("labels a provider's token by its provider, whatever the property is called", () => {
    const { text } = redactJsonLine(JSON.stringify({ api_key: fake.openai }));
    expect(JSON.parse(text)).toEqual({ api_key: "[REDACTED:openai-key]" });
  });

  it("leaves values that don't look like secrets alone, whatever their property", () => {
    const line = JSON.stringify({
      usage: { input_tokens: 123456789012, output_tokens: 5 },
      signature: "A1".repeat(40),
      token_type: "Bearer",
      tokenizer: "cl100k_base",
      tokenRegistryKey: "token_registry_v2",
      secretKey: "nowtick_secret_v2",
      secret: "the release is on 2026-10-10",
    });
    expect(redactJsonLine(line)).toEqual({ text: line, counts: {} });
  });

  it("redacts invalid JSON as plain text", () => {
    expect(redactJsonLine(`{"broken": ${fake.npm}`).text).toBe('{"broken": [REDACTED:npm-token]');
  });
});
