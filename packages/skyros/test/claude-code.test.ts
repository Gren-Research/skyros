import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claudeSettingsPath, installHook, withHook } from "../src/claude-code.ts";

const COMMAND = 'node "/opt/skyros/cli.ts" hook session-end';

describe("withHook", () => {
  it("adds a command hook for the event", () => {
    expect(withHook({}, "SessionEnd", COMMAND)).toEqual({
      hooks: { SessionEnd: [{ hooks: [{ type: "command", command: COMMAND }] }] },
    });
  });

  it("keeps every other setting and hook", () => {
    const other = { hooks: [{ type: "command", command: "echo bye" }] };
    const settings = { model: "opus", hooks: { Stop: [other], SessionEnd: [other] } };
    expect(withHook(settings, "SessionEnd", COMMAND)).toEqual({
      model: "opus",
      hooks: {
        Stop: [other],
        SessionEnd: [other, { hooks: [{ type: "command", command: COMMAND }] }],
      },
    });
  });

  it("returns undefined when the hook is already there", () => {
    const once = withHook({}, "SessionEnd", COMMAND) ?? {};
    expect(withHook(once, "SessionEnd", COMMAND)).toBeUndefined();
  });

  it("refuses settings it doesn't understand rather than overwrite them", () => {
    expect(() => withHook({ hooks: "nope" }, "SessionEnd", COMMAND)).toThrow();
    expect(() => withHook({ hooks: { SessionEnd: {} } }, "SessionEnd", COMMAND)).toThrow();
  });
});

describe("installHook", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skyros-claude-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the settings file when there is none", () => {
    const path = join(dir, "settings.json");
    expect(installHook(path, "SessionEnd", COMMAND)).toBe("installed");
    expect(JSON.parse(readFileSync(path, "utf8")).hooks.SessionEnd).toHaveLength(1);
    expect(existsSync(`${path}.skyros-backup`)).toBe(false);
  });

  it("backs up an existing file, and installs only once", () => {
    const path = join(dir, "settings.json");
    writeFileSync(path, '{"model":"opus"}\n');

    expect(installHook(path, "SessionEnd", COMMAND)).toBe("installed");
    expect(readFileSync(`${path}.skyros-backup`, "utf8")).toBe('{"model":"opus"}\n');
    const installed = readFileSync(path, "utf8");
    expect(installHook(path, "SessionEnd", COMMAND)).toBe("already-installed");
    expect(readFileSync(path, "utf8")).toBe(installed);
  });

  it("never overwrites a file that isn't valid JSON", () => {
    const path = join(dir, "settings.json");
    writeFileSync(path, "{ not json");
    expect(() => installHook(path, "SessionEnd", COMMAND)).toThrow();
    expect(readFileSync(path, "utf8")).toBe("{ not json");
  });
});

describe("claudeSettingsPath", () => {
  it("defaults to ~/.claude/settings.json and honors CLAUDE_CONFIG_DIR", () => {
    expect(claudeSettingsPath({})).toBe(join(homedir(), ".claude", "settings.json"));
    expect(claudeSettingsPath({ CLAUDE_CONFIG_DIR: "/cfg" })).toBe(join("/cfg", "settings.json"));
  });
});
