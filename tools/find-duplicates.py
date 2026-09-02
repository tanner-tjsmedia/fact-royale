#!/usr/bin/env python3
"""
FACT ROYALE — DUPLICATE TOPIC DETECTOR

Finds questions that cover the same ground, without needing a hand-written
topic list. Compares the salient words of every question prompt against every
other and reports pairs above a similarity threshold.

    python3 tools/find-duplicates.py               # default threshold 0.42
    python3 tools/find-duplicates.py 0.5           # stricter
    python3 tools/find-duplicates.py 0.35 2026-11  # looser, one month
"""
import json, os, re, sys
from collections import defaultdict
from itertools import combinations

QDIR = os.path.join(os.path.dirname(__file__), '..', 'questions-src')

STOP = set("""a an the of in on at to for from by with without and or but is are was were be been
being what which who whom whose when where why how did does do done has have had this that these
those it its their his her they them he she you your we our us as if then than so such most more
much many other another same both each any all some no not only over under between into during
before after above below up down out off again further once here there both few own too very can
will just should now about across against among around because being below beyond during except
following inside instead near outside since through throughout toward until upon within
called known considered following significant significance role effect impact main major key
primary important famous famously actual actually specifically particularly essentially largely
mostly often sometimes usually generally typically approximately roughly nearly almost
term terms name named refers refer meant mean means makes made make making
one two three four five first second third last next new old """.split())

NUM = re.compile(r'^\d+$')


def salient(text):
    words = re.findall(r"[A-Za-z][A-Za-z'\-]+", text.lower())
    return {w for w in words if len(w) > 3 and w not in STOP and not NUM.match(w)}


def main():
    thresh = 0.42
    prefix = ''
    args = sys.argv[1:]
    if args and re.match(r'^0?\.\d+$', args[0]):
        thresh = float(args[0]); args = args[1:]
    if args:
        prefix = args[0]

    items = []
    for fn in sorted(os.listdir(QDIR)):
        if not fn.endswith('.json') or not fn.startswith(prefix):
            continue
        date = fn[:-5]
        data = json.load(open(os.path.join(QDIR, fn), encoding='utf-8'))
        for i, q in enumerate(data.get('questions', [])):
            s = salient(q.get('question', ''))
            if len(s) >= 3:
                items.append((date, i, q.get('category', ''), q.get('question', ''), s))

    print(f'Comparing {len(items)} questions (threshold {thresh})...\n')

    pairs = []
    for (d1, i1, c1, q1, s1), (d2, i2, c2, q2, s2) in combinations(items, 2):
        inter = len(s1 & s2)
        if inter < 2:
            continue
        j = inter / len(s1 | s2)
        if j >= thresh:
            pairs.append((j, d1, i1, q1, d2, i2, q2, c1))

    pairs.sort(reverse=True, key=lambda p: p[0])

    # group into clusters
    parent = {}
    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: parent[ra] = rb

    meta = {}
    for j, d1, i1, q1, d2, i2, q2, c in pairs:
        k1, k2 = f'{d1}#{i1}', f'{d2}#{i2}'
        meta[k1] = (q1, c); meta[k2] = (q2, c)
        union(k1, k2)

    clusters = defaultdict(list)
    for k in meta:
        clusters[find(k)].append(k)

    big = sorted(clusters.values(), key=len, reverse=True)
    total = sum(len(c) for c in big)

    print(f'{len(big)} duplicate clusters covering {total} questions\n')
    print('=' * 72)
    for c in big:
        c = sorted(c)
        print(f'\n[{len(c)}x]')
        for k in c:
            q, cat = meta[k]
            print(f'  {k}  ({cat})')
            print(f'      {q[:104]}')

    print('\n' + '=' * 72)
    print(f'SUMMARY: {len(big)} clusters, {total} questions, '
          f'{total - len(big)} would need replacing to leave one of each')


if __name__ == '__main__':
    main()
