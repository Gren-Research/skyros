# GitHub setup (one-time, for the Owner)

Rules written in Markdown are suggestions; repository settings are enforcement. This page turns [AGENTS.md](../../AGENTS.md) into settings GitHub enforces, so the rules hold even when an agent is confused, wrong, or compromised. One gap remains while both agent keys live on your PC (§2).

Setting names match GitHub's UI at the time of writing. If one has moved, look for the same option nearby.

## 1. Organization and repository

- Create a free GitHub **organization** for Gren Research and create the repository inside it (public).
  Why an organization: "Restrict who can push to matching branches", the setting that makes the Reviewer the *only* one able to merge, exists only for organization-owned repositories. On a personal account everything else still works, but nothing technically stops the Builder from merging an approved PR; that rule would rest on instructions alone.
- **Bootstrap exception:** push this first set of governance files straight to `main` *before* turning on protection. It's the only direct push `main` will ever get.

## 2. Two GitHub Apps, two agent identities

GitHub never lets an account approve its own pull request. If the Builder and the Reviewer both used your account, the Reviewer couldn't approve anything, and your approvals would be self-approvals. So each agent role gets its own identity: a **GitHub App** owned by the organization (Organization settings → Developer settings → GitHub Apps).

| App | Repository permissions | Never grant |
|---|---|---|
| `skyros-builder` | Contents: read & write · Pull requests: read & write · Issues: read & write · Checks: read · Commit statuses: read · Metadata: read | Administration, Workflows, Secrets, Actions |
| `skyros-reviewer` | Contents: read & write (needed to merge) · Pull requests: read & write · Issues: read & write (labels) · Checks: read · Commit statuses: read · Metadata: read | Administration, Workflows, Secrets, Actions |

- Install both apps on **this repository only**.
- Register them through GitHub's app-manifest flow, which hands each private key straight to your PC, so nobody copies a key by hand.
- The keys live on your PC in `~/.skyros/secrets/github/` (`<app>.pem`, plus `<app>.json` with the app's client and installation IDs), never in the repo or a synced folder. Agents need them to mint tokens. Keep a backup in a password manager. If a key may have leaked, generate a new one in the app's settings and delete the old one.
- Agents act as their app through [`scripts/as-app.mjs`](../../scripts/as-app.mjs), which runs a command with a one-hour installation token ([AGENTS.md §8](../../AGENTS.md#8-commands)). It fails closed: without a token the command doesn't run, and the command can't fall back to your own `gh` or git login, which is for Owner actions only.
- Without the **Workflows** permission, GitHub itself rejects any push from these apps that changes `.github/workflows/`. CI changes go through you.
- Why apps rather than extra user accounts: least privilege, short-lived tokens, no passwords, and every action is attributed (`skyros-builder[bot]`).
- **The Phase 0 gap.** While both keys sit on your PC, any agent running as you can read either one, so a Builder *could* act as the Reviewer and approve and merge its own `risk:low` or `risk:normal` PR. GitHub can't tell the difference; only AGENTS.md §8 forbids it. Your approval on `risk:high` PRs holds regardless. Phase 1 (§8) closes the gap: the Reviewer runs in CI with its key stored as a GitHub secret, and the key leaves your PC.

## 3. CODEOWNERS

[`.github/CODEOWNERS`](../../.github/CODEOWNERS) names `@A1zen-s` as the Owner. That account must be an owner of the Gren-Research organization. As code appears, add its sensitive paths (memory, permissions, sandboxing, agent charters and prompts) and keep the list in sync with AGENTS.md §4.

## 4. Protect `main`

Settings → Branches → Add branch protection rule → pattern `main`:

- [x] Require a pull request before merging
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners
  - [x] Require approval of the most recent reviewable push
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - Add each CI check here once CI exists
- [x] Require conversation resolution before merging
- [x] Require linear history
- [x] Do not allow bypassing the above settings
- [x] Restrict who can push to matching branches → only `skyros-reviewer`
- [ ] Allow force pushes (leave off)
- [ ] Allow deletions (leave off)

Result: `skyros-builder` can open PRs but can't merge; only `skyros-reviewer` can merge, and only approved, green PRs; `risk:high` paths also need your approval. (Mind the Phase 0 gap in §2.)

**Your own `risk:high` PRs.** You're the only code owner and GitHub won't let you approve your own PR, so a `risk:high` PR you author can't satisfy "Require review from Code Owners". Prefer asking a Builder to make the change: you approve it and the Reviewer merges. If you must author it yourself, get the Reviewer's approval, then turn off "Do not allow bypassing the above settings", merge, turn it back on, and comment on the PR explaining why. That's the break-glass path in [CONTRIBUTING.md](../../CONTRIBUTING.md#break-glass).

## 5. Repository settings

**Settings → General → Pull Requests**
- Allow squash merging only; turn off merge commits and rebase merging.
- Default squash commit message: pull request title and description.
- Automatically delete head branches.

**Settings → Actions → General**
- Fork pull request workflows from outside collaborators: **Require approval for all outside collaborators**.
- Workflow permissions: **Read repository contents and packages permissions**.
- Leave **Allow GitHub Actions to create and approve pull requests** off.

**Settings → Code security**
- Private vulnerability reporting: on.
- Secret scanning and push protection: on.
- Dependabot alerts and security updates: on.
- Code scanning (CodeQL default setup): on once there's code.

## 6. CI rules (once CI exists)

- Trigger on `pull_request`. Never combine `pull_request_target` with checking out the PR's code: that runs untrusted code with secrets.
- Pin third-party Actions to a full commit SHA, not a tag. In March 2025 the widely used `tj-actions/changed-files` was compromised by re-pointing its tags.
- Give each job only the `permissions:` it needs.
- If an AI agent runs in CI, never let it read untrusted text (issues, PR bodies, fork code) while it holds write tokens or secrets.

## 7. Labels

Create: `ready`, `in-progress`, `needs-owner`, `risk:low`, `risk:normal`, `risk:high`, `external`, `rfc`, `research`, `do-not-merge`.

## 8. Running the agents

**Phase 0 (now).** Two separate agent sessions, started by you, each with its own app token:
- **Builder:** "Work on issue #N."
- **Reviewer:** a different terminal and a fresh session: "You are the Reviewer. Follow docs/governance/reviewer.md. Review PR #N." Use a different model from the Builder if you can: another Claude model, or another vendor's agent.

**Phase 1.** The Reviewer runs automatically when a PR is marked ready for review (a CI job using the reviewer app). PRs from forks still wait for you.

**Phase 2.** This project's own persistent Builder and Reviewer agents, with long-term memory, take over. The project starts building itself.
