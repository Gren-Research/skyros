// Runs one command as one of this repository's GitHub Apps, so an agent acts as itself and
// never as the Owner (AGENTS.md §8). From the repository root:
//
//   node scripts/as-app.mjs skyros-builder gh pr create ...
//   node scripts/as-app.mjs skyros-builder git push
//
// It mints a one-hour installation token scoped to this repository and runs the command with
// it. It fails closed: if no token can be minted, the command doesn't run, and the command
// can't fall back to another login, because gh gets an empty config directory and git gets
// a credential helper that only knows this token. The app's key comes from
// ~/.skyros/secrets/github/ ($SKYROS_HOME overrides ~/.skyros). Neither the key nor the
// token is ever printed.
import { spawnSync } from "node:child_process";
import { createSign } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const OWNER = "Gren-Research";
const REPO = "skyros";
const APPS = ["skyros-builder", "skyros-reviewer"];

class Failure extends Error {}

async function main([app, command, ...args]) {
  if (!APPS.includes(app) || !command) {
    console.error(`usage: node scripts/as-app.mjs <${APPS.join("|")}> <command> [args...]`);
    return 2;
  }
  const token = await mintToken(app);

  const ghConfig = mkdtempSync(join(tmpdir(), "skyros-as-app-"));
  try {
    const result = spawnSync(command, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        GH_TOKEN: token,
        // No stored logins for gh to fall back to.
        GH_CONFIG_DIR: ghConfig,
        // For git: drop every credential helper (they may hold the Owner's login), then use
        // gh, which answers with GH_TOKEN.
        GIT_CONFIG_COUNT: "2",
        GIT_CONFIG_KEY_0: "credential.helper",
        GIT_CONFIG_VALUE_0: "",
        GIT_CONFIG_KEY_1: "credential.helper",
        GIT_CONFIG_VALUE_1: "!gh auth git-credential",
      },
    });
    if (result.error) throw new Failure(`can't run ${command}: ${result.error.message}`);
    return result.status ?? 1;
  } finally {
    rmSync(ghConfig, { recursive: true, force: true });
  }
}

async function mintToken(app) {
  const dir = join(process.env.SKYROS_HOME ?? join(homedir(), ".skyros"), "secrets", "github");
  let meta;
  let key;
  try {
    meta = JSON.parse(readFileSync(join(dir, `${app}.json`), "utf8"));
    key = readFileSync(join(dir, `${app}.pem`), "utf8");
  } catch {
    throw new Failure(`can't read ${app}'s key and IDs in ${dir}`);
  }

  // A short-lived JWT signed with the app's key proves we are the app. GitHub accepts at most
  // 10 minutes; iat is backdated a minute to allow for clock drift.
  const now = Math.floor(Date.now() / 1000);
  const encode = (part) => Buffer.from(JSON.stringify(part)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iat: now - 60,
    exp: now + 540,
    iss: meta.client_id,
  })}`;
  const jwt = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(key, "base64url")}`;

  const github = async (path, init = {}) => {
    const what = `GitHub ${init.method ?? "GET"} ${path}`;
    let res;
    try {
      res = await fetch(`https://api.github.com${path}`, {
        ...init,
        signal: AbortSignal.timeout(15_000),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${jwt}`,
          "User-Agent": "skyros-as-app",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    } catch (error) {
      throw new Failure(`${what} failed (${error.name})`);
    }
    if (!res.ok) throw new Failure(`${what} failed with HTTP ${res.status}`);
    return res.json();
  };

  const installationId =
    meta.installation_id ?? (await github(`/repos/${OWNER}/${REPO}/installation`)).id;
  const { token } = await github(`/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    body: JSON.stringify({ repositories: [REPO] }),
  });
  if (typeof token !== "string" || token.length === 0) throw new Failure("GitHub returned no token");
  return token;
}

// Set the exit code rather than calling process.exit(): exiting while fetch's connections are
// still closing trips a libuv assertion on Windows and garbles the exit code.
try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof Failure)) throw error;
  console.error(`as-app: ${error.message}; nothing was run`);
  process.exitCode = 1;
}
