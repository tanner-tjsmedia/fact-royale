#!/usr/bin/env python3
"""
FACT ROYALE - CLUSTER REPORT

Read-only. Groups the existing questions by what they are ABOUT, so the size
of the underlying fact base can be measured instead of guessed.

    python tools/cluster.py                 writes clusters.txt
    python tools/cluster.py --min 3         only clusters of 3 or more

WHY

The job is not "verify 984 questions". It is "extract a fact base FROM 984
questions". The questions are raw material - evidence of ground already
covered. The output is the knowledge database.

That inverts the economics. Per-question verification is 984 units of work.
Per-fact verification is however many DISTINCT CLAIMS actually sit
underneath, and the first twenty questions inspected already showed Brazil
twice, Thriller twice, Michael Jackson twice and Queen twice.

This report measures that. It decides nothing.

THREE SIGNALS, deliberately separated

  SAME ANSWER      Two questions with the same answer are nearly always
                   about the same subject. Strongest signal, and it catches
                   what word overlap cannot: "Freddie Mercury was lead
                   vocalist of which band?" and "Which band performed
                   Bohemian Rhapsody?" share almost no words, but both
                   answer Queen.

  TIGHT OVERLAP    Salient-word similarity at or above preflight's own
                   duplicate threshold. These are near-duplicate questions -
                   probably the SAME claim asked twice.

  FUZZY OVERLAP    Similar but below that line. Same territory, probably
                   DIFFERENT claims about one subject. Reported as suggested
                   links, not merged.

Everything else is a singleton: its own subject, its own fact.

WHAT THE NUMBERS MEAN

  clusters + singletons  is the rough count of distinct SUBJECTS
  questions per cluster  is how much verification each fact buys

A corpus of 984 questions across 500 subjects means verifying 500 things,
not 984, and every future question on those subjects is already covered.

Word overlap is fuzzy and this will get some groupings wrong. It is a
proposal for a human to correct, never an automated decision.
"""

import json, glob, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import preflight                   # safe: main() is __main__-guarded

# One owner per rule. salient() and the duplicate threshold belong to
# preflight; this file borrows them rather than keeping a second copy that
# drifts. That mistake has already been made three times on this project.
salient   = preflight.salient
TIGHT     = preflight.DUP_THRESH   # 0.42
FUZZY     = 0.22

QDIR = os.path.join(HERE, '..', 'questions-src')
OUT  = os.path.join(HERE, '..', 'clusters.txt')


def norm_answer(a):
    """Normalise an answer for identity comparison, or return '' when the
    answer must not be used as an identity link at all.

    NUMERIC ANSWERS NEVER LINK. The first version of this function did not
    make that exception and produced a 15-question cluster containing:

        How many NBA championships did Jordan win?      6
        How many players on the ice in NHL hockey?      6
        How many players on a volleyball court?         6
        How many points is a touchdown worth?           6

    "6" equals "6" is not a subject relationship. Worse, the error runs in
    the unhelpful direction: fusing unrelated questions into one cluster
    counts them as ONE subject when they are really eight, so it understates
    the true size of the fact base.

    Very short answers are excluded for the same reason - a two-character
    answer carries no subject identity.
    """
    s = str(a).lower().strip()
    s = re.sub(r'^(the|a|an)\s+', '', s)
    s = re.sub(r'[^a-z0-9 ]', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    if not s or len(s) <= 2:
        return ''
    if re.fullmatch(r'[\d ]+', s):          # pure number, any digits
        return ''
    return s


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


class Union:
    """Union-find, so transitive groupings merge: if A links B and B links
    C, all three are one cluster even when A and C never matched directly."""
    def __init__(self): self.p = {}
    def find(self, x):
        self.p.setdefault(x, x)
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb: self.p[ra] = rb


def main():
    min_size = 2
    if '--min' in sys.argv:
        min_size = int(sys.argv[sys.argv.index('--min') + 1])

    rows = []
    for path in sorted(glob.glob(os.path.join(QDIR, '*.json'))):
        name = os.path.basename(path)
        if not re.match(r'^\d{4}-', name):
            continue
        data = json.load(open(path, encoding='utf-8'))
        for q in data.get('questions', []):
            qid = q.get('id')
            if not qid:
                continue
            rows.append({
                'id': qid,
                'date': name[:-5],
                'cat': q.get('category', ''),
                'q': q.get('question', ''),
                'a': q.get('answer', ''),
                'na': norm_answer(q.get('answer', '')),
                # Salience over prompt AND answer: the answer often carries
                # the subject ("Brazil", "Queen") that the prompt never names.
                'terms': salient(str(q.get('question', '')) + ' ' + str(q.get('answer', ''))),
                'sourced': bool(q.get('sourceRefs')),
            })

    if not rows:
        print('No questions found.'); sys.exit(1)

    u = Union()
    for r in rows:
        u.find(r['id'])

    # ---- signal 1: identical answer ---------------------------------
    by_ans = collections.defaultdict(list)
    for r in rows:
        if r['na']:
            by_ans[r['na']].append(r['id'])
    same_answer_links = 0
    for ans, ids in by_ans.items():
        for other in ids[1:]:
            u.union(ids[0], other); same_answer_links += 1

    # ---- signals 2 and 3: salient-word overlap ----------------------
    # Inverted index first, so only questions sharing a term are compared.
    index = collections.defaultdict(set)
    for i, r in enumerate(rows):
        for t in r['terms']:
            index[t].add(i)

    tight_links, fuzzy_pairs = 0, []
    seen = set()
    for i, r in enumerate(rows):
        candidates = set()
        for t in r['terms']:
            candidates |= index[t]
        for j in candidates:
            if j <= i:
                continue
            key = (i, j)
            if key in seen:
                continue
            seen.add(key)
            s = jaccard(r['terms'], rows[j]['terms'])
            if s >= TIGHT:
                u.union(r['id'], rows[j]['id']); tight_links += 1
            elif s >= FUZZY:
                fuzzy_pairs.append((s, r['id'], rows[j]['id']))

    # ---- assemble ----------------------------------------------------
    groups = collections.defaultdict(list)
    by_id = {r['id']: r for r in rows}
    for r in rows:
        groups[u.find(r['id'])].append(r['id'])

    clusters = [sorted(v) for v in groups.values() if len(v) >= 2]
    singles  = [v[0] for v in groups.values() if len(v) == 1]
    clusters.sort(key=len, reverse=True)

    subjects = len(clusters) + len(singles)
    in_clusters = sum(len(c) for c in clusters)

    print('FACT ROYALE - CLUSTER REPORT\n')
    print(f'  {len(rows)} questions')
    print(f'  {len(clusters)} clusters covering {in_clusters} questions')
    print(f'  {len(singles)} singletons')
    print(f'\n  ESTIMATED DISTINCT SUBJECTS: {subjects}')
    print(f'  which is {subjects / len(rows) * 100:.0f}% of the question count.')
    print(f'  Verification per subject rather than per question saves roughly')
    print(f'  {len(rows) - subjects} units of work.\n')
    print(f'  links from identical answers  {same_answer_links}')
    print(f'  links from tight overlap      {tight_links}')
    print(f'  fuzzy pairs (not merged)      {len(fuzzy_pairs)}')

    sizes = collections.Counter(len(c) for c in clusters)
    print('\n  cluster sizes:')
    for n in sorted(sizes):
        print(f'    {n:3d} questions   {sizes[n]:4d} clusters')

    # ---- write the detail -------------------------------------------
    with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('CLUSTER REPORT\n')
        fh.write(f'{len(rows)} questions, {len(clusters)} clusters, '
                 f'{len(singles)} singletons, ~{subjects} distinct subjects\n')
        fh.write('=' * 70 + '\n\n')

        for c in clusters:
            if len(c) < min_size:
                continue
            answers = {by_id[i]['na'] for i in c}
            label = 'SAME ANSWER' if len(answers) == 1 else 'RELATED'
            fh.write(f'[{label}] {len(c)} questions\n')
            for qid in c:
                r = by_id[qid]
                flag = 'sourced' if r['sourced'] else '   -   '
                fh.write(f'  {qid}  {flag}  {r["date"]}  {r["cat"]}\n')
                fh.write(f'      Q: {r["q"][:120]}\n')
                fh.write(f'      A: {r["a"][:80]}\n')
            fh.write('\n')

        fuzzy_pairs.sort(reverse=True)
        fh.write('\n' + '=' * 70 + '\n')
        fh.write(f'FUZZY PAIRS - similar but not merged ({len(fuzzy_pairs)})\n')
        fh.write('Same territory, probably different claims. Judgement call.\n\n')
        for s, a, b in fuzzy_pairs[:150]:
            fh.write(f'  {s:.2f}  {a}  {by_id[a]["q"][:70]}\n')
            fh.write(f'        {b}  {by_id[b]["q"][:70]}\n\n')

    print(f'\nwrote clusters.txt')
    print('Read-only. Nothing else was changed.')


if __name__ == '__main__':
    main()
