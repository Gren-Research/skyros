# Open problems

Problems found while designing. Agents decide technical, everyday and coding problems themselves and record the decision in an RFC. Only creative questions go to the Owner: how to improve a feature, what to build next, and novel problems no known technique solves.

**Status:** 🟠 open · ✅ decided

| # | Problem | Decided in | Status |
|---|---|---|---|
| P1 | What is one memory? | [RFC 0001 → Units of memory](../rfcs/0001-memory.md#units-of-memory) | ✅ |
| P2 | One word, many meanings | [RFC 0001 → Entities and keywords](../rfcs/0001-memory.md#entities-and-keywords) | ✅ |
| P3 | Names change and references are relative | [RFC 0001 → Entities and keywords](../rfcs/0001-memory.md#entities-and-keywords) | ✅ |
| P4 | Contradictions with no clear winner | [RFC 0001 → Time and change](../rfcs/0001-memory.md#time-and-change) | ✅ |
| P5 | You'll change | [RFC 0001 → Time and change](../rfcs/0001-memory.md#time-and-change) | ✅ |
| P6 | Day one | [RFC 0001 → Day one](../rfcs/0001-memory.md#day-one) | ✅ |
| P7 | Was a memory actually used? | [RFC 0001 → Strength](../rfcs/0001-memory.md#how-use-is-detected) | ✅ |
| P8 | Surprised compared to what? | [RFC 0001 → Strength](../rfcs/0001-memory.md#how-surprise-is-measured) | ✅ |
| P9 | Which memories should dream together? | [RFC 0001 → Write path](../rfcs/0001-memory.md#write-path) | ✅ |
| P10 | What can "predict, then compare" grade? | [RFC 0001 → Learning from use](../rfcs/0001-memory.md#predict-then-compare) | ✅ |
| P11 | The telephone game | [RFC 0001 → Write path](../rfcs/0001-memory.md#write-path) | ✅ |
| P12 | Over-learned lessons | [RFC 0001 → Learning from use](../rfcs/0001-memory.md#lessons-stay-the-right-size) | ✅ |
| P13 | Forgetting for real | [RFC 0001 → Safety](../rfcs/0001-memory.md#forgetting-for-real) | ✅ |
| P14 | Other people's secrets | [RFC 0001 → Safety](../rfcs/0001-memory.md#other-people) | ✅ |
| P15 | Forking and merging an agent | [RFC 0004 → Forking and merging](../rfcs/0004-agents.md#forking-and-merging) | ✅ |
| P16 | What crosses between agents | [RFC 0004 → Sharing](../rfcs/0004-agents.md#sharing) (Owner: share everything) | ✅ |
| P17 | When to speak up | [RFC 0004 → Speaking up](../rfcs/0004-agents.md#speaking-up) (Owner: freely) | ✅ |
| P18 | Earned trust | [RFC 0004 → Earned trust](../rfcs/0004-agents.md#earned-trust) | ✅ |
| P19 | Where agents live | [RFC 0004 → Where agents live](../rfcs/0004-agents.md#where-agents-live) | ✅ |

## The problems, as first written

Kept for the record.

- **P1. What is one memory?** A conversation is a continuous stream. Where does one memory start and end: a sentence, a session, or a bug hunt that spans three days?
- **P2. One word, many meanings.** "Apple", "Python", two people called Sam. Every extra keyword also brings more wrong matches.
- **P3. Names change and references are relative.** Projects get renamed, files move, "my manager" changes, and "like we did yesterday" means nothing a month later.
- **P4. Contradictions with no clear winner.** A change of mind, two contexts, a mood, or sarcasm?
- **P5. You'll change.** When should the past stop shaping what the agent does, without being forgotten?
- **P6. Day one.** How does the agent learn the user's life so far without hours of homework?
- **P7. Was a memory actually used?** Models can use a memory silently, or mention one and ignore it.
- **P8. Surprised compared to what?** Surprise needs an expectation; emotion has to be read from text alone.
- **P9. Which memories should dream together?** A million memories make half a trillion pairs.
- **P10. What can "predict, then compare" grade?** Most of life isn't multiple choice, and the agent's suggestions influence the user.
- **P11. The telephone game.** Memories rewritten every night for years drift from what happened.
- **P12. Over-learned lessons.** One bad bug, and the agent is nervous about a file forever.
- **P13. Forgetting for real.** "Forget that" when it has spread into summaries, links, other agents, git history and backups.
- **P14. Other people's secrets.** People mentioned to the agent never agreed to be remembered.
- **P15. Forking and merging an agent.** Parallel copies learn different, even opposite, things.
- **P16. What crosses between agents.** Should the assistant know what the developer agent learned about you?
- **P17. When to speak up.** Reminding at the right moment versus nagging.
- **P18. Earned trust.** What an agent may do without asking, and how freedom is earned and lost.
- **P19. Where agents live.** Laptops sleep; devices need to share one memory.
