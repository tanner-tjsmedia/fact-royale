#!/usr/bin/env python3
"""
FACT ROYALE — PREFLIGHT GATE

One command. Pass or fail. Run before handing any batch of questions back.

    python3 tools/preflight.py                 # everything from today forward
    python3 tools/preflight.py 2026-09         # one month
    python3 tools/preflight.py --all           # including already-played dates
    python3 tools/preflight.py --week 2026-09-06

Exit code 0 means shippable. Anything else means do not hand it over yet.

This exists because the review cycle kept repeating: write, hand over, get
asked "is it clean", find problems, fix, repeat. Every check below was added
after a specific failure that reached the user. Run this instead of asking.
"""
import json, os, re, statistics, sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from itertools import combinations

QDIR = os.path.join(os.path.dirname(__file__), '..', 'questions')
REG_PATH = os.path.join(os.path.dirname(__file__), '..', 'sources.json')

def load_registry():
    try:
        return json.load(open(REG_PATH, encoding='utf-8')).get('sources', {})
    except Exception:
        return {}
REGISTRY = load_registry()

# ── the standard ──────────────────────────────────────────
OPT_MAX     = 120   # hard ceiling on an option
SPREAD_MAX  = 45    # longest minus shortest option in one question
RATIO_LOW   = 0.20  # below: one-word recall, question is shallow
RATIO_HIGH  = 1.30  # above: answers dwarf the question
TELL_MAX    = 5     # answer may not exceed next-longest by more than this
LOAD_MAX    = 5500  # characters a player reads for a full day
POS_TOL     = 0.09  # answer-position share may not deviate more than this from .25
DUP_THRESH  = 0.42  # salient-word overlap that counts as a duplicate topic

EXPECTED_CAT = {'History': 3, 'Sports': 2, 'Pop Culture': 3,
                'Geography': 2, 'Science & Nature': 2}

# Claims that decay. Every one of these produced a real error at some point.
VOLATILE = re.compile(
    r'\b(world record|holds the record|record for|the most \w+ (?:ever|in|of)|'
    r'currently|to date|so far|still the|remains the|highest[- ]grossing|'
    r'best[- ]selling|most populous|fastest ever|confirmed \w+ (?:moons|planets)|'
    r'no one has|nobody has|has never been|only (?:woman|man|person|player|film|'
    r'team|country) to)\b', re.I)

STOP = set("""a an the of in on at to for from by with and or but is are was were be
been being what which who whom whose when where why how did does do has have had this
that these those it its their his her they them he she you your we our us as if then
than so such most more much many other another same both each any all some no not only
over under between into during before after above below out off again further once here
there few own too very can will just should now about across against among around
because beyond except following inside instead near outside since through throughout
toward until upon within called known considered significant significance role effect
impact main major key primary important famous actual actually specifically particularly
essentially largely mostly often sometimes usually generally typically approximately
roughly nearly almost term terms name named refers refer meant mean means makes made
make making one two three four five first second third last next new old""".split())



# ── source quality ────────────────────────────────────────
# Three tiers, in descending order of what a single source is worth.
#
#   CANONICAL   Widely agreed, universally attested, cannot change.
#               No source required. Mark riskTier "canonical" and say why.
#
#   PRIMARY     The person, the institution, or the document itself.
#               One is normally sufficient. Exception below.
#
#   SECONDARY   Reputable reporting about a primary source.
#               Needs two, from different outlets.
#
# PRIMARY EXCEPTION: a first-person account where the speaker benefits from
# the story still needs corroboration. Jesse Owens is the case in point — the
# Luz Long advice story rests almost entirely on Owens's own later retellings,
# and historians dispute it. Self-interest downgrades primary to secondary.

PRIMARY = (
    # research and the institutions that hold the data
    'science.org', 'nature.com', 'pnas.org', 'thelancet.com', 'nejm.org',
    'cell.com', 'bmj.com', 'jstor.org', 'arxiv.org', 'doi.org',
    'nasa.gov', 'noaa.gov', 'usgs.gov', 'esa.int', 'iau.org', 'ipcc.ch',
    'nsidc.org', 'cern.ch', 'nist.gov', 'unep-wcmc.org', 'iucn.org',
    # national ministries that do not use a .gov domain
    'mmediu.ro', 'gov.pl', 'gouv.fr', 'bund.de', 'gc.ca', 'govt.nz', 'gov.au',
    # governments and intergovernmental bodies on their own data
    '.gov', '.gov.uk', 'who.int', 'un.org', 'unesco.org', 'worldbank.org',
    'imf.org', 'oecd.org', 'census.gov', 'ons.gov.uk', 'eurostat',
    # archives, museums and libraries holding the actual object
    'nationalarchives.gov.uk', 'loc.gov', 'si.edu', 'britishmuseum.org',
    'bl.uk', 'archives.gov', 'bnf.fr',
    # governing bodies, on their own records only
    'olympics.com', 'ioc.org', 'fifa.com', 'mlb.com', 'nba.com', 'nfl.com',
    'nhl.com', 'worldathletics.org', 'atptour.com', 'wtatennis.com',
    'wimbledon.com', 'uci.org', 'fina.org', 'billboard.com',
    # official bodies for their own field
    'oscars.org', 'bafta.org', 'nobelprize.org', 'pulitzer.org',
    'grammy.com', 'festival-cannes.com', 'bfi.org.uk', 'emmys.com',
    'library.olympics.com',
    # universities publishing their own research
    '.edu', '.ac.uk',
)

# Edited reference works: strong, but a step below the primary record.
REFERENCE = ('britannica.com', 'oxfordreference.com', 'oed.com',
             'sahistory.org.za', 'plato.stanford.edu')

UNRELIABLE = ('spacedaily.com', 'factotd.com', 'lyxplanet.com', 'sportskeeda.com',
              'answers.com', 'quora.com', 'reddit.com', 'pinterest.',
              'substack.com/@', 'medium.com/@', 'wikipedia.org')


def source_grade(url):
    u = url.lower()
    if any(b in u for b in UNRELIABLE):   return 'unreliable'
    if any(a in u for a in PRIMARY):      return 'primary'
    if any(r in u for r in REFERENCE):    return 'reference'
    return 'secondary'


def domain(url):
    m = re.search(r'https?://(?:www\.)?([^/]+)', url.lower())
    return m.group(1) if m else url.lower()


def salient(t):
    return {w for w in re.findall(r"[A-Za-z][A-Za-z'\-]+", t.lower())
            if len(w) > 3 and w not in STOP}


def main():
    args = sys.argv[1:]
    show_all = '--all' in args
    if show_all: args.remove('--all')
    week = None
    if '--week' in args:
        i = args.index('--week'); week = args[i+1]; del args[i:i+2]

    today = date.today().isoformat()
    files = sorted(f for f in os.listdir(QDIR) if f.endswith('.json'))
    if week:
        w0 = date.fromisoformat(week)
        keep = {(w0 + timedelta(days=i)).isoformat() for i in range(7)}
        files = [f for f in files if f[:-5] in keep]
    else:
        prefix = args[0] if args else ''
        files = [f for f in files if f.startswith(prefix)]
        if not show_all and not prefix:
            files = [f for f in files if f[:-5] >= today]

    if not files:
        print('No files in scope.'); return 1

    hard, soft = [], []
    pos = Counter(); n_q = 0
    items = []          # for duplicate detection
    volatile_hits = []
    sourced = []
    unsourced = []
    weak = []
    canonical = []

    for fn in files:
        d = fn[:-5]
        data = json.load(open(os.path.join(QDIR, fn), encoding='utf-8'))
        qs = data.get('questions', [])

        if len(qs) != 12:
            hard.append(f'{d}: {len(qs)} questions, expected 12')
        cats = Counter(q.get('category') for q in qs)
        for c, want in EXPECTED_CAT.items():
            if cats.get(c, 0) != want:
                hard.append(f'{d}: {c}={cats.get(c,0)}, expected {want}')

        load = 0
        for i, q in enumerate(qs):
            loc = f'{d}#{i}'
            o = q.get('options', []); a = q.get('answer'); p = q.get('question', '')
            n_q += 1

            if len(o) != 4:
                hard.append(f'{loc}: {len(o)} options'); continue
            if a not in o:
                hard.append(f'{loc}: answer not among options'); continue
            if len(set(o)) != 4:
                hard.append(f'{loc}: duplicate options')
            for fld in ('explanation', 'memory_hook'):
                if not q.get(fld):
                    hard.append(f'{loc}: missing {fld}')

            L = [len(x) for x in o]
            load += len(p) + sum(L)
            pos[o.index(a)] += 1

            if len(p):
                r = statistics.mean(L) / len(p)
                if r > RATIO_HIGH:
                    hard.append(f'{loc}: ratio {r:.2f}, answers dwarf the question')
                elif r < RATIO_LOW:
                    hard.append(f'{loc}: ratio {r:.2f}, shallow recall')
            if max(L) > OPT_MAX:
                hard.append(f'{loc}: option {max(L)} chars over {OPT_MAX}')
            if max(L) - min(L) > SPREAD_MAX:
                hard.append(f'{loc}: spread {max(L)-min(L)}')
            if max(o, key=len) == a:
                s = sorted(L, reverse=True)
                if s[0] - s[1] > TELL_MAX:
                    hard.append(f'{loc}: answer longest by {s[0]-s[1]} chars')

            # Every question makes a factual claim. Every one needs a source.
            # A trivia product that is not reliably true has no reason to exist.
            tier = q.get('riskTier')
            if q.get('sources'):
                hard.append(f'{loc}: inline sources, move into sources.json and cite by ref')
            src = []
            for rid in (q.get('sourceRefs') or []):
                e = REGISTRY.get(rid)
                if not e:
                    hard.append(f'{loc}: sourceRef "{rid}" not in sources.json')
                else:
                    src.append({'claim': '; '.join(e.get('establishes') or []),
                                'source': e.get('url', ''),
                                'checked': e.get('checked', ''),
                                '_tier': e.get('tier')})
            if tier == 'canonical':
                if not q.get('canonicalNote'):
                    hard.append(f'{loc}: marked canonical with no justification note')
                else:
                    canonical.append(loc)
            elif not src:
                unsourced.append(loc)
            else:
                grades, doms = [], set()
                for e in src:
                    u = e.get('source', '')
                    if not u.startswith('http'):
                        hard.append(f'{loc}: source entry has no URL'); continue
                    if not e.get('claim'):
                        hard.append(f'{loc}: source entry has no claim text')
                    g = e.get('_tier') or source_grade(u)
                    if g == 'unreliable':
                        hard.append(f'{loc}: unreliable source {domain(u)}')
                        continue
                    grades.append(g); doms.add(domain(u))
                strong = ('primary' in grades) or ('reference' in grades)
                indep = len(doms)
                if q.get('selfReported') and 'primary' in grades and indep < 2:
                    weak.append((loc, indep, sorted(doms) + ['self-reported, needs corroboration']))
                elif strong or indep >= 2:
                    sourced.append(loc)
                else:
                    weak.append((loc, indep, sorted(doms)))
            # volatile claims are called out separately even when sourced,
            # because they need re-checking as time passes
            for fld in ('question', 'answer', 'explanation', 'memory_hook'):
                for sent in re.split(r'(?<=[.!?])\s+', q.get(fld, '')):
                    if tier != 'canonical' and VOLATILE.search(sent):
                        volatile_hits.append((loc, fld, sent.strip()[:110], bool(src)))

            s = salient(p)
            if len(s) >= 3:
                items.append((loc, q.get('category', ''), p, s))

        if load > LOAD_MAX:
            hard.append(f'{d}: reading load {load} over {LOAD_MAX}')

    # duplicate topics
    dupes = []
    for (l1, c1, q1, s1), (l2, c2, q2, s2) in combinations(items, 2):
        inter = len(s1 & s2)
        if inter < 2:
            continue
        if inter / len(s1 | s2) >= DUP_THRESH:
            dupes.append((l1, q1[:60], l2, q2[:60]))
    for a, qa, b, qb in dupes:
        hard.append(f'duplicate topic: {a} and {b}')

    # answer position balance
    if n_q >= 40:
        for i in range(4):
            share = pos[i] / n_q
            if abs(share - 0.25) > POS_TOL:
                hard.append(f'answer position {i} at {share*100:.0f}%, '
                            f'expected 25% +/- {POS_TOL*100:.0f}')

    # ── report ──
    print(f'PREFLIGHT  |  {len(files)} files, {n_q} questions\n')

    n_src = len(set(sourced)); n_uns = len(set(unsourced)); n_can = len(set(canonical))
    covered = n_src + n_can
    print(f'COVERAGE  {covered}/{covered + n_uns + len(weak)}   '
          f'{n_src} sourced, {n_can} canonical, {n_uns} unsourced, {len(weak)} under-sourced\n')

    unchecked_volatile = [v for v in volatile_hits if not v[3]]
    if unchecked_volatile:
        print(f'VOLATILE AND UNSOURCED ({len(unchecked_volatile)}) — check these first')
        print('  Records, counts, superlatives. Every error found so far was one of these.\n')
        for loc, fld, sn, _ in unchecked_volatile[:20]:
            print(f'  {loc} [{fld}]  {sn}')
        if len(unchecked_volatile) > 20:
            print(f'  ... and {len(unchecked_volatile)-20} more')
        print()

    if weak:
        print(f'UNDER-SOURCED ({len(weak)}) — need a second independent source or an authoritative one')
        for loc, n, doms in weak[:15]:
            print(f'  {loc}  {n} source(s): {", ".join(doms)}')
        if len(weak) > 15:
            print(f'  ... and {len(weak)-15} more')
        print()
        hard.append(f'{len(weak)} questions under-sourced')
    if unsourced:
        hard.append(f'{n_uns} questions have no source record')

    if hard:
        print(f'FAIL  {len(hard)} blocking issues\n')
        for h in hard[:40]:
            print(f'  {h}')
        if len(hard) > 40:
            print(f'  ... and {len(hard)-40} more')
        print(f'\nDo not hand this over. Fix and re-run.')
        return 1

    print('PASS  no blocking issues')
    print(f'  answer positions: ' +
          ', '.join(f'{i}:{100*pos[i]/n_q:.0f}%' for i in range(4)))
    stale = [v for v in volatile_hits if v[3]]
    if stale:
        print(f'\n  {len(stale)} sourced claims are time-sensitive. Re-check periodically.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
