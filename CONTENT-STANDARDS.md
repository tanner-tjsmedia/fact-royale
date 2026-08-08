# Fact Royale — Content Standards

**One gate.** Nothing is handed over until this passes:

```bash
python3 tools/preflight.py --week 2026-09-06
```

Exit 0 means shippable. Anything else means keep working. Do not ask whether a
batch is clean — run the gate.

---

## Why this document is a procedure

Every rule below was added after a specific failure that reached the user.
The failures were not caused by not knowing the rules. They were caused by
checking the rules *after* writing instead of applying them *while* writing.

Checking afterwards guarantees a review cycle. The order of operations below
exists to make the review a formality.

---

## The writing procedure

Follow in this order. Steps 1 and 2 are the ones that get skipped, and skipping
them is what causes rework.

### 1. Check the topic is unused — with the tool, not grep

```bash
python3 tools/find-duplicates.py 0.42 2026-09
```

`grep -il "Fosbury"` matches distractor text and explanations and will report a
topic as unused when it has already been asked three times. That exact mistake
put the Fosbury Flop into the corpus twice and Miracle on Ice six times.

### 2. Decide whether the claim can expire

If the answer involves a **record, a count, a current holder, or a superlative**,
either verify it against a source now or reframe the question so it cannot go
stale. This category has produced **every factual error found so far**:

| Written | Reality | Failure mode |
|---|---|---|
| Saturn has "over 140 confirmed moons" | 274 since March 2025 | Correct once, then moved 130 |
| "Only woman to win the Palme d'Or" | Three have — 1993, 2021, 2023 | Superlative quietly expired |
| "More golds than around 160 nations" | 66 | Number reached for, not known |
| "Fallen roughly 40% since 1979" | ~12% per decade | Overstated to sound sharper |

Reframing beats verifying. "Saturn has N moons" expires; "why is Saturn's moon
count awkward to state" does not, and is a better question.

### 3. Write the four options at equal length *before* settling which is correct

The correct answer accumulates qualifiers — dates, hedges, "roughly",
"primarily" — because being precisely right takes more words than being vaguely
wrong. Write the answer first and it ends up longest every time.

Measured at **53% corpus-wide** against 25% for random. In one batch written
while actively trying to avoid this, it hit **61%**. Order of operations is the
only reliable fix.

### 4. Write the prompt to carry the setup

Context goes in the question, where it is read once, not repeated across four
options where it is read four times.

**Ratio = mean option length ÷ prompt length.**

| Ratio | Meaning |
|---|---|
| under 0.20 | One-word recall. The question teaches nothing. |
| **0.30 – 0.90** | **Target.** |
| over 1.30 | Answers dwarf the question. This is the readability complaint. |

### 5. Run the gate

---

## Hard limits

| Rule | Limit |
|---|---|
| Option length | 120 characters |
| Spread within a question | 45 characters |
| Answer longer than next-longest | 5 characters |
| Ratio | 0.20 – 1.30 |
| Reading load per day | 5,500 characters (~4,300 target) |
| Answer position | 25% each, ±9 |
| Category balance | History 3, Pop Culture 3, Sports 2, Geography 2, Science 2 |

**Accuracy overrides every one of these.** If a question needs 110 characters
to be correct and unambiguous, it gets 110. The limits exist to stop padding,
not to force questions into being vague or wrong.

---

## Accuracy rules

**A trivia platform that is not reliably true has no reason to exist.** This
section outranks everything else in this document.

### Sourcing bar

Every question carries a `sources` array. The gate blocks without it.

**One authoritative source, OR two independent weaker ones.** One source proves
nothing — you can find a source for almost any claim, including false ones. Two
links to the same wire story are one source.

| Tier | Examples | Sufficient alone? |
|---|---|---|
| **Authoritative** | Peer-reviewed journals, `.gov` and `.edu`, NASA, NOAA, WHO, UNESCO, IAU, national archives, Britannica, and governing bodies **on their own records** (MLB for MLB, IOC for Olympic) | **Yes** |
| **Secondary** | Reputable news and trade press, museum and university outreach pages, established reference sites | Only in pairs, different outlets |
| **Unreliable** | Content farms, SEO listicles, tourism marketing, Quora, Reddit, personal blogs | **Never**, even in pairs |

Wikipedia is for *finding* primary sources, not for being one.

Judged against this bar, the first eight claims verified in this project scored
three passes and five fails. Volume of sources was never the issue; quality was.

### Writing rules

1. **Settled facts stated as settled.**
2. **Unsettled things stated as unsettled.** The Hubble tension, coronal
   heating, whether Harold took an arrow in the eye — flag the dispute rather
   than picking a side.
3. **Never reach for a number to make a sentence land.** If the figure isn't
   known, look it up or drop it. This produced the Phelps error: "around 160
   nations" was invented; the real answer was 66.
4. **Ranges beat false precision.** "1,200 to 1,500 Uros" is honest; "1,200"
   was not.
5. **Cite the year for anything time-bound.** "Kipchoge ran 2:01:09 at Berlin in
   2022" survives; "the world record is 2:01:09" does not.

### Source record format

```json
"sources": [
  {"claim":  "what specifically this source establishes",
   "source": "https://...",
   "checked": "2026-08-08"}
]
```

Record the claim, not just the link, so a future check knows what was verified
rather than re-deriving it.

---

## Distractors

- Plausible enough that an informed person might pick one
- Not a near-duplicate of the answer with one word changed
- Not eliminable by grammar, tone or specificity alone
- At least one should be longer than the correct answer

---

## Subject matter

**Sports** — boxing, soccer, American football, baseball, basketball,
athletics, Olympic history. Cricket, golf and rugby sparse.

**Pop Culture** — visual art, photography, architecture, music, prestige TV
over film trivia. Never "which actor played X" or "who directed Y". Ask about
the work, the technique, or the controversy.

**Science & Nature** — astronomy around 25% of the category.

**History** — broad global coverage; European including German and Dutch is
well represented.

**Geography** — physical geography and the human systems built on it, not
capital-city recall.

**Memory hooks** — three sentences is fine. This is where the teaching happens
and the one field where length is a feature.

---

## Tooling

```bash
python3 tools/preflight.py --week 2026-09-06   # the gate. run this.
python3 tools/preflight.py 2026-09             # a month
python3 tools/preflight.py --all               # everything incl. past

python3 tools/find-duplicates.py 0.42 2026-09  # before writing replacements
python3 tools/audit-claims.py --risk high      # claims worth sourcing
python3 tools/build-review.py --base <commit>  # before/after HTML diff
```

`review.html` on the live site runs the same checks with adjustable thresholds,
admin-gated, readable from a phone.

---

## Reference

`questions/2026-11-24.json` was the day rebuilt to demonstrate the target, then
deleted with the November trim. The live reference is any day between
**2026-08-09 and 2026-09-05** — four weeks that pass the gate with zero blocking
issues.
