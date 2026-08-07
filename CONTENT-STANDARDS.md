# Fact Royale — Content Standards

Effective immediately. All new and revised questions must meet these.
Run `python3 tools/validate-questions.py` before any push.

---

## 1. Accuracy comes first

Any factual error gets fixed the moment it's found, ahead of all other work.

Avoid claims that go stale. "The current world record is X" will be wrong within a
year or two. Prefer facts anchored to a fixed event: what happened, who did it,
why it mattered. If a record must be referenced, tie it to the specific race and
year rather than presenting it as the standing record.

---

## 2. Answer options: 60 characters

| Rule | Limit |
|---|---|
| Target length | **≤ 60 characters** |
| Hard ceiling | **80 characters** |
| Max spread within a question | **35 characters** (longest minus shortest) |

The spread rule matters more than the absolute length. If the correct answer is
150 characters and the three distractors are 50, a player can pick the right one
without reading a word. This was measured at **78% in December 2026 content** —
against 25% for random guessing. That isn't a quiz, it's a formatting tell.

**Depth belongs in `explanation` and `memory_hook`, never in the options.**
Options only need to be distinguishable enough to make the choice meaningful.
The learning happens after the answer is locked in.

### Why this drifts

Correct answers get written first and accumulate every qualifier needed to be
defensibly right: dates, hedges, "roughly," "primarily." Distractors get written
second as obviously-wrong things, and wrong needs no qualifying. Being precisely
right takes more words than being vaguely wrong. Left unchecked, that asymmetry
compounds on every single question.

**Counter-practice:** write the four options at roughly equal length *first*,
then verify the correct one is actually correct. Not the other way around.

---

## 3. Distractors must be plausible

A distractor should be something a reasonably informed person might believe.

- Not absurd ("The Moon is made of cheese")
- Not a near-duplicate of the correct answer with one word changed
- Not eliminable purely by grammar, tone, or specificity

---

## 4. Answer position

Correct answers must be distributed evenly across positions 0–3.
Historical content had 38% sitting in position 1. The shuffle pass in
`tools/` corrects this; re-run it after any batch of edits.

---

## 5. Category balance (per file, exactly 12 questions)

| Category | Count |
|---|---|
| History | 3 |
| Pop Culture | 3 |
| Sports | 2 |
| Geography | 2 |
| Science & Nature | 2 |

If a replacement changes a question's category, another question must move to
compensate. The validator enforces this — earlier passes only checked Geography
and Science, which let three imbalances through undetected.

---

## 6. Subject matter

**Sports** — favour boxing, soccer, American football, baseball, basketball,
athletics, Olympic history. Keep cricket, golf, and rugby sparse.

**Pop Culture** — visual art, photography, architecture, music, and prestige
television are all preferred over film trivia. Never "which actor played X" or
"who directed Y"; ask about the work, the technique, or the controversy.

**Science & Nature** — astronomy sits at roughly 25% of the category.

**History** — broad global coverage. European, including German and Dutch, is
welcome and currently well represented.

**Geography** — physical geography and the human systems built on it, not
capital-city recall.

---

## 7. Question prompts

The prompt carries the context so the options don't have to. A prompt may run
two sentences when the topic genuinely needs setup. Prefer one.

Bad:  *Which director made 'The 400 Blows' and 'Jules and Jim'?*
Good: *What did the French New Wave change about how films were shot?*

The first tests whether you happen to know a name. The second tests whether you
understand something, and teaches the reader either way.

---

## 8. Memory hooks

Three sentences is fine and often better — the extra context is the point.
This is the one field where length is a feature.

---

## Validation

```bash
python3 tools/validate-questions.py           # whole corpus
python3 tools/validate-questions.py 2026-11   # one month
```

Checks structure, category balance, answer-in-options, option length, length
spread, and reports the "longest option is the answer" exploit rate.

Exit code is non-zero if anything fails. **Nothing ships red.**
