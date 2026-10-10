import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** Claude Code's user settings file. CLAUDE_CONFIG_DIR moves it, as it does for Claude Code. */
export function claudeSettingsPath(env: NodeJS.ProcessEnv = process.env): string {
  const dir = env.CLAUDE_CONFIG_DIR?.trim();
  return join(dir ? dir : join(homedir(), ".claude"), "settings.json");
}

type Settings = Record<string, unknown>;

const isObject = (value: unknown): value is Settings =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Returns `settings` with a command hook for `event` added, or undefined if that exact
 * command is already there. Everything else in the settings is kept as it is.
 */
export function withHook(settings: Settings, event: string, command: string): Settings | undefined {
  const hooks = settings.hooks ?? {};
  if (!isObject(hooks)) throw new Error('Claude Code settings: "hooks" is not an object');
  const groups = hooks[event] ?? [];
  if (!Array.isArray(groups))
    throw new Error(`Claude Code settings: "hooks.${event}" is not a list`);

  const present = groups.some(
    (group) =>
      isObject(group) &&
      Array.isArray(group.hooks) &&
      group.hooks.some((hook) => isObject(hook) && hook.command === command),
  );
  if (present) return undefined;
  return {
    ...settings,
    hooks: { ...hooks, [event]: [...groups, { hooks: [{ type: "command", command }] }] },
  };
}

/**
 * Adds the hook to the settings file at `path`, keeping a backup of the old file beside it.
 * A file that isn't valid JSON is never overwritten.
 */
export function installHook(
  path: string,
  event: string,
  command: string,
): "installed" | "already-installed" {
  const existed = existsSync(path);
  const settings: unknown = existed ? JSON.parse(readFileSync(path, "utf8")) : {};
  if (!isObject(settings)) throw new Error(`${path} is not a JSON object`);

  const next = withHook(settings, event, command);
  if (!next) return "already-installed";
  mkdirSync(dirname(path), { recursive: true });
  if (existed) copyFileSync(path, `${path}.skyros-backup`);
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
  return "installed";
}
