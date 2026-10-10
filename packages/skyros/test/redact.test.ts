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
};

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

  it("redacts random-looking password assignments but leaves code alone", () => {
    expect(redactText('password = "Xk29fjQ0pLm3z"').text).toBe('password = "[REDACTED:password]"');
    expect(redactText("API_KEY: Xk29fjQ0pLm3z").text).toBe("API_KEY: [REDACTED:password]");
    for (const code of [
      "token = getToken()",
      "const secret = process.env.SECRET",
      "password: string",
      "apiKey = config.apiKey",
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

  it("redacts invalid JSON as plain text", () => {
    expect(redactJsonLine(`{"broken": ${fake.npm}`).text).toBe('{"broken": [REDACTED:npm-token]');
  });
});
