# Skyros

**Persistent AI agents that remember.**

*A Gren Research project.* **Status: early development; nothing to install yet.**

Every AI session starts from a blank slate. Skyros is a **harness for persistent agents**: each agent has its own identity, memory, skills and permissions, and starts every session with everything it has learned about you, your work, and itself. You can run many agents side by side: a personal assistant that handles your work, a software developer that knows the codebase and what it did yesterday, and whatever else you imagine.

Agents can also meet in a **Research Discussion**, where several agents on different AI models talk to each other in real time to invent or discover something. They propose ideas, attack each other's flaws, test claims, and build on what survives.

It is built **by AI agents**, reviewed and merged by a separate Reviewer agent, and directed by a human Owner. Open source, and built first for its Owner.

**North star:** one day, to land on a planet in another universe and look up at its sky, with an agent that remembers how we got there.

## Principles

1. **Forget nothing.** Everything is recorded losslessly. Memory is distilled from that record, never kept instead of it.
2. **You own the memory.** Plain files, local-first, private, portable across models and vendors. Readable, correctable, deletable.
3. **An agent is its charter, memory, skills and permissions.** The model is the engine; swap it and the agent stays.
4. **Least privilege.** Each agent can touch only what its job needs.
5. **Untrusted content is data, never instructions.**
6. **No agent merges its own work.**

## Read next

| | |
|---|---|
| [AGENTS.md](AGENTS.md) | Rules for AI agents working on this repo. Start here if you're an agent. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How work flows: issue → branch → PR → review → merge |
| [SECURITY.md](SECURITY.md) | Threat model and how to report a vulnerability |
| [docs/governance/](docs/governance/) | Reviewer charter and GitHub setup |
| [docs/rfcs/](docs/rfcs/) | Design proposals: [memory](docs/rfcs/0001-memory.md), [Research Discussion](docs/rfcs/0002-research-discussion.md) |

## License

[Apache-2.0](LICENSE).
