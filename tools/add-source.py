#!/usr/bin/env python3
"""
FACT ROYALE - ATTACH SOURCES TO QUESTIONS

Writes sourceRefs onto questions. This is the ONLY thing that should write
that field, so the validation lives here once instead of being re-implemented
by hand every time a batch is sourced.

    python tools/add-source.py --apply frq-0327=mlb-bonds-top-moments
    python tools/add-source.py --apply frq-0710=archives-emancipation-proclamation,britannica-emancipation-proclamation
    python tools/add-source.py --file batch.txt
    python tools/add-source.py --status

A mapping is  questionId=sourceId[,sourceId...]

REFUSES to write when:
  - the question id does not exist
  - a source id is not in sources.json (no dangling refs, ever)
  - the question already has sourceRefs and --force was not given

Every refusal names the question, because a sourcing run that silently skips
a question leaves it looking done when it is not. That failure mode already
cost this project once: review.html pointed at a dead directory, caught
nothing, and reported a clean corpus of zero questions.
"""

import datetime, json, glob, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
QDIR = os.path.join(ROOT, 'questions-src')
REG  = os.path.join(ROOT, 'sources.json')


def load_registry():
    with open(REG, encoding='utf-8') as fh:
        return json.load(fh)['sources']


def load_questions():
    """Returns {questionId: (path, index)} and the parsed files, keyed by path."""
    index, files = {}, {}
    for path in sorted(glob.glob(os.path.join(QDIR, '*.json'))):
        name = os.path.basename(path)
        if not re.match(r'^\d{4}-', name):
            continue
        with open(path, encoding='utf-8') as fh:
            data = json.load(fh)
        files[path] = data
        for i, q in enumerate(data.get('questions', [])):
            if q.get('id'):
                index[q['id']] = (path, i)
    return index, files


def parse_mappings(items):
    out = []
    for raw in items:
        raw = raw.strip()
        if not raw or raw.startswith('#'):
            continue
        if '=' not in raw:
            print(f'  SKIP  malformed, expected id=source: {raw}')
            continue
        qid, srcs = raw.split('=', 1)
        refs = [s.strip() for s in srcs.split(',') if s.strip()]
        out.append((qid.strip(), refs))
    return out


def status():
    index, files = load_questions()
    total = sourced = 0
    for data in files.values():
        for q in data.get('questions', []):
            if not q.get('options'):
                continue
            total += 1
            if q.get('sourceRefs'):
                sourced += 1
    print(f'{sourced} of {total} questions carry sourceRefs '
          f'({sourced/total*100:.0f}%), {total - sourced} to go')


def apply(mappings, force=False, dry=False):
    registry = load_registry()
    index, files = load_questions()
    touched, written, refused = set(), 0, 0

    for qid, refs in mappings:
        if qid not in index:
            print(f'  REFUSED {qid}: no such question'); refused += 1; continue

        bad = [r for r in refs if r not in registry]
        if bad:
            print(f'  REFUSED {qid}: not in sources.json -> {", ".join(bad)}')
            refused += 1; continue

        path, i = index[qid]
        q = files[path]['questions'][i]
        if q.get('sourceRefs') and not force:
            print(f'  REFUSED {qid}: already sourced ({", ".join(q["sourceRefs"])}); '
                  f'use --force to replace')
            refused += 1; continue

        if dry:
            print(f'  would set {qid} -> {", ".join(refs)}')
        else:
            q['sourceRefs'] = refs
            # Stamped here and nowhere else. Without it there is no way to ask
            # "what did we source this week", which is the question a reviewer
            # actually wants to ask before trusting a batch.
            q['sourcedAt'] = datetime.date.today().isoformat()
            touched.add(path)
        written += 1

    if not dry:
        for path in sorted(touched):
            with open(path, 'w', encoding='utf-8') as fh:
                json.dump(files[path], fh, indent=2, ensure_ascii=False)
                fh.write('\n')

    verb = 'would write' if dry else 'wrote'
    print(f'\n{verb} {written} sourceRefs across {len(touched) or "0"} files, '
          f'{refused} refused')
    return refused


def main():
    argv = sys.argv[1:]
    if '--status' in argv or not argv:
        status(); return 0

    force = '--force' in argv
    dry   = '--dry-run' in argv
    items = []

    if '--file' in argv:
        p = argv[argv.index('--file') + 1]
        with open(p, encoding='utf-8') as fh:
            items = fh.read().splitlines()
    elif '--apply' in argv:
        items = [a for a in argv[argv.index('--apply') + 1:] if not a.startswith('--')]
    else:
        print(__doc__); return 2

    refused = apply(parse_mappings(items), force=force, dry=dry)
    if not dry:
        status()
    return 1 if refused else 0


if __name__ == '__main__':
    sys.exit(main())
