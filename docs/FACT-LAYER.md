# The Fact Layer — Base Design

**Status:** design under section-by-section review.
**Settled:** §2 fact record · §3 claimType · §4 distractors · §5 volatility ·
§6 cooldown · §7 tags · §8 storage.
**Open:** nothing in the record design. The MIGRATION PATH — how 984 existing
questions with string options and zero facts become fact-layer records — is
the one substantial piece still undesigned.

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

### The house rule that beats all of this

> **Anchor a changeable claim in time and it stops being changeable.**

"Who holds the record?" goes false the moment the record falls. "Who led the
category as of the 2024 season?" is true forever.

This is not a nicety. At `seasonal` = 3 months and `live` = 1 month, a
3,000-fact corpus with even 5% volatile content means **600 to 1,800
rechecks a year, forever**, whether or not anyone has time. Anchoring is the
difference between a knowledge base that maintains itself and one that
decays the moment you stop feeding it.

**Target: under 2% of the corpus carrying any recheck at all.** Achievable
if anchoring is the habit from the first question. Effectively impossible to
retrofit across three thousand.

#### Say it the way a person would

The anchor belongs in the sentence, not bolted to the front of it. House
phrasings, in rough order of preference:

> "As of the 2024 season, which player led the league in assists?"
> "Through 2025, which nation had won the most Winter Olympic golds?"
> "At the end of the 2024 season, who held the career passing record?"
> "As of January 2026, which company had the largest market capitalisation?"

Avoid the bare present tense for anything that can change: *"Who holds…",
"Which is the tallest…", "Who is the current…"*. Those are the sentences
that quietly go wrong.

The anchor goes in **both** the fact's `claim` and the question text. The
claim is what gets verified; the question is what the player reads. If only
one carries the date, they will drift.

#### The anchor must be backed by the evidence

An anchor is a claim about currency, and claiming currency you do not have
is its own kind of wrong. "As of 2025" resting on a source last checked in
2023 asserts two years of knowledge nobody verified.

**Rule: the anchor year may not exceed the most recent cited source's
`checked` date.** `preflight` enforces it by comparing the year in the
anchor against the newest source on the fact. Cheap to check, and it closes
the gap where date-anchoring becomes a way to *look* rigorous while
actually asserting more.

### Mechanics

**`volatility` is derived, not assigned 984 times.** `claimType` already
implies most of it — a `definition` is static, a `superlative` rarely is, a
`point` about a past event is static. The default comes from `claimType`;
an explicit value is required only to override it.

**`recheck` is computed, never stored.** It is `verifiedAt` plus the
interval for the fact's `volatility`. Storing both a `verifiedAt` and a
`recheck` date means re-verifying can update one and not the other, and they
disagree silently — the same class of bug as two `ORDER` constants drifting
apart. One source of truth, one field fewer.

**An expired fact stops being DRAWN, not merely published.** Blocking
publication is not enough: once quizzes are assembled from the pool, a fact
whose recheck lapsed weeks ago is still eligible for selection into
tomorrow's quiz. Expired facts are excluded from selection everywhere —
daily, live and tournament — and surface in the studio as a queue.

**Known dates beat fixed intervals.** A record set in March gets rechecked
in June, but the season ended in April. Elections, Olympics and award cycles
all have dates a 90-day timer ignores. The interval is the default; an
explicit `recheckAfter` overrides it for facts tied to a known event.

**Superseded facts are retained for audit only.** When Burj Khalifa is
overtaken, the old fact stays so past quizzes remain explicable. But it is
**never taught in learning mode, never drawn, never cited by a new
question**. A knowledge base that serves superseded facts as instruction is
worse than one with gaps: gaps are visible, confident wrongness is not.

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

### Settled rules for cooldown

**Cooldown tracks EXPOSURE, not association.** A question touches facts in
three different ways and only some of them teach the player anything. An
earlier draft blocked a question if *any* cited fact was recently used,
which would have crippled reuse for no benefit.

| Fact's role in a question | Does the player see it? | Cooldown |
|---|---|---|
| `answer` — the correct answer rests on it | yes, directly | **full** |
| `context` — appears in the explanation after answering | yes, read once | **half** |
| `refutation` — cited by `falseByFact` to kill a distractor | **never** | **none** |

The last row is what makes rich questions affordable. A refutation basis and
its sources are admin-only and never ship to the player, so a fact used only
to disprove a distractor can back an answer tomorrow with no staleness at
all. A question resting on five facts may carry exactly one full cooldown.

**Provisional values, in one config block:** 180 days on the question,
45 days on the answer-fact. These are invented. Nothing was measured and no
player data exists. They belong in a single place precisely so they are the
easiest thing in the system to change once telemetry can correct them.

**Usage is recorded per appearance, not as a counter.** Cooldown is global
for now, which is wrong in both directions: too strict for a newcomer who
has seen nothing, too loose for a day-one regular who has seen everything.
Keeping each appearance as its own record leaves a per-player calculation
possible later. Cheap to preserve now, expensive to reconstruct.

### Tournament reuse

**The distinction that settles this: recognition versus knowledge.**

*Recognition* — "I remember this exact question" — is cheap and worth
preventing. *Knowledge* — "I know this because I learned it here" — is the
product working as intended. A trivia competition is supposed to reward
people who know more trivia.

So the rule bites on recognition only:

| Since the question last ran | In a tournament |
|---|---|
| 0–7 days | **excluded** |
| 8–14 days | permitted, but **must be reworded** — different stem, ideally a different angle on the same fact |
| 15+ days | free |

**Why not a reserved pool that never touches the daily quiz.** It was
considered and rejected. A daily player sees roughly 4,380 question-slots a
year, which exceeds any realistic authoring rate, so no corpus size can make
a regular a stranger to your content. But the boundary is arbitrary anyway:
someone who plays pub quizzes elsewhere arrives with exposure that is
invisible and uncontrollable. Engineering around internal exposure while
ignoring external exposure is precision theatre. `neverDaily` remains
available per question for a specific event, but it is an option, not a
requirement.

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

### Settled rules for tags

**The vocabulary is seeded and faceted, not invented one tag at a time.**
An empty controlled vocabulary puts the approver in front of infinite
choices with no frame, which is how you end up with `space`, `astronomy`,
`spaceflight` and `cosmos` all meaning roughly one thing. So `tags.json`
ships with a starter bank organised by facet, and every tag belongs to
exactly one:

| facet | holds | examples |
|---|---|---|
| `domain` | subject matter | philosophy, astronomy, cinema, macroeconomics |
| `period` | named eras | ancient-greece, cold-war, renaissance |
| `place` | geography | japan, west-africa, the-pacific |
| `form` | medium or artefact | painting, album, treaty, spacecraft |
| `event` | kinds of happening | olympics, election, eruption |

Facets are not a hierarchy. They are orthogonal dimensions, so they coexist
with the flat-plus-`broader` rule below. Their practical value is that the
studio can offer candidates per facet while tagging, and can show what is
*missing* — "this fact has no period tag" — instead of leaving the approver
to remember.

**Tags have the same lifecycle as questions: `proposed` → `approved` →
`deprecated`.** Claude may propose a tag; nothing is bindable until the
approver accepts it, and accepting requires writing the **scope note** in
the same action. A tag arriving without a scope note arrives broken, because
the scope note is the only thing preventing the four-way split above.

**2 to 4 tags per fact.** `preflight` warns outside that range rather than
blocking; a fact genuinely needing six tags is usually two facts. More than
four requires explicit approval, recorded.

**Flat, with an optional single-level `broader` pointer.**
`ancient-greece → ancient-world` is allowed. A four-level taxonomy is not.
Most of the query benefit, a fraction of the upkeep.

**A tag may never share a name with a category.** History is one of the five
fixed quiz slots; it is not a tag. Categories are structure, tags are
subject matter, and letting them overlap gives round-building two competing
notions of the same thing. `preflight` rejects it.

**Granularity: a tag should plausibly reach 10+ facts**, since that is
roughly a themed round. Tags still under 5 facts after a year get merged or
retired, and `check.py` reports them. Provisional numbers, easily adjusted —
the point is that the vocabulary is pruned on evidence rather than growing
forever.

### Era and tags are complementary, not merely separate

Keeping them apart avoids conflict but wastes the relationship. So the link
is explicit: **a `period` tag carries its own numeric range in the
registry.**

```json
"cold-war": {
  "facet": "period",
  "label": "The Cold War",
  "scope": "1947 to 1991. Superpower rivalry, proxy conflicts, the arms and
            space races. Not post-1991 Russia relations.",
  "era": { "from": 1947, "to": 1991 },
  "status": "approved"
}
```

That gives three things at once:

- **"anything between 1900 and 1950"** queries the numeric `era` on facts
- **"a Cold War round"** queries the tag
- **they cannot disagree**, because the tag defines its own range and
  `preflight` warns when a fact's `era` falls outside the range of a period
  tag it carries

The studio can also suggest a fact's `era` from its period tag, so the
numeric range is usually inherited rather than typed. `era.to` may be null
for an open period, and a fact may carry an `era` with no period tag at all
— a 2019 research finding sits in no named era and needs none.

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

### Settled rules for storage

**`facts-src/` shards by ID block**, not by tag, date or category:
`facts-0001-0499.json`, `facts-0500-0999.json`. Stable forever, no
reorganisation when a fact is retagged, and a diff stays inside one file
instead of rewriting the corpus.

**Filenames deliberately carry no category.** A fact has no category — the
*question* does. The same fact can back a History question today and a
Geography one tomorrow, so naming files by category would bake in an
association the data does not have. The blocks are meaningless on purpose.

**Tag ids are slugs, immutable once approved.** `ancient-greece`, not
`tag-0042`. You will read these constantly in diffs and queries and rename
them almost never. A rename creates a new tag and deprecates the old one.

**`sync-questions.js` gains facts as a third collection**, with `--status`
reporting fact counts beside question counts, and the same byte-identical
round-trip guarantee. Otherwise facts would live only on one machine and
silently never reach the bank.

**Scale threshold, noted rather than engineered for.** 3,000 facts at ~1KB
is about 3MB: fine to load wholesale into the studio, comfortably inside the
Firestore free tier. Around **10,000 facts** the studio needs pagination and
daily read counts start to matter. That is years away; building for it now
would be speculative.

### What reaches the player

**The player-facing payload does not change at all.** Question, options as
plain text, answer, `explanation`, `memory_hook` — the same shape it already
has, whether it is the daily quiz, a live round or a tournament.

**Sources are not shown to players.** An earlier draft argued citations on
the results screen would differentiate a trivia app that has made accuracy
its point. Overruled, and rightly: accuracy is the baseline expectation of a
trivia platform, not a claim that needs evidence attached. Displaying
citations reads as defensive, and it invites players to audit the source
rather than trust the product. The standard is met, not proven.

This has a useful consequence: **the entire verification apparatus is
internal.** Nothing about facts, evidence or review crosses to the client in
any format, so the fact layer's blast radius on the player-facing side is
zero.

Never published, in any format:

    claim · claimType · scope · sources · falseBy · basis · falseByFact
    plausibility · factRefs · riskTier · volatility · review · usage

`basis` and `falseByFact` are the hard prohibition. Distractor reasoning is
a map of which options are wrong, and shipping it hands the answer to anyone
who opens devtools. The answer-fact's claim leaks the same way `answer`
already does under client-side grading; server-side grading in phase 3
closes that whole class at once, not field by field.

> **The rule to hold: if the client must render it, assume it leaks.**

This is the same mistake the first secure-database draft made — specifying
answers as living only in an unreadable collection while grading stayed on
the client, two things that could not both be true. Stating the rule once is
cheaper than rediscovering it per field.

**Explanations stay authored, not composed.** Keeping one consistent surface
across every format is worth more than generating prose from `context`. The
risk is that a hand-written explanation can quietly contradict the evidence
its question rests on, so the studio shows the explanation **beside the
cited claims** during review. That is the §4 responsiveness check extended:
the approver is confirming the explanation agrees with the evidence, not
only that it reads well.

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
