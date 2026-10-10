# RFC 0004: Agents

- **Status:** Accepted (2026-10-10)
- **Created:** 2026-10-10

## Summary

An agent is a persistent worker with its own identity, memory, skills and permissions; the model is only its engine. Agents run on the user's machine and wake on schedules, events or the user. They share everything they learn, speak up whenever they notice something useful, earn freedom by proving themselves, and can be forked and merged like branches.

## Motivation

An assistant that starts every session blank can't grow into a colleague. The Owner wants several agents, each with its own job (a developer, a personal assistant), that keep their own memory, keep working when nobody is watching, and earn more freedom as they prove themselves. [RFC 0001](0001-memory.md) gives each of them a memory; this RFC defines the agent around that memory.

## What an agent is

```
agents/<name>/
  charter.md         # who it is, its job, boundaries, tone
  permissions.yaml   # tools, and a trust level per action type
  triggers.yaml      # schedules and events that wake it
  core.md  contents.md  notes/  threads/  skills/  todo.md  log/  events/   # memory (RFC 0001)
```

Creating an agent means creating this folder, usually from a template. The first two:

| Agent | Job | Runs on |
|---|---|---|
| **Developer** | Knows the codebase and what it did before | Claude Code, with this project's memory through hooks and MCP |
| **Assistant** | Handles the user's work: tasks, reminders, messages, research | This project's own runtime |

## Sharing

**Owner decision: share everything.**

- Every agent can read everything every other agent knows: about the user, their people, their projects and their work.
- Each agent writes only to its own memory and to the shared scopes, so agents never overwrite each other.
- Sensitive information keeps its label (RFC 0001 → Other people). Every agent can read it, but none puts it into outgoing messages without the user's OK.

## When agents disagree

Notes carry evidence and dates. Sleep reconciles them across agents with the same rules as contradictions (RFC 0001 → Time and change): repeated behavior outweighs a single statement, and context can make both sides true. If it's still unclear and an action depends on it, the agent asks the user.

## Speaking up

**Owner decision: freely.**

- Agents speak up whenever they notice something useful, without waiting to be asked.
- They learn from reactions. Kinds of interruptions the user ignores or waves off happen less; ones the user acts on keep coming.
- "Not now" or "quiet until 6" pauses every agent. Urgent things (deadlines, things only the user can do) still get through.
- When several agents have something to say at once, their messages arrive as one bundle.

## Earned trust

Permissions are per action type (read, edit files, run commands, send messages, spend money, delete, publish), each at one of three levels: **ask first**, **act and tell**, **just act**.

- New agents ask first for anything with effects outside their own workspace.
- After 10 approvals of the same action type with no corrections, the agent proposes moving it up a level, and the user confirms with one click.
- A mistake moves that action type down a level immediately.
- Irreversible or outward-facing actions (messages sent as the user, payments, deletions, publishing) always ask, unless the user explicitly changes that for a specific action.

## Forking and merging

- A fork is a branch of an agent: it starts with the parent's memory and writes its own log. Parallel Claude Code sessions of the developer agent are forks.
- Merging is easy because logs are append-only. The fork's log joins the parent's, and sleep reconciles the derived memory as if the agent had done several things in one day.
- Opposite lessons are kept side by side with their scope and evidence. Sleep tries to explain the difference (usually different contexts); if it can't, both drop to low confidence and the conflict is flagged.
- Identity: an agent is its charter plus its memory lineage. A merged fork is the same agent. A fork that's never merged can become a new agent with its own name.

## Where agents live

- **v1: the user's PC.** A small background service runs the agents and the memory engine, and Claude Code connects to it through hooks and MCP. Agents wake on schedules, events (file changes; later, new email or calendar events) or the user. When the PC sleeps, agents sleep, and missed schedules run on wake.
- **v2: an always-on host** (a small cloud server or a home machine) for agents that must act while the PC is off. Same code.
- **Several devices:** one memory, synced through an encrypted private git remote. Logs are append-only, so syncing them never conflicts, and sleep rebuilds derived memory after a sync. The phone is a window onto the agents, not a second brain.

## Alternatives considered

- **One general agent.** Simpler, but it needs one charter and one set of permissions for everything: the coding agent would hold the keys to email. Separate agents keep charters short and permissions narrow, and sharing everything keeps them from being strangers to each other.
- **Separate memories per agent.** Stronger isolation, but the user would have to repeat themselves to every agent. The Owner chose to share everything.
- **Agents in the cloud from day one.** Always on, but the user's memory would live on someone else's machine before per-memory encryption exists ([RFC 0001](0001-memory.md#forgetting-for-real)). The always-on host comes in v2.
- **Fixed permissions.** Either too timid to be useful or too free to be safe. Earned trust starts cautious and widens only with evidence.

## Risks & security

- **Shared memory is shared exposure.** With everything shared, one compromised agent can read all memory. Untrusted content is stored as information, never as instructions ([RFC 0001](0001-memory.md#poisoning)). Sensitive information about other people never goes into outgoing messages without the user's OK. Outward-facing and irreversible actions always ask first.
- **Earned trust can be gamed.** An agent could pile up approvals on trivial actions. Approvals count per action type, one mistake demotes immediately, and irreversible actions never promote on their own.
- **Speaking up freely can turn into noise.** Agents learn from the user's reactions, "Not now" pauses every agent, and simultaneous messages arrive as one bundle.
- **The background service runs with the user's permissions.** It acts only through each agent's trust levels, and every action lands in that agent's log ([RFC 0001](0001-memory.md#write-path)).

## Open questions

None blocking. The agent problems P15–P19 are decided ([open problems](../ideas/open-problems.md)). Building starts after the memory MVP ([RFC 0001](0001-memory.md#mvp)).

## Small decisions

Made by agents; the Owner can overturn any of them.

- Promotion after 10 clean approvals of the same action type; demotion after one mistake.
- One background service per machine; agents are folders, not processes.
- Forks merge at the end of their session.

## MVP

1. Agent folders and templates; the developer agent on Claude Code.
2. The background service, with schedules.
3. Trust levels with one-click promotion.
4. Parallel Claude Code sessions as forks, merged at session end.

Later: the assistant agent, event triggers, speaking up, the always-on host, multi-device sync.
