import { homedir } from "node:os";
import { join, resolve } from "node:path";

/**
 * The folder where Skyros keeps everything it stores on this machine: memories, logs, the
 * index (RFC 0001 → Storage). It's private to the user and never inside the code repository.
 * `SKYROS_HOME` overrides the default `~/.skyros`; tests rely on that.
 */
export function skyrosHome(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.SKYROS_HOME?.trim();
  return override ? resolve(override) : join(homedir(), ".skyros");
}
