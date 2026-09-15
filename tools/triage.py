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

RATIO_LOW, RATIO_HIGH = 0.20, 1.30
OPT_MAX, SPREAD_MAX, TELL_MAX = 120, 45, 5

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
        # The low-ratio rule does not apply to short-answer formats.
        # See preflight.py for the measurement behind this.
        if r['ratio'] < RATIO_LOW and not is_shortform(r['opts']):
            out.append('ratio-low')
        if r['ratio'] > RATIO_HIGH: out.append('ratio-high')
        if r['longest'] > OPT_MAX:  out.append('option-too-long')
        if r['spread'] > SPREAD_MAX: out.append('spread')
        if r['tell'] > TELL_MAX:    out.append('length-tell')
        if r['count'] != 4:         out.append('option-count')
        if not r['answer_ok']:      out.append('answer-missing')
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

    # ---- the part that matters: WHY is the ratio low? -----------------
    low = [r for r in rows if r['ratio'] < RATIO_LOW]
    print(f'\n  of the {len(low)} ratio-low questions, the cause splits:\n')

    # A prompt well above the median with normal-length options is padding.
    # Short options with a normal prompt is genuine shallowness.
    padded  = [r for r in low if r['prompt'] > med_prompt * 1.4 and r['mean'] >= med_mean * 0.6]
    shallow = [r for r in low if r['mean'] < med_mean * 0.6 and r['prompt'] <= med_prompt * 1.4]
    both    = [r for r in low if r['prompt'] > med_prompt * 1.4 and r['mean'] < med_mean * 0.6]
    other   = [r for r in low if r not in padded and r not in shallow and r not in both]

    print(f'    PADDED PROMPT   {len(padded):4d}   trim the stem, options are fine')
    print(f'    SHORT OPTIONS   {len(shallow):4d}   genuinely shallow, needs rewriting')
    print(f'    BOTH            {len(both):4d}   long stem AND one-word answers')
    print(f'    neither         {len(other):4d}   near the boundary, judgement call')

    def show(label, items):
        if not items: return
        print(f'\n  --- {label} ---')
        for r in sorted(items, key=lambda r: r['ratio'])[:4]:
            print(f'    {r["id"]}  ratio {r["ratio"]:.2f}  '
                  f'prompt {r["prompt"]}  mean option {r["mean"]:.0f}')
            print(f'      "{r["q"][:110]}{"..." if len(r["q"]) > 110 else ""}"')

    show('PADDED PROMPT examples', padded)
    show('SHORT OPTIONS examples', shallow)

    # ---- is the ratio rule even applicable to these? ------------------
    # A numeric answer cannot pass. "How many NBA titles did Jordan win?"
    # has options 5/6/7/8, so mean option length is 1 and the ratio is 0.01
    # against any prompt. The gate is not measuring quality here, it is
    # measuring that the answer is a number.
    def kind(r):
        opts = r.get('opts', [])
        stripped = [o.replace(',', '').replace('%', '').strip() for o in opts]
        if all(re.fullmatch(r'-?\d+(\.\d+)?', o or 'x') for o in stripped):
            return 'numeric'
        if all(len(o.split()) <= 2 for o in opts):
            return 'short-form'          # cities, names, single terms
        return 'prose'

    for r in rows:
        r['kind'] = kind(r)
    lowk = Counter(r['kind'] for r in low)
    allk = Counter(r['kind'] for r in rows)
    print('\n  ratio-low questions by ANSWER FORMAT:\n')
    print(f'    {"format":12s} {"ratio-low":>10s} {"in corpus":>10s} {"% failing":>10s}')
    for k in ('numeric', 'short-form', 'prose'):
        pct = (100 * lowk[k] / allk[k]) if allk[k] else 0
        print(f'    {k:12s} {lowk[k]:10d} {allk[k]:10d} {pct:9.0f}%')
    struct = lowk['numeric'] + lowk['short-form']
    print(f'\n  {struct} of {len(low)} ratio-low questions have numeric or two-word')
    print(f'  answers, which cannot pass this gate by construction.')
    print(f'  Excluding them leaves {len(low) - struct} genuine ratio failures.')

    # ---- how much is salvageable by trimming alone? -------------------
    # If the stem were cut to the median length, would the ratio pass?
    rescued = [r for r in low if (r['mean'] / med_prompt) >= RATIO_LOW]
    print(f'\n  {len(rescued)} of {len(low)} ratio-low questions would PASS if the')
    print(f'  prompt were trimmed to the corpus median ({med_prompt:.0f} chars).')
    print(f'  That is editing, not rewriting, and it is the cheapest repair available.\n')

    unsourced_broken = sum(1 for r in rows if per_q[r['id']] and not r['sourced'])
    clean_unsourced  = sum(1 for r in rows if not per_q[r['id']] and not r['sourced'])
    clean_sourced    = sum(1 for r in rows if not per_q[r['id']] and r['sourced'])
    print('  crossed with sourcing (ratio exemption applied):')
    print(f'    mechanically clean AND sourced      {clean_sourced:4d}   ready to use')
    print(f'    mechanically clean, needs a source  {clean_unsourced:4d}   cheapest to rescue')
    print(f'    broken and unsourced                {unsourced_broken:4d}   most expensive')

    # The set that actually matters. Every error found in this corpus so far
    # was a record, count or superlative - not a formatting problem.
    volatile = re.compile(r'\b(only|first|last|most|least|record|fastest|'
                          r'slowest|highest|lowest|largest|smallest|longest|'
                          r'shortest|best|worst|oldest|youngest|never|all|'
                          r'every|billion|million)\b', re.I)
    risky = [r for r in rows if not r['sourced'] and
             volatile.search(r['q'] + ' ' + ' '.join(r['opts']))]
    print(f'\n  VOLATILE AND UNSOURCED  {len(risky)}')
    print('    Records, counts, superlatives with no evidence behind them.')
    print('    Mechanical failures are a quality problem. These are a')
    print('    credibility problem, and they are where every known error came from.')


if __name__ == '__main__':
    main()
