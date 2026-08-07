#!/usr/bin/env python3
"""
FACT ROYALE — QUESTION VALIDATOR

Run from the repo root:   python3 tools/validate-questions.py
Or check one month:       python3 tools/validate-questions.py 2026-11

Enforces the content standard:
  - 12 questions per file
  - Category balance: History 3, Sports 2, Pop Culture 3, Geography 2, Science 2
  - answer must exactly match one of the 4 options
  - Option length <= 80 chars (target 60)
  - Length spread <= 35 chars, so the correct answer can't be spotted by length
  - Answer position spread across 0-3 (reported corpus-wide)
"""
import json, os, sys
from collections import Counter

QDIR = os.path.join(os.path.dirname(__file__), '..', 'questions')

TARGET_LEN   = 60   # aim
MAX_LEN      = 80   # hard ceiling
MAX_SPREAD   = 35   # max(len) - min(len) within one question
EXPECTED_CAT = {'History': 3, 'Sports': 2, 'Pop Culture': 3, 'Geography': 2, 'Science & Nature': 2}

def main():
    prefix = sys.argv[1] if len(sys.argv) > 1 else ''
    files = sorted(f for f in os.listdir(QDIR) if f.endswith('.json') and f.startswith(prefix))
    if not files:
        print(f'No question files matching "{prefix}"'); return 1

    errors, warnings = [], []
    pos = Counter(); longest_is_ans = 0; total_q = 0
    len_violations = []

    for fn in files:
        date = fn[:-5]
        with open(os.path.join(QDIR, fn)) as f:
            data = json.load(f)
        qs = data.get('questions', [])

        if len(qs) != 12:
            errors.append(f'{date}: has {len(qs)} questions, expected 12')

        cats = Counter(q.get('category') for q in qs)
        for cat, want in EXPECTED_CAT.items():
            if cats.get(cat, 0) != want:
                errors.append(f'{date}: {cat} = {cats.get(cat,0)}, expected {want}')

        for i, q in enumerate(qs):
            total_q += 1
            opts = q.get('options', [])
            ans  = q.get('answer')
            loc  = f'{date} idx={i}'

            if len(opts) != 4:
                errors.append(f'{loc}: {len(opts)} options, expected 4'); continue
            if ans not in opts:
                errors.append(f'{loc}: answer does not match any option'); continue
            if len(set(opts)) != 4:
                errors.append(f'{loc}: duplicate options')

            pos[opts.index(ans)] += 1
            lens = [len(o) for o in opts]
            if max(opts, key=len) == ans:
                longest_is_ans += 1

            if max(lens) > MAX_LEN:
                len_violations.append((loc, 'too long', max(lens)))
            elif max(lens) > TARGET_LEN:
                warnings.append(f'{loc}: option {max(lens)} chars (target {TARGET_LEN})')

            spread = max(lens) - min(lens)
            if spread > MAX_SPREAD:
                len_violations.append((loc, 'length tell', spread))

            for field in ('explanation', 'memory_hook'):
                if not q.get(field):
                    warnings.append(f'{loc}: missing {field}')

    print(f'Checked {len(files)} files, {total_q} questions\n')

    if errors:
        print(f'ERRORS ({len(errors)}):')
        for e in errors[:40]: print(f'  {e}')
        if len(errors) > 40: print(f'  ... and {len(errors)-40} more')
        print()
    else:
        print('No structural errors.\n')

    if len_violations:
        toolong = [v for v in len_violations if v[1] == 'too long']
        tell    = [v for v in len_violations if v[1] == 'length tell']
        print(f'LENGTH ISSUES ({len(len_violations)}):')
        print(f'  over {MAX_LEN} chars:      {len(toolong)}')
        print(f'  length tell (>{MAX_SPREAD}): {len(tell)}')
        for loc, kind, val in len_violations[:15]:
            print(f'    {loc}: {kind} ({val})')
        if len(len_violations) > 15: print(f'    ... and {len(len_violations)-15} more')
        print()

    pct = 100 * longest_is_ans / total_q if total_q else 0
    print('EXPLOIT CHECK')
    print(f'  answer is longest option: {longest_is_ans}/{total_q} ({pct:.1f}%)  [25% = ideal]')
    if pct > 35: print('  ^^ EXPLOITABLE: players can guess by picking the longest option')
    print('  answer position:', ', '.join(f'{i}:{100*pos[i]/total_q:.0f}%' for i in range(4)))
    print()

    if warnings:
        print(f'WARNINGS ({len(warnings)}) — first 10:')
        for w in warnings[:10]: print(f'  {w}')

    return 1 if (errors or len_violations) else 0

if __name__ == '__main__':
    sys.exit(main())
