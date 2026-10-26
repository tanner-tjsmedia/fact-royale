/* ============================================================
   FACT ROYALE — THE CATEGORY TABLE

   The single owner of what a category is called, what colour it is, and
   what it used to be called. Load this before anything that displays a
   category.

   WHY THIS FILE EXISTS

   The same drift has now caused three separate bugs:

     1. admin.html kept one map keyed 'Pop Culture' and another keyed
        'Music/Movies'. A lookup missed, returned undefined, and the
        TypeError killed two dashboard panels.
     2. studio.css styled [data-cat="Pop Culture"] only, so every row
        written under the current name fell through to no colour at all --
        silently, because an unmatched CSS selector is not an error.
     3. quiz.js getCategoryClass() matched 'music' and 'movie' but not
        'pop', so 246 of 984 questions -- a quarter of the corpus, every
        Pop Culture row -- rendered in the grey default.

   Each was fixed in isolation and the next one appeared somewhere else,
   because the real fault was that four files each held their own opinion
   about the list.

   A fourth and fifth turned up later, and were worse:

     4. auth.js carried its OWN alias table pointing the opposite way --
        'Music/Movies' -> 'Pop Culture' -- so every category total written
        to Firestore was canonicalised to the dead name.
     5. createUserProfile() seeded categoryStats with three categories
        under those dead names, so every new account was missing Geography
        and Science & Nature from the day it was created.

   RULES
     - Nothing outside this file hardcodes a category name or colour.
     - The corpus still contains the retired name. Do not rewrite 246
       question files to fix a display bug; alias it here instead.
     - Adding a category means editing this file and tokens.css, and
       nothing else.
     - Key maps by SLUG, never by display name. Slugs do not get renamed.

   WHO HAS BEEN CONVERTED

     done     quiz.js, home.js, auth.js, mastery.js  (player-facing)
     NOT YET  admin.html   DI_LEGACY_KEYS + a catMap with its own aliases
              live.html    const CATEGORIES = [...]
              studio.html  const CATS = [...]

   The three outstanding ones are internal tools, so a drift there shows
   up as a broken dashboard rather than a wrong score — which is how
   bug 1 was found. They do not load this file yet; converting them means
   adding the <script> tag as well as deleting the array.
   ============================================================ */

var FR_CATEGORIES = [
  { slug: 'history',   label: 'History',
    aliases: ['history'] },
  { slug: 'sports',    label: 'Sports',
    aliases: ['sport', 'sports'] },
  { slug: 'music',     label: 'Music/Movies',
    /* 'pop culture' is the retired name and is still on 246 questions. */
    aliases: ['music', 'movie', 'movies', 'pop culture', 'pop'] },
  { slug: 'geography', label: 'Geography',
    aliases: ['geography', 'geo'] },
  { slug: 'science',   label: 'Science & Nature',
    aliases: ['science', 'nature'] }
];

/* Resolve any name the corpus might carry, current or retired.
 *
 * Returns { slug, label, cls } — never null, so no caller has to guard.
 * cls is hue-*, not cat-*: style.css still owns .cat-* as the old
 * category pill and reusing the name drags its background along.
 * An unknown category gets the default slug and keeps whatever text it
 * arrived with, which is the honest outcome: show it, colour it neutrally,
 * and let it be visibly odd rather than silently invisible. */
function frCategory(name) {
  var raw = String(name == null ? '' : name).trim();
  var low = raw.toLowerCase();
  for (var i = 0; i < FR_CATEGORIES.length; i++) {
    var c = FR_CATEGORIES[i];
    for (var j = 0; j < c.aliases.length; j++) {
      if (low.indexOf(c.aliases[j]) !== -1) {
        return { slug: c.slug, label: c.label, cls: 'hue-' + c.slug };
      }
    }
  }
  return { slug: 'default', label: raw || 'Other', cls: 'hue-default' };
}

/* The canonical five, in display order. For anything that renders the set
 * rather than one member: the homepage standards, the results breakdown,
 * the Royal Record. */
function frCategoryList() { return FR_CATEGORIES.slice(); }
