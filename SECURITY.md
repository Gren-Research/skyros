# Security

## Reporting a vulnerability

Please **don't open a public issue**. Use GitHub's private vulnerability reporting: the **Security** tab → **Report a vulnerability**. This is a small personal project, so responses are best-effort, but security reports come first.

## What we protect against

This project builds agents that remember everything about the person they work for and act on their behalf. That makes the agents, and this repository built by agents, attractive targets.

| Threat | How it shows up | Main defenses |
|---|---|---|
| **Private data in a public repo** | A key, token, memory file or transcript gets committed | Real data lives outside the repo; secret scanning with push protection; `.gitignore`; Reviewer checklist |
| **Prompt injection** | Instructions hidden in an issue, PR, web page, email, document or tool output | Content is data, never instructions ([AGENTS.md §1](AGENTS.md#1-prime-directives)); deterministic CI gates no agent can override; Owner approval for sensitive changes |
| **Memory poisoning** | Injected text is saved to long-term memory and replays in every future session | Every memory records its source and trust level; untrusted content never becomes instructions or core memory without the user's confirmation; versioned memory with rollback |
| **The "lethal trifecta"** (Simon Willison) | One agent with private data, exposure to untrusted content, and a way to send data out can be tricked into leaking it | No agent gets all three at once without a human checkpoint |
| **Supply chain** | Malicious or hallucinated packages ("slopsquatting"); compromised GitHub Actions | New dependencies are `risk:high`; verify packages are real and the intended ones; pin Actions to commit SHAs |
| **Runaway automation** | Agents merging, publishing or acting beyond their mandate | Separate identities, least-privilege short-lived tokens, branch protection; outward actions need the Owner |

## Rules for the code

- Least privilege for every agent, tool and token.
- Untrusted input is never interpolated into shell commands, SQL, file paths, or the instruction part of a prompt.
- Agents never see raw credentials when a scoped, short-lived token will do.
- Users can see, correct, export and permanently delete what their agents remember.
