import {
  chmodSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type CommandHook,
  claudeSettingsPath,
  installHook,
  SESSION_END_TIMEOUT_SECONDS,
  withHook,
} from "../src/claude-code.ts";

const HOOK: CommandHook = {
  type: "command",
  command: 'node "/opt/skyros/cli.ts" hook session-end',
  timeout: SESSION_END_TIMEOUT_SECONDS,
};

describe("withHook", () => {
  it("adds a command hook for the event", () => {
    expect(withHook({}, "SessionEnd", HOOK)).toEqual({
      hooks: { SessionEnd: [{ hooks: [HOOK] }] },
    });
  });

  it("keeps every other setting and hook", () => {
    const other = { hooks: [{ type: "command", command: "echo bye" }] };
    const settings = { model: "opus", hooks: { Stop: [other], SessionEnd: [other] } };
    expect(withHook(settings, "SessionEnd", HOOK)).toEqual({
      model: "opus",
      hooks: { Stop: [other], SessionEnd: [other, { hooks: [HOOK] }] },
    });
  });

  it("returns undefined when the hook is already there", () => {
    const once = withHook({}, "SessionEnd", HOOK) ?? {};
    expect(withHook(once, "SessionEnd", HOOK)).toBeUndefined();
  });

  it("refuses settings it doesn't understand rather than overwrite them", () => {
    expect(() => withHook({ hooks: "nope" }, "SessionEnd", HOOK)).toThrow();
    expect(() => withHook({ hooks: { SessionEnd: {} } }, "SessionEnd", HOOK)).toThrow();
  });
});

describe("installHook", () => {
  let dir: string;
  let path: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "skyros-claude-"));
    path = join(dir, "settings.json");
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the settings file when there is none", () => {
    expect(installHook(path, "SessionEnd", HOOK)).toBe("installed");
    expect(JSON.parse(readFileSync(path, "utf8")).hooks.SessionEnd).toEqual([{ hooks: [HOOK] }]);
    expect(readdirSync(dir)).toEqual(["settings.json"]);
  });

  it("backs up an existing file, and installs only once", () => {
    writeFileSync(path, '{"model":"opus"}\n');

    expect(installHook(path, "SessionEnd", HOOK)).toBe("installed");
    expect(readFileSync(`${path}.skyros-backup`, "utf8")).toBe('{"model":"opus"}\n');
    const installed = readFileSync(path, "utf8");
    expect(installHook(path, "SessionEnd", HOOK)).toBe("already-installed");
    expect(readFileSync(path, "utf8")).toBe(installed);
    expect(readdirSync(dir).sort()).toEqual(["settings.json", "settings.json.skyros-backup"]);
  });

  it("keeps the first backup when another hook is installed later", () => {
    writeFileSync(path, '{"model":"opus"}\n');
    installHook(path, "SessionEnd", HOOK);
    installHook(path, "SessionEnd", { ...HOOK, command: "node other.ts" });

    expect(readFileSync(`${path}.skyros-backup`, "utf8")).toBe('{"model":"opus"}\n');
    expect(JSON.parse(readFileSync(path, "utf8")).hooks.SessionEnd).toHaveLength(2);
  });

  it("never overwrites a file that isn't valid JSON", () => {
    writeFileSync(path, "{ not json");
    expect(() => installHook(path, "SessionEnd", HOOK)).toThrow();
    expect(readFileSync(path, "utf8")).toBe("{ not json");
  });

  it.skipIf(process.platform === "win32")("keeps the file's permissions", () => {
    writeFileSync(path, "{}\n");
    chmodSync(path, 0o600);
    installHook(path, "SessionEnd", HOOK);
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it.skipIf(process.platform === "win32")("writes through a symlink to the real file", () => {
    const real = join(dir, "dotfiles-settings.json");
    writeFileSync(real, "{}\n");
    symlinkSync(real, path);
    installHook(path, "SessionEnd", HOOK);

    expect(lstatSync(path).isSymbolicLink()).toBe(true);
    expect(JSON.parse(readFileSync(real, "utf8")).hooks.SessionEnd).toEqual([{ hooks: [HOOK] }]);
  });
});

describe("claudeSettingsPath", () => {
  it("defaults to ~/.claude/settings.json and honors CLAUDE_CONFIG_DIR", () => {
    expect(claudeSettingsPath({})).toBe(join(homedir(), ".claude", "settings.json"));
    expect(claudeSettingsPath({ CLAUDE_CONFIG_DIR: "/cfg" })).toBe(join("/cfg", "settings.json"));
  });
});
