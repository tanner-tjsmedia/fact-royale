# SOURCING STANDARD

What counts as evidence for a question, and what does not.

Confirmed 2026-09-29. Owner of the write path: `tools/add-source.py`.
Nothing else may write `sourceRefs`.

---

## 1. The rule

**A source must establish the ANSWER, not the topic.**

That is the whole standard. Everything below is a consequence of it.

A source about the right subject that does not support the specific answer
being marked correct is not evidence. It is a coincidence of vocabulary.

### Why this is written down

An automated matcher was run against the 263-entry registry to find questions
that existing sources could cite. It proposed 11 candidates. On inspection
**5 were wrong**:

| question | proposed source | what went wrong |
| --- | --- | --- |
| Mendel and inheritance | `richthofen-silk-road-coinage` | shared the word "century" |
| what is a steal in basketball | `mlb-bonds-top-moments` | shared "record", "player" |
| F1 drivers' championships | `olympics-phelps-medals` | shared "record", "championship" |
| Jesse Owens and the Hitler snub | `npr-owens-long-myth` | right athlete, **different myth** |
| why India passed China | `un-india-overtakes-china` | establishes **that** it happened, not **why** |

The last two are the instructive ones. Both were about the correct subject.
Both would have passed a reviewer skimming for topical relevance. Neither
supports the answer the question marks correct.

A 45% false-positive rate is why this cannot be automated, and why a matcher
may propose but never apply.

---

## 2. Consequences

### Hold rather than cite a near miss

If no source establishes the answer, the question stays unsourced. An
unsourced question is visibly incomplete. A wrongly sourced one looks finished
and is worse, because nothing will ever re-examine it.

Six questions were held on the first sourcing run under this rule:

- noble gases — only a Britannica **Kids** page was found
- centripetal force — the source established the force, not that **friction** supplies it
- ozone layer — results covered ozone toxicity, not the stratospheric layer
- enzyme denaturation — best hits were arXiv preprints
- refraction — only video pages, no citable article
- non-coding DNA — no adequate source located

Each is a targeted search later, not a shrug now.

### Reference grade or better

Acceptable: primary sources (NASA, USGS, UN, national archives, governing
bodies, museums), established reference works, peer-reviewed literature.

Not acceptable **as the only source**:

- children's or student editions of reference works
- preprint servers with no published version
- aggregators, listicles, SEO content, quiz sites
- anything already in the registry's replace queue

### No dangling references

Every id in `sourceRefs` must resolve in `sources.json`. Enforced by
`add-source.py`, which refuses rather than warns. As of this writing the
corpus has zero dangling refs and it stays that way.

### Two sources when the claim is contested

One source is enough for a settled fact. Use two when reference works
disagree, when the answer depends on a convention (longest river, largest
desert, best-selling album), or when the figure is an estimate. The
disagreement is the point and both sides belong in the record.

---

## 3. What this costs

Measured on the first run: **8 searches produced 7 sourced questions.** Close
to one search per question.

The question corpus is roughly 90% singletons — 881 distinct subjects across
984 questions — so the clustering advantage that made fact authoring efficient
(about 3 facts per search) does not exist here. Sourcing is slow because the
corpus is broad, not because the standard is fussy.

**The bar was considered and kept.** Dropping the establishes-the-answer check
would roughly double throughput. It was rejected because `approvedBy` exists in
the fact layer for exactly this reason: the original corpus was built without
this rigour, and rebuilding it with the same gap would waste the work of going
dark.

---

## 4. Facts versus direct sourcing

Both paths are legitimate. The split, decided 2026-09-29:

- **Direct `sourceRefs`** for singletons. One question, one search, no fact
  record. This is most of the corpus.
- **A fact record** where one subject backs several questions, because the
  research is then reused rather than repeated.

Writing a fact for a singleton costs the same search plus claim authoring plus
an approval gate, and the reuse never arrives. Do not do it for ceremony.

The fact base is not a sourcing mechanism. It is the asset for learning mode,
live play and question generation, and it is aimed at teachable subjects with
enough sibling depth to supply distractors. Measuring it by question coverage
is measuring the wrong thing.

---

## 5. Tooling

```
python tools/add-source.py --status                 how many are sourced
python tools/add-source.py --dry-run --apply id=src preview, write nothing
python tools/add-source.py --apply id=src,src2      write
python tools/add-source.py --file batch.txt         one mapping per line
```

Refuses on: unknown question id, source id not in the registry, question
already sourced without `--force`. Every refusal names the question, because a
run that silently skips leaves a question looking done when it is not.

`review.html` reports the count of unsourced questions. It reports only gates
that `preflight.py` still owns; it does not report the retired ratio rule.
