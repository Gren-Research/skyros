# RFC 0001: Memory that forgets nothing

- **Status:** Accepted (2026-10-10)
- **Created:** 2026-10-09
- **Updated:** 2026-10-10: added accepted ideas 1–7 from the [ideas ledger](../ideas/memory.md), decisions on [open problems](../ideas/open-problems.md) P1–P14, and the Owner's 120-day raw-log retention

## Summary

**Recall like a human, store like a machine.**

Day to day, an agent remembers the way a person does. Memories surface on their own when a cue appears: a name, a file, a topic. The outline comes first, and details only on demand. Memories that matter more are stronger and easier to reach. Underneath, the agent keeps a complete record of the last 120 days, and the exact lines behind every memory for good, so any memory can be traced back to the moment it came from.

Memory is plain files in a private git repository, owned by the user and portable across models. How well the agent recalls, and how well it knows its user, is measured continuously.

## Motivation

Today's assistants start every session blank, or with a thin layer of saved notes that the model has to search on purpose. But an agent can't search for something it doesn't know it knows. We want agents that know their user and their work the way a long-time colleague does: they recall the right thing at the right moment without being asked, and keep getting better for years, across model upgrades and vendor changes.

## What "forgets nothing" means

A context window is finite, so "forgets nothing" can't mean "everything is always in context". It means four guarantees:

| Guarantee | Meaning | Mechanism |
|---|---|---|
| **Capture** | Nothing the agent sees or does is lost. The full record is kept for 120 days, and every memory keeps the exact lines it came from for good. | The harness, not the model, appends every event to the log |
| **Recall** | Anything recorded can be found again, with its source | Cue-triggered hints, deliberate search, and exact search over the log |
| **Relevance** | What matters now comes to mind without being asked for | Core memory at the start of every session; cues surface the rest when needed |
| **Currency** | When facts change, the agent knows what's true now *and* what was true before | Notes are superseded with validity dates, never edited in place |

Two corollaries:

- **The log is the source; memories are built from it.** Curated memory is lossy by design. Every memory links to the log, and before the log expires after 120 days (Owner decision), it saves the exact lines it cites. Inside the window, memories can be rebuilt from scratch, for example by a better model.
- **Forgetting nothing doesn't mean recalling everything.** Like a person's, some of the agent's memories are hard to reach because they're rarely used or never cued. Hard to reach isn't gone: a strong enough cue or a deliberate search still finds them.

## Memory layers

| Layer | Human analogy | Holds | Reached by |
|---|---|---|---|
| **Working** | Attention | The current context window | It *is* the context |
| **Core** | Identity | Who the agent is, who the user is, preferences, active goals, standing rules (~2k tokens) | Loaded every session |
| **Episodic** | Autobiography | Every session, cut into events and threads | Cues, search, recent events at start |
| **Semantic** | Knowledge | Notes on facts, people, projects and decisions, each with source, validity dates and strength | Cues, search |
| **Procedural** | Skills, habits | How-tos, playbooks, lessons learned, feedback ("don't do X, because Y") | Cues, plus an index at start |
| **Prospective** | "Remember to…" | A to-do list. Each item fires on a date or on a cue ("next time Sam comes up, ask about the budget") | Its trigger |

## Units of memory

The raw log is a continuous stream. Sleep cuts it into units of three sizes, all linked:

| Unit | What it is | Example |
|---|---|---|
| **Event** | One stretch of activity about one thing. The log is cut wherever the topic or task changes, at pauses over 30 minutes, and at session boundaries. Every log line belongs to exactly one event. | "Debugged the Safari login failure, 14:05–14:50" |
| **Thread** | The events about one task or thing across sessions, in order, with their own summary and an open or closed status. | "The Safari login bug" (3 events over 2 days) |
| **Note** | One self-contained statement: a fact, preference, decision, lesson or to-do. Each note cites the events and lines it came from. | "Atlas has used SQLite since 2026-09-02" |

One moment can feed several units. The debugging event belongs to the bug thread, and the sister's wedding mentioned during it becomes its own note citing that event. Hints prefer notes (short), then threads ("what happened with…"), then events.

## Entities and keywords

Keywords belong to **entities**: the people, projects, files, places, organizations, topics and tools in the user's life. Each entity has a stable ID (`person/sam-k`, `org/apple`, `file/auth.ts`). Memories link to entities, and entities carry the keywords.

- **Many keywords per entity** (Owner decision): names, nicknames, synonyms, brands, broader categories and related terms. `car/tesla-model-3` carries `car`, `Tesla`, `Model 3`, `motor vehicle` and `my ride`.
- **Strong and weak keywords.** Exact names, file paths and rare aliases are strong: they can surface a hint alone. Categories and common words (`motor vehicle`, `code`) are weak: they only add activation, and need another cue before anything surfaces. Weights come from rarity (the fan effect) and are recomputed nightly.
- **One word, many meanings.** When a keyword fits several entities ("Apple", "Python", two Sams), the cue detector picks one by context: the active project, other entities mentioned nearby, how closely the recent conversation matches each entity's description, and how recently each entity came up. If no candidate clearly wins, nothing surfaces, and deliberate search is still available.
- **Learning.** A keyword that keeps surfacing the wrong entity in some context loses weight in that context.
- **Names change.** Aliases have validity dates: "Atlas" until 2026-11-02, "Orion" after. Roles do too: "my manager" means `person/sam-k` until December 2026 and `person/priya-r` after. A reference is resolved using the date it was said. Renames are picked up from git (moved files), from statements ("we renamed Atlas to Orion"), and by sleep noticing two names for one thing.
- **Relative references** ("yesterday", "that bug", "he") are resolved during sleep into absolute ones (dates, entity IDs) using the surrounding log. The original wording is kept beside the resolution. If sleep isn't confident, the reference is marked unresolved rather than guessed.

## Recall

### Cue-triggered recall (the core)

Memories come to the agent; it doesn't have to go looking for them.

- **Cue detection.** Every event is checked for keywords: user messages, agent messages, tool calls, files opened, commands run. The check is string matching plus small local embeddings, so it takes milliseconds and needs no LLM call. The agent's actions are cues too: opening `auth.ts` is as strong a cue as saying "auth".
- **Activation.** Matching memories are scored the way cognitive models of human memory score them (ACT-R):
  - recently and often used memories are easier to reach;
  - strong and rare keywords count more than weak and common ones;
  - activation spreads to linked memories, fading at each hop;
  - a memory's [strength](#strength) adds in.
- **Hints, not dumps.** Only memories above a threshold surface, each as a one-line hint with its date, source and trust level: *"💭 Oct 3: changing auth.ts broke login on Safari."* Hints clear after the turn, like a passing thought.
- **Pull the thread.** The agent can expand a hint into the full memory, and the full memory into its source lines.
- **Re-tagging.** When a memory turns out to matter in a context it had no keywords for, it gains that context's keywords.
- **Trust.** Hints from untrusted sources are shown as information, never as instructions.

Hints enter the conversation between steps: after the user's message and after each tool call. Claude Code runs hooks at exactly those points. Claude's API also has a beta for mid-conversation system messages that clear after one turn. Other providers need an adapter.

### Feeling of knowing

Each agent keeps a small table of contents of what it has memories about ("Project Atlas: 47 memories, last one a week ago"), loaded at the start of every session. It knows when digging is worthwhile, and can honestly say "you never told me".

### Deliberate and deep recall

- **Search.** When the agent knows it needs something, it searches memory by keyword, meaning, link, time and scope.
- **Raw log.** When curated memory isn't enough, it searches and reads the raw log (the last 120 days) and the saved source lines (everything older): exact text, with dates.
- **Sources.** The agent cites the memories it relies on (`[m:7f3a]`), so the user can see where things came from and correct them.

## Strength

A memory's strength decides how easily cues reach it. Strength never affects whether a memory is stored.

- **Use.** Memories used recently and often are stronger; unused ones drift out of easy reach. A memory is strengthened only when it was actually used, not just shown.
- **Surprise.** A note that contradicts what the agent knew, or couldn't have been predicted from it, is stored stronger ("you've always used TypeScript; today you said you're switching to Rust"). Surprise that's never confirmed again decays.
- **Emotion.** Moments when the user was clearly frustrated, delighted or worried are stored stronger, so the agent doesn't repeat what upset them. Emotion is one signal among several, never the only one.

### How use is detected

1. **Citations.** The agent cites the memories it relies on.
2. **Actions.** After a hint, actions that touch the hint's entities (opening the file, mentioning the person) count as weak evidence.
3. **Sleep review.** During sleep, a small model reads each turn where hints appeared and labels each hint *used*, *ignored* or *misleading*. This label is the one that counts; citations and actions are fast provisional signals.
4. **Corrections.** When the user corrects something a memory caused ("no, that's outdated"), the memory is marked wrong or outdated and reviewed.

### How surprise is measured

During sleep, before a new note is stored, a model predicts it from memory as it stood *before* the session ("which language will the new project use?" → "TypeScript"). The gap between the prediction and reality ("Rust"), weighted by how confident the prediction was, is the surprise. Contradicting a confident existing note also counts.

### How emotion is read

A small model rates each user message for intensity and kind (frustrated, delighted, worried, neutral) against the user's own baseline: someone who always writes in capitals isn't always angry. Only intensity above the baseline adds strength, and the boost is capped.

## Learning from use

### Linked by use

When memories help with the same task, the link between them strengthens ("fire together, wire together"). Links that aren't reinforced decay. Over time, memory organizes itself around how the user actually works.

### Predict, then compare

At real decision points the agent privately predicts what the user will say or choose, then compares with what actually happens. Misses are the most valuable things to learn from.

- **Prediction points** have checkable outcomes. Will the user accept this plan, draft or PR as-is? Which of the offered options will they pick? Will they edit the draft, and how (shorter, warmer, more formal)? Will they act on it today? Sleep adds hidden-note predictions (see *How surprise is measured*).
- **Fair scoring.** Predictions are made before the agent shows its own suggestion. Decisions where the agent recommended something are scored separately, so "you took my advice" doesn't inflate the score.
- **The know-me score** is rolling accuracy per area ("coding choices 81%, scheduling 62%"). Discrete outcomes are scored exactly; free-form ones are scored by a judge model as 0, ½ or 1.
- Predictions are never used to steer the user, the feature can be switched off, and the score is a diagnostic, not a goal.

### Lessons stay the right size

- Every lesson has a scope (this function, this file, this project, everywhere) and a record of the times it held and the times it didn't.
- A new lesson starts at the narrowest scope that explains the mistake. It widens only after holding true in two independent places, and narrows when contradicted.
- Confidence decays without reconfirmation, and counter-evidence (ten clean edits of `auth.ts`) lowers it. Low-confidence lessons stop appearing as warnings and become background notes.
- Lessons are written as checks ("after editing auth.ts, test Safari login"), not fears ("avoid auth.ts").

## Write path

1. **Capture, always.** The harness appends every message, tool call, tool result and file change to the session log. This doesn't depend on the model choosing to save anything.
2. **Explicit memory, during a session.** The agent has tools to remember, update and supersede memories, for "remember that…" and for things it judges important. Before the context is compacted, the agent is prompted to save anything that matters.
3. **Sleep, after each session and nightly.** A background job:
   1. cuts the new log into events and attaches them to threads;
   2. resolves relative references into dates and entities;
   3. extracts notes: facts, decisions, preferences, lessons and to-dos;
   4. links notes to entities, adding new entities and keywords as needed;
   5. scores surprise and emotion, and labels which hints were used;
   6. reconciles with existing memory (see [Time and change](#time-and-change));
   7. updates core memory (within its budget) and the table of contents;
   8. **dreams** (below);
   9. resurfaces neglected memories, so strong memories don't crowd out the rest;
   10. audits for drift (below);
   11. saves the source lines of memories whose logs are about to expire;
   12. commits everything to git with a message describing what was learned.

   `git log` becomes "what did my agent learn today?", and `git diff` shows exactly what changed in its mind.

**Dreaming.** Each new memory is compared with a small set of old ones: its closest matches in meaning, memories that share its entities, memories about the same kind of problem, and a few random ones for serendipity. That's about 25 comparisons per new memory, not every possible pair. Real connections ("this bug is the same one as in March") are stored as hypotheses with evidence. A dream is confirmed when it's later used successfully, when the user agrees with it as it surfaces, or when new evidence matches. Unconfirmed dreams stop surfacing after 90 days.

**No telephone game.** A memory is always rebuilt from its sources plus the new evidence, never from its previous version alone. The sources are the raw log while it's kept, and the saved source lines after that. Thread and period summaries are for navigation only; notes never come from them. Each night, a random sample of memories still inside the 120-day window is rebuilt from the raw log and compared with the stored version, differences are fixed, and the drift rate is tracked. When a better model arrives, the last 120 days can be rebuilt in full, and everything older from its saved source lines.

## Time and change

Notes are never edited in place. Each one carries `valid_from`, `valid_to`, `recorded_at`, `source` and `confidence`. A change supersedes the old note:

```
project/atlas/database = Postgres   valid 2026-01-10 → 2026-09-02   source: session 2026-09-02 #L88
project/atlas/database = SQLite     valid 2026-09-02 → now          source: session 2026-09-02 #L88
```

The agent can answer "what does Atlas use?", "what did it use in March?", and, by following the source, "why did we switch?". Git history is a second, independent record of every change.

**Contradictions.** When a new statement conflicts with an existing note, sleep classifies it:

| Kind | Example | What happens |
|---|---|---|
| **Update** | "I switched to Rust" | The old note is superseded, with dates |
| **Context** | "I hate meetings" and "I love our Friday standup" | Both stay true, each scoped to its context |
| **Moment** | One angry message | Kept as a moment in its event, not as a lasting preference, unless it repeats |
| **Unclear** | Possible sarcasm | Both kept, with lower confidence |

The agent asks about an unclear contradiction only when it needs the answer to act, never just to tidy its memory.

**You'll change.** Preferences, opinions and habits lose influence over time unless they're reconfirmed; hard facts like birthdays don't. Recent behavior outweighs old statements. The agent never brings up what you used to think against you, unless you ask. Once a year, sleep rebuilds the user profile from the last twelve months and keeps the old one as history, so there is a picture of you for every year.

## Day one

The agent shouldn't start from zero, and the user shouldn't have to do homework.

1. **Import what's already on the machine**, each source opt-in: past Claude Code sessions (`~/.claude/projects/`), Claude Code's memory files, and the git history of the user's repositories. Imports keep their original dates and go through sleep like any other log.
2. **Import exports the user downloads**, opt-in: ChatGPT and Claude.ai data exports, notes.
3. **A short first conversation**, optional, about 10 minutes: who you are, what you're working on, the people who matter, how you like to work.
4. **Learn as you go.** Everything else accrues naturally, and the feeling of knowing lets the agent say "I don't know this yet" honestly.

The importer reads whatever Claude Code still has. Claude Code keeps 30 days of sessions by default, and that setting stays as it is (Owner decision).

## Storage

- **Source of truth: plain files.** Markdown with front matter for notes, events, threads and entities (including keywords); JSONL for logs. They live in a private git repository *outside* the public code repository. Readable and editable by hand, diffable, portable across tools and vendors, and likely to outlive any database or API.
- **Retention** (Owner decision). Raw logs are kept for 120 days. Before a log expires, sleep makes sure every memory built from it has saved the exact lines it cites, and then the log is deleted. Notes, events, threads and their source lines are kept for good. The window can grow as storage techniques improve.
- **Index: SQLite** with full-text search (FTS5) and vectors (`sqlite-vec`), holding keywords, links, strengths and search data. It's derived and disposable: it can be rebuilt from the files at any time. Learned state (strengths, links) is recomputed from usage events, which are kept with the memories, so nothing learned lives only in the index.
- **Backups.** Losing the disk is also forgetting. Backups are encrypted (see [Forgetting for real](#forgetting-for-real)) and kept off the machine.

Sketch:

```
~/.skyros/                       # private; never inside the public repo
  agents/
    assistant/
      charter.md                 # identity, job, boundaries, tone
      permissions.yaml           # tools, memory scopes, trust levels
      triggers.yaml              # schedules and events that wake it
      core.md                    # always loaded, budgeted
      contents.md                # table of contents: what it has memories about
      notes/  threads/  skills/  todo.md
      log/2026/10/09-<session-id>.jsonl    # raw, kept 120 days
      events/2026/10/09.md                 # kept for good, with source lines
    developer/ ...
  shared/
    user/profile.md              # the user; shared by all agents (RFC 0004)
    entities/                    # people, projects, files… with aliases and validity dates
    projects/<name>/
  index.sqlite                   # derived; rebuildable
```

## Many agents, separate minds

Each agent writes its own memory, and every agent can read what the others know (Owner decision: share everything). How disagreements between agents are settled, and how forks merge back, are in [RFC 0004](0004-agents.md).

## Safety

### Poisoning

- **No secrets in memory.** A secret scanner on the write path redacts passwords, keys, tokens and card numbers before anything is stored; a secret written once would replay into every future session.
- **Memory poisoning is the top threat.** A prompt injection that reaches long-term memory becomes permanent. Every memory records its source and trust level. Content from untrusted sources (web pages, emails, documents, other people) is stored as *information about* the world, never as *instructions*, and can't enter core memory or rules without the user's confirmation.
- **Sleeper memories.** A poisoned memory can lie dormant until its keyword appears. Every hint carries its source and trust level, and untrusted memories can't act as instructions.
- **Reviewed changes to identity.** Changes to core memory, charters and standing rules are proposed as diffs. Low-impact ones apply automatically; high-impact ones wait for the user, like a pull request for the agent's mind.

### Forgetting for real

- **Cascade.** Every derived memory records its sources, so "forget that" finds everything built from it (notes, summaries, links, dreams, predictions, the index) and rebuilds or deletes each one. A tombstone records that something was deleted and when, never what.
- **On the machine,** the content is redacted from the log and saved source lines, and the private memory repository's git history is rewritten to remove it.
- **Off the machine,** anything that leaves (sync, backups) is encrypted with a separate key per memory and per log segment. Deleting means destroying those keys, so old copies in backups become unreadable without being touched.
- **Off the record.** The user can say "off the record": nothing is stored until they say otherwise, and the log records only that a gap exists.
- The user's explicit "forget this" always beats "forget nothing".

### Other people

- Information about other people is linked to their entity, and marked sensitive when it touches health, relationships, money, legal matters or secrets.
- Sensitive information about others never leaves the user's private memory and is never put into outgoing messages without the user's OK.
- "What do you know about Sam?" shows everything stored about a person, and any of it can be deleted.

## Measuring it

"Forgets nothing" and "knows me" are claims, so test them:

- **Recall tests.** Questions with known answers and sources, generated during sleep plus hand-written cases. Categories follow LongMemEval: single-session recall, multi-session reasoning, temporal reasoning ("before or after?"), knowledge updates (returns the newest note), and abstention (says "I don't know" when it was never told).
- **Cue tests.** Replay past sessions and check that the right hints surfaced, and only those.
- **Hint quality.** The share of hints labeled *used* versus *ignored* or *misleading* by the sleep review.
- **Drift rate.** How often a memory rebuilt from the raw log differs from the stored one.
- **Know-me score.** The accuracy of predict-then-compare over time.

Tests run on synthetic data in CI (never real memories) and on real memory locally. A change that lowers recall doesn't merge.

## Small decisions

Made by agents unless marked; the Owner can overturn any of them.

- Raw logs are kept for 120 days; memories and their source lines are kept for good (Owner decision).
- At most 5 hints per turn; activation spreads at most 3 hops.
- Core memory starts with a ~2k-token budget, tuned with the recall tests.
- Events are cut at topic changes, task changes, session boundaries and pauses over 30 minutes.
- Preferences have an influence half-life of about six months unless reconfirmed.
- Dreaming: about 25 comparisons per new memory per night; unconfirmed dreams stop surfacing after 90 days.
- Lessons widen after two independent confirmations.
- Sleep uses the agent's own model for judgment and a small model for bulk labeling, configurable per scope.
- Encryption with per-memory keys is required before any memory leaves the machine.

## Prior art (borrow ideas, own the format)

- **ACT-R** (John Anderson): memory activation from recency and frequency, spreading activation from cues, and the fan effect.
- **HippoRAG** (2024): hippocampus-inspired retrieval that spreads activation over a knowledge graph.
- **Prospective memory research:** event-based intentions ("when I see X, do Y").
- **Letta / MemGPT:** core memory blocks the agent edits itself; background "sleep-time" agents that consolidate.
- **Mem0:** extracting facts from conversations and reconciling them (add / update / delete / no-op).
- **Zep / Graphiti:** a temporal knowledge graph with validity intervals on facts.
- **Generative Agents** (Park et al., 2023): a memory stream; retrieval by recency × importance × relevance; reflection.
- **Claude Code:** `CLAUDE.md` project memory and file-based auto memory.
- **Claude API:** the client-side memory tool (`memory_20250818`, a `/memories` directory backed by your own storage). Managed Agents **memory stores** (beta) are mounted as files, and every change is versioned and redactable. That is close to the storage side of this design and a candidate *backend*, but the source of truth stays in files the user owns.
- **Benchmarks:** LongMemEval, LoCoMo.

What's new here: recall triggered by cues in both words and actions, with gist-first hints that fade; strength from use, surprise and emotion; memory that reorganizes itself through use and dreaming; a measurable "knows me" score; provenance on every memory.

## MVP

1. **Capture.** Every session lands in the JSONL log. Claude Code passes each session's transcript path to hooks, so a `SessionEnd` hook copies the transcript into the log.
2. **Day-one import** of past Claude Code sessions.
3. **Core and table of contents**, injected at session start (a `SessionStart` hook).
4. **Sleep v1.** Events, notes, entities and keywords as Markdown with front matter, committed to git, with source lines saved before logs expire.
5. **Cue hints v1.** Strong-keyword matching on user prompts and tool calls, with context disambiguation; scoring from recency and keyword rarity; one-line hints through Claude Code hooks; citations.
6. **Search.** An MCP server with `search_memory`, `read_episode` and `remember` tools: full-text search (SQLite FTS5) plus grep over the log.
7. **Tests.** 30 recall questions, and a cue test that replays past sessions.

Result: Claude Code becomes the first developer agent that doesn't start blank, and any other MCP-capable tool can use the same memory.

Later: weak keywords and meaning-based matching, spreading over links, use-based strength, surprise and emotion, linked by use, dreaming, predict-then-compare, scoped lessons, cue-triggered to-dos, the forgetting cascade (until then, deletion is manual), encryption, per-scope permissions.

## Open problems

The memory problems in [open-problems.md](../ideas/open-problems.md) (P1–P14) are decided in this document. Agent problems (P15–P19) are decided in [RFC 0004](0004-agents.md).
