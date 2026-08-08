#!/usr/bin/env python3
"""
FACT ROYALE — CLAIM RISK CLASSIFIER

Sorts questions into "needs a source" and "canonical, stands on its own".

The test is not whether a number appears. It is:

    Could a reasonable source disagree, or could this change?

Kilimanjaro's height is in every atlas and no source disputes it. Whether
Danny rides a tricycle or a go-kart had two respectable sources disagreeing
inside a single search. Those are different kinds of claim.

    python3 tools/classify-claims.py                 # summary
    python3 tools/classify-claims.py --list source   # what needs sourcing
    python3 tools/classify-claims.py --list canonical
    python3 tools/classify-claims.py --apply         # write riskTier into the JSON
"""
import json, os, re, sys

QDIR = os.path.join(os.path.dirname(__file__), '..', 'questions')
LO, HI = '2026-08-09', '2026-10-15'

# ── Things that force a source ────────────────────────────

# 1. Records, counts and superlatives that can move
CHANGEABLE = re.compile(
    r'\b(world record|holds? the record|record for|currently|to date|so far|'
    r'still the|remains? the|highest[- ]grossing|best[- ]selling|most populous|'
    r'fastest ever|confirmed \w+|no one has|nobody has|has never been|'
    r'only (?:woman|man|person|player|film|team|country|one) to|'
    r'as of \d{4})\b', re.I)

# 2. Figures that are not canonical constants: percentages, populations,
#    measurements, money, counts of people or things
FIGURE = re.compile(
    r'(\d+(?:\.\d+)?\s?%|\$[\d,.]+|\b\d{1,3}(?:,\d{3})+\b|'
    r'\b\d+(?:\.\d+)?\s?(?:million|billion|trillion|thousand)\b|'
    r'\b\d+(?:\.\d+)?\s?(?:km|kg|tonnes?|metres?|meters?|miles|feet|ft)\b)', re.I)

# 3. Scholarly estimate language: the figure is contested by construction
ESTIMATE = re.compile(
    r'\b(estimat\w+|approximately|roughly|around \d|perhaps|up to [\d,]+|'
    r'between [\d,]+ and [\d,]+|somewhere|disputed|contested|debated|'
    r'some (?:historians|scholars|scientists)|widely (?:believed|thought)|'
    r'reportedly|allegedly|is said to|may have|possibly)\b', re.I)

# 4. Causal, interpretive and intent claims. Not lookups; someone's reading.
INTERPRETIVE = re.compile(
    r'\b(why (?:did|does|was|is|were)|what (?:caused|made|drove|explains|'
    r'prompted|triggered)|what did .{0,25}(?:say|mean|intend|believe|think|want)|'
    r'according to|described (?:it|the|them) as|argued that|credited with|'
    r'is considered|regarded as|seen as|read as)\b', re.I)

# 5. Corrective framing: the question exists because the common belief is wrong.
#    These are the highest-value and highest-risk questions we write.
CORRECTIVE = re.compile(
    r'\b(what is wrong with|myth|misquot|commonly (?:believed|assumed|said)|'
    r'actually|in fact|contrary to|often (?:said|claimed|assumed)|'
    r'is usually got wrong|popular (?:belief|story)|really)\b', re.I)

# 6. Recent enough that details still get revised
RECENT = re.compile(r'\b(19[9]\d|20[0-2]\d)\b')

# ── Canonical: atlas, dictionary and rulebook level ───────
CANONICAL = re.compile(
    r'\b(which (?:country|continent|ocean|sea|river|mountain|state|city) '
    r'(?:is|are|contains?|borders?|forms?|lies|sits)|'
    r'what is the (?:capital|name|term|word) (?:of|for)|'
    r'what does .{0,20} stand for|'
    r'which (?:planet|element|gas|organ|bone|blood type)|'
    r'stroke order|how many players|what shape)\b', re.I)


def classify(q):
    """Return (tier, reasons)."""
    qt = q.get('question', '')
    blob = ' '.join([qt, q.get('answer', ''),
                     q.get('explanation', ''), q.get('memory_hook', '')])
    why = []
    if CHANGEABLE.search(blob):    why.append('changeable')
    if FIGURE.search(blob):        why.append('figure')
    if ESTIMATE.search(blob):      why.append('estimate')
    if INTERPRETIVE.search(qt):    why.append('interpretive')
    if CORRECTIVE.search(blob):    why.append('corrective')
    if RECENT.search(blob) and (FIGURE.search(blob) or CHANGEABLE.search(blob)):
        why.append('recent')

    if why:
        return 'source', why
    if CANONICAL.search(qt):
        return 'canonical', ['atlas/rulebook level']
    # Default to needing a source. Unclassified is not the same as safe.
    return 'source', ['unclassified, defaulting to source']


def main():
    args = sys.argv[1:]
    apply_ = '--apply' in args
    if apply_: args.remove('--apply')
    want = None
    if '--list' in args:
        i = args.index('--list'); want = args[i+1]; del args[i:i+2]

    counts = {'source': 0, 'canonical': 0}
    reasons = {}
    rows = []

    for fn in sorted(os.listdir(QDIR)):
        if not fn.endswith('.json'): continue
        d = fn[:-5]
        if not (LO <= d <= HI): continue
        path = os.path.join(QDIR, fn)
        data = json.load(open(path, encoding='utf-8'))
        changed = False
        for i, q in enumerate(data['questions']):
            tier, why = classify(q)
            counts[tier] += 1
            for w in why:
                reasons[w] = reasons.get(w, 0) + 1
            rows.append((f'{d}#{i}', tier, ','.join(why),
                         q.get('category', '')[:4], q.get('question', '')[:76]))
            if apply_:
                q['riskTier'] = tier
                changed = True
        if changed:
            json.dump(data, open(path, 'w', encoding='utf-8'),
                      indent=2, ensure_ascii=False)

    total = sum(counts.values())
    print(f'{LO} to {HI}   {total} questions\n')
    print(f'  NEEDS SOURCE  {counts["source"]:4d}  ({100*counts["source"]/total:4.1f}%)')
    print(f'  CANONICAL     {counts["canonical"]:4d}  ({100*counts["canonical"]/total:4.1f}%)')
    print(f'\n  searches at 2 per sourced question: ~{counts["source"]*2}')
    print('\n  triggers:')
    for k, v in sorted(reasons.items(), key=lambda x: -x[1]):
        print(f'    {k:34s} {v}')

    if want:
        print(f'\n{"="*74}')
        for loc, tier, why, cat, qq in rows:
            if tier == want:
                print(f'{loc} [{cat}] ({why})\n   {qq}')
    if apply_:
        print('\nriskTier written into every question in range.')


if __name__ == '__main__':
    main()
