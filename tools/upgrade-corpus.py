#!/usr/bin/env python3
"""
FACT ROYALE - TURN THE CALENDAR INTO A CORPUS

Adds the three fields that let the question bank behave as a reusable pool
rather than a list of days: difficulty, usage, status.

WHY EACH ONE EXISTS

  difficulty   1 (easy) .. 5 (brutal), or null for "not yet judged".
               Tournament and live rounds are built by difficulty band. You
               cannot ladder a round without it.

               Author-assigned is a GUESS. It becomes real once it can be
               compared against how players actually performed. Treat the
               number as a starting estimate that measurement corrects, not
               as a fact.

  usage        [{ "date": "2026-07-04", "context": "daily" }, ...]

               A LOG OF ACTUAL APPEARANCES, which is not the same thing as
               the day a question is filed under. A question can appear in
               the daily quiz, then a live game, then a tournament. Cooldown
               rules ("nothing used in the last 90 days") need the log, not
               the filename.

               Seeded from the filenames: a question filed under a date that
               has already passed genuinely ran that day. That is 960
               questions of real history recovered for free rather than
               starting the corpus at zero.

  status       active | retired | draft

               A weak question has to be able to leave rotation WITHOUT being
               deleted, or you lose the record of what was wrong with it and
               risk writing it again. Deletion destroys evidence; retirement
               keeps it.

USAGE
    python tools/upgrade-corpus.py --dry-run
    python tools/upgrade-corpus.py

Idempotent: fields that already exist are left alone, so re-running after
adding new files only touches the new ones.
"""

import json, glob, sys, os, datetime

QDIR  = os.path.join(os.path.dirname(__file__), '..', 'questions-src')
TODAY = datetime.date.today()

# Difficulty is deliberately absent from this list of defaults. Defaulting it
# to 3 would fill the corpus with 984 confident-looking numbers that nobody
# ever chose, which is worse than an honest null.
ORDER = ['id', 'category', 'difficulty', 'question', 'options', 'answer',
         'explanation', 'memory_hook', 'riskTier', 'sourceRefs',
         'review', 'status', 'usage']


def main():
    dry = '--dry-run' in sys.argv
    files = sorted(glob.glob(os.path.join(QDIR, '2026-*.json')))
    if not files:
        print('No question files found.'); sys.exit(1)

    added = {'difficulty': 0, 'usage': 0, 'status': 0}
    seeded = 0
    total = 0

    for f in files:
        date_key = os.path.basename(f)[:-5]
        try:
            file_date = datetime.date.fromisoformat(date_key)
        except ValueError:
            continue
        already_ran = file_date < TODAY

        d = json.load(open(f, encoding='utf-8'))
        qs = d.get('questions', [])
        changed = False

        for q in qs:
            total += 1
            if 'difficulty' not in q:
                q['difficulty'] = None; added['difficulty'] += 1; changed = True
            if 'status' not in q:
                q['status'] = 'active'; added['status'] += 1; changed = True
            if 'usage' not in q:
                # Only a date in the past counts as an appearance. A question
                # filed under next Tuesday has not been used yet.
                q['usage'] = ([{'date': date_key, 'context': 'daily'}]
                              if already_ran else [])
                if already_ran: seeded += 1
                added['usage'] += 1; changed = True

        d['questions'] = [{k: q[k] for k in ORDER if k in q} |
                          {k: v for k, v in q.items() if k not in ORDER} for q in qs]

        if not dry and changed:
            with open(f, 'w', encoding='utf-8', newline='\n') as fh:
                json.dump(d, fh, indent=2, ensure_ascii=False)
                fh.write('\n')

    print(f'{len(files)} files   {total} questions')
    for k, v in added.items():
        print(f'  added {k:11s} {v}')
    print(f'  usage entries seeded from past dates: {seeded}')
    print(f'  difficulty left null (unjudged):      {added["difficulty"]}')
    if dry:
        print('\nDRY RUN - nothing written. Drop --dry-run to apply.')


if __name__ == '__main__':
    main()
