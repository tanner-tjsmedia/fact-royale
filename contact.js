/* ============================================================
   FACT ROYALE — CONTACT

   A small dialog, opened from the footer on any page, that posts to the
   same Apps Script endpoint as signups and the notify form. No new
   infrastructure, no new function to deploy, no new secret.

   WHAT THIS CANNOT DO, AND WHY THE WORDING MATTERS

   The post goes out with mode:'no-cors'. The browser will not let us read
   the response — not the status, not the body, nothing. So this code
   cannot know whether the message arrived. It says "Sent" because the
   request left, which is a weaker claim than it sounds, and the copy on
   screen says so plainly rather than implying a delivery receipt we do not
   have. If that is not good enough, the fix is a Cloud Function endpoint
   that can answer properly; this is the cheap option and it should not
   pretend to be the expensive one.

   THE APPS SCRIPT NEEDS A MATCHING BRANCH

   Posts carry source='contact' and a `message` field the script has never
   seen. Until the deployment handles it, messages may land in the wrong
   columns or be dropped. See docs/CONTACT-ENDPOINT.md.

   Requires: firebase-config.js (FR_SHEET_URL, frPostToSheet), app.css.
   ============================================================ */

var FR_CONTACT_TOPICS = [
  'A question',
  'A correction to a question',
  'A fact worth adding',
  'Something is broken',
  'Something else'
];

function frContactHtml() {
  return '' +
  // fc-card, not modal-card. style.css already owns .modal-card with the
  // old flat treatment, and reusing it would drag that look in exactly the
  // way .cat-history dragged an amber fill onto the explanation panel.
  '<div class="fc-card charter" role="dialog" aria-modal="true" aria-labelledby="fc-title">' +
    '<button type="button" class="fc-x" id="fc-close" aria-label="Close">&times;</button>' +

    '<h3 class="hhead" id="fc-title">Send Word</h3>' +
    '<p class="fc-lede">We read everything. Corrections to a question are the most ' +
       'useful thing you can send &mdash; say which day it was and we will check the source.</p>' +

    '<form id="fc-form" novalidate>' +
      '<label class="fc-label" for="fc-topic">What is it about</label>' +
      '<select id="fc-topic" class="fc-field">' +
        FR_CONTACT_TOPICS.map(function (t) {
          return '<option value="' + t + '">' + t + '</option>';
        }).join('') +
      '</select>' +

      '<label class="fc-label" for="fc-email">Your email</label>' +
      '<input id="fc-email" class="fc-field" type="email" autocomplete="email" ' +
        'placeholder="so we can reply">' +

      '<label class="fc-label" for="fc-message">Message</label>' +
      '<textarea id="fc-message" class="fc-field" rows="5" ' +
        'placeholder="As much detail as you have."></textarea>' +

      '<p class="fc-error" id="fc-error" role="alert"></p>' +
      '<button type="submit" class="btn" id="fc-send">Send</button>' +
      '<p class="fc-fine">We use your email only to reply to this message. ' +
        'See <a href="privacy.html">Privacy</a>.</p>' +
    '</form>' +
  '</div>';
}

function frOpenContact() {
  var m = document.getElementById('fr-contact');
  if (!m) {
    m = document.createElement('div');
    m.id = 'fr-contact';
    m.className = 'fc-modal';
    m.innerHTML = frContactHtml();
    document.body.appendChild(m);
    frWireContact(m);
  }
  m.style.display = 'flex';
  var t = document.getElementById('fc-topic');
  if (t) t.focus();
}

function frCloseContact() {
  var m = document.getElementById('fr-contact');
  if (m) m.style.display = 'none';
}

function frWireContact(m) {
  document.getElementById('fc-close').onclick = frCloseContact;
  m.addEventListener('click', function (e) { if (e.target === m) frCloseContact(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') frCloseContact();
  });

  document.getElementById('fc-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var topic = document.getElementById('fc-topic').value;
    var email = document.getElementById('fc-email').value.trim();
    var msg   = document.getElementById('fc-message').value.trim();
    var err   = document.getElementById('fc-error');
    var btn   = document.getElementById('fc-send');

    // Validated here because the endpoint cannot answer back. A message
    // that silently goes nowhere is the worst outcome, so the only checks
    // that exist are the ones we can actually make before sending.
    if (!msg)  { err.textContent = 'Please write a message.'; return; }
    if (!email || email.indexOf('@') < 1) {
      err.textContent = 'Please add an email address so we can reply.'; return;
    }
    err.textContent = '';
    btn.disabled    = true;
    btn.textContent = 'Sending…';

    var who = (typeof realUser === 'function' && realUser()) || null;

    frPostToSheet({
      source:   'contact',
      topic:    topic,
      email:    email,
      message:  msg,
      // Context the player should not have to type. uid is here so a
      // report about a specific account can be traced without asking.
      uid:      who ? who.uid : '',
      name:     who ? (who.displayName || '') : '',
      page:     location.pathname.split('/').pop() || 'index.html',
      sentAt:   new Date().toISOString()
    }).catch(function () { /* opaque either way */ });

    // Deliberately "on its way", not "we got it". See the header.
    document.getElementById('fc-form').innerHTML =
      '<p class="fc-done"><span class="seal seal--gold" aria-hidden="true">FR</span>' +
      'Your message is on its way. If it needs a reply you will get one at ' +
      '<b>' + email.replace(/[<>&]/g, '') + '</b>.</p>';
  });
}
