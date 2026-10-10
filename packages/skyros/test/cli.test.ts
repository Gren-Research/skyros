import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Runs the real CLI the way Claude Code does: Node strips the types, no build step.
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "skyros-cli-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function run(args: string[], input = "") {
  return spawnSync(process.execPath, [CLI, ...args], {
    input,
    encoding: "utf8",
    env: {
      ...process.env,
      SKYROS_HOME: join(root, "skyros"),
      CLAUDE_CONFIG_DIR: join(root, "claude"),
    },
  });
}

describe("skyros CLI", () => {
  it("captures a session when Claude Code's SessionEnd hook runs", () => {
    const sessionId = "5e551011-0000-4000-8000-000000000002";
    const transcriptPath = join(root, `${sessionId}.jsonl`);
    const line = JSON.stringify({ type: "user", uuid: "u1", timestamp: "2026-10-10T08:00:00Z" });
    writeFileSync(transcriptPath, `${line}\n`);

    const hook = run(
      ["hook", "session-end"],
      JSON.stringify({
        hook_event_name: "SessionEnd",
        session_id: sessionId,
        transcript_path: transcriptPath,
      }),
    );

    expect(hook.stderr).toBe("");
    expect(hook.status).toBe(0);
    const log = join(
      root,
      "skyros",
      "agents",
      "developer",
      "log",
      "2026",
      "10",
      `10-${sessionId}.jsonl`,
    );
    expect(readFileSync(log, "utf8")).toBe(`${line}\n`);
  });

  it("installs the hook only with --yes when there is no terminal to ask", () => {
    expect(run(["install", "claude-code"]).status).toBe(1);

    mkdirSync(join(root, "claude"));
    const install = run(["install", "claude-code", "--yes"]);
    expect(install.status).toBe(0);
    const settings = JSON.parse(readFileSync(join(root, "claude", "settings.json"), "utf8"));
    expect(settings.hooks.SessionEnd[0].hooks[0].command).toMatch(/cli\.ts" hook session-end$/);
  });

  it("explains its usage on unknown commands", () => {
    const result = run(["fly"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("usage:");
  });
});
