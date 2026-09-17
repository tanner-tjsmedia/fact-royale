#!/usr/bin/env python3
"""
FACT ROYALE - SOURCING WORKLIST

Writes the highest-priority unsourced questions to a single file, so a
sourcing session can start from a targeted list instead of reading 82
question files to find them.

    python tools/worklist.py                 top 40 to worklist.txt
    python tools/worklist.py --limit 25      smaller batch
    python tools/worklist.py --skip 40       the next batch after the first

Read-only. Writes one file, worklist.txt, and nothing else.

PRIORITY ORDER, and the reason for it

  1. VOLATILE AND UNSOURCED
     Records, counts, superlatives, firsts, "only". Every factual error
     found in this corpus so far has been one of these, including the two
     where the ANSWER was wrong. They are 13% of the corpus and carry most
     of the risk of being publicly, embarrassingly incorrect.

  2. UNSOURCED BUT MECHANICALLY CLEAN
     Good questions missing only evidence. Cheapest to rescue: nothing needs
     rewriting, only verifying.

  3. UNSOURCED AND MECHANICALLY BROKEN
     Needs a rewrite as well as a source. Most expensive, least urgent,
     and often better replaced than repaired.

Already-sourced questions are excluded entirely.
"""

import json, glob, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
QDIR = os.path.join(ROOT, 'questions-src')
OUT  = os.path.join(ROOT, 'worklist.txt')

PROMPT_MAX, OPT_MAX, SPREAD_MAX, TELL_MAX = 160, 120, 45, 5

# IMPORTED, not redefined.
#
# The first version of this file declared its own volatile word list and
# reported 608 tier-1 questions. preflight.py reports 131 for the same
# thing. Mine was wrong: it matched bare words like "most", "first" and
# "only", which appear in ordinary prose constantly. preflight matches
# PHRASES - "world record", "the most X ever", "only woman to" - which is
# a far better pattern.
#
# This is the third time in one session that a duplicated rule drifted from
# its original and inflated a number. The fix is never a better copy. It is
# one owner per question, imported.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import preflight                      # safe: its main() is __main__-guarded
VOLATILE = preflight.VOLATILE


def mech_issues(q):
    opts = [str(o) for o in q.get('options', [])]
    if not opts:
        return ['no options']
    lens = [len(o) for o in opts]
    ans = str(q.get('answer', ''))
    nxt = max([len(o) for o in opts if o != ans] or [0])
    out = []
    if len(q.get('question', '')) > PROMPT_MAX: out.append('prompt-too-long')
    if max(lens) > OPT_MAX:                     out.append('option-too-long')
    if max(lens) - min(lens) > SPREAD_MAX:      out.append('spread')
    if len(ans) == max(lens) and len(ans) - nxt > TELL_MAX: out.append('length-tell')
    if len(opts) != 4:                          out.append('option-count')
    if ans not in opts:                         out.append('answer-missing')
    return out


def main():
    argv = sys.argv[1:]
    limit = 40
    skip = 0
    if '--limit' in argv: limit = int(argv[argv.index('--limit') + 1])
    if '--skip' in argv:  skip = int(argv[argv.index('--skip') + 1])

    rows = []
    for path in sorted(glob.glob(os.path.join(QDIR, '*.json'))):
        name = os.path.basename(path)
        if not re.match(r'^\d{4}-', name):
            continue
        data = json.load(open(path, encoding='utf-8'))
        for q in data.get('questions', []):
            if q.get('sourceRefs'):
                continue                      # already has evidence
            issues = mech_issues(q)
            blob = ' '.join([q.get('question', ''), q.get('explanation', ''),
                             q.get('memory_hook', '')])
            hit = VOLATILE.search(blob)
            tier = 1 if hit else (2 if not issues else 3)
            rows.append({'tier': tier, 'date': name[:-5], 'q': q,
                         'issues': issues, 'trigger': hit.group(0) if hit else None})

    rows.sort(key=lambda r: (r['tier'], r['q'].get('id', '')))
    total = len(rows)
    batch = rows[skip:skip + limit]

    with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
        t1 = sum(1 for r in rows if r['tier'] == 1)
        t2 = sum(1 for r in rows if r['tier'] == 2)
        t3 = sum(1 for r in rows if r['tier'] == 3)
        fh.write(f'SOURCING WORKLIST\n')
        fh.write(f'{total} unsourced questions total\n')
        fh.write(f'  tier 1  volatile and unsourced      {t1}\n')
        fh.write(f'  tier 2  clean, needs only a source  {t2}\n')
        fh.write(f'  tier 3  broken and unsourced        {t3}\n')
        fh.write(f'\nshowing {len(batch)}, skipping the first {skip}\n')
        fh.write('=' * 70 + '\n\n')

        for r in batch:
            q = r['q']
            fh.write(f'{q.get("id")}  [tier {r["tier"]}]  {r["date"]}  {q.get("category")}\n')
            if r['trigger']:
                fh.write(f'  VOLATILE WORD: "{r["trigger"]}"\n')
            if r['issues']:
                fh.write(f'  mechanical: {", ".join(r["issues"])}\n')
            fh.write(f'  Q: {q.get("question")}\n')
            for o in q.get('options', []):
                mark = '*' if o == q.get('answer') else ' '
                fh.write(f'   {mark} {o}\n')
            if q.get('explanation'):
                fh.write(f'  E: {q["explanation"]}\n')
            fh.write('\n')

    print(f'{total} unsourced questions')
    print(f'  tier 1 volatile   {sum(1 for r in rows if r["tier"] == 1)}')
    print(f'  tier 2 clean      {sum(1 for r in rows if r["tier"] == 2)}')
    print(f'  tier 3 broken     {sum(1 for r in rows if r["tier"] == 3)}')
    print(f'\nwrote {len(batch)} to worklist.txt (skipped {skip})')


if __name__ == '__main__':
    main()
