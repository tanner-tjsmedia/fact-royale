/* FACT ROYALE - REVIEW QUEUE
 *
 * The shared "what changed and what needs me" panel. Loaded by BOTH
 * admin.html and review.html.
 *
 * It lives in one file on purpose. Four separate bugs in this project came
 * from the same shape of mistake - the same rule written out twice and then
 * allowed to drift:
 *
 *   - the admin email, copied into five Firestore rules
 *   - the category chart, keyed 'Pop Culture' in one table and
 *     'Music/Movies' in the other, which threw and killed two panels
 *   - the rig scale, once in the SVG attribute and once in the physics
 *   - the ratio rule, retired in preflight but still reported by review.html
 *
 * So: one renderer, two pages. Not two renderers.
 *
 * Reads static files directly and needs no scan to have been run, because the
 * first thing you want after a sourcing batch is to check that batch.
 */
(function (global) {
  'use strict';

  var FACT_SHARDS = ['facts-src/facts-0001-0499.json'];
  var _facts = null;
  var _questions = null;

  /* Same trap as db: firebase-config.js uses `const auth`, which is not a
   * window property. Read it by identifier or the approver email comes back
   * empty and the human check rejects the write. */
  function currentEmail() {
    try {
      return (typeof auth !== 'undefined' && auth.currentUser && auth.currentUser.email) || '';
    } catch (e) { return ''; }
  }

  function escH(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function daysAgo(iso) {
    if (!iso) return Infinity;
    var t = Date.parse(iso + 'T00:00:00Z');
    if (isNaN(t)) return Infinity;
    return Math.floor((Date.now() - t) / 86400000);
  }

  function loadFacts() {
    // FRStore owns fact access when it is present (admin.html). review.html
    // does not load it, so the direct fetch stays as a read-only fallback.
    if (global.FRStore) {
      if (global.FRStore.mode()) return Promise.resolve(global.FRStore.facts());
      return global.FRStore.init().then(function () { return global.FRStore.facts(); });
    }
    if (_facts) return Promise.resolve(_facts);
    return Promise.all(FACT_SHARDS.map(function (f) {
      return fetch(f, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : { facts: [] }; })
        .catch(function () { return { facts: [] }; });
    })).then(function (parts) {
      _facts = [];
      parts.forEach(function (p) { _facts = _facts.concat(p.facts || []); });
      return _facts;
    });
  }

  // Uses the index rather than probing every date, so a refresh does not fire
  // two hundred speculative 404s. The cost of that choice: this panel is only
  // as current as questions-src/index.json. Regenerate it with
  // tools/build-index.py after adding or removing a day.
  function loadQuestions() {
    if (_questions) return Promise.resolve(_questions);
    return fetch('questions-src/index.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { days: [] }; })
      .catch(function () { return { days: [] }; })
      .then(function (idx) {
        var days = (idx.days || []).map(function (d) {
          return typeof d === 'string' ? d : (d && d.date);
        }).filter(Boolean);
        return Promise.all(days.map(function (d) {
          return fetch('questions-src/' + d + '.json', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) { return j ? { date: d, data: j } : null; })
            .catch(function () { return null; });
        }));
      })
      .then(function (files) {
        _questions = [];
        files.forEach(function (f) {
          if (!f) return;
          (f.data.questions || []).forEach(function (q) {
            _questions.push({ date: f.date, q: q });
          });
        });
        return _questions;
      });
  }

  function card(accent, head, body, answer, refs) {
    return '<div style="border-left:2px solid ' + accent + ';padding:.5rem .8rem;' +
           'margin-bottom:.5rem;background:rgba(255,255,255,.02);border-radius:0 4px 4px 0">' +
           '<div style="font-size:.72rem;opacity:.6">' + head + '</div>' +
           '<div style="margin:.25rem 0">' + escH(body) + '</div>' +
           '<div style="font-size:.8rem;color:#7c7">A: ' + escH(answer) + '</div>' +
           '<div style="font-size:.72rem;opacity:.55;margin-top:.3rem">' +
           (refs && refs.length
              ? refs.map(function (s) { return '<code>' + escH(s) + '</code>'; }).join(' &middot; ')
              : '<span style="color:#c86">no source</span>') +
           '</div></div>';
  }

  function stat(value, label, cls) {
    return '<div style="min-width:120px"><div style="font-size:1.6rem;font-weight:700' +
           (cls ? ';color:' + cls : '') + '">' + value + '</div>' +
           '<div style="font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;' +
           'opacity:.55">' + label + '</div></div>';
  }

  /* render({ into, days, limit })
   * into  - element id to fill
   * days  - recency window, default 7
   * limit - max cards per list, default 40
   */
  function render(opts) {
    opts = opts || {};
    var el = document.getElementById(opts.into || 'review-queue');
    if (!el) return Promise.resolve();
    var win = opts.days || 7;
    var limit = opts.limit || 40;
    el.innerHTML = '<em style="opacity:.6">Loading review queue...</em>';

    return Promise.all([loadFacts(), loadQuestions()]).then(function (res) {
      var facts = res[0], qs = res[1];
      var recentQ = qs.filter(function (x) { return daysAgo(x.q.sourcedAt) <= win; });
      var recentF = facts.filter(function (f) { return daysAgo(f.addedAt) <= win; });
      var unappr  = facts.filter(function (f) { return !f.approvedBy; });
      var unsrc   = qs.filter(function (x) { return !x.q.sourceRefs || !x.q.sourceRefs.length; });

      var h = '<div style="display:flex;gap:1.4rem;flex-wrap:wrap;margin-bottom:1.1rem">' +
        stat(recentQ.length, 'sourced last ' + win + 'd') +
        stat(recentF.length, 'facts added last ' + win + 'd') +
        stat(unappr.length, 'facts awaiting approval', unappr.length ? '#d4af37' : '#6c6') +
        stat(unsrc.length, 'questions unsourced', unsrc.length ? '#d4af37' : '#6c6') +
        '</div>';

      if (recentQ.length) {
        recentQ.sort(function (a, b) {
          return (a.q.sourcedAt < b.q.sourcedAt) ? 1 : -1;
        });
        h += '<h3 style="font-size:.85rem;margin:1rem 0 .5rem">Questions sourced in the last ' +
             win + ' days</h3>';
        recentQ.slice(0, limit).forEach(function (x) {
          h += card('#d4af37',
            escH(x.q.id) + ' &middot; ' + escH(x.date) + ' &middot; ' +
            escH(x.q.category) + ' &middot; sourced ' + escH(x.q.sourcedAt),
            x.q.question, x.q.answer, x.q.sourceRefs);
        });
        if (recentQ.length > limit)
          h += '<div style="font-size:.78rem;opacity:.55">... and ' +
               (recentQ.length - limit) + ' more</div>';
      }

      // approvedBy must be a human and nothing publishes without it, so this
      // list is the actual work queue. It shows even when nothing is recent.
      var list = recentF.length ? recentF : unappr;
      var label = recentF.length
        ? 'Facts added in the last ' + win + ' days'
        : 'Facts awaiting approval (none added in the last ' + win + ' days)';
      if (list.length) {
        h += '<h3 style="font-size:.85rem;margin:1.4rem 0 .5rem">' + label + '</h3>';
        list.slice(0, limit).forEach(function (f) {
          h += card(f.approvedBy ? '#5a5' : '#a85',
            escH(f.id) + ' &middot; ' + escH(f.claimType) + ' &middot; ' +
            escH(f.riskTier) + ' &middot; added ' + escH(f.addedAt || 'unknown') +
            ' &middot; ' + (f.approvedBy
              ? 'approved by ' + escH(f.approvedBy)
              : '<strong style="color:#c86">NOT APPROVED</strong>'),
            f.claim, f.answer, f.sources);
        });
        if (list.length > limit)
          h += '<div style="font-size:.78rem;opacity:.55">... and ' +
               (list.length - limit) + ' more</div>';
      }

      if (!recentQ.length && !list.length)
        h += '<em style="opacity:.6">Nothing changed in that window.</em>';

      el.innerHTML = h;
    }).catch(function (err) {
      el.innerHTML = '<span style="color:#c66">Review queue failed to load. ' +
                     'See console.</span>';
      console.error('review-queue:', err);
    });
  }

  /* ─── Library ──────────────────────────────────────────────────────────
   * Browse what exists rather than what needs attention. Facts and questions
   * in one list so "what backs this" is answerable without knowing the file
   * layout - which is the point of having it at all, for anyone who joins
   * later and has never seen facts-src/.
   */
  function matches(hay, q) {
    if (!q) return true;
    var needle = q.toLowerCase();
    return (hay || '').toLowerCase().indexOf(needle) !== -1;
  }

  function renderLibrary(opts) {
    opts = opts || {};
    var el = document.getElementById(opts.into || 'library-out');
    if (!el) return Promise.resolve();
    var q = (opts.query || '').trim();
    var kind = opts.kind || 'all';
    var want = opts.state || 'ready';
    el.innerHTML = '<em style="opacity:.6">Loading library...</em>';

    return Promise.all([loadFacts(), loadQuestions()]).then(function (res) {
      var facts = res[0], qs = res[1], rows = [], shownF = 0, shownQ = 0;

      if (kind !== 'questions') {
        facts.forEach(function (f) {
          var ok = !!f.approvedBy;
          if (want === 'ready' && !ok) return;
          if (want === 'pending' && ok) return;
          var blob = [f.claim, f.answer, f.subject, (f.tags || []).join(' '),
                      (f.sources || []).join(' '), f.id].join(' ');
          if (!matches(blob, q)) return;
          shownF++;
          rows.push('<div class="lib-row ' + (ok ? 'ok' : 'pending') + '">' +
            '<div class="lib-meta">FACT &middot; ' + escH(f.id) + ' &middot; ' +
              escH(f.claimType) + ' &middot; ' + escH(f.riskTier) +
              ' &middot; ' + (f.tags || []).map(escH).join(', ') +
              ' &middot; ' + (ok ? 'approved by ' + escH(f.approvedBy)
                                 : '<strong style="color:#c86">not approved</strong>') +
            '</div>' +
            '<div>' + escH(f.claim) + '</div>' +
            '<div class="lib-ans">A: ' + escH(f.answer) + '</div>' +
            '<div class="lib-src">' + ((f.sources || []).map(function (s) {
              return '<code>' + escH(s) + '</code>'; }).join(' &middot; ') || 'no source') +
              (ok ? '' : '<label class="pickwrap"><input type="checkbox" class="pick" ' +
                         'value="' + escH(f.id) + '"> select</label>' +
                         '<button class="btn-approve" data-approve="' + escH(f.id) +
                         '">Approve</button>') +
            '</div></div>');
        });
      }

      if (kind !== 'facts') {
        qs.forEach(function (x) {
          var ok = !!(x.q.sourceRefs && x.q.sourceRefs.length);
          if (want === 'ready' && !ok) return;
          if (want === 'pending' && ok) return;
          var blob = [x.q.question, x.q.answer, x.q.category, x.q.id,
                      (x.q.sourceRefs || []).join(' ')].join(' ');
          if (!matches(blob, q)) return;
          shownQ++;
          rows.push('<div class="lib-row ' + (ok ? 'ok' : 'pending') + '">' +
            '<div class="lib-meta">QUESTION &middot; ' + escH(x.q.id) + ' &middot; ' +
              escH(x.date) + ' &middot; ' + escH(x.q.category) +
              (x.q.sourcedAt ? ' &middot; sourced ' + escH(x.q.sourcedAt) : '') + '</div>' +
            '<div>' + escH(x.q.question) + '</div>' +
            '<div class="lib-ans">A: ' + escH(x.q.answer) + '</div>' +
            '<div class="lib-src">' + ((x.q.sourceRefs || []).map(function (s) {
              return '<code>' + escH(s) + '</code>'; }).join(' &middot; ')
              || '<span style="color:#c86">unsourced</span>') + '</div></div>');
        });
      }

      var pend = rows.filter(function (r) { return r.indexOf('class="pick"') !== -1; }).length;
      var bulk = pend ? '<div class="bulkbar">' +
          '<label><input type="checkbox" id="pick-all"> select all ' + pend + ' shown</label>' +
          '<button class="btn-approve" id="approve-picked">Approve selected</button>' +
          '<span id="pick-count" style="opacity:.55;font-size:.75rem"></span></div>' : '';

      var head = bulk + '<div style="font-size:.78rem;opacity:.6;margin-bottom:.8rem">' +
        shownF + ' fact' + (shownF === 1 ? '' : 's') + ', ' +
        shownQ + ' question' + (shownQ === 1 ? '' : 's') +
        (q ? ' matching "' + escH(q) + '"' : '') + '</div>';

      var LIMIT = 300;
      el.innerHTML = head + (rows.length
        ? rows.slice(0, LIMIT).join('') +
          (rows.length > LIMIT
            ? '<div style="font-size:.78rem;opacity:.55">... and ' +
              (rows.length - LIMIT) + ' more. Narrow the search.</div>' : '')
        : '<em style="opacity:.6">Nothing matches.</em>');

      wireApprovals(el);
      wireBulk(el);
    }).catch(function (err) {
      el.innerHTML = '<span style="color:#c66">Library failed to load. See console.</span>';
      console.error('library:', err);
    });
  }

  /* Approving needs write access, which needs a folder grant. Ask for it at
   * the moment it is needed rather than on page load, so simply looking at
   * the dashboard never triggers a permission prompt. */
  function wireApprovals(root) {
    root.querySelectorAll('[data-approve]').forEach(function (btn) {
      btn.onclick = async function () {
        var id = btn.getAttribute('data-approve');
        var who = currentEmail();
        btn.disabled = true; btn.textContent = 'Approving...';
        try {
          await global.FRStore.approve(id, who);
          btn.textContent = 'Approved';
          btn.style.background = '#2a4a2a';
        } catch (e) {
          btn.disabled = false; btn.textContent = 'Approve';
          alert('Could not approve ' + id + ':\n\n' + e.message);
          console.error(e);
        }
      };
    });
  }

  function wireBulk(root) {
    var all   = root.querySelector('#pick-all');
    var go    = root.querySelector('#approve-picked');
    var count = root.querySelector('#pick-count');
    if (!go) return;
    function picked() {
      return Array.prototype.slice.call(root.querySelectorAll('.pick:checked'))
        .map(function (c) { return c.value; });
    }
    function tally() { if (count) count.textContent = picked().length + ' selected'; }
    root.querySelectorAll('.pick').forEach(function (c) { c.onchange = tally; });
    if (all) all.onchange = function () {
      root.querySelectorAll('.pick').forEach(function (c) { c.checked = all.checked; });
      tally();
    };
    go.onclick = async function () {
      var ids = picked();
      var who = currentEmail();
      if (!ids.length) { alert('Select some facts first.'); return; }
      if (!confirm('Approve ' + ids.length + ' fact' + (ids.length === 1 ? '' : 's') +
                   ' as ' + who + '?\n\nApproval says a person read the claim and ' +
                   'checked it against its sources.')) return;
      go.disabled = true; go.textContent = 'Approving...';
      try {
        var n = await global.FRStore.approveMany(ids, who);
        go.textContent = 'Approved ' + n;
        if (global.FRAdminRefreshLibrary) global.FRAdminRefreshLibrary();
      } catch (e) {
        go.disabled = false; go.textContent = 'Approve selected';
        alert(e.message); console.error(e);
      }
    };
    tally();
  }

  global.FRReviewQueue = {
    render: render,
    renderLibrary: renderLibrary,
    daysAgo: daysAgo,
    escH: escH
  };
})(window);
