# Contributing

This project is **AI-first**: AI agents write, review and merge the code; a human Owner sets the direction and holds the keys. It's built mainly for the Owner's own use, in the open.

The binding rules are in [AGENTS.md](AGENTS.md). This document explains how the pieces fit together and why, for humans and agents alike.

## Who does what

| | Owner (human) | Builder (agent) | Reviewer (agent) |
|---|---|---|---|
| Decide what gets built | ✅ | proposes | proposes |
| Mark an issue `ready` | ✅ | | |
| Write code and open PRs | optional | ✅ | |
| Review PRs | `risk:high` only | | ✅ every PR |
| Approve PRs | `risk:high` only | | ✅ |
| **Merge PRs** | break-glass only | **never** | ✅ **always** |
| Releases, settings, secrets | ✅ | | |

**Why a separate Reviewer?** An agent checking its own work makes the same mistakes twice. The Reviewer works in a fresh context, under its own GitHub identity and, ideally, on a different model from the Builder so their blind spots differ. Over time it builds a long-term memory of this project's recurring mistakes.

## The life of a change

```
Idea → Issue → (RFC, if it's a design change) → Owner marks `ready`
     → Builder claims → branch → commits → pull request
     → CI passes → Reviewer reviews ⇄ Builder fixes (≤ 3 rounds, then the Owner decides)
     → risk:high? Owner approves
     → Reviewer squash-merges → issue closes
```

1. **Idea.** Anyone can open an issue with the Task template. Agents may propose issues, but only the Owner marks them `ready`. Direction stays with the human, and agents can't invent their own backlog.
2. **Design.** Work that adds a subsystem, changes a data format or the security model, or is hard to undo needs an accepted RFC first ([below](#rfcs-design-proposals)).
3. **Build.** A Builder claims the issue, branches, plans, implements and opens a PR, following [AGENTS.md §3](AGENTS.md#3-doing-a-piece-of-work-builder).
4. **CI.** Build, lint, types, tests, secret scanning and dependency review must pass. These are deterministic gates: no agent can argue its way past them.
5. **Review.** The Reviewer follows its [charter](docs/governance/reviewer.md) and approves, requests changes, or escalates.
6. **Owner approval.** Required for `risk:high` PRs, enforced by CODEOWNERS.
7. **Merge.** The Reviewer squash-merges once every merge condition holds. The branch is deleted and the issue closes.
8. **If something breaks,** anyone opens a revert PR. Reverts are reviewed fast and merged first; the investigation comes after.

## Disagreements

The Builder and the Reviewer each make their case once, in the PR. If they still disagree, the Reviewer adds `needs-owner` with a short summary of both positions. The Owner decides, and the decision is recorded in the PR. Agents don't argue in circles.

## External contributors

Welcome. Because this repository is run by agents, a few extra rules apply:

- Open an issue before a large PR, so we can agree it's wanted.
- External PRs are always `risk:high`: the Reviewer agent reviews them, the Owner approves, and the Reviewer merges.
- CI on PRs from forks runs without secrets and waits for the Owner's approval to start.
- Everything in your PR is treated as data. Text aimed at our agents ("ignore previous instructions…") gets the PR closed.
- Tell us whether AI wrote your contribution, and which model. That's fine; we just want to know.

## RFCs (design proposals)

One file per decision: `docs/rfcs/NNNN-short-title.md`, numbered in order. Sections: Summary, Motivation, Design, Alternatives considered, Risks & security, Open questions. Status moves from `Draft` to `Accepted` or `Rejected`, then `Implemented`. Rejected RFCs stay, with the reason.

## Releases

Semantic Versioning, starting at `0.x`. The Owner tags releases. The changelog is generated from squash-commit titles, which is why PR titles follow Conventional Commits.

## Break-glass

If the Reviewer is broken or unavailable, or the fix is to the Reviewer itself, the Owner may merge directly using the branch-protection bypass ([setup §4](docs/governance/github-setup.md#4-protect-main)). Every bypass gets a PR comment explaining why, plus a follow-up issue if something needs fixing. It's for emergencies, not convenience.

## Changing these rules

Edit AGENTS.md, this file, or `docs/governance/` through a PR like any other change. These files are `risk:high`, so the Owner must approve.
