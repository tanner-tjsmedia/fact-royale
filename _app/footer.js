/* ============================================================
   FACT ROYALE — THE FOOTER

   ONE OWNER. Every player-facing page gets its footer from here and
   nowhere else.

   This exists because the footer had drifted into three states at once:
   index.html carried a .sitefoot whose "Leaderboard · Privacy · Contact"
   were plain <span> text that did nothing and pointed nowhere, a second
   hidden .home-footer sat inside #legacy-landing, and groups.html and
   mastery.html had no footer at all. Three answers to one question is the
   bug class that has cost us most this month — a dead FR_CATEGORIES took
   the whole auth layer down, and a second category alias table is still
   open. A footer is lower stakes, but it drifts the same way, so it gets
   the same treatment: built in one place, injected everywhere.

   Markup is deliberately built here rather than copied into each page.
   Copies are what drift.

   Requires: app.css (.charter, .hrule, .seal, .wrap) and tokens.css.
   Styles live in app.css under "site footer"; nothing is styled inline.
   ============================================================ */

/* Where the footer's links go. One list, used for both the markup and
   the active-page check, so a renamed page cannot leave a stale label. */
var FR_FOOT_NAV = [
  { href: 'index.html',   label: 'Play' },
  { href: 'index.html#leaderboard', label: 'Leaderboard' },
  { href: 'mastery.html', label: 'Royal Record' },
  { href: 'groups.html',  label: 'Groups' }
];

var FR_FOOT_LEGAL = [
  { href: 'privacy.html', label: 'Privacy' },
  { href: 'terms.html',   label: 'Terms' }
];

/* The crest. Same path as the one in the old .home-footer so the mark is
   literally identical rather than a near-copy that slowly diverges. */
function frCrestSvg(cls) {
  return '<svg class="' + (cls || 'foot-crest') + '" viewBox="0 0 100 74" ' +
    'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M4,54 L4,40 L18,16 L36,44 L50,4 L64,44 L82,16 L96,40 L96,54 Z" fill="var(--gold)"/>' +
    '<rect x="4" y="54" width="92" height="17" rx="3" fill="var(--gold-deep)"/>' +
    '<circle cx="18" cy="16" r="5.5" fill="var(--gold-bright)"/>' +
    '<circle cx="50" cy="4"  r="7"   fill="var(--gold-bright)"/>' +
    '<circle cx="82" cy="16" r="5.5" fill="var(--gold-bright)"/>' +
    '</svg>';
}

function frFooterHtml() {
  var here = (location.pathname.split('/').pop() || 'index.html');

  // Exact match only. Matching on the part before the '#' marked BOTH
  // "Play" and "Leaderboard" as the current page on index.html, because
  // both resolve to index.html — two current-page markers, which is the
  // same as none.
  var nav = FR_FOOT_NAV.map(function (l) {
    var on = l.href === here ? ' class="is-here"' : '';
    return '<a href="' + l.href + '"' + on + '>' + l.label + '</a>';
  }).join('');

  var legal = FR_FOOT_LEGAL.map(function (l) {
    return '<a href="' + l.href + '">' + l.label + '</a>';
  }).join('');

  return '' +
  '<div class="wrap">' +
    '<div class="sitefoot__charter charter">' +

      /* crest + tagline */
      '<div class="sitefoot__mark">' +
        frCrestSvg() +
        '<b>Fact Royale</b>' +
        '<i>A new quiz every day.</i>' +
      '</div>' +

      '<div class="hrule"><i></i></div>' +

      /* the three columns */
      '<div class="sitefoot__cols">' +
        '<nav class="sitefoot__col">' +
          '<h4 class="sitefoot__head">The Realm</h4>' + nav +
        '</nav>' +
        '<nav class="sitefoot__col">' +
          '<h4 class="sitefoot__head">The Charter</h4>' + legal +
        '</nav>' +
        '<div class="sitefoot__col">' +
          '<h4 class="sitefoot__head">Send Word</h4>' +
          '<p class="sitefoot__note">Questions, a correction, or a fact worth adding.</p>' +
          '<button type="button" class="btn btn--ghost btn--sm" id="foot-contact">Contact</button>' +
        '</div>' +
      '</div>' +

      '<div class="hrule"><i></i></div>' +

      /* the seal line */
      '<div class="sitefoot__seal">' +
        '<span class="seal seal--gold" aria-hidden="true">FR</span>' +
        '<span>&copy; ' + new Date().getFullYear() + ' Fact Royale</span>' +
      '</div>' +

    '</div>' +
  '</div>';
}

/* Replace an existing <footer> if the page has one, otherwise append.
 *
 * Replacing rather than always appending is what keeps index.html from
 * ending up with two footers while #legacy-landing still exists. When that
 * block is deleted in Phase 4 this branch simply stops being taken. */
function frMountFooter() {
  var existing = document.querySelector('footer.sitefoot');
  var foot = existing || document.createElement('footer');
  foot.className = 'sitefoot';
  foot.innerHTML = frFooterHtml();
  if (!existing) document.body.appendChild(foot);

  /* Any OTHER footer on the page is a leftover. Hide rather than remove:
     #legacy-landing's children are still written to by auth.js and
     mastery.js, and removing a node they hold a reference to is how you
     get a null dereference three files away. */
  [].forEach.call(document.querySelectorAll('footer'), function (f) {
    if (f !== foot) f.hidden = true;
  });

  var c = document.getElementById('foot-contact');
  if (c) c.onclick = function () {
    if (typeof frOpenContact === 'function') frOpenContact();
  };
}

document.addEventListener('DOMContentLoaded', frMountFooter);
