import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureSession } from "../src/capture.ts";

const SESSION = "1b2c3d4e-0000-4000-8000-000000000001";
const fakeToken = ["gh", "p_", "z9".repeat(18)].join("");

let root: string;
let home: string;
let projects: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "skyros-capture-"));
  home = join(root, "skyros");
  projects = join(root, "claude", "projects", "C--work");
  mkdirSync(projects, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const message = (n: number, text = `message ${n}`) =>
  JSON.stringify({
    type: "user",
    uuid: `uuid-${n}`,
    timestamp: `2026-10-09T23:5${n}:00.000Z`,
    message: { role: "user", content: text },
  });

/** Writes the transcript; `partial` is a last line that's still being written. */
function transcript(lines: string[], partial = ""): string {
  const path = join(projects, `${SESSION}.jsonl`);
  writeFileSync(path, lines.map((line) => `${line}\n`).join("") + partial);
  return path;
}

const logPath = join("agents", "developer", "log", "2026", "10", `09-${SESSION}.jsonl`);
const readLog = () => readFileSync(join(home, logPath), "utf8");

describe("captureSession", () => {
  it("copies a session into the log, dated by its first timestamp in UTC", () => {
    const lines = [JSON.stringify({ type: "summary" }), message(1), message(2)];
    const result = captureSession({ transcriptPath: transcript(lines), home });

    expect(result).toEqual({
      logPath: join(home, logPath),
      appended: 3,
      redactions: 0,
      conflicts: [],
    });
    expect(readLog()).toBe(lines.map((line) => `${line}\n`).join(""));
  });

  it("is idempotent", () => {
    const path = transcript([message(1), message(2)]);
    captureSession({ transcriptPath: path, home });
    const before = readLog();

    expect(captureSession({ transcriptPath: path, home }).appended).toBe(0);
    expect(readLog()).toBe(before);
  });

  it("appends only the lines added since the last capture", () => {
    const path = transcript([message(1)]);
    captureSession({ transcriptPath: path, home });
    appendFileSync(path, `${message(2)}\n${message(3)}\n`);

    expect(captureSession({ transcriptPath: path, home }).appended).toBe(2);
    expect(readLog()).toBe(`${message(1)}\n${message(2)}\n${message(3)}\n`);
  });

  it("waits for a line that is still being written", () => {
    const path = transcript([message(1)], '{"type":"user","uuid":"uu');
    expect(captureSession({ transcriptPath: path, home }).appended).toBe(1);
    expect(readLog()).toBe(`${message(1)}\n`);
  });

  it("redacts secrets before writing and counts them", () => {
    const path = transcript([message(1, `my token is ${fakeToken}`)]);
    const result = captureSession({ transcriptPath: path, home });

    expect(result.redactions).toBe(1);
    expect(readLog()).not.toContain(fakeToken);
    expect(JSON.parse(readLog()).message.content).toBe("my token is [REDACTED:github-token]");
  });

  it("repairs a partial line left by a run that crashed", () => {
    const path = transcript([message(1), message(2)]);
    mkdirSync(join(home, logPath, ".."), { recursive: true });
    writeFileSync(join(home, logPath), `${message(1)}\n${message(2).slice(0, 20)}`);

    expect(captureSession({ transcriptPath: path, home }).appended).toBe(1);
    expect(readLog()).toBe(`${message(1)}\n${message(2)}\n`);
  });

  it("leaves a log alone when it no longer matches its transcript", () => {
    const path = transcript([message(1), message(2)]);
    captureSession({ transcriptPath: path, home });
    transcript([message(1), message(5), message(6)]);

    const result = captureSession({ transcriptPath: path, home });
    expect(result.conflicts).toEqual([join(home, logPath)]);
    expect(readLog()).toBe(`${message(1)}\n${message(2)}\n`);
  });

  it("leaves a conflicting log byte for byte, even a partial last line", () => {
    const path = transcript([message(1), message(2)]);
    mkdirSync(join(home, logPath, ".."), { recursive: true });
    const before = `${message(1)}
${message(2)}
${message(3).slice(0, 20)}`;
    writeFileSync(join(home, logPath), before);
    transcript([message(1), message(5), message(6)]);

    expect(captureSession({ transcriptPath: path, home }).conflicts).toEqual([join(home, logPath)]);
    expect(readLog()).toBe(before);
  });

  it("captures subagent transcripts beside the session", () => {
    const path = transcript([message(1)]);
    const subagents = join(projects, SESSION, "subagents");
    mkdirSync(subagents, { recursive: true });
    writeFileSync(join(subagents, "agent-a1.jsonl"), `${message(2)}\n`);

    expect(captureSession({ transcriptPath: path, home }).appended).toBe(2);
    const subagentLog = join(home, logPath.replace(".jsonl", ""), "subagents", "agent-a1.jsonl");
    expect(readFileSync(subagentLog, "utf8")).toBe(`${message(2)}\n`);
  });

  it.skipIf(process.platform === "win32")("keeps the logs readable by their owner only", () => {
    const path = transcript([message(1)]);
    const subagents = join(projects, SESSION, "subagents");
    mkdirSync(subagents, { recursive: true });
    writeFileSync(
      join(subagents, "agent-a1.jsonl"),
      `${message(2)}
`,
    );
    captureSession({ transcriptPath: path, home });
    appendFileSync(
      path,
      `${message(3)}
`,
    );
    captureSession({ transcriptPath: path, home });

    const mode = (...parts: string[]) => statSync(join(home, ...parts)).mode & 0o777;
    const session = logPath.replace(".jsonl", "");
    expect(mode()).toBe(0o700);
    expect(mode(logPath, "..")).toBe(0o700);
    expect(mode(logPath)).toBe(0o600);
    expect(mode(session, "subagents")).toBe(0o700);
    expect(mode(session, "subagents", "agent-a1.jsonl")).toBe(0o600);
  });

  it("writes nothing for a transcript with no messages yet", () => {
    const result = captureSession({
      transcriptPath: transcript([JSON.stringify({ type: "summary" })]),
      home,
    });
    expect(result).toEqual({ appended: 0, redactions: 0, conflicts: [] });
    expect(existsSync(join(home, "agents"))).toBe(false);
  });

  it("rejects session ids and agent names that could escape the log folder", () => {
    const path = transcript([message(1)]);
    expect(() => captureSession({ transcriptPath: path, sessionId: "../escape", home })).toThrow();
    expect(() => captureSession({ transcriptPath: path, agent: "../escape", home })).toThrow();
  });
});
