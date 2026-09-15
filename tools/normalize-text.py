#!/usr/bin/env python3
"""
FACT ROYALE - NORMALISE TEXT TO ASCII

Replaces typographic Unicode with plain ASCII across question content and
the source registry.

    python tools/normalize-text.py              report only, writes nothing
    python tools/normalize-text.py --apply      write the changes

Writing requires --apply. Running it bare is always safe.

WHY, and the reason is not style

  MATCHING BREAKS SILENTLY. A curly apostrophe and a straight one are
  different characters. Duplicate detection, tag matching, search, and the
  differs() comparison in sync-questions.js all treat "Hitchcock's" and
  "Hitchcock’s" as unrelated strings. Nothing errors. Results are just
  quietly wrong.

  EXPORTS GET SIMPLER. CSV into a spreadsheet, a printed pub-quiz sheet, an
  API for a partner - every one handles ASCII without special cases.

  ONE RULE, NO EXEMPTIONS. "Internal fields are exempt" is the carve-out
  that gets forgotten and lets the problem back in.

  CONSOLES STOP MANGLING. An em dash renders as a replacement block on a
  Windows terminal, which makes every report harder to read and to paste.

THE PRINCIPLE

  Normalise at rest, prettify at render.

  If typographic quotes are ever wanted on the page, a render-time converter
  is a few lines and never touches the data. Storing pretty characters to
  get pretty output couples the database to the typography, and the database
  is the thing that has to last.

SCOPE

  questions-src/*.json   question, options, answer, explanation, memory_hook
  sources.json           establishes, publisher, note, replace

  Not touched: ids, dates, urls, any structural field.

This is deliberately a SINGLE-PURPOSE commit. A diff that reads "every
typographic character became ASCII" can be spot-checked and trusted. The
same change smeared through a content rewrite is invisible, and you could
never tell whether a question changed meaning or only punctuation.
"""

import json, glob, os, re, sys, collections

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
QDIR = os.path.join(ROOT, 'questions-src')
REG  = os.path.join(ROOT, 'sources.json')

# Order matters: em dash before the generic dash sweep.
SUBS = [
    ('—', ' - ',  'em dash'),
    ('–', '-',    'en dash'),
    ('‒', '-',    'figure dash'),
    ('‑', '-',    'non-breaking hyphen'),
    ('−', '-',    'minus sign'),
    ('‘', "'",    'left single quote'),
    ('’', "'",    'right single quote / apostrophe'),
    ('‚', "'",    'low single quote'),
    ('“', '"',    'left double quote'),
    ('”', '"',    'right double quote'),
    ('„', '"',    'low double quote'),
    ('…', '...',  'ellipsis'),
    (' ', ' ',    'non-breaking space'),
    (' ', ' ',    'thin space'),
    ('​', '',     'zero-width space'),
    ('­', '',     'soft hyphen'),
]

Q_ORDER = ['id','category','difficulty','question','options','answer',
           'explanation','memory_hook','riskTier','sourceRefs',
           'review','status','usage']

TEXT_FIELDS = ('question', 'answer', 'explanation', 'memory_hook')

counts = collections.Counter()
examples = []


def clean(s):
    """Normalise one string. Returns the new value."""
    if not isinstance(s, str):
        return s
    out = s
    for ch, rep, label in SUBS:
        if ch in out:
            counts[label] += out.count(ch)
            out = out.replace(ch, rep)
    # An em dash becomes " - ", which can double a space that was already
    # there. Collapse runs, but never touch leading or trailing space.
    collapsed = re.sub(r' {2,}', ' ', out)
    if collapsed != out:
        out = collapsed
    if out != s and len(examples) < 10:
        examples.append((s, out))
    return out


def clean_question(q):
    for f in TEXT_FIELDS:
        if f in q:
            q[f] = clean(q[f])
    opts = q.get('options')
    if isinstance(opts, list):
        q['options'] = [
            ({**o, 'text': clean(o.get('text'))} if isinstance(o, dict) else clean(o))
            for o in opts
        ]
    return q


def order_keys(q):
    out = {k: q[k] for k in Q_ORDER if k in q}
    for k, v in q.items():
        if k not in out:
            out[k] = v
    return out


def main():
    apply = '--apply' in sys.argv
    files = sorted(f for f in glob.glob(os.path.join(QDIR, '*.json'))
                   if re.match(r'^\d{4}-', os.path.basename(f)))
    if not files:
        print('No question files found.'); sys.exit(1)

    touched_files, touched_q = 0, 0

    for path in files:
        raw = open(path, encoding='utf-8').read()
        data = json.loads(raw)
        before = json.dumps(data, ensure_ascii=False)
        data['questions'] = [order_keys(clean_question(q))
                             for q in data.get('questions', [])]
        after = json.dumps(data, ensure_ascii=False)
        if before != after:
            touched_files += 1
            touched_q += sum(1 for q in data['questions'])
            if apply:
                with open(path, 'w', encoding='utf-8', newline='\n') as fh:
                    json.dump(data, fh, indent=2, ensure_ascii=False)
                    fh.write('\n')

    # ---- the registry ------------------------------------------------
    reg_touched = False
    if os.path.exists(REG):
        reg = json.load(open(REG, encoding='utf-8'))
        src = reg.get('sources', {})
        b = json.dumps(reg, ensure_ascii=False)
        for sid, s in src.items():
            for f in ('publisher', 'note', 'replace'):
                if isinstance(s.get(f), str):
                    s[f] = clean(s[f])
            est = s.get('establishes')
            if isinstance(est, list):
                s['establishes'] = [clean(e) for e in est]
            elif isinstance(est, str):
                s['establishes'] = clean(est)
        reg_touched = json.dumps(reg, ensure_ascii=False) != b
        if reg_touched and apply:
            with open(REG, 'w', encoding='utf-8', newline='\n') as fh:
                json.dump(reg, fh, indent=2, ensure_ascii=False)
                fh.write('\n')

    # ---- report ------------------------------------------------------
    print('FACT ROYALE - TEXT NORMALISATION')
    print('write mode\n' if apply else 'REPORT ONLY - nothing written\n')

    if not counts:
        print('  nothing to change: the corpus is already plain ASCII')
        return

    print('  characters replaced:')
    for _, _, label in SUBS:
        if counts[label]:
            print(f'    {label:32s} {counts[label]:5d}')
    print()
    print(f'  question files affected  {touched_files} of {len(files)}')
    print(f'  sources.json affected    {"yes" if reg_touched else "no"}')

    print('\n  before and after, real examples:\n')
    for a, b in examples[:6]:
        print(f'    -  {a[:96]}{"..." if len(a) > 96 else ""}')
        print(f'    +  {b[:96]}{"..." if len(b) > 96 else ""}')
        print()

    if not apply:
        print('  Nothing was written. Re-run with --apply to make the changes,')
        print('  then read the git diff before committing. It will be large:')
        print('  apostrophes appear in most questions.')


if __name__ == '__main__':
    main()
