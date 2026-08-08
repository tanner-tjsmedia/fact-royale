#!/usr/bin/env python3
"""
FACT ROYALE — SOURCE REGISTRY TOOL

    python3 tools/registry.py                    # health report
    python3 tools/registry.py --usage            # which questions cite what
    python3 tools/registry.py --orphans          # entries nothing cites
    python3 tools/registry.py --stale            # entries past their recheck date
    python3 tools/registry.py --impact <id>      # what breaks if this is wrong

The registry is the point of the whole exercise. A claim verified once is
never verified again, and over time it becomes a fact base keyed to primary
records rather than a pile of links.

Two things make it durable:

  archive   a web.archive.org snapshot. Sources disappear. A citation that
            404s in two years is not a citation.

  reverse   which questions depend on each entry. If Saturn's moon count moves
  index     again you need to know instantly what to fix, not go hunting.
"""
import json, os, sys
from collections import defaultdict
from datetime import date

ROOT = os.path.join(os.path.dirname(__file__), '..')
REG  = os.path.join(ROOT, 'sources.json')
QDIR = os.path.join(ROOT, 'questions')


def load():
    return json.load(open(REG, encoding='utf-8'))


def usage_index():
    """id -> [question locations citing it]"""
    idx = defaultdict(list)
    inline = []
    for fn in sorted(os.listdir(QDIR)):
        if not fn.endswith('.json'):
            continue
        d = fn[:-5]
        data = json.load(open(os.path.join(QDIR, fn), encoding='utf-8'))
        for i, q in enumerate(data.get('questions', [])):
            for r in (q.get('sourceRefs') or []):
                idx[r].append(f'{d}#{i}')
            if q.get('sources'):
                inline.append(f'{d}#{i}')
    return idx, inline


def main():
    args = sys.argv[1:]
    reg = load()
    srcs = reg.get('sources', {})
    idx, inline = usage_index()
    today = date.today().isoformat()

    if '--impact' in args:
        sid = args[args.index('--impact') + 1]
        e = srcs.get(sid)
        if not e:
            print(f'no entry "{sid}"'); return 1
        who = idx.get(sid, [])
        print(f'{sid}\n  {e.get("publisher","?")}  [{e.get("tier","?")}]')
        print(f'  establishes: {e.get("establishes","")}')
        print(f'\n  {len(who)} question(s) depend on this:')
        for w in who:
            print(f'    {w}')
        if not who:
            print('    none')
        return 0

    if '--usage' in args:
        for sid in sorted(srcs):
            who = idx.get(sid, [])
            print(f'{sid:32s} {len(who):3d}  {", ".join(who[:6])}'
                  f'{" ..." if len(who) > 6 else ""}')
        return 0

    if '--orphans' in args:
        orph = [s for s in srcs if not idx.get(s)]
        print(f'{len(orph)} entries cited by nothing:')
        for o in orph:
            print(f'  {o}')
        return 0

    if '--stale' in args:
        stale = [(s, e['recheck']) for s, e in srcs.items()
                 if e.get('recheck') and e['recheck'] <= today]
        print(f'{len(stale)} entries due for recheck:')
        for s, d in sorted(stale, key=lambda x: x[1]):
            print(f'  {d}  {s}  ({len(idx.get(s,[]))} questions affected)')
        return 0

    # ── health report ──
    tiers = defaultdict(int)
    no_archive, no_establishes, flagged = [], [], []
    upcoming = []
    for sid, e in srcs.items():
        tiers[e.get('tier', 'unset')] += 1
        if not e.get('archive'):
            no_archive.append(sid)
        if not e.get('establishes'):
            no_establishes.append(sid)
        if e.get('replace'):
            flagged.append((sid, e['replace']))
        if e.get('recheck'):
            upcoming.append((e['recheck'], sid))

    cited = sum(len(v) for v in idx.values())
    print(f'REGISTRY  {len(srcs)} entries, cited {cited} times '
          f'by {len(set(w for v in idx.values() for w in v))} questions\n')
    for t in ('primary', 'reference', 'secondary', 'unset'):
        if tiers[t]:
            print(f'  {t:10s} {tiers[t]}')

    if inline:
        print(f'\n  {len(inline)} questions bypass the registry with inline sources:')
        for q in inline[:10]:
            print(f'    {q}')
        print('  Move these into sources.json so they can be reused and tracked.')

    if no_archive:
        print(f'\n  {len(no_archive)} entries have no archive snapshot '
              f'(link rot risk)')
    if no_establishes:
        print(f'  {len(no_establishes)} entries do not say what they establish')

    if flagged:
        print(f'\n  {len(flagged)} entries need a better source:')
        for sid, note in flagged:
            print(f'    {sid}: {note[:80]}')

    if upcoming:
        print(f'\n  recheck schedule:')
        for d, sid in sorted(upcoming):
            due = ' DUE' if d <= today else ''
            print(f'    {d}  {sid}  ({len(idx.get(sid,[]))} questions){due}')

    return 0


if __name__ == '__main__':
    sys.exit(main())
