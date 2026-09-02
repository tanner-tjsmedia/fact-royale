#!/usr/bin/env python3
"""
FACT ROYALE - MINT STABLE QUESTION IDS

Every question gets a permanent `id`, assigned once, never derived from its
position in the array and never derived from its content.

WHY THIS MATTERS, stated plainly:

  Today a question is identified as "index 7 of 2026-09-06.json". Reorder the
  file, insert a question, or fix a typo that changes the sort, and that
  pointer silently means something else.

  Everything you want to build next holds a pointer to a question:
    - an admin flag           {questionId, reason}
    - a user report           {questionId, reason}
    - a review verdict        {questionId, state, evidence}
    - the source registry     which question a source backs

  If the pointer is positional, every one of those rots on the first edit -
  and rots SILENTLY, pointing at a real question that is simply the wrong
  one. That is worse than a broken link.

  IDs must also not be content hashes. A hash changes when you fix a typo,
  which is exactly when you most need the flag to stay attached.

So: opaque, sequential, permanent.

  frq-0001 .. frq-0984, assigned in date order at mint time.

After minting, order carries no meaning. frq-0007 is not the seventh
question of anything. It is just that question, forever.

The record also gains a `review` block so state lives with the question
rather than in a parallel file that can drift:

  review.state   unreviewed | verified | flagged | rejected | retired
  review.at      ISO date the state was last set
  review.by      who set it
  review.note    free text, why

Initial state is derived honestly from what is already true:
  has a non-empty sourceRefs  -> verified   (something was checked)
  otherwise                   -> unreviewed (nothing was)

USAGE
    python tools/mint-ids.py --dry-run    report only, writes nothing
    python tools/mint-ids.py              apply

Idempotent: questions that already have an id are left alone, so re-running
after adding new files only mints the new ones.
"""

import json, glob, sys, os, datetime

QDIR = os.path.join(os.path.dirname(__file__), '..', 'questions-src')
PREFIX = 'frq-'
TODAY = datetime.date.today().isoformat()

# Field order in the written file. Keeps diffs readable and puts identity
# and evidence at the top where they are easy to eyeball.
ORDER = ['id', 'category', 'question', 'options', 'answer',
         'explanation', 'memory_hook', 'riskTier', 'sourceRefs', 'review']


def existing_ids(files):
    """Collect ids already minted, so a re-run never reissues one."""
    seen = {}
    for f in files:
        d = json.load(open(f, encoding='utf-8'))
        for i, q in enumerate(d.get('questions', [])):
            if q.get('id'):
                seen.setdefault(q['id'], []).append(f'{os.path.basename(f)}#{i}')
    return seen


def main():
    dry = '--dry-run' in sys.argv
    files = sorted(glob.glob(os.path.join(QDIR, '2026-*.json')))
    if not files:
        print('No question files found.'); sys.exit(1)

    seen = existing_ids(files)
    dupes = {k: v for k, v in seen.items() if len(v) > 1}
    if dupes:
        print(f'{len(dupes)} DUPLICATE ids already present - refusing to run:')
        for k, v in list(dupes.items())[:10]:
            print(f'  {k}: {", ".join(v)}')
        sys.exit(1)

    # Continue the sequence rather than restarting it.
    nums = [int(i[len(PREFIX):]) for i in seen if i.startswith(PREFIX)
            and i[len(PREFIX):].isdigit()]
    nxt = max(nums) + 1 if nums else 1

    minted = kept = verified = unreviewed = 0
    plan = []

    for f in files:
        d = json.load(open(f, encoding='utf-8'))
        qs = d.get('questions', [])
        changed = False
        for q in qs:
            if not q.get('id'):
                q['id'] = f'{PREFIX}{nxt:04d}'; nxt += 1; minted += 1; changed = True
            else:
                kept += 1
            if 'review' not in q:
                cited = bool(q.get('sourceRefs'))
                q['review'] = {
                    'state': 'verified' if cited else 'unreviewed',
                    'at': TODAY if cited else None,
                    'by': 'tanner@tjs16media.com' if cited else None,
                    'note': 'carried over: had a cited source before IDs existed'
                            if cited else None
                }
                changed = True
            if q['review']['state'] == 'verified': verified += 1
            else: unreviewed += 1
        # rewrite each question with a stable key order
        d['questions'] = [{k: q[k] for k in ORDER if k in q} |
                          {k: v for k, v in q.items() if k not in ORDER} for q in qs]
        plan.append((f, changed, len(qs)))
        if not dry and changed:
            with open(f, 'w', encoding='utf-8', newline='\n') as fh:
                json.dump(d, fh, indent=2, ensure_ascii=False)
                fh.write('\n')

    print(f'{len(files)} files   {minted + kept} questions')
    print(f'  ids minted        {minted}')
    print(f'  ids already there {kept}')
    print(f'  next free id      {PREFIX}{nxt:04d}')
    print()
    print(f'  review state verified   {verified}')
    print(f'  review state unreviewed {unreviewed}')
    if dry:
        print('\nDRY RUN - nothing written. Drop --dry-run to apply.')


if __name__ == '__main__':
    main()
