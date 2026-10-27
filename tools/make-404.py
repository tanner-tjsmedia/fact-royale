#!/usr/bin/env python3
"""
FACT ROYALE — BUILD 404.html FROM THE SIEGE ARTWORK

GitHub Pages serves 404.html for any route it cannot resolve. That page
was previously a straight `cp under-siege.html 404.html` in go-dark.sh,
and go-live.sh deleted it again — so when the site was up there was no
branded 404 at all, and when it was down there were two copies of a
74KB file drifting apart from each other.

ONE SOURCE, TWO MODES.

under-siege.html owns the artwork, the physics and the playable siege.
This script copies it and swaps only the words, because the right words
genuinely differ by state:

  --dark   The whole site is down. A deep link should say "we are making
           repairs", not "no such page" — the page the visitor wanted
           does exist, it just isn't being served.

  --live   The site is up and this really is a missing route. Say so,
           and give them somewhere to go.

In --live mode the copy is chosen in the browser from the path that was
requested, because GitHub Pages preserves the original URL when it
serves 404.html. A mistyped archive date is a different problem from a
mistyped page, and deserves a different sentence.

USAGE
  python3 tools/make-404.py --live     (called by go-live.sh)
  python3 tools/make-404.py --dark     (called by go-dark.sh)
  python3 tools/make-404.py --live --check    report drift, write nothing

Neither go-dark.sh nor go-live.sh should ever delete 404.html again. A
site with no 404 page is the one state that is wrong in both modes.
"""

import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "under-siege.html"
OUT = ROOT / "404.html"

# The copy block in under-siege.html, matched on its own markers rather
# than line numbers so an edit above it cannot silently break this.
COPY_RE = re.compile(
    r"<h1>Under Siege</h1>.*?</p>\s*(?=<script>)",
    re.DOTALL,
)
TITLE_RE = re.compile(r"<title>.*?</title>", re.DOTALL)
OGTITLE_RE = re.compile(r'<meta property="og:title" content=".*?">')

# Contact goes through the site's own form, not a mailto. The old link
# here still pointed at the retired tjs16media.com address.
CONTACT = '<a href="/privacy.html">Privacy</a>'

DARK_COPY = """<h1>Under Siege</h1>
<p class="line">Fact Royale is unavailable while we make repairs.</p>
<p class="tiny">
  Your streak, stats and history are secure &nbsp;·&nbsp; """ + CONTACT + """
</p>
"""

# --live. The heading and line are placeholders; the script below picks
# the real wording from the URL that was actually requested.
LIVE_COPY = """<h1 id="e404-title">Nothing here</h1>
<p class="line" id="e404-line">That page does not exist.</p>
<p class="tiny">
  <a href="/">Back to the gate</a> &nbsp;·&nbsp;
  <a href="/?autostart=1">Play today's quiz</a> &nbsp;·&nbsp; """ + CONTACT + """
</p>
<script>
/* GitHub Pages serves this file but leaves the requested URL in the
   address bar, so the page can tell what was actually asked for and say
   something useful instead of a generic apology. */
(function () {
  var p = (location.pathname || '').toLowerCase();
  var q = new URLSearchParams(location.search);
  var h = document.getElementById('e404-title');
  var l = document.getElementById('e404-line');
  if (!h || !l) return;

  function say(title, line) { h.textContent = title; l.innerHTML = line; }

  var date = q.get('date');
  if (date && /^\\d{4}-\\d{2}-\\d{2}$/.test(date)) {
    // A real date, but no quiz under it. Almost always a day from before
    // the archive window rather than a typo.
    say('No quiz that day',
        'There is no quiz for ' + date + '. ' +
        'The archive only reaches back a week.');
    return;
  }
  // Anchored to a path SEGMENT, not matched anywhere in the string.
  // The loose version flagged '/delivery' as an admin route, because
  // 'delivery' contains 'live'.
  if (/^\\/(admin|studio|review|live)(\\.html)?\\/?$/.test(p)) {
    say('Barred', 'That part of the castle is not open to visitors.');
    return;
  }
  if (/^\\/(questions|questions-src|facts-src|sources|tools|docs|functions)\\//.test(p)) {
    // Someone poking at the data paths. Tell them plainly rather than
    // pretending the route is merely missing.
    say('Barred', 'Nothing behind that door is public.');
    return;
  }
  if (p && p !== '/' && p !== '/404.html') {
    say('Nothing here', 'No page at <b>' + p.replace(/[<>&]/g, '') + '</b>.');
  }
})();
</script>
"""


def build(mode: str) -> str:
    if not SRC.exists():
        sys.exit(f"{SRC.name} not found. It is the source for this page.")
    html = SRC.read_text(encoding="utf-8")

    if not COPY_RE.search(html):
        sys.exit(
            "Could not find the copy block in under-siege.html.\n"
            "It is matched on '<h1>Under Siege</h1>' through the last </p>\n"
            "before <script>. If that markup changed, update COPY_RE here\n"
            "rather than hand-editing 404.html — a hand-edited copy is the\n"
            "thing this script exists to prevent."
        )

    copy = DARK_COPY if mode == "dark" else LIVE_COPY
    title = ("Fact Royale — Under Siege" if mode == "dark"
             else "Not found — Fact Royale")

    html = COPY_RE.sub(lambda m: copy, html, count=1)
    html = TITLE_RE.sub(f"<title>{title}</title>", html, count=1)
    html = OGTITLE_RE.sub(f'<meta property="og:title" content="{title}">',
                          html, count=1)

    banner = (f"<!-- GENERATED by tools/make-404.py --{mode}. "
              f"Do not edit. Edit under-siege.html for the artwork, or "
              f"that script for the words. -->\n")
    return banner + html


def main() -> None:
    args = sys.argv[1:]
    mode = "dark" if "--dark" in args else "live" if "--live" in args else None
    if mode is None:
        sys.exit(__doc__.strip().split("USAGE")[1])

    built = build(mode)

    if "--check" in args:
        if not OUT.exists():
            print(f"404.html is MISSING. Build it: python3 tools/make-404.py --{mode}")
            sys.exit(1)
        current = OUT.read_text(encoding="utf-8")
        if current == built:
            print(f"404.html is in step with under-siege.html ({mode} mode).")
            sys.exit(0)
        print(f"404.html has DRIFTED from under-siege.html ({mode} mode).")
        print(f"Rebuild: python3 tools/make-404.py --{mode}")
        sys.exit(1)

    OUT.write_text(built, encoding="utf-8")
    print(f"  404.html    <- under-siege.html ({mode} wording, "
          f"{len(built) // 1024}KB)")


if __name__ == "__main__":
    main()
