# Secure Question Database — Design

**Status:** design, not yet implemented
**Written:** 2026-08-24

---

## 1. What is actually exposed today

Questions live as static JSON on GitHub Pages. That means:

```
https://fact-royale.com/questions/2026-09-15.json
```

is publicly fetchable **right now**, by anyone, with no account, three weeks before
that quiz runs. The file contains the prompt, all four options, **the correct
answer**, and the explanation.

Three separate problems fall out of that one fact:

| | Problem | Who it affects |
|---|---|---|
| **A** | Future content is readable | Anyone who guesses the URL pattern |
| **B** | Today's answers are readable before you play | Anyone on today's quiz |
| **C** | The corpus can be scraped wholesale | Competitors, content thieves |

The refresh exploit fixed on 2026-08-24 was a *convenience* cheat. **B** is the
easy one and no code change to the client can fix it, because the client is
where the answer has to arrive.

**Honest framing:** this is a friends-and-family trivia app with a small
leaderboard. Nobody is currently exploiting any of this. But the corpus is the
asset — it is being built toward live events and licensing — and a publicly
scrapable asset is a weak one.

---

## 2. The principle

> **Author locally. Serve remotely. Never ship an unplayed answer.**

- **Local JSON stays the source of truth.** It is git-versioned, diffable,
  reviewable, and it is what `tools/preflight.py` gates. That does not change.
  This is the "local" half of "local but secure".
- **Firestore becomes the delivery layer.** It can enforce time and identity
  rules that a static file server cannot.
- **Publishing is an explicit step**, not a consequence of committing a file.

The repo is the manuscript. Firestore is the printing press. Today they are the
same thing, which is the root of the problem.

---

## 2a. Correction to this document (2026-08-31)

The first draft specified answers living **only** in `quizKeys/`, which no client
can read — while phase 2 kept grading on the client, which needs the answer.
Those two things cannot both be true. Implementing it as written would have
shipped a quiz that cannot be marked.

**Resolution.** Through phase 2, `answer` and `explanation` ride in the public
`quizzes/` document, still behind `publishAt`. `quizKeys/` is populated anyway
so phase 3 is a drop-in later rather than a second migration.

What phase 2 actually buys, stated honestly:

| | Problem | Fixed by phase 2? |
|---|---|---|
| **A** | Future content readable | **Yes.** This is the big one. |
| **B** | Today's answers readable before you play | No. Needs server-side grading. |
| **C** | Corpus scrapable wholesale | **Partly.** Unpublished days become unreachable. |

**B needs Cloud Functions, which needs the Blaze plan.** Usage stays inside the
free allowance at this scale, but it requires a billing account attached, which
is a decision rather than a detail. Phase 2 needs no billing change at all.

---

## 3. Document shape

Split each day into **two documents** so the answer can be withheld
independently of the question.

### `quizzes/{dateKey}` — publicly readable, time-gated

```json
{
  "date": "2026-09-15",
  "publishAt": "<Firestore Timestamp: 2026-09-15T00:00:00Z>",
  "version": 3,
  "questions": [
    {
      "id": "q1",
      "category": "History",
      "question": "…",
      "options": ["…", "…", "…", "…"],
      "memory_hook": "…"
    }
  ]
}
```

Note what is **absent**: `answer`, `explanation`, `sourceRefs`.

### `quizKeys/{dateKey}` — never client-readable

```json
{
  "date": "2026-09-15",
  "answers": { "q1": 2, "q2": 0, "…": 3 },
  "explanations": { "q1": "…" },
  "sourceRefs": { "q1": ["britannica-taj-mahal"] }
}
```

Answers stored as **option index**, not text, so a leaked prompt document
cannot be matched against a leaked key document by string comparison.

### Why split rather than one gated document

If answers live in the same document as prompts, then the moment the document
becomes readable — which it must, to be played — the answers are readable too.
Splitting is what makes phase 3 (server-side grading) possible later without
another migration.

---

## 4. Firestore rules

Add to `firestore.rules`. **Additive — nothing existing changes.**

```js
// ── Quiz content: prompts and options only ─────────────
// Readable only once publishAt has passed. Tomorrow's quiz is not
// fetchable today, by anyone, regardless of auth state.
// Writes are console/admin-SDK only; the client never writes content.
match /quizzes/{dateKey} {
  allow read: if resource.data.publishAt <= request.time;
  allow write: if false;
}

// ── Answer keys: never readable by any client ──────────
// Only the Admin SDK (Cloud Functions, migration script) can touch these.
// Phase 2 keeps grading client-side, so the client still receives answers
// via the play document below. Phase 3 removes that.
match /quizKeys/{dateKey} {
  allow read, write: if false;
}
```

**Read the `publishAt` rule carefully.** `resource.data.publishAt <=
request.time` is evaluated by the server against its own clock, not the
client's. Changing your device clock does not help you. This is the one
guarantee a static file host cannot give.

### Admin override for the live play area

The live console needs the whole corpus regardless of date:

```js
match /quizzes/{dateKey} {
  allow read: if resource.data.publishAt <= request.time
              || request.auth.token.email == 'tanner@tjs16media.com';
  allow write: if false;
}
```

---

## 5. Phasing

Each phase ships independently and leaves the app working.

### Phase 1 — Mirror (no behaviour change)

Run the migration script. Firestore now holds every day. **The client still
reads the static JSON.** Nothing user-visible changes.

*Purpose: prove the data lands correctly with zero risk.*

Verify: document count matches file count; spot-check three days against
the JSON; confirm `publishAt` timestamps are right.

### Phase 2 — Cut over reads, remove future files

1. Point `loadQuiz()` at Firestore instead of `fetch('/questions/…')`.
2. **Delete future-dated JSON from the deployed site** — keep them in the repo,
   add `questions/` to a build-ignore, or move to `questions-src/`.
3. Past-dated files can stay served for the archive, or the archive reads
   Firestore too (cleaner).

At the end of phase 2, **problem A is solved**: future content is no longer
fetchable. Problems B and C remain — the client still receives answers for
the day it is playing.

### Phase 3 — Server-side grading (optional, later)

Add a Cloud Function `submitAnswers(dateKey, answers[])` that:
- reads `quizKeys/{dateKey}` with the Admin SDK,
- grades server-side,
- writes the score,
- returns per-question correctness **and only then** the explanations.

The client never holds an answer before it has committed to a guess. This
solves **B** completely and makes **C** expensive — a scraper would have to
play every question to learn the answers.

**Cost:** one function invocation per quiz completion. At current volumes,
free tier. Adds a network round-trip to the results screen.

**Recommendation:** do phases 1 and 2. Leave 3 until the leaderboard matters
enough that someone would cheat on it.

---

## 6. Cost

Firestore free tier: 50,000 document reads/day.

One quiz play = **1 read** (the day's `quizzes/` doc). Even with per-user
caching disabled, 500 daily players is 500 reads. Two orders of magnitude
inside free tier.

The live play area reads more — a full corpus pull is ~130 documents — but
that is once per session, by one admin.

**This does not meaningfully cost money at any plausible near-term scale.**

---

## 7. What this unlocks beyond security

This is the part worth caring about more than the cheating.

- **Queryable corpus.** `where('category', '==', 'History')`,
  `where('riskTier', '==', 'canonical')`, difficulty ranges — none of which is
  possible against 130 flat files.
- **Reuse without duplication.** The live play area, a future print product, an
  API for partners, in-person events — all read the same store instead of each
  getting a copy that drifts.
- **Publishing becomes a decision.** A day is live because `publishAt` passed,
  not because a file exists. Pull a day back, hold a day, reschedule a week —
  all without a deploy.
- **Verification metadata travels with the question.** `sourceRefs` and
  `riskTier` live next to the content instead of in a parallel file.

---

## 8. Open decisions

1. **Does the archive read Firestore or keep static files?**
   Firestore is cleaner and closes C for past content too. Static is zero work.
   *Leaning: Firestore, in phase 2, since the code path is already written.*

2. **Do we keep `questions/*.json` in the repo after cutover?**
   Yes — it is the authoring source and what `preflight.py` gates. But it must
   stop being *deployed*. Options: `.nojekyll` exclusion, move to
   `questions-src/`, or a build step. *Leaning: rename to `questions-src/`,
   which is unambiguous and cannot be served by accident.*

3. **How does publishing happen?**
   Manual script run, or automatic on push via a GitHub Action?
   *Leaning: manual at first. An automatic publisher that runs on every push
   would happily publish unverified content, which is the failure mode we have
   been fighting all week.*

4. **Sources: public or private?**
   Showing sources on the results screen would be a real differentiator for a
   trivia app that has made accuracy its point. That argues for keeping
   `sourceRefs` in the readable document rather than the key document.
   *Leaning: move `sourceRefs` back to the public doc and show them.*

---

## 9. Files

| File | Status |
|---|---|
| `docs/SECURE-QUESTION-DB.md` | this document |
| `tools/migrate-to-firestore.js` | written, not run |
| `firestore.rules` | rules block above **not yet applied** |
| `quiz.js` `loadQuiz()` | unchanged, phase 2 work |
