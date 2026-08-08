#!/usr/bin/env python3
"""
FACT ROYALE — QUESTION VALIDATOR

    python3 tools/validate-questions.py            # whole corpus
    python3 tools/validate-questions.py 2026-11    # one month
    python3 tools/validate-questions.py --quiet    # summary only

Enforces the content standard in CONTENT-STANDARDS.md.

The governing rule is the RATIO: mean option length divided by prompt length.
It catches both failure modes with one number.

    under 0.20   options are one-word recall; the question is shallow
    0.30 - 0.90  target band; prompt carries setup, options stay scannable
    over 1.30    answers rival or dwarf the question (the readability complaint)
"""
import json, os, sys, statistics
from collections import Counter

QDIR = os.path.join(os.path.dirname(__file__), '..', 'questions')

# ── the standard ──────────────────────────────────────────
OPT_TARGET   = 90     # option chars: comfortable
OPT_MAX      = 120    # option chars: hard ceiling (about two lines)
SPREAD_MAX   = 45     # longest minus shortest option within a question
PROMPT_MIN   = 60     # below this the prompt isn't carrying its weight
PROMPT_MAX   = 280    # above this the prompt itself is a wall
RATIO_LOW    = 0.20   # below: shallow recall
RATIO_HIGH   = 1.30   # above: answers dwarf the question
LOAD_TARGET  = 4300   # chars a player reads for a full 12-question day
LOAD_MAX     = 5500
LONG_Q_MIN   = 1      # per day, questions allowed a heavier option set
LONG_Q_MAX   = 5
LONG_OPT     = 70     # what counts as a "heavier" option

EXPECTED_CAT = {'History': 3, 'Sports': 2, 'Pop Culture': 3,
                'Geography': 2, 'Science & Nature': 2}


def main():
    args = [a for a in sys.argv[1:]]
    quiet = '--quiet' in args
    if quiet: args.remove('--quiet')
    prefix = args[0] if args else ''

    files = sorted(f for f in os.listdir(QDIR)
                   if f.endswith('.json') and f.startswith(prefix))
    if not files:
        print(f'No question files matching "{prefix}"'); return 1

    errors, warnings = [], []
    pos = Counter(); longest_is_ans = 0; total_q = 0
    ratios, loads = [], []
    over_ratio = 0

    for fn in files:
        date = fn[:-5]
        data = json.load(open(os.path.join(QDIR, fn), encoding='utf-8'))
        qs = data.get('questions', [])

        if len(qs) != 12:
            errors.append(f'{date}: {len(qs)} questions, expected 12')
        cats = Counter(q.get('category') for q in qs)
        for cat, want in EXPECTED_CAT.items():
            if cats.get(cat, 0) != want:
                errors.append(f'{date}: {cat}={cats.get(cat,0)}, expected {want}')

        day_load = 0
        day_long = 0

        for i, q in enumerate(qs):
            total_q += 1
            opts = q.get('options', [])
            ans  = q.get('answer')
            prompt = q.get('question', '')
            loc = f'{date} #{i}'

            if len(opts) != 4:
                errors.append(f'{loc}: {len(opts)} options'); continue
            if ans not in opts:
                errors.append(f'{loc}: answer not among options'); continue
            if len(set(opts)) != 4:
                errors.append(f'{loc}: duplicate options')

            pos[opts.index(ans)] += 1
            L = [len(o) for o in opts]
            if max(opts, key=len) == ans:
                longest_is_ans += 1

            day_load += len(prompt) + sum(L)
            if max(L) > LONG_OPT:
                day_long += 1

            # ── the ratio rule ──
            if len(prompt):
                r = statistics.mean(L) / len(prompt)
                ratios.append(r)
                if r > RATIO_HIGH:
                    over_ratio += 1
                    errors.append(f'{loc}: ratio {r:.2f} — answers dwarf the question')
                elif r < RATIO_LOW:
                    warnings.append(f'{loc}: ratio {r:.2f} — shallow recall, options too thin')

            if max(L) > OPT_MAX:
                errors.append(f'{loc}: option {max(L)} chars (max {OPT_MAX})')
            elif max(L) > OPT_TARGET:
                warnings.append(f'{loc}: option {max(L)} chars (target {OPT_TARGET})')

            if max(L) - min(L) > SPREAD_MAX:
                errors.append(f'{loc}: spread {max(L)-min(L)} — length gives away the answer')

            if len(prompt) < PROMPT_MIN:
                warnings.append(f'{loc}: prompt only {len(prompt)} chars — let it carry more setup')
            if len(prompt) > PROMPT_MAX:
                warnings.append(f'{loc}: prompt {len(prompt)} chars — trim it')

            for f in ('explanation', 'memory_hook'):
                if not q.get(f):
                    warnings.append(f'{loc}: missing {f}')

        loads.append((date, day_load, day_long))
        if day_load > LOAD_MAX:
            errors.append(f'{date}: day load {day_load} (max {LOAD_MAX})')
        if not (LONG_Q_MIN <= day_long <= LONG_Q_MAX):
            warnings.append(f'{date}: {day_long} heavier questions (want {LONG_Q_MIN}-{LONG_Q_MAX})')

    # ── report ──
    print(f'Checked {len(files)} files, {total_q} questions\n')

    if ratios:
        med = statistics.median(ratios)
        print('RATIO  (mean option / prompt)')
        print(f'  median {med:.2f}   target band {RATIO_LOW}-0.90')
        print(f'  over {RATIO_HIGH}: {over_ratio} questions ({100*over_ratio/total_q:.1f}%)')
        thin = sum(1 for r in ratios if r < RATIO_LOW)
        print(f'  under {RATIO_LOW}: {thin} questions ({100*thin/total_q:.1f}%) — shallow\n')

    if loads:
        med = int(statistics.median(l[1] for l in loads))
        worst = max(loads, key=lambda l: l[1])
        print('READING LOAD PER DAY')
        print(f'  median {med}   target {LOAD_TARGET}, max {LOAD_MAX}')
        print(f'  worst  {worst[0]} at {worst[1]}\n')

    pct = 100 * longest_is_ans / total_q if total_q else 0
    print('EXPLOIT CHECK')
    print(f'  answer is longest option: {longest_is_ans}/{total_q} ({pct:.1f}%)  [25% ideal]')
    if pct > 35:
        print('  ^^ players can score by picking the longest option')
    if total_q:
        print('  answer position: ' + ', '.join(f'{i}:{100*pos[i]/total_q:.0f}%' for i in range(4)))
    print()

    print(f'ERRORS: {len(errors)}    WARNINGS: {len(warnings)}')
    if not quiet:
        for e in errors[:30]: print(f'  ERR  {e}')
        if len(errors) > 30: print(f'  ... and {len(errors)-30} more errors')
        for w in warnings[:15]: print(f'  warn {w}')
        if len(warnings) > 15: print(f'  ... and {len(warnings)-15} more warnings')

    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
