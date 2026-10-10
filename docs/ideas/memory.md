# Memory ideas ledger

Working notes for the memory design. The Owner proposes ideas, agents point out the problems in them, and together we decide. Accepted ideas move into [RFC 0001](../rfcs/0001-memory.md). Unsolved problems live in [open-problems.md](open-problems.md).

**Verdicts:** ✅ keep · 🔧 keep with changes · 🧊 later · ❌ drop · ❔ waiting for the Owner

**Working thesis:** *recall like a human, store like a machine.* Day to day, the agent remembers like a person does: driven by cues, associative, gist first, fading. Underneath, a lossless record means nothing is ever truly lost.

| # | Idea | From | Verdict | Status |
|---|---|---|---|---|
| 1 | Cue-triggered recall, with many keywords per memory | Owner | 🔧 keep with changes | In RFC 0001 |
| 2 | Reminders that fire on a cue | Agent | ✅ keep, as a simple to-do list | In RFC 0001 |
| 3 | Surprise and emotion decide strength | Agent | ✅ keep | In RFC 0001 |
| 4 | Feeling of knowing | Agent | ✅ keep | In RFC 0001 |
| 5 | Memories used together link together | Agent | ✅ keep | In RFC 0001 |
| 6 | Dreaming | Agent | ✅ keep | In RFC 0001 |
| 7 | Predict, then compare | Agent | ✅ keep | In RFC 0001 |

## 1. Cue-triggered recall (Owner)

**Idea.** Tag each memory with words. When the user mentions a word, or the agent thinks of it, pull the related memories, then the memories related to those, and so on. That way the agent doesn't load every memory every time.

**Why it's strong.** This is how human recall works: a name, a place or a smell brings back a memory you weren't looking for. It also fixes the biggest weakness of search-based memory: an agent can't search for something it doesn't know it knows. With cues, relevant memories surface on their own.

**Issues found in round 1, and the changes adopted:**

| | Issue | Change |
|---|---|---|
| a | **Word mismatch.** You say "car" but the memory is tagged "Tesla" or "my ride". | Tag *things* (people, projects, files, places, topics) along with all their aliases, and match on meaning as well as exact words. |
| b | **Guessing future cues.** If the right tag isn't added when the memory is saved, the memory can never be reached. | Tag automatically with many cues: who, what, where, when, which project, which files, mood. Add new cues later, whenever a memory turns out to matter in a new context. |
| c | **Common words flood.** "Code" or "today" would pull thousands of memories. | Rare cues count more than common ones (the "fan effect"). |
| d | **"And so on" runs away.** Chains drift like daydreaming and flood the context. | Activation fades with each hop. Only memories above a threshold surface, with a cap on hops and on hints per turn. |
| e | **The agent's thoughts can't be read mid-sentence.** | Watch what the agent *does*: messages, tool calls, files, commands. Check cues between steps. |
| f | **Wrong memories distract.** | Surface one-line hints, not full memories; the agent pulls the full memory if it wants it. Hints fade after the turn. |
| g | **Sleeper injections.** A poisoned memory waits for its trigger word. | Every hint carries its source and trust level; untrusted memories can never act as instructions. |
| h | **Rich get richer.** Memories that surface get reinforced and crowd out the rest. | Strengthen only memories that were actually used; resurface neglected ones during sleep. |

**Owner decision (2026-10-10).** Every memory keeps many keywords, not just one: `car`, but also `Tesla`, `motor vehicle` and other related words.

**Verdict:** 🔧 keep with changes. Design: [RFC 0001 → Recall](../rfcs/0001-memory.md#recall).

## 2. Reminders that fire on a cue (agent proposal)

"Next time Sam comes up, remind me about the budget." "When I next open the payments repo, mention the key rotation." An intention waits for its cue. Humans have exactly this ability (event-based prospective memory).

**Owner (2026-10-10):** "It's just a simple to-do." Agreed: it's a to-do list where an item can wait for a cue instead of a date. A small feature, not a headline.

**Verdict:** ✅ keep. Design: [RFC 0001 → Memory layers](../rfcs/0001-memory.md#memory-layers) (Prospective).

## 3. Surprise and emotion decide strength (agent proposal)

People remember surprises and emotional moments best. A fact that contradicts what the agent expected gets stored stronger ("you've always used TypeScript; today you said you're switching to Rust"). So does a moment when the user was clearly frustrated or excited, so the agent never repeats what made them angry.

**Notes from the proposal:** surprises that are never confirmed again decay; emotion is a modest weight, never the only signal.

**Verdict:** ✅ keep. Design: [RFC 0001 → Strength](../rfcs/0001-memory.md#strength).

## 4. Feeling of knowing (agent proposal)

The agent keeps a tiny table of contents of what it has memories about ("Project Atlas: 47 memories, last one a week ago"). It knows when to dig deeper, and can honestly say "you never told me".

**Verdict:** ✅ keep. Design: [RFC 0001 → Recall](../rfcs/0001-memory.md#feeling-of-knowing).

## 5. Memories used together link together (agent proposal)

When two memories help with the same task, the link between them strengthens ("fire together, wire together"). Over time the memory graph organizes itself around how the user actually works.

**Notes from the proposal:** links decay unless they're reinforced.

**Verdict:** ✅ keep. Design: [RFC 0001 → Learning from use](../rfcs/0001-memory.md#learning-from-use).

## 6. Dreaming (agent proposal)

During sleep, the agent looks for connections between new and old memories ("this bug is the same one as in March") and stores them as hypotheses with their evidence.

**Notes from the proposal:** dreams stay labeled as hypotheses until confirmed.

**Verdict:** ✅ keep. Design: [RFC 0001 → Write path](../rfcs/0001-memory.md#write-path).

## 7. Predict, then compare (agent proposal)

Before the user answers or decides, the agent quietly predicts what they'll say or choose, then compares with what actually happened. Misses are the most valuable things to learn from. Accuracy over time becomes a measurable "how well do I know you" score.

**Notes from the proposal:** predict only at real decision points; predictions stay private and can be switched off; they're never used to steer the user, and the score is a diagnostic, not a goal.

**Verdict:** ✅ keep. Design: [RFC 0001 → Learning from use](../rfcs/0001-memory.md#learning-from-use).
