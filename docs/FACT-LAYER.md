# The Fact Layer — Base Design

**Status:** design under section-by-section review.
**Settled:** §2 fact record · §3 claimType · §4 distractors.
**Open:** §5 volatility onward.

**This document is the foundation.** Individual rules may be tuned as the
system is used. The shape below is not up for renegotiation without a
reason written down here.
**Written:** 2026-09-03
**Decisions in here were made jointly. Where a choice was contested, the
reasoning is recorded so we do not relitigate it in six months.**

---

## 1. The problem this solves

Today a question carries its own citation. That is why the corpus is in the
state it is in:

- **887 of 984 questions have no source at all.**
- The ~30 factual errors found in the Aug 9–15 week were in content
  previously reported clean.
- Two of those errors were in **the answer itself** — American Gothic (Wood
  rejected the satire reading) and Marciano ("smallest-ever champion", when
  Tommy Burns was smaller).
- **Distractors were never verified at all.** `frq-0973` offers "a fine of
  thirty minae, paid by his wealthier students" as a wrong answer, when
  Socrates' friends did guarantee roughly that sum. If that holds up, the
  question has two correct answers and always did.

Question-first citation makes every one of these repeatable. Verify a claim
for one question, and the next question about the same thing starts from
zero. Nothing compounds.

**The fix: verify claims, not questions.** A fact is the unit of truth. A
question is an arrangement of facts. Rewording a question does not
invalidate its evidence, and one verified fact can serve many questions —
including refuting their distractors.

---

## 2. Three records

### `facts/{fct-id}` — the unit of truth

```json
{
  "id": "fct-0142",
  "claim": "At his trial in 399 BC Socrates proposed free meals in the Prytaneum as his penalty.",
  "claimType": "enumeration",
  "context": "Athenian law let both sides propose a sentence and the jury pick one. Socrates argued that a man who had spent his life urging Athenians toward moral improvement deserved what Olympic victors got.",
  "tags": ["ancient-greece", "philosophy", "law-and-justice"],
  "era": { "from": -399, "to": -399, "label": "Classical Greece" },
  "riskTier": "standard",
  "volatility": "static",
  "recheck": null,
  "sources": ["plato-apology-36d", "britannica-socrates-trial"],
  "status": "active",
  "researchedBy": "claude",
  "approvedBy": "tanner@tjs16media.com",
  "verifiedAt": "2026-09-03",
  "supersededBy": null
}
```

### Settled rules for this record

**`era` uses a plain convention, NOT ISO 8601.** Negative means BC: `-399`
is 399 BC. ISO astronomical numbering has no year zero (1 BC is `0000`,
2 BC is `-0001`), so 399 BC would be `-398` and every BC date in the corpus
would be silently off by one. We are not importing that trap to look
standards-compliant. `era` is null for facts with no meaningful date.

**Claims must be self-contained.** No pronouns, no implied subject, no
"this". A claim is detached from its question the moment a second question
cites it. `preflight` flags any claim opening with a pronoun.

**`riskTier` lives on the fact, not the question.** Evidentiary risk is a
property of a claim, not of the wording wrapped around it. Questions inherit
it, as they inherit tags and era. The field is removed from the question.

**Required sources are derived from `riskTier`:**

| `riskTier` | Sources required |
|---|---|
| `canonical` | 1 reference, or exempt |
| `standard` | 1 primary, or 2 independent references |
| `volatile` | 3, at least one primary |

`preflight` enforces this against the fact. A question inherits compliance
from its facts and is never separately sourced.

**Research and approval are different people, and both are recorded.**
`researchedBy` may be Claude. `approvedBy` may only ever be a human.
**A fact with no `approvedBy` cannot be published**, which is the structural
guarantee that unreviewed machine output never reaches a player. This is the
single most important line in the document, because the corpus is in its
current state precisely because that guarantee did not exist.

**Correction versus supersession.** Edit the fact when *we* were wrong.
Supersede it when *the world* changed — the claim was true and no longer is.
Superseding keeps the old fact so questions that already ran stay
explicable: "why did the site say that in 2026?" always has an answer.

**Facts carry `status`** (active / retired), same as questions. Retiring a
fact flags every question resting on it, since those questions have just
lost their evidence.

`claim` is one assertion and is what gets verified.
`context` is teaching prose. **It is not a unit of verification** — it exists
for learning mode and for question explanations. Anything in `context` that
carries real weight should be promoted to its own fact.

### `questionBank/{frq-id}` — an arrangement of facts

```json
{
  "id": "frq-0973",
  "category": "History",
  "difficulty": 3,
  "question": "Convicted in 399 BC, Socrates was invited to propose his own penalty instead of death. What did he suggest?",
  "options": [
    { "text": "Free meals at public expense, for the rest of his life",
      "role": "answer",
      "factRef": "fct-0142" },

    { "text": "Exile to Thessaly, where friends had offered him refuge",
      "role": "distractor",
      "falseBy": "exhaustive",
      "falseByFact": ["fct-0142"],
      "basis": "The Apology records his proposals in full; exile is not among them.",
      "plausibility": 4 },

    { "text": "A fine of thirty minae, paid by his wealthier students",
      "role": "distractor",
      "falseBy": null,
      "basis": "UNRESOLVED — his friends did offer to guarantee thirty minae. Likely a second correct answer. Replace.",
      "plausibility": 5 }
  ],
  "factRefs": ["fct-0142"],
  "status": "active",
  "review": { "state": "flagged", "at": "...", "by": "...", "note": "..." },
  "usage": [{ "date": "2026-09-06", "context": "daily" }]
}
```

Tags and era are **not** stored on the question. They are inherited from its
facts. One place to correct, and a question can never disagree with its own
evidence about what it is about.

### `sources.json` — unchanged

Already works. Facts cite sources by id exactly as questions do today.

---

## 3. `claimType` — the rule that keeps reuse honest

A distractor can be refuted by pointing at an existing fact
(`falseByFact`). That is where the compounding comes from: the first
question on a topic is expensive, every later one is nearly free.

**But a fact only refutes a distractor if it is exhaustive over the relevant
domain.** "Socrates proposed free meals" does not by itself refute "he
proposed exile" — he could have proposed both.

Without this rule, `falseByFact` becomes a machine for manufacturing
refutations we have not earned. That is the exact failure mode this rebuild
exists to end.

| `claimType` | Example | May refute |
|---|---|---|
| `definition` | "A hexagon has six sides" | Competing definitions only |
| `point` | "The Declaration of Independence was adopted on 4 July 1776" | Competing *values* only. Never the existence of an unlisted alternative. |
| `enumeration` | "Socrates' only sentencing proposals at his 399 BC trial were free meals in the Prytaneum and a token fine" | **Anything not in the list.** |
| `superlative` | "Rocky Marciano, at 5 ft 10 in, was the shortest undisputed world heavyweight champion" | Rival claimants. Always volatile. |
| `attribution` | "Grant Wood rejected the reading of American Gothic as satire" | Contrary readings asserted as settled fact |

Only `enumeration` and `superlative` license automatic refutation.

### Settled rules for `claimType`

**Precision lives in the claim, not in a side field.** The first draft of this
document put a `scope` field on superlatives. That was the wrong fix: a field
nobody reads cannot make a vague claim precise. Instead, a `superlative`
claim must name **the measure and the domain in the claim itself**.

> ~~"Marciano was the smallest-ever heavyweight champion"~~
> "Rocky Marciano, at 5 ft 10 in, was the shortest undisputed world
> heavyweight champion."

This is the error that shipped. "Smallest" silently allowed height and weight
to compete, and Tommy Burns won on one of them. "Shortest, at 5 ft 10 in,
undisputed world heavyweight" cannot fail that way.

**The vagueness gate is mechanical.** `preflight` holds a wordlist —
*smallest, biggest, largest, best, greatest, worst, most famous, longest,
shortest, fastest* — and blocks any `superlative` claim that uses one without
a stated unit or measure. Editorial discipline that a script can enforce is
the only kind that survives contact with volume.

**`enumeration` keeps a required `scope`.** Here the failure is silent: drop
the word "only" from "Socrates proposed free meals and a fine" and you have
quietly licensed false refutations across every question citing it, and
nothing downstream notices. A required field forces the boundary to be stated
as a deliberate act rather than hoped for in the prose.

**`definition` means true by definition, not merely well known.**

| Is a `definition` | Is not |
|---|---|
| "A hexagon has six sides" | "The Eiffel Tower is in Paris" — contingent, so `point` |
| "The Bill of Rights is the first ten amendments to the US Constitution" | "Water boils at 100 °C" — has conditions, so `point` |
| "A leap year has 366 days" | "The Declaration was adopted 4 July 1776" — historical, so `point` |

The test: **could new evidence ever change it?** If genuinely no, it is a
`definition`. If yes even in principle, it is a `point` and needs a source.

**Guard against abuse:** every error in this corpus was *well known* — that
is precisely why nobody checked it. If `definition` becomes the bucket for
"everybody knows this", it reopens the hole this rebuild closes, with a
schema field blessing it. So `definition` requires a **constitutive source**:
the dictionary, the standard, the founding document. Not "no source" — a
different kind of source.

**`attribution` carries the strictest evidence bar.** It requires the
attributee's own words or a primary record of the act. A secondary source
describing what someone believed may support the claim but may never
establish it alone. The American Gothic error is exactly this failure: a
critic's characterisation of Wood's view, recorded as Wood's view.

**`claimType` and `scope` are set by the approver, never the researcher.**
Mislabel a `point` as an `enumeration` and you license false refutations
across every question citing it, invisibly and at scale. It is the
highest-risk field in the schema and belongs to the same human who owns
`approvedBy`.

**One `claimType` per fact.** If a claim is genuinely two things, it is two
facts. Splitting is always available and always cheaper than ambiguity.

**No chained refutation.** Fact A may not refute a distractor by way of fact
B. Direct citation only, so every refutation is auditable in one hop.
Chains are how "we verified this" quietly becomes "something adjacent to this
was verified once".

---

## 4. Distractors

Every distractor must clear two independent bars. A question fails if any
distractor fails either.

### 4a. It must be false — and we must record *how we know*

| `falseBy` | Meaning | Strength |
|---|---|---|
| `contradiction` | A source directly states otherwise | strongest |
| `exhaustive` | A source that *would have* mentioned it does not | workhorse, weaker |
| `category` | Could not be true — wrong century, person dead, place did not exist | strong and cheap |

A distractor that fits none of the three is one we cannot defend. **Replace
it rather than ship it.** `falseBy: null` blocks publication.

### 4b. It must actually distract

Three tests, all of which must hold:

> **Same kind.** Same type, register and specificity as the answer. Four
> people, or four years, or four cities — never three people and a concept.
>
> **Attracts the half-informed.** Someone who knows the topic vaguely can
> pick it *for a reason*. If nobody would ever choose it, it is filler and it
> gives the answer away by elimination.
>
> **Falls to real knowledge.** Someone who knows the topic properly rules it
> out from knowledge — not from wordplay, formatting, or length.

Rated **1–5**. `preflight.py` blocks any question with a distractor below **3**.

### Settled rules for distractors

**The vagueness gate runs on the question text, not just the claim.** A
question can be vague even when its fact is precise. "Who was the smallest
heavyweight champion?" resting on a properly worded Marciano fact is still
broken — the player is answering the vague version. The same wordlist that
gates `superlative` claims gates question text.

**A `factRef` proves the answer is true, not that it is responsive.** A true
statement that does not answer the question asked passes every automated gate
in this document. This is irreducibly a human judgement, so it is named as
one: the studio shows the question and the cited claim side by side, and
approving means *"this claim answers this question"* — not merely "this claim
is true". **It is the one check no gate can make**, and it is the reason a
human approver exists at all.

**`plausibility` is proposed by the researcher and only binding once set by
the approver.** Claude may suggest a rating with reasoning; an unconfirmed
rating does not satisfy the gate. The researcher also wrote the distractor,
which makes a self-assigned quality score exactly the number least worth
trusting.

**Rules are written per option, never "the three distractors".** The corpus is
uniformly four-option today. Every rule here is expressed as *"every option
with `role: distractor`"* so a future six-option or true/false format does not
require rewriting the gates.

**A refutation may not rest on a dead fact.** `preflight` blocks publication
when any `falseByFact` points at a fact that is retired, superseded, or past
its `recheck` date. Otherwise a refutation silently becomes worthless the
moment its supporting fact is pulled — the same class of bug as a dangling
`sourceRef`, which the registry tool already catches.

**Equivalent distractors are a judgement call, deliberately.** "He proposed
exile" and "He proposed banishment" are one distractor written twice, and the
player is really choosing between three options. A fuzzy string match would
flag legitimate near-misses and still miss real synonyms, so no gate is built.
Instead the studio shows all four options together with their refutations,
which makes the duplication visible where today it is not.

**Anti-patterns, automatic fail:**
- the comic or absurd option
- a near-identical number with nothing memorable between them (1776 vs 1777)
- the only option with a different grammatical shape
- the only option that is noticeably longer — already caught mechanically by
  the length-tell rule, kept here because the *reason* matters

The line to hold: **distracting, not deceiving.** A player who loses should
be able to see why they were wrong and feel it was fair.

---

## 5. Volatility and rechecking

Settled history never needs rechecking. Records do — and sports records fall
faster than most.

| `volatility` | Recheck | Typical |
|---|---|---|
| `static` | never | dates, definitions, settled events, works of art |
| `slow` | 24 months | records that fall rarely |
| `annual` | 12 months | awards, tallest/longest structures |
| `seasonal` | **3 months** | active sports records, standings, active-career stats |
| `live` | 1 month | office holders, rankings, current champions |

`preflight.py` refuses to publish a question resting on a fact whose
`recheck` date has passed. The studio surfaces overdue facts as a queue.

### The editorial rule that beats all of this

> **Anchor volatile claims in time, and they stop being volatile.**

"Who holds the record?" goes false the moment the record falls.
"Who held the record at the end of the 2024 season?" is true forever.

A dated claim converts `seasonal` into `static`. Prefer it. Reserve genuinely
live claims for cases where the currency *is* the point — and accept that
those carry a standing maintenance cost.

---

## 6. Cooldown — two windows

A player who has seen one question about a fact has effectively learned it.
A second question on the same fact is no longer testing them, however
differently it is worded.

- **Question cooldown: long.** A specific question does not reappear inside
  the long window.
- **Fact cooldown: short.** No two questions resting on the same fact appear
  inside the short window.

Starting values, to be tuned once there is real data: **180 days** on the
question, **45 days** on the fact.

**Consequence to keep in view:** real capacity is measured in *facts*, not
questions. A corpus of 3,000 questions built on 900 facts has the drawing
power of 900.

---

## 7. Tags

On the fact, inherited by the question. Controlled vocabulary in a
`tags.json` registry shaped like `sources.json`: id, label, and a one-line
scope note saying what does and does not belong under it. The scope note is
what stops `space` and `astronomy` drifting into two tags.

**Granularity test:** a tag should be able to fill a themed round on its own.
Too narrow to ever do that and it belongs in `context`, not in the
vocabulary. Broad enough to fill a hundred rounds and it is a category, which
already exists.

**Build the starter vocabulary from the 97 already-clean questions**, not
from imagination. Vocabularies invented up front miss how the content
actually clusters — you get tags nobody uses and gaps nobody predicted.

---

## 8. Storage

Same three-store model already in place, extended:

| Store | Holds |
|---|---|
| `facts-src/*.json` + `questions-src/*.json` | manuscript — git history, diffs, preflight gate |
| `facts/{fct-id}` + `questionBank/{frq-id}` | workbench — any device, admin-only |
| `quizzes/{date}` | printing press — `publishAt`-gated, public |

IDs: `fct-0001…`, mirroring `frq-0001…`. Sequential, permanent, never
positional, never a content hash.

**Publishing flattens.** Options ship to players as plain strings. Every bit
of verification metadata — `falseBy`, `basis`, `plausibility`, `factRef` —
stays admin-side. It cannot leak an answer, and the published payload gets
smaller, not larger.

---

## 9. What this breaks

Honest blast radius. Options becoming objects touches:

| File | Change |
|---|---|
| `_app/quiz.js` | read `option.text`, not the string |
| `tools/preflight.py` | option access; new gates for `falseBy`, `plausibility`, expired `recheck` |
| `tools/migrate-to-firestore.js` | flatten options on publish |
| `studio.html` | per-option evidence editor, fact picker, fact queue |
| `tools/sync-questions.js` | facts as a second collection |
| `live.html` | option access |
| `sources.json` | unchanged |

Existing questions keep working throughout: a plain string option is read as
`{ text: <string>, role: ? }`, so migration can be incremental rather than a
flag day.

---

## 10. What this costs

Verification goes from **984 checks to ~3,936** — one answer plus three
distractors per question. That is the honest headline.

Against it: `falseByFact` means the cost falls as the fact base grows. The
first question on a topic pays full price; the tenth pays almost nothing.
The curve bends down, and it bends further the more concentrated the corpus
is around fewer, richer topics.

**This has not been measured.** The only way to know the real numbers is a
calibration batch — a small set taken all the way through, timed, with the
rejection rate recorded.

---

## 11. Deliberately not decided yet

- **Question formats beyond 4-option multiple choice.** Tournaments usually
  want variety. Changes the player UI, not just the data. Later.
- **Multi-user roles.** Everything is hardcoded to one admin email. Fine
  today; the `verified.by` and `review.by` fields leave the door open.
- **Pool-based scheduling.** Agreed direction, but only once the corpus can
  support it. Date files remain the authoring workflow until then.
- **Telemetry.** Difficulty stays an author's guess until player performance
  can correct it. The field exists; the measurement does not.
