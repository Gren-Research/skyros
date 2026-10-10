import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** Claude Code's user settings file. CLAUDE_CONFIG_DIR moves it, as it does for Claude Code. */
export function claudeSettingsPath(env: NodeJS.ProcessEnv = process.env): string {
  const dir = env.CLAUDE_CONFIG_DIR?.trim();
  return join(dir ? dir : join(homedir(), ".claude"), "settings.json");
}

/**
 * SessionEnd hooks share a 1.5-second budget, which a hook's own `timeout` raises up to 60
 * seconds (https://code.claude.com/docs/en/hooks#sessionend). Capturing a large session takes
 * longer than 1.5 seconds, and a hook that runs out of time is killed, so ask for all 60.
 */
export const SESSION_END_TIMEOUT_SECONDS = 60;

/** A command hook as Claude Code's settings describe it. */
export interface CommandHook {
  type: "command";
  command: string;
  /** Seconds before Claude Code cancels the command. */
  timeout?: number;
}

type Settings = Record<string, unknown>;

const isObject = (value: unknown): value is Settings =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Returns `settings` with `hook` added for `event`, or undefined if a hook with that command
 * is already there. Everything else in the settings is kept as it is.
 */
export function withHook(
  settings: Settings,
  event: string,
  hook: CommandHook,
): Settings | undefined {
  const hooks = settings.hooks ?? {};
  if (!isObject(hooks)) throw new Error('Claude Code settings: "hooks" is not an object');
  const groups = hooks[event] ?? [];
  if (!Array.isArray(groups))
    throw new Error(`Claude Code settings: "hooks.${event}" is not a list`);

  const present = groups.some(
    (group) =>
      isObject(group) &&
      Array.isArray(group.hooks) &&
      group.hooks.some((other) => isObject(other) && other.command === hook.command),
  );
  if (present) return undefined;
  return { ...settings, hooks: { ...hooks, [event]: [...groups, { hooks: [hook] }] } };
}

/**
 * Adds the hook to the settings file at `path`. The first install keeps a backup of the
 * original file beside it, and later installs never replace that backup. The new file is
 * written beside the old one and renamed over it, so a crash can't leave half a file, and
 * a file that isn't valid JSON is never overwritten.
 */
export function installHook(
  path: string,
  event: string,
  hook: CommandHook,
): "installed" | "already-installed" {
  const existed = existsSync(path);
  const settings: unknown = existed ? JSON.parse(readFileSync(path, "utf8")) : {};
  if (!isObject(settings)) throw new Error(`${path} is not a JSON object`);

  const next = withHook(settings, event, hook);
  if (!next) return "already-installed";
  mkdirSync(dirname(path), { recursive: true });
  const backup = `${path}.skyros-backup`;
  if (existed && !existsSync(backup)) copyFileSync(path, backup);
  // Write through a symlink to the real file, keeping its permissions.
  const target = existed ? realpathSync(path) : path;
  const mode = existed ? statSync(target).mode & 0o777 : 0o600;
  writeFileSync(`${target}.skyros-partial`, `${JSON.stringify(next, null, 2)}\n`, { mode });
  renameSync(`${target}.skyros-partial`, target);
  return "installed";
}
