# RFC 0002: Research Discussion

- **Status:** Deferred. Needs more refinement; memory and agents are built first.
- **Created:** 2026-10-09

## Summary

A Research Discussion is a structured, live conversation between several agents, on different models, with different roles and their own memories, aimed at inventing or discovering something. Ordinary sub-agents work alone and only report back to a parent. Here, participants see and respond to each other during the work: they propose ideas, attack each other's flaws, test claims, and build on what survives. The output is a research brief with dissent preserved, and everything is remembered for next time.

## Motivation

One model thinking alone has one set of blind spots. Human research moves forward through argument: proposal, objection, evidence, revision. We want that loop between AI agents, with the user able to join at any time.

## What goes wrong in multi-agent discussion

Design against these from day one:

1. **Conformity.** Agents converge on the first confident idea. Copies of the same model share blind spots, so their agreement means less than it looks.
2. **Degeneration of thought.** Once an agent commits to a view, it stops exploring (Liang et al., 2023).
3. **Persuasion isn't truth.** The most fluent argument wins unless claims must be backed by evidence.
4. **Cost and context blow-up.** N agents × R rounds × a growing transcript.
5. **Debate isn't automatically better.** Several studies found that multi-agent debate often doesn't beat simpler baselines, such as majority vote over independent answers, on standard benchmarks. Its value has to come from generating and stress-testing new ideas, and we have to measure it.
6. **Drift.** The discussion wanders off the question.

## Design

### A shared blackboard, not a chat log

Participants communicate through a shared, structured board. Every contribution is a typed post:

| Type | Purpose |
|---|---|
| `IDEA` | A proposal or hypothesis |
| `CRITIQUE` | Names a specific flaw in a specific post |
| `QUESTION` | Asks for clarification or evidence |
| `EVIDENCE` | A citation, calculation, experiment or code result |
| `BUILD` | Extends, combines or repairs earlier ideas |
| `VERDICT` | A ranking or decision, with reasons |
| `SUMMARY` | The current state of the discussion |

Posts have an id, an author (hidden during critique), targets, and a confidence. Each agent sees the current summary plus the threads relevant to it, not the entire transcript, which keeps context bounded.

### Roles

| Role | Job |
|---|---|
| **Moderator** | Frames the question, runs the phases, picks speakers, enforces the rules, detects stagnation and drift, decides when to stop. Doesn't propose ideas. |
| **Explorers** (2–4) | Generate ideas from different model families and different lenses: first principles, analogies from other fields, contrarian, pragmatic engineer. |
| **Critic** | Tries to break ideas. Judged by the real flaws it finds. |
| **Verifier** | Grounds claims: runs code, math and simulations, searches the literature, checks citations and novelty ("has this been done?"). The only role that can mark a claim `verified`. |
| **Scribe** | Maintains the running summary, writes the final brief, and files it in memory. |
| **The user** | Can join at any point to add ideas, steer, or veto. |

### Protocol

0. **Frame.** The Moderator and the user agree on the question, what counts as success, constraints, and a budget.
1. **Diverge, privately.** Each Explorer produces ideas alone, without seeing the others. This prevents anchoring, as in brainwriting and the Delphi method.
2. **Reveal and cross-examine.** Ideas are posted anonymously. Every participant must raise at least one substantive critique or question about others' ideas; authors respond.
3. **Build.** Combine, mutate and repair the surviving ideas.
4. **Ground.** The Verifier tests the claims that matter. Unbacked claims are labeled speculative.
5. **Rank.** A pairwise tournament or a rubric: novelty, plausibility, impact, testability, evidence.
6. **Converge.** The Scribe writes the brief.

Steps 2–5 repeat until a stop condition is met.

### Rules against conformity

- Independent first drafts before anyone sees anyone else's ideas.
- Anonymous authorship during critique, so no one defers to the "smart" model.
- Changing your position requires citing what changed your mind: a post id with evidence or an argument. No "great point, I agree" without a reason.
- Mixed model families by default.
- When consensus forms quickly, the Moderator asks for the strongest case against it.
- Dissent is recorded, never erased: every brief has a **minority report**.

### How agents talk during the work

- **v1: synchronous rounds.** An orchestrator gives each participant the board, collects their posts, and repeats. Simple, deterministic, and easy to debug and replay.
- **v2: live message bus.** Participants run concurrently with `post` and `read_inbox` tools and can interrupt each other with a `CRITIQUE` or `QUESTION` while work is in progress. For example, Explorers keep going while the Verifier runs an experiment. The Moderator arbitrates. Side conversations are allowed but logged on the board.

### Budget and stopping

Hard caps on rounds, tokens, money and wall-clock time. Stop when the leading ideas are verified and stable, when K rounds pass with no new idea or critique, when the budget runs out, or when the user says so.

### Output: the Research Brief

The question; top ideas with evidence and confidence; the strongest objections to each; the minority report; rejected ideas and why; open questions; proposed next experiments; and links to the full transcript.

### Memory

- Each participant brings its own memory: the developer agent knows the codebase, the assistant knows the user's goals.
- The whole discussion is stored, raw and as a brief, following the memory design in RFC 0001.
- **Idea graveyard:** rejected ideas are kept with the reason, so later discussions don't repeat dead ends, and can revive an idea when new evidence appears.
- Proposed experiments become issues or tasks.

## Evaluation

Does a discussion beat one strong model given the same budget? Compare a single agent, best-of-N independent answers with voting, and a Research Discussion. Score blind, by the user and by judge models, on novelty, correctness and usefulness. Also track how many real flaws the critiques found and how many claims were verified.

## Prior art

- Multi-agent debate: Du et al., 2023 (debate improves factuality and reasoning); Liang et al., 2023 (divergent thinking, "degeneration of thought").
- Frameworks: AutoGen group chat; CAMEL role-play.
- Google's AI co-scientist (2025): generation, reflection, Elo-style ranking tournaments, evolution, meta-review.
- Karpathy's `llm-council`: models answer, review each other anonymously, and a chair synthesizes.
- Claude Managed Agents multi-agent sessions: a coordinator delegates to sub-agents that share a filesystem and report back. Hub-and-spoke, single-vendor.
- Classic: blackboard architectures (Hearsay-II), the Delphi method, brainwriting.

What's new here: persistent participants with their own long-term memory; mixed model families by design; peer-to-peer critique during the work rather than only reports to a parent; grounding through a Verifier; and a memory of dead ends across discussions.

## MVP

- A Moderator, two Explorers on different model families, one Critic, and one Scribe.
- Synchronous rounds; the board is a JSON file plus a rendered Markdown view.
- One discussion produces one brief, stored in memory.
- Run 5 real questions against a single-model baseline and compare blind.

## Open questions

1. Final feature name: "Research Discussion", "Council", or something else?
2. How do agents run experiments safely? (Sandboxing, no secrets, no network by default.)
3. How do we keep frontier-model costs in check, e.g. cheaper models for Explorers and the strongest for the Verifier and Moderator?
4. Should the user be able to pause the room and talk to one participant privately?
