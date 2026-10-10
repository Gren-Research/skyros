// Prints a one-hour GitHub token for one of this repository's agent apps, scoped to this
// repository. Agents pass it as GH_TOKEN so they act as themselves, never as the Owner
// (AGENTS.md §8). Usage: node scripts/gh-app-token.mjs skyros-builder
//
// The app's private key and IDs are read from ~/.skyros/secrets/github/ ($SKYROS_HOME
// overrides ~/.skyros), where setup put them (docs/governance/github-setup.md §2).
// The key is never printed.
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const OWNER = "Gren-Research";
const REPO = "skyros";
const APPS = ["skyros-builder", "skyros-reviewer"];

const app = process.argv[2];
if (!APPS.includes(app)) {
  console.error(`usage: node scripts/gh-app-token.mjs <${APPS.join("|")}>`);
  process.exit(2);
}

const dir = join(process.env.SKYROS_HOME ?? join(homedir(), ".skyros"), "secrets", "github");
const { client_id: clientId, installation_id: installationId } = JSON.parse(
  readFileSync(join(dir, `${app}.json`), "utf8"),
);
const key = readFileSync(join(dir, `${app}.pem`), "utf8");

// A short-lived JWT signed with the app's key proves we are the app. GitHub accepts at most
// 10 minutes; iat is backdated a minute to allow for clock drift.
const now = Math.floor(Date.now() / 1000);
const encode = (part) => Buffer.from(JSON.stringify(part)).toString("base64url");
const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
  iat: now - 60,
  exp: now + 540,
  iss: clientId,
})}`;
const jwt = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(key, "base64url")}`;

async function github(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jwt}`,
      "User-Agent": "skyros-gh-app-token",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    console.error(`${app}: GitHub ${init.method ?? "GET"} ${path} failed with HTTP ${res.status}`);
    process.exit(1);
  }
  return res.json();
}

const id = installationId ?? (await github(`/repos/${OWNER}/${REPO}/installation`)).id;
const { token } = await github(`/app/installations/${id}/access_tokens`, {
  method: "POST",
  body: JSON.stringify({ repositories: [REPO] }),
});
process.stdout.write(token);
