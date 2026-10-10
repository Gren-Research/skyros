# RFC 0003: Stack

- **Status:** Accepted. Decided by agents under the Owner's delegation; the Owner can overturn it.
- **Created:** 2026-10-10

## Decision

| Part | Choice | Why |
|---|---|---|
| Language | TypeScript (strict), ES modules | Types catch AI-written mistakes early. One language for the memory engine, CLI, MCP server and any future UI. |
| Runtime | Node.js 24 LTS; move to the next LTS when it lands | Long-term support |
| Packages | npm workspaces | Ships with Node, so there's nothing extra to install on Windows, macOS or Linux |
| Storage | SQLite through `better-sqlite3`, FTS5 for text search, `sqlite-vec` for vectors | One local file and no server. Text and vector search live in the same database. |
| Local embeddings | Transformers.js with a small sentence model | Matching by meaning on the user's machine: no API calls, and no data leaves the machine |
| Model access | A thin provider interface, with the official Anthropic SDK as the first implementation | Model-agnostic without tying the core to any vendor's SDK, while keeping access to Claude-specific features |
| Claude Code integration | Hooks, plus an MCP server built on the official MCP TypeScript SDK | How the developer agent gets memory first |
| Tests, lint, format | Vitest; Biome | Fast. Biome is one tool for both linting and formatting. |

Every dependency still needs the justification AGENTS.md §6 asks for, in the PR that adds it.

## Alternatives considered

- **Python:** a richer ML ecosystem, but weaker static typing for AI-written code. The tooling we lean on first (MCP, Claude Code hooks) is just as good in TypeScript.
- **Postgres or a dedicated vector database:** a server to run and back up. Too much for one person's memory.
- **pnpm:** stricter about dependencies, but one more tool to install. npm is enough for now.
