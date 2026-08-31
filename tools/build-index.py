#!/usr/bin/env python3
"""Regenerate questions/index.json. Run after adding or removing quiz days.

The live play area uses this to sample the corpus without fetching all 123
files. It carries no answers, only dates and category counts.
"""
import json, os
from collections import Counter
QD = os.path.join(os.path.dirname(__file__), '..', 'questions')
days, cats = [], Counter()
for fn in sorted(os.listdir(QD)):
    if not fn.endswith('.json') or fn == 'index.json':
        continue
    qs = json.load(open(os.path.join(QD, fn), encoding='utf-8'))['questions']
    c = Counter(q.get('category', '') for q in qs)
    cats.update(c)
    days.append({'date': fn[:-5], 'count': len(qs), 'categories': dict(c)})
idx = {'_readme': 'Index of available quiz days for the internal live play area. '
                  'Regenerate with tools/build-index.py.',
       'generated': __import__('datetime').date.today().isoformat(),
       'dayCount': len(days),
       'questionCount': sum(d['count'] for d in days),
       'categories': dict(cats), 'days': days}
json.dump(idx, open(os.path.join(QD, 'index.json'), 'w', encoding='utf-8'),
          indent=2, ensure_ascii=False)
print(f"index: {len(days)} days, {idx['questionCount']} questions")
