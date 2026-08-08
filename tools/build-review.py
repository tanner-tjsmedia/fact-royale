#!/usr/bin/env python3
"""
FACT ROYALE — REVIEW PAGE BUILDER

Generates a single self-contained HTML page showing every question that
changed against git HEAD, old vs new side by side, so changes can be
reviewed before deploying.

    python3 tools/build-review.py                        # vs HEAD
    python3 tools/build-review.py --base e288697         # vs a specific commit
    python3 tools/build-review.py --base e288697 2026-11 # one month

Use --base to compare against the last commit BEFORE the content pass began,
otherwise already-committed rewrites won't appear.

Writes tools/review.html. Open it in a browser.
"""
import json, os, subprocess, sys, html
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
QDIR = os.path.join(ROOT, 'questions')
OUT  = os.path.join(ROOT, 'tools', 'review.html')

MAX_LEN, MAX_SPREAD = 80, 35
BASE = 'HEAD'


def git_head_version(relpath):
    try:
        r = subprocess.run(['git', 'show', f'{BASE}:{relpath}'],
                           cwd=ROOT, capture_output=True, text=True, timeout=20)
        if r.returncode != 0:
            return None
        return json.loads(r.stdout)
    except Exception:
        return None


def flags_for(q):
    out = []
    opts = q.get('options', [])
    ans = q.get('answer')
    if len(opts) != 4:
        out.append(('err', f'{len(opts)} options'))
    if ans not in opts:
        out.append(('err', 'answer not in options'))
    if len(set(opts)) != len(opts):
        out.append(('err', 'duplicate options'))
    if opts:
        L = [len(o) for o in opts]
        if max(L) > MAX_LEN:
            out.append(('warn', f'{max(L)} chars'))
        if max(L) - min(L) > MAX_SPREAD:
            out.append(('warn', f'spread {max(L)-min(L)}'))
        if ans in opts and max(opts, key=len) == ans:
            out.append(('warn', 'answer is longest'))
    if not q.get('explanation'):
        out.append(('warn', 'no explanation'))
    if not q.get('memory_hook'):
        out.append(('warn', 'no memory hook'))
    return out


def opt_html(q, changed_set=None):
    rows = []
    for o in q.get('options', []):
        is_ans = (o == q.get('answer'))
        cls = 'opt ans' if is_ans else 'opt'
        mark = '&#10003;' if is_ans else '&nbsp;'
        rows.append(
            f'<div class="{cls}"><span class="mark">{mark}</span>'
            f'<span class="otext">{html.escape(o)}</span>'
            f'<span class="olen">{len(o)}</span></div>')
    return ''.join(rows)


def main():
    global BASE
    args = sys.argv[1:]
    if '--base' in args:
        i = args.index('--base')
        BASE = args[i + 1]
        del args[i:i + 2]
    prefix = args[0] if args else ''
    files = sorted(f for f in os.listdir(QDIR)
                   if f.endswith('.json') and f.startswith(prefix))

    blocks, n_changed, n_files = [], 0, 0
    total_flags = {'err': 0, 'warn': 0}

    for fn in files:
        date = fn[:-5]
        rel = f'questions/{fn}'
        new = json.load(open(os.path.join(QDIR, fn), encoding='utf-8'))
        old = git_head_version(rel)

        newqs = new.get('questions', [])
        oldqs = (old or {}).get('questions', [])

        file_blocks = []
        for i, nq in enumerate(newqs):
            oq = oldqs[i] if i < len(oldqs) else None
            same = oq is not None and \
                oq.get('question') == nq.get('question') and \
                oq.get('options') == nq.get('options') and \
                oq.get('answer') == nq.get('answer')
            if same:
                continue
            n_changed += 1

            fl = flags_for(nq)
            for kind, _ in fl:
                total_flags[kind] += 1
            flag_html = ''.join(
                f'<span class="flag {k}">{html.escape(t)}</span>' for k, t in fl)

            if oq is None:
                old_html = '<div class="none">new question (no previous version)</div>'
            else:
                oL = [len(o) for o in oq.get('options', [])]
                old_meta = (f'max {max(oL)} / spread {max(oL)-min(oL)}' if oL else '')
                old_html = (f'<div class="qtext">{html.escape(oq.get("question",""))}</div>'
                            f'{opt_html(oq)}<div class="meta">{old_meta}</div>')

            nL = [len(o) for o in nq.get('options', [])]
            new_meta = (f'max {max(nL)} / spread {max(nL)-min(nL)}' if nL else '')

            file_blocks.append(f'''
<div class="q" data-flags="{'err' if any(k=='err' for k,_ in fl) else ('warn' if fl else 'clean')}">
  <div class="qhead">
    <span class="qid">{date} &middot; #{i}</span>
    <span class="cat">{html.escape(nq.get('category',''))}</span>
    {flag_html}
  </div>
  <div class="cols">
    <div class="col old"><div class="collabel">before</div>{old_html}</div>
    <div class="col new"><div class="collabel">after</div>
      <div class="qtext">{html.escape(nq.get('question',''))}</div>
      {opt_html(nq)}
      <div class="meta">{new_meta}</div>
    </div>
  </div>
  <details class="extra">
    <summary>explanation &amp; memory hook</summary>
    <p><b>Explanation.</b> {html.escape(nq.get('explanation','(missing)'))}</p>
    <p><b>Hook.</b> {html.escape(nq.get('memory_hook','(missing)'))}</p>
  </details>
</div>''')

        if file_blocks:
            n_files += 1
            blocks.append(f'<h2 class="day">{date}</h2>' + ''.join(file_blocks))

    body = ''.join(blocks) if blocks else \
        '<p class="none" style="padding:2rem">No changes against git HEAD.</p>'

    doc = f'''<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Fact Royale — Question Review</title>
<style>
 :root {{ --bg:#0e0e16; --card:#16161f; --line:#26263a; --gold:#d4af37;
          --txt:#e9e9f2; --mut:#8f8fa8; --grn:#4ade80; --red:#f87171; }}
 * {{ box-sizing:border-box }}
 body {{ margin:0; background:var(--bg); color:var(--txt);
   font:14px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif }}
 header {{ position:sticky; top:0; z-index:9; background:rgba(14,14,22,.97);
   border-bottom:1px solid var(--line); padding:.85rem 1.25rem;
   display:flex; gap:1.25rem; align-items:center; flex-wrap:wrap;
   backdrop-filter:blur(10px) }}
 h1 {{ font-size:1rem; margin:0; color:var(--gold); letter-spacing:.01em }}
 .sum {{ color:var(--mut); font-size:.85rem }}
 .sum b {{ color:var(--txt) }}
 .filters {{ margin-left:auto; display:flex; gap:.4rem }}
 .fbtn {{ background:#1d1d2a; border:1px solid var(--line); color:var(--mut);
   padding:.32rem .8rem; border-radius:99px; cursor:pointer; font:inherit; font-size:.8rem }}
 .fbtn.on {{ background:var(--gold); color:#12121c; border-color:var(--gold); font-weight:700 }}
 main {{ max-width:1240px; margin:0 auto; padding:1.25rem }}
 h2.day {{ font-size:.78rem; letter-spacing:.14em; text-transform:uppercase;
   color:var(--gold); opacity:.75; margin:2rem 0 .75rem; font-weight:700 }}
 .q {{ background:var(--card); border:1px solid var(--line);
   border-radius:12px; padding:.9rem 1rem; margin-bottom:.85rem }}
 .qhead {{ display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; margin-bottom:.7rem }}
 .qid {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.76rem; color:var(--mut) }}
 .cat {{ font-size:.7rem; padding:.14rem .55rem; border-radius:99px;
   background:rgba(212,175,55,.12); color:var(--gold) }}
 .flag {{ font-size:.68rem; padding:.14rem .5rem; border-radius:99px; font-weight:700 }}
 .flag.warn {{ background:rgba(240,192,64,.15); color:#f0c040 }}
 .flag.err  {{ background:rgba(248,113,113,.18); color:var(--red) }}
 .cols {{ display:grid; grid-template-columns:1fr 1fr; gap:.85rem }}
 @media (max-width:900px) {{ .cols {{ grid-template-columns:1fr }} }}
 .col {{ border:1px solid var(--line); border-radius:9px; padding:.7rem .8rem; min-width:0 }}
 .col.old {{ opacity:.62 }}
 .col.new {{ border-color:rgba(74,222,128,.3) }}
 .collabel {{ font-size:.64rem; letter-spacing:.13em; text-transform:uppercase;
   color:var(--mut); margin-bottom:.5rem; font-weight:700 }}
 .col.new .collabel {{ color:var(--grn) }}
 .qtext {{ font-weight:600; margin-bottom:.55rem; font-size:.9rem }}
 .opt {{ display:flex; gap:.5rem; align-items:baseline; padding:.2rem 0;
   border-top:1px solid rgba(255,255,255,.045); font-size:.845rem }}
 .opt.ans {{ color:var(--grn); font-weight:600 }}
 .mark {{ width:1em; flex:none }}
 .otext {{ flex:1; min-width:0; overflow-wrap:anywhere }}
 .olen {{ flex:none; color:var(--mut); font-size:.7rem;
   font-family:ui-monospace,Menlo,monospace }}
 .meta {{ margin-top:.5rem; font-size:.7rem; color:var(--mut);
   font-family:ui-monospace,Menlo,monospace }}
 .none {{ color:var(--mut); font-style:italic }}
 .extra {{ margin-top:.6rem; font-size:.82rem; color:var(--mut) }}
 .extra summary {{ cursor:pointer; color:var(--gold); opacity:.7; font-size:.76rem }}
 .extra p {{ margin:.5rem 0 0 }}
 .hidden {{ display:none !important }}
</style></head><body>
<header>
  <h1>Question Review</h1>
  <span class="sum"><b>{n_changed}</b> changed across <b>{n_files}</b> days
    &middot; <b style="color:var(--red)">{total_flags['err']}</b> errors
    &middot; <b style="color:#f0c040">{total_flags['warn']}</b> warnings</span>
  <div class="filters">
    <button class="fbtn on" data-f="all">All</button>
    <button class="fbtn" data-f="err">Errors</button>
    <button class="fbtn" data-f="warn">Flagged</button>
  </div>
</header>
<main>{body}</main>
<script>
document.querySelectorAll('.fbtn').forEach(b => b.onclick = () => {{
  document.querySelectorAll('.fbtn').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  const f = b.dataset.f;
  document.querySelectorAll('.q').forEach(q => {{
    const v = q.dataset.flags;
    const show = f === 'all' || (f === 'err' && v === 'err') ||
                 (f === 'warn' && v !== 'clean');
    q.classList.toggle('hidden', !show);
  }});
  document.querySelectorAll('h2.day').forEach(h => {{
    let n = h.nextElementSibling, any = false;
    while (n && n.tagName !== 'H2') {{
      if (n.classList.contains('q') && !n.classList.contains('hidden')) any = true;
      n = n.nextElementSibling;
    }}
    h.classList.toggle('hidden', !any);
  }});
}});
</script>
<footer style="max-width:1240px;margin:0 auto;padding:2rem 1.25rem;
  color:#8f8fa8;font-size:.78rem">
  Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} &middot;
  compared against <code>{html.escape(BASE)}</code>
</footer>
</body></html>'''

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write(doc)
    print(f'{n_changed} changed questions across {n_files} days')
    print(f'errors: {total_flags["err"]}   warnings: {total_flags["warn"]}')
    print(f'wrote {OUT}')


if __name__ == '__main__':
    main()
