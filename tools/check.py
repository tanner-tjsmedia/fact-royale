#!/usr/bin/env python3
"""
FACT ROYALE - INTEGRITY CHECK

One read-only command that audits the whole corpus and prints everything
worth knowing. It NEVER writes. Run it as often as you like.

    python tools/check.py

WHY THIS EXISTS

A Windows update on 2026-09-08 cut Claude's sandbox off from this drive, so
Claude can no longer run scripts against these files. Previously Claude
would run half a dozen ad-hoc probes and report a summary you had to take on
trust. That is exactly the habit that let a broken live.html ship and let a
week of questions be called "clean" while carrying thirty errors.

So the checks move here: into the repo, run by you, printing real output
that we both read. Permanent, reviewable, and impossible to fake in a
summary.

WHAT IT DOES NOT DO

It does not duplicate tools/preflight.py. Preflight owns the CONTENT gates
(ratio, spread, length tell, sourcing tiers, category balance). Duplicating
that logic here would let the two drift apart, which is the same class of
bug as the studio's metrics disagreeing with the gate. This script owns
STRUCTURE and REFERENCES instead. Run both.

READING THE OUTPUT

    BLOCK   must be fixed. Exit code 1.
    WARN    worth looking at. Does not fail the run.
    ok      checked and healthy.
"""

import json, os, re, sys, glob, datetime

ROOT  = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
QDIR  = os.path.join(ROOT, 'questions-src')
FDIR  = os.path.join(ROOT, 'facts-src')
REG   = os.path.join(ROOT, 'sources.json')
TODAY = datetime.date.today()

# Key order, must match studio.html and tools/sync-questions.js. If these
# three ever disagree, every save rewrites files that did not change and
# real edits get lost in the noise.
Q_ORDER = ['id','category','difficulty','question','options','answer',
           'explanation','memory_hook','riskTier','sourceRefs',
           'review','status','usage']

VALID_REVIEW   = {'unreviewed','verified','flagged','rejected','retired'}
VALID_STATUS   = {'active','retired','draft'}
VALID_CLAIM    = {'definition','point','enumeration','superlative','attribution'}
VALID_FALSEBY  = {'contradiction','exhaustive','category'}
VALID_VOLATILE = {'static','slow','annual','seasonal','live'}
VALID_TIER     = {'canonical','standard','volatile'}

# Superlatives that hide their measure. "Smallest" is how the Marciano error
# shipped: height and weight silently competed and nobody had said which.
#
# The (?!-) guard matters. An earlier version flagged "best-selling album",
# because a hyphen is a word boundary so \bbest\b matched inside it. But
# "best-selling" NAMES its measure - units sold - which is exactly the
# specificity this gate is asking for. Hyphenated compounds are precise by
# construction and must not be flagged.
VAGUE = re.compile(r'\b(smallest|biggest|largest|best|greatest|worst|'
                   r'most famous|longest|shortest|fastest|richest|oldest|'
                   r'youngest|deadliest|rarest)\b(?!-)', re.I)

# A measure, unit or number anywhere in the sentence redeems a vague word:
# "the largest by area", "the longest at 3,600 km", "the oldest university,
# founded 1088".
MEASURED = re.compile(r'\d|\b(by|in|at|per)\s+(height|weight|length|area|'
                      r'population|revenue|units|sales|mass|volume|duration|'
                      r'wins|points|goals|capacity|surface|diameter)\b', re.I)

PRONOUN = re.compile(r'^\s*(he|she|it|they|this|that|these|those|his|her|'
                     r'their|its)\b', re.I)

block, warn, notes = [], [], []
def B(m): block.append(m)
def W(m): warn.append(m)
def N(m): notes.append(m)


def load_json(path):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh), None
    except Exception as e:
        return None, f'{os.path.basename(path)}: cannot parse - {e}'


def order_keys(rec, order):
    out = {k: rec[k] for k in order if k in rec}
    for k, v in rec.items():
        if k not in out:
            out[k] = v
    return out


# ---------------------------------------------------------------- registry
def check_registry():
    reg, err = load_json(REG)
    if err:
        B(err); return {}
    src = reg.get('sources', {})
    N(f'registry: {len(src)} source entries')
    no_archive = [k for k, v in src.items() if not v.get('archive')]
    if no_archive:
        W(f'{len(no_archive)} sources have no archive snapshot '
          f'(a citation that 404s in two years is not a citation)')
    replace = [k for k, v in src.items() if v.get('replace')]
    if replace:
        W(f'{len(replace)} sources flagged for replacement: '
          + ', '.join(sorted(replace)[:6]) + ('...' if len(replace) > 6 else ''))
    return src


# ------------------------------------------------------------------- facts
def check_facts(sources):
    """The fact layer may not exist yet. Absence is not an error."""
    if not os.path.isdir(FDIR):
        N('facts: layer not present yet (facts-src/ does not exist) - skipped')
        return {}
    facts = {}
    for path in sorted(glob.glob(os.path.join(FDIR, '*.json'))):
        data, err = load_json(path)
        if err:
            B(err); continue
        items = data.get('facts', data if isinstance(data, list) else [])
        for f in items:
            fid = f.get('id')
            if not fid:
                B(f'{os.path.basename(path)}: a fact has no id'); continue
            if fid in facts:
                B(f'duplicate fact id {fid}'); continue
            facts[fid] = f

            ct = f.get('claimType')
            if ct not in VALID_CLAIM:
                B(f'{fid}: claimType "{ct}" is not one of {sorted(VALID_CLAIM)}')
            if ct == 'enumeration' and not f.get('scope'):
                B(f'{fid}: enumeration facts require a scope - without it the '
                  f'refutation licence is unbounded')

            claim = f.get('claim', '')
            if not claim:
                B(f'{fid}: no claim')
            elif PRONOUN.match(claim):
                B(f'{fid}: claim opens with a pronoun - claims must stand alone '
                  f'once detached from their question')
            if ct == 'superlative' and VAGUE.search(claim) and not MEASURED.search(claim):
                B(f'{fid}: superlative claim uses a vague word with no stated '
                  f'measure - this is the Marciano failure')

            if f.get('status') not in VALID_STATUS:
                B(f'{fid}: status "{f.get("status")}" invalid')
            if f.get('volatility') and f['volatility'] not in VALID_VOLATILE:
                B(f'{fid}: volatility "{f["volatility"]}" invalid')
            if f.get('riskTier') and f['riskTier'] not in VALID_TIER:
                B(f'{fid}: riskTier "{f["riskTier"]}" invalid')

            if not f.get('approvedBy'):
                W(f'{fid}: no approvedBy - cannot be published')

            for s in f.get('sources', []):
                if s not in sources:
                    B(f'{fid}: source "{s}" is not in sources.json')

            rc = f.get('recheck')
            if rc:
                try:
                    if datetime.date.fromisoformat(rc) < TODAY:
                        W(f'{fid}: recheck was due {rc}')
                except ValueError:
                    B(f'{fid}: recheck "{rc}" is not a date')
    N(f'facts: {len(facts)} records')
    return facts


# --------------------------------------------------------------- questions
def check_questions(sources, facts):
    files = sorted(f for f in glob.glob(os.path.join(QDIR, '*.json'))
                   if re.match(r'^\d{4}-', os.path.basename(f)))
    if not files:
        B('no dated question files found in questions-src/'); return
    seen, total, rewrite = {}, 0, []
    dashed = []   # questions containing an em or en dash

    for path in files:
        name = os.path.basename(path)
        raw = open(path, encoding='utf-8').read()
        data, err = load_json(path)
        if err:
            B(err); continue

        # Round-trip. This is the check that caught 30 files silently gaining
        # a "date" key they never had. If a file would be rewritten by a save
        # that changes nothing, real edits drown in the diff.
        rt = dict(data)
        rt['questions'] = [order_keys(q, Q_ORDER) for q in data.get('questions', [])]
        if json.dumps(rt, indent=2, ensure_ascii=False) + '\n' != raw:
            rewrite.append(name)

        for i, q in enumerate(data.get('questions', [])):
            total += 1
            loc = f'{name}#{i}'
            qid = q.get('id')
            if not qid:
                B(f'{loc}: no id - run tools/mint-ids.py'); continue
            if qid in seen:
                B(f'duplicate id {qid}: {loc} and {seen[qid]}'); continue
            seen[qid] = loc

            opts = q.get('options', [])
            if len(opts) != 4:
                B(f'{qid}: {len(opts)} options, expected 4')

            # Options may be plain strings (today) or objects (fact layer).
            if opts and isinstance(opts[0], dict):
                answers = [o for o in opts if o.get('role') == 'answer']
                if len(answers) != 1:
                    B(f'{qid}: {len(answers)} options marked answer, expected 1')
                for o in opts:
                    if o.get('role') != 'distractor':
                        continue
                    if not o.get('falseBy') and not o.get('falseByFact'):
                        B(f'{qid}: distractor "{str(o.get("text"))[:30]}..." '
                          f'has no falseBy - cannot be defended, replace it')
                    if o.get('falseBy') and o['falseBy'] not in VALID_FALSEBY:
                        B(f'{qid}: falseBy "{o["falseBy"]}" invalid')
                    p = o.get('plausibility')
                    if p is None:
                        W(f'{qid}: distractor has no plausibility rating')
                    elif not isinstance(p, int) or not 1 <= p <= 5:
                        B(f'{qid}: plausibility {p!r} must be 1-5')
                    elif p < 3:
                        B(f'{qid}: distractor plausibility {p} is below the '
                          f'floor of 3')
                    for fid in o.get('falseByFact', []):
                        f = facts.get(fid)
                        if not f:
                            B(f'{qid}: falseByFact "{fid}" does not exist')
                        elif f.get('status') == 'retired':
                            B(f'{qid}: refutation rests on retired fact {fid}')
                        elif f.get('supersededBy'):
                            B(f'{qid}: refutation rests on superseded fact {fid}')
                        elif f.get('claimType') not in ('enumeration', 'superlative'):
                            B(f'{qid}: fact {fid} is a '
                              f'{f.get("claimType")} and may not refute by absence')
                for fid in q.get('factRefs', []):
                    if fid not in facts:
                        B(f'{qid}: factRef "{fid}" does not exist')
            else:
                if q.get('answer') not in opts:
                    B(f'{qid}: answer is not among the options')

            # The vagueness gate applies to the QUESTION too, not only the
            # claim. A precise fact behind a vague question is still broken.
            qt = q.get('question', '')
            if VAGUE.search(qt) and not MEASURED.search(qt):
                W(f'{qid}: question uses a vague superlative with no measure '
                  f'- "{VAGUE.search(qt).group(0)}"')

            rv = q.get('review', {})
            if rv.get('state') and rv['state'] not in VALID_REVIEW:
                B(f'{qid}: review.state "{rv["state"]}" invalid')
            if q.get('status') and q['status'] not in VALID_STATUS:
                B(f'{qid}: status "{q["status"]}" invalid')

            d = q.get('difficulty')
            if d is not None and (not isinstance(d, int) or not 1 <= d <= 5):
                B(f'{qid}: difficulty {d!r} must be null or 1-5')

            for u in q.get('usage', []):
                try:
                    when = datetime.date.fromisoformat(u.get('date', ''))
                except ValueError:
                    B(f'{qid}: usage date "{u.get("date")}" is not a date'); continue
                # Usage records an appearance that HAPPENED. A future entry
                # means something was logged at authoring time, which breaks
                # every cooldown calculation from then on.
                if when > TODAY:
                    B(f'{qid}: usage dated {when}, in the future - usage is '
                      f'written when a question is SERVED, not authored')

            for s in q.get('sourceRefs', []):
                if s not in sources:
                    B(f'{qid}: sourceRef "{s}" is not in sources.json')

            # Em and en dashes. You set this standard for UI copy months ago
            # and nothing has ever enforced it on question CONTENT. They also
            # render as a replacement block on a Windows console, which makes
            # every report harder to read and harder to paste.
            fields = [q.get('question', ''), q.get('explanation', ''),
                      q.get('memory_hook', '')] + \
                     [str(o) for o in q.get('options', []) if not isinstance(o, dict)] + \
                     [str(o.get('text', '')) for o in q.get('options', [])
                      if isinstance(o, dict)]
            if any('—' in f or '–' in f for f in fields):
                dashed.append(qid)

    N(f'questions: {total} across {len(files)} files, {len(seen)} unique ids')
    if dashed:
        W(f'{len(dashed)} questions contain an em or en dash, against the '
          f'no-dash rule set for UI copy: ' + ', '.join(dashed[:6])
          + ('...' if len(dashed) > 6 else ''))
    else:
        N('no em or en dashes in question content')
    if rewrite:
        W(f'{len(rewrite)} files would be rewritten by a no-op save '
          f'(key order or formatting drift): ' + ', '.join(rewrite[:5])
          + ('...' if len(rewrite) > 5 else ''))
    else:
        N('round-trip: every file byte-identical on a no-op save')


def main():
    print('FACT ROYALE - INTEGRITY CHECK')
    print(f'{TODAY}   read-only, nothing is modified\n')
    try:
        sources = check_registry()
        facts   = check_facts(sources)
        check_questions(sources, facts)
    except Exception as e:
        B(f'check crashed: {type(e).__name__}: {e}')

    for n in notes: print(f'  ok    {n}')
    if warn:
        print()
        for w in warn: print(f'  WARN  {w}')
    if block:
        print()
        for b in block[:40]: print(f'  BLOCK {b}')
        if len(block) > 40: print(f'  BLOCK ...and {len(block)-40} more')

    print(f'\n{len(block)} blocking, {len(warn)} warnings')
    print('\nThis covers structure and references only.')
    print('Run tools/preflight.py as well - it owns the content gates.')
    sys.exit(1 if block else 0)


if __name__ == '__main__':
    main()
