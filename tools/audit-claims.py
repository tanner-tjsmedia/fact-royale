#!/usr/bin/env python3
"""
FACT ROYALE — FACTUAL CLAIM AUDIT

Extracts checkable factual claims from questions, options, explanations and
memory hooks, and ranks them by how likely they are to be wrong.

    python3 tools/audit-claims.py                    # whole corpus
    python3 tools/audit-claims.py 2026-08            # one month
    python3 tools/audit-claims.py --risk high        # only high-risk claims
    python3 tools/audit-claims.py --field answer     # only the answer text

The validator proves a question is well-formed. It cannot prove it is true.
This finds the sentences most worth checking against a source.

RISK TIERS
  high    superlatives combined with numbers, vague quantifiers attached to
          hard figures, and "more/fewer than N <things>" comparisons. These
          are where a number gets reached for to make a sentence land.
  medium  bare statistics, percentages, measurements, money, records
  low     plain years and dates
"""
import json, os, re, sys
from collections import defaultdict

QDIR = os.path.join(os.path.dirname(__file__), '..', 'questions')

SUPERLATIVE = re.compile(
    r'\b(first|only|last|largest|smallest|biggest|longest|shortest|highest|'
    r'lowest|fastest|slowest|most|least|greatest|worst|best|oldest|newest|'
    r'deepest|tallest|heaviest|richest|never|always|every|all)\b', re.I)

VAGUE = re.compile(r'\b(about|around|roughly|approximately|perhaps|nearly|'
                   r'over|under|more than|fewer than|less than|up to|some)\b', re.I)

NUMBER = re.compile(
    r'(?<![\w.])('
    r'\d{1,3}(?:,\d{3})+'          # 1,234,567
    r'|\d+(?:\.\d+)?\s?%'          # 42%  42.5 %
    r'|\d+(?:\.\d+)?\s?(?:km|kg|m|cm|mm|ft|miles?|metres?|meters?|tonnes?|'
    r'tons?|degrees?|°C|°F|hours?|minutes?|seconds?|days?|weeks?|months?|'
    r'years?|billion|million|thousand|trillion)'
    r'|\$\d[\d,.]*'                # $1.65 billion
    r'|\b\d{2,}\b'                 # bare 2+ digit number
    r')', re.I)

YEAR = re.compile(r'\b(1[0-9]{3}|20[0-9]{2})\b')

COMPARATIVE = re.compile(
    r'\b(?:more|fewer|less|greater|larger|smaller|faster|slower|higher|lower)\s+'
    r'than\b[^.;]{0,60}?\d', re.I)


def claims_in(text, where):
    """Return (risk, snippet, why) for each checkable claim in text."""
    out = []
    if not text:
        return out
    # split into sentences so snippets stay readable
    for sent in re.split(r'(?<=[.!?])\s+', text):
        nums  = NUMBER.findall(sent)
        years = YEAR.findall(sent)
        sup   = SUPERLATIVE.search(sent)
        vague = VAGUE.search(sent)
        comp  = COMPARATIVE.search(sent)

        if not (nums or years or sup):
            continue

        why = []
        risk = 'low'
        if comp:
            risk = 'high'; why.append('comparison to a count')
        if sup and nums:
            risk = 'high'; why.append('superlative + number')
        if vague and nums:
            if risk != 'high':
                risk = 'high'
            why.append('hedged figure')
        if risk != 'high':
            if nums:
                risk = 'medium'; why.append('statistic')
            elif sup:
                risk = 'medium'; why.append('superlative')
            elif years:
                risk = 'low'; why.append('date')
        out.append((risk, sent.strip()[:150], ', '.join(why), where))
    return out


def main():
    args = sys.argv[1:]
    want_risk = None
    want_field = None
    if '--risk' in args:
        i = args.index('--risk'); want_risk = args[i+1]; del args[i:i+2]
    if '--field' in args:
        i = args.index('--field'); want_field = args[i+1]; del args[i:i+2]
    prefix = args[0] if args else ''

    files = sorted(f for f in os.listdir(QDIR)
                   if f.endswith('.json') and f.startswith(prefix))

    buckets = defaultdict(list)
    n_q = 0

    for fn in files:
        date = fn[:-5]
        data = json.load(open(os.path.join(QDIR, fn), encoding='utf-8'))
        for i, q in enumerate(data.get('questions', [])):
            n_q += 1
            loc = f'{date}#{i}'
            fields = {
                'question':    q.get('question', ''),
                'answer':      q.get('answer', ''),
                'explanation': q.get('explanation', ''),
                'hook':        q.get('memory_hook', ''),
            }
            for fname, text in fields.items():
                if want_field and fname != want_field:
                    continue
                for risk, snip, why, _ in claims_in(text, fname):
                    buckets[risk].append((loc, fname, snip, why))

    print(f'Scanned {len(files)} files, {n_q} questions\n')
    order = ['high', 'medium', 'low']
    for r in order:
        print(f'  {r:6s}: {len(buckets[r])} claims')
    print()

    show = [want_risk] if want_risk else ['high']
    for r in show:
        rows = buckets[r]
        if not rows:
            continue
        print('=' * 74)
        print(f'{r.upper()} RISK — {len(rows)} claims worth checking against a source')
        print('=' * 74)
        for loc, fname, snip, why in rows:
            print(f'\n{loc}  [{fname}]  ({why})')
            print(f'  {snip}')

    if not want_risk:
        print(f'\nRun with --risk medium or --risk low to see the rest.')


if __name__ == '__main__':
    main()
