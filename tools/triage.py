#!/usr/bin/env python3
"""
FACT ROYALE - TRIAGE

Read-only. Splits the preflight failures into what they ACTUALLY are, so a
repair plan is built on the real shape of the problem rather than on a
headline number.

    python tools/triage.py

WHY THIS EXISTS

preflight --all reports 706 blocking issues. That number is misleading in
two ways, and acting on it directly would waste weeks.

1. It counts ISSUES, not questions. One question failing on both ratio and
   length tell appears twice.

2. "ratio 0.02, shallow recall" conflates two opposite problems:

       SHORT OPTIONS    long question, one-word answers.
                        Genuinely shallow. The question needs rewriting.

       PADDED PROMPT    the options are fine; the question stem is bloated
                        with preamble. Trim the stem and the same question
                        passes.

   The ratio is mean(option length) / prompt length, so both push it down.
   A rule that cannot tell them apart tells you to rewrite questions that
   only need a shorter stem.

This script separates them and prints examples of each, so the repair plan
can be argued from evidence.
"""

import json, glob, os, re, statistics, sys

QDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'questions-src')

# Ceilings only. The ratio rule was retired 2026-09-15 - see preflight.py
# for the measurement that killed it. Nothing here asks content to hit a
# target; every rule is "do not exceed".
PROMPT_MAX, OPT_MAX, SPREAD_MAX, TELL_MAX = 160, 120, 45, 5

# Reference points, measured from the corpus itself further down rather than
# assumed: a "normal" prompt and a "normal" option length.
def main():
    files = sorted(f for f in glob.glob(os.path.join(QDIR, '*.json'))
                   if re.match(r'^\d{4}-', os.path.basename(f)))
    rows = []
    for path in files:
        try:
            data = json.load(open(path, encoding='utf-8'))
        except Exception as e:
            print(f'  cannot parse {os.path.basename(path)}: {e}'); continue
        for q in data.get('questions', []):
            opts = [str(o) for o in q.get('options', [])]
            if not opts:
                continue
            lens = [len(o) for o in opts]
            prompt = len(q.get('question', '')) or 1
            mean = statistics.mean(lens)
            ans = str(q.get('answer', ''))
            nxt = max([len(o) for o in opts if o != ans] or [0])
            rows.append({
                'id': q.get('id', '?'),
                'q': q.get('question', ''),
                'opts': opts,
                'prompt': prompt, 'mean': mean, 'ratio': mean / prompt,
                'longest': max(lens), 'spread': max(lens) - min(lens),
                'tell': (len(ans) - nxt) if len(ans) == max(lens) else 0,
                'count': len(opts),
                'answer_ok': ans in opts,
                'sourced': bool(q.get('sourceRefs')),
            })

    n = len(rows)
    if not n:
        print('No questions found.'); sys.exit(1)

    med_prompt = statistics.median(r['prompt'] for r in rows)
    med_mean   = statistics.median(r['mean'] for r in rows)
    print(f'TRIAGE  {n} questions across {len(files)} files\n')
    print(f'  median prompt length   {med_prompt:.0f} chars')
    print(f'  median option length   {med_mean:.0f} chars')
    print(f'  median ratio           {statistics.median(r["ratio"] for r in rows):.2f}\n')

    # ---- every distinct failure, per question -------------------------
    def is_shortform(opts):
        """Numeric or two-word answers. Must stay identical to the test in
        preflight.py - two tools disagreeing about the same corpus is the
        drift bug this project keeps hitting."""
        s = [str(x).strip() for x in opts]
        return (all(re.fullmatch(r'-?[\d,]+(\.\d+)?%?', x) for x in s)
                or all(len(x.split()) <= 2 for x in s))

    def fails(r):
        out = []
        if r['prompt'] > PROMPT_MAX:  out.append('prompt-too-long')
        if r['longest'] > OPT_MAX:    out.append('option-too-long')
        if r['spread'] > SPREAD_MAX:  out.append('spread')
        if r['tell'] > TELL_MAX:      out.append('length-tell')
        if r['count'] != 4:           out.append('option-count')
        if not r['answer_ok']:        out.append('answer-missing')
        return out

    per_q = {r['id']: fails(r) for r in rows}
    broken = {k: v for k, v in per_q.items() if v}
    issues = sum(len(v) for v in broken.values())
    print(f'  questions with at least one failure   {len(broken)}')
    print(f'  total individual issues               {issues}')
    print(f'  (this is why preflight says ~{issues}, not ~{len(broken)})\n')

    from collections import Counter
    c = Counter(f for v in broken.values() for f in v)
    print('  failures by kind:')
    for k, v in c.most_common():
        print(f'    {k:18s} {v:4d}')

    # ---- where each ceiling actually bites ----------------------------
    #
    # HISTORY, recorded so the reasoning is not lost. This section used to
    # analyse why the RATIO was low, splitting questions into "padded
    # prompt" versus "genuinely shallow". That whole framing went with the
    # ratio rule on 2026-09-15.
    #
    # The ratio asked content to hit a target RELATIONSHIP between prompt
    # and answer length. Good writing has no such relationship: an answer
    # is one word when one word is right, and a sentence when it is not.
    # The rule rejected 48 of 48 numeric questions, which is not a quality
    # signal, it is a format ban.
    #
    # Ceilings replaced it. Nothing has to reach a length; nothing may
    # exceed one. The useful analysis is therefore no longer "why is this
    # ratio low" but "how close is the corpus to each ceiling".
    print('\n  distance to each ceiling:\n')
    print(f'    {"rule":18s} {"ceiling":>8s} {"median":>8s} {"p90":>8s} {"over":>6s}')

    def pctile(vals, p):
        s = sorted(vals)
        return s[min(len(s) - 1, int(len(s) * p))] if s else 0

    for label, key, ceiling in (('prompt chars', 'prompt', PROMPT_MAX),
                                ('longest option', 'longest', OPT_MAX),
                                ('option spread', 'spread', SPREAD_MAX),
                                ('answer tell', 'tell', TELL_MAX)):
        vals = [r[key] for r in rows]
        over = sum(1 for v in vals if v > ceiling)
        print(f'    {label:18s} {ceiling:8d} '
              f'{statistics.median(vals):8.0f} {pctile(vals, 0.9):8.0f} {over:6d}')

    worst = sorted(rows, key=lambda r: r['prompt'], reverse=True)[:4]
    if worst and worst[0]['prompt'] > PROMPT_MAX:
        print('\n  longest prompts:')
        for r in worst:
            flag = 'OVER' if r['prompt'] > PROMPT_MAX else '  ok'
            print(f'    {flag}  {r["id"]}  {r["prompt"]} chars')
            print(f'      "{r["q"][:100]}{"..." if len(r["q"]) > 100 else ""}"')

    unsourced_broken = sum(1 for r in rows if per_q[r['id']] and not r['sourced'])
    clean_unsourced  = sum(1 for r in rows if not per_q[r['id']] and not r['sourced'])
    clean_sourced    = sum(1 for r in rows if not per_q[r['id']] and r['sourced'])
    print('\n  crossed with sourcing:')
    print(f'    mechanically clean AND sourced      {clean_sourced:4d}   ready to use')
    print(f'    mechanically clean, needs a source  {clean_unsourced:4d}   cheapest to rescue')
    print(f'    broken and unsourced                {unsourced_broken:4d}   most expensive')

    # DELIBERATELY NOT COUNTED HERE.
    #
    # A first version of this script counted "volatile and unsourced" with
    # its own regex and reported 380. preflight.py reports 131 for the same
    # thing. Mine was wrong - it matched ordinary words like "all", "every"
    # and "first", and searched the options as well as the prompt.
    #
    # The point is not that the regex was sloppy. It is that two tools
    # answering the same question with different numbers is the exact drift
    # bug this project keeps hitting, and the fix is one owner per question,
    # not two implementations kept in sync by good intentions.
    #
    # preflight.py owns "which claims are volatile and unsourced".
    print('\n  Volatile and unsourced claims are counted by preflight.py,')
    print('  which owns that question:   python tools/preflight.py --all')


if __name__ == '__main__':
    main()
