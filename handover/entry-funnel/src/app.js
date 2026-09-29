/*
 * HybridX plan finder: page script (reference implementation, framework-free).
 *
 * Reads three things that build.js puts on window before this file runs:
 *   window.HX_FUNNEL   content and options, from data/funnel.json
 *   window.HXRouting   routing rules, from data/routing.js
 *   window.HX_CONFIG   optional settings, set by the page (see CONFIG below)
 *
 * Parts: data and routing wrappers, HXT (the tracker), rendering, navigation,
 * the entry-funnel skip logic, page-level tracking, event wiring.
 * Claude Code will port this to the Next.js app. docs/04 explains the tracker.
 */
(function () {
  'use strict';

  var DATA = window.HX_FUNNEL;
  var RT = window.HXRouting;
  var USER = window.HX_CONFIG || {};

  /* ------------------------------------------------------------------
     CONFIG. Set through window.HX_CONFIG before this script runs.
       talkEndpoint   where the "Talk to us" form POSTs JSON. Empty = preview mode.
       trackEndpoint  where the tracker POSTs event batches. Empty = tracking off.
       captureNote    true (default) sends the scrubbed step-5 note with the answers.
       mode           'entry' (funnel above the homepage) or 'page'. Detected from #hx-entry.
       variant        optional experiment arm: 'A', 'B' or 'control'.
       privacyHref    link shown next to the step-5 privacy line.
  ------------------------------------------------------------------ */
  var CONFIG = {
    talkEndpoint: USER.talkEndpoint || '',
    trackEndpoint: USER.trackEndpoint || '',
    captureNote: USER.captureNote !== false,
    mode: USER.mode || (document.getElementById('hx-entry') ? 'entry' : 'page'),
    variant: USER.variant || null,
    privacyHref: USER.privacyHref || 'https://hybridx.club/privacy-policy',
    siteVersion: USER.siteVersion || 'ref-1',
    ownHosts: /^https:\/\/(app\.)?hybridx\.club(\/|$)/
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var ico = function (n, c) { return '<svg class="ico' + (c ? ' ' + c : '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var by = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var slug = function (s, max) { return String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max || 40); };

  document.documentElement.classList.add('js');

  /* ---------------- data ---------------- */
  var GOALS = DATA.goals, LEVELS = DATA.levels, PLACES = DATA.places, OBSTS = DATA.obstacles, FORMATS = DATA.formats;
  var STATIONS = DATA.stations, CAT = DATA.catalog, COPY = DATA.copy, STEPS = DATA.steps;

  /* ---------------- state ---------------- */
  var state = {
    step: 1, maxStep: 1, resultReady: false, talkFrom: null, talkPrefilled: false,
    goal: null, level: null, place: null, obst: [], format: null, note: '', race: '',
    talk: { name: '', email: '', goal: '', week: '', msg: '', attach: true },
    fb: { fit: null, reasons: [], sent: false }
  };

  var dlg = $('#finder');
  var entryEl = $('#hx-entry');
  var elStrip = dlg && $('#f-strip'), elBody = dlg && $('#f-body'), elFoot = dlg && $('#f-foot');
  var lastFocus = null, focusAfterClose = null, closeReason = 'button', openedAt = 0, stepAt = 0, resultSig = '', pendingTalkFrom = null;
  var loadedAt = Date.now();

  /* ==================================================================
     HXT: the tracker. Off unless trackEndpoint is set. Also off when the browser
     sends Global Privacy Control or Do Not Track. Holds a random id in memory only:
     nothing is written to cookies, localStorage or sessionStorage, and a reload is a
     new visit. Events are batched and sent as text/plain JSON (no CORS preflight).
     What may be sent is defined in data/events.schema.json.
  ================================================================== */
  var HXT = (function () {
    var optOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
    var on = !!CONFIG.trackEndpoint && !optOut;
    var queue = [], seq = 0, timer = null, sent = 0, CAP = 400;

    function rid() {
      var a = '', i;
      try {
        var b = new Uint8Array(16); crypto.getRandomValues(b);
        for (i = 0; i < b.length; i++) a += ('0' + b[i].toString(16)).slice(-2);
      } catch (e) {
        for (i = 0; i < 32; i++) a += Math.floor(Math.random() * 16).toString(16);
      }
      return a;
    }
    var sid = rid();

    function host(u) {
      try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return ''; }
    }
    function utm() {
      var out = {}, any = false;
      try {
        var p = new URLSearchParams(location.search);
        ['source', 'medium', 'campaign', 'content', 'term'].forEach(function (k) {
          var v = slug(p.get('utm_' + k), 60);
          if (v) { out['utm_' + k] = v; any = true; }
        });
      } catch (e) {}
      return any ? out : undefined;
    }
    function ctx() {
      var w = window.innerWidth || 1024;
      var c = {
        site: slug(CONFIG.siteVersion, 20) || 'ref', route: RT.VERSION, catalog: slug(DATA.catalogVersion, 20),
        mode: CONFIG.mode, path: location.pathname || '/', ref: host(document.referrer),
        vw: w < 640 ? 'phone' : w < 1024 ? 'tablet' : 'desktop',
        lang: slug(document.documentElement.lang || navigator.language || 'en', 10)
      };
      if (CONFIG.variant) c.variant = CONFIG.variant;
      var u = utm(); if (u) c.utm = u;
      return c;
    }
    function send(body, unload) {
      try {
        if (unload && navigator.sendBeacon && navigator.sendBeacon(CONFIG.trackEndpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
      } catch (e) {}
      try {
        fetch(CONFIG.trackEndpoint, { method: 'POST', body: body, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=UTF-8' } }).catch(function () {});
      } catch (e) {}
    }
    function flush(unload) {
      if (timer) { clearTimeout(timer); timer = null; }
      if (!on) return;
      while (queue.length) {
        var batch = queue.splice(0, 50);
        send(JSON.stringify({ v: 1, sid: sid, ctx: ctx(), events: batch }), unload);
      }
    }
    function track(n, props) {
      if (!on || sent >= CAP) return;
      var e = { n: n, t: Date.now(), q: seq++ };
      if (props) for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k) && props[k] !== undefined && props[k] !== null) e[k] = props[k];
      queue.push(e); sent++;
      if (queue.length >= 10) flush(false);
      else if (!timer) timer = setTimeout(function () { flush(false); }, 4000);
    }
    return { track: track, flush: flush, on: on, optOut: optOut };
  })();
  window.HXTrack = { flush: function () { HXT.flush(false); }, enabled: HXT.on };

  /* ---------------- routing wrappers ---------------- */
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function raceWeeks() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.race)) return 0;
    var p = state.race.split('-').map(Number);
    var race = new Date(p[0], p[1] - 1, p[2]);
    var t = new Date(); t = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    var days = Math.round((race - t) / 86400000);
    if (days < 1 || days > 730) return 0;
    return Math.max(1, Math.round(days / 7));
  }
  // First pass at removing personal details from the free-text note before it leaves the browser.
  // The collector scrubs again (server/collect-core.js scrubText), so this is defence in depth.
  function scrubNote(s) {
    return String(s)
      .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]')
      .replace(/(https?:\/\/|www\.)\S+/gi, '[link]')
      .replace(/\+?\d[\d\s().-]{5,}\d/g, '[number]')
      .replace(/\s+/g, ' ').trim().slice(0, 500);
  }
  function raceBucket(w) { return !w ? 'none' : w <= 4 ? '1-4' : w <= 11 ? '5-11' : w <= 23 ? '12-23' : '24+'; }
  function answers() { return { goal: state.goal, level: state.level, place: state.place, obst: state.obst, format: state.format }; }
  function answersEvt() {
    var a = { obst: state.obst.slice(), race: raceBucket(raceWeeks()) };
    ['goal', 'level', 'place', 'format'].forEach(function (k) { if (state[k]) a[k] = state[k]; });
    return a;
  }
  function route() {
    var r = RT.route(answers()), weeks = raceWeeks(), ex = RT.explain(answers(), DATA, { weeks: weeks });
    return {
      primaryId: r.primary, primary: CAT[r.primary], secondaryIds: r.secondary,
      secondary: r.secondary.map(function (id) { return CAT[id]; }),
      why: ex.why, chips: ex.chips, trace: r.trace, weeks: weeks
    };
  }

  /* ---------------- rendering ---------------- */
  function opt(k, v, cls, inner) {
    return '<button type="button" class="opt ' + cls + '" data-k="' + k + '" data-v="' + v + '" aria-pressed="false">' + inner + '</button>';
  }

  function renderStrip() {
    var st = state.step;
    if (st > 6) { elStrip.hidden = true; return; }
    elStrip.hidden = false;
    var h = '<div class="stn-row">';
    STATIONS.forEach(function (name, i) {
      var n = i + 1, cur = st === n, done = st > n, reach = n <= state.maxStep && !cur;
      h += '<button type="button" class="stn' + (cur ? ' cur' : done ? ' done' : '') + '" data-step="' + n + '"' + (cur ? ' aria-current="step"' : '') + (reach ? '' : ' disabled') +
        ' aria-label="Station ' + n + ' of 5, ' + esc(name) + '"><i></i><span>0' + n + ' · ' + esc(name) + '</span></button>';
    });
    h += '</div>';
    if (st <= 5) h += '<div class="stn-cap" aria-hidden="true">Station 0' + st + ' of 05 · ' + esc(STATIONS[st - 1]) + '</div>';
    elStrip.innerHTML = h;
  }

  function leftCol(st) {
    return '<div class="f-left"><span class="chip stn-chip">Station 0' + st + '</span><h2 class="h2" id="f-title" tabindex="-1">' + esc(STEPS[st].title) + '</h2><p class="f-help">' + esc(STEPS[st].help) + '</p></div>';
  }

  function privacyNote() {
    var P = COPY.privacy;
    if (!HXT.on) return esc(P.trackingOff);
    var t = esc(CONFIG.captureNote ? P.trackingOn : P.trackingOnNoNote);
    return t + (CONFIG.privacyHref ? ' <a class="ulink ulink--in" href="' + esc(CONFIG.privacyHref) + '" target="_blank" rel="noopener">' + esc(P.linkLabel) + '</a>' : '');
  }

  function renderQuestion(st) {
    var r = '';
    if (st === 1) {
      r = '<div class="opts opts--2 opts--goal">' + GOALS.map(function (g) {
        return opt('goal', g.id, 'opt--goal', '<span class="opt__t">' + esc(g.label) + '</span><span class="opt__s">' + esc(g.sub) + '</span>');
      }).join('') + '</div>';
    } else if (st === 2) {
      r = '<div class="f-grp" role="group" aria-labelledby="g-lvl"><div class="label" id="g-lvl">Your experience</div><div class="opts opts--2">' +
        LEVELS.map(function (l) { return opt('level', l.id, 'opt--lvl', esc(l.label)); }).join('') + '</div></div>' +
        '<div class="f-grp" role="group" aria-labelledby="g-plc"><div class="label" id="g-plc">Where you train</div><div class="opts opts--3">' +
        PLACES.map(function (p) { return opt('place', p.id, 'opt--plc', esc(p.label)); }).join('') + '</div></div>';
    } else if (st === 3) {
      r = '<div class="opts opts--2" role="group" aria-label="What has got in the way before? Choose as many as apply">' + OBSTS.map(function (o) {
        return opt('obst', o.id, 'opt--chk', '<span class="cb">' + ico('check') + '</span><span>' + esc(o.label) + '</span>');
      }).join('') + '</div>';
    } else if (st === 4) {
      r = '<div class="opts opts--2 opts--fmt">' + FORMATS.map(function (f) {
        return opt('format', f.id, 'opt--fmt', '<span class="opt__t">' + esc(f.label) + '</span><span class="opt__s">' + esc(f.sub) + '</span>');
      }).join('') + '</div>';
    } else {
      r = '<div class="f-narrow">' +
        '<div class="field"><label for="note">Anything else we should know?</label><textarea class="inp" id="note" rows="5" maxlength="500" placeholder="For example, your race, your weekly schedule or the equipment you have"></textarea></div>' +
        '<div class="field"><label for="race">Race date <span class="opt-txt">(optional)</span></label><input class="inp" id="race" type="date" min="' + todayISO() + '"></div>' +
        '<p class="f-note" id="f-privacy">' + privacyNote() + '</p></div>';
    }
    elBody.innerHTML = '<div class="f-grid">' + leftCol(st) + '<div class="f-right">' + r + '</div></div>';
    if (st === 5) {
      $('#note').value = state.note;
      $('#race').value = state.race;
    }
  }

  function coverHTML(c) {
    return '<div class="cover" aria-hidden="true"><span class="logo"></span><span class="cover__t">' + esc(c.title.toUpperCase()) + '</span><span class="label">' + esc(c.badge) + '</span></div>';
  }
  function extLink(c, id, slot) {
    return 'href="' + esc(c.href) + '" target="_blank" rel="noopener' + (c.affiliate ? ' sponsored' : '') + '" data-product="' + esc(id) + '" data-slot="' + slot + '"';
  }

  function fbHTML() {
    var F = COPY.feedback, fb = state.fb;
    var h = '<div class="fb" id="fb"><div class="label">' + esc(F.title) + '</div>';
    if (fb.sent) return h + '<p class="fb__thanks" role="status">' + esc(F.thanks) + '</p></div>';
    h += '<div class="fb__row">' + F.fit.map(function (o) {
      return '<button type="button" class="pill pill--btn" data-fb="' + o.id + '" aria-pressed="' + (fb.fit === o.id) + '">' + esc(o.label) + '</button>';
    }).join('') + '</div>';
    if (fb.fit === 'partly' || fb.fit === 'no') {
      h += '<div class="label fb__why" id="fb-why">' + esc(F.whyTitle) + '</div><div class="fb__row" role="group" aria-labelledby="fb-why">' + F.reasons.map(function (o) {
        return '<button type="button" class="pill pill--btn" data-fbr="' + o.id + '" aria-pressed="' + (fb.reasons.indexOf(o.id) > -1) + '">' + esc(o.label) + '</button>';
      }).join('') + '</div><button type="button" class="btn btn--line fb__send" data-act="fbsend">' + esc(F.send) + '</button>';
    }
    return h + '</div>';
  }
  function refreshFb(focusSel) {
    var el = $('#fb'); if (!el) return;
    el.outerHTML = fbHTML();
    if (focusSel) { var f = $(focusSel); if (f) f.focus({ preventScroll: true }); }
  }

  function renderResult() {
    var R = route(), p = R.primary;
    var h = '<div class="f-grid f-grid--res"><div class="f-left"><span class="chip">' + esc(COPY.result.chip) + '</span>' +
      '<h2 class="h2" id="f-title" tabindex="-1">' + esc(COPY.result.headPrefix) + ' <span class="ty">' + esc(p.head) + '.</span></h2>' +
      '<div class="chips">' + R.chips.map(function (c) { return '<span class="pill">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<p class="f-why">' + esc(R.why) + '</p>' +
      '<button type="button" class="ulink" data-act="restart">' + esc(COPY.result.changeAnswers) + '</button></div>' +
      '<div class="f-right"><div class="rcard">' + coverHTML(p) +
      '<div><div class="rcard__k">Best fit, ' + esc(p.kind.toLowerCase()) + '</div><div class="rcard__n">' + esc(p.title) + '</div><div class="rcard__m">' + esc(p.meta) + '</div>' +
      '<div class="rcard__a"><a class="btn" ' + extLink(p, R.primaryId, 'primary') + '>' + esc(p.cta) + ' ' + ico('arrow') + '</a><span>' + esc(p.price) + '</span></div></div></div>';
    if (R.secondary.length) {
      h += '<div class="label">' + esc(COPY.result.alsoUseful) + '</div>';
      R.secondary.forEach(function (s, i) {
        h += '<a class="sec2" ' + extLink(s, R.secondaryIds[i], 'secondary') + '><span><span class="k">' + esc(s.kind) + '</span><span class="t">' + esc(s.title) + '</span><span class="m">' + esc(s.meta) + '</span></span>' + ico('arrow') + '</a>';
      });
    }
    if (HXT.on) h += fbHTML();
    h += '</div></div>';
    elBody.innerHTML = h;
    // One result_view per distinct set of answers, not one per screen visit.
    var sig = JSON.stringify([answersEvt(), R.primaryId, R.secondaryIds]);
    if (sig !== resultSig) {
      resultSig = sig;
      state.fb = { fit: null, reasons: [], sent: false };
      HXT.track('result_view', { answers: answersEvt(), primary: R.primaryId, secondary: R.secondaryIds, trace: R.trace, weeks: R.weeks });
    }
  }

  function fieldHTML(id, label, type, extra, optional) {
    return '<div class="field"><label for="' + id + '">' + label + (optional ? ' <span class="opt-txt">(optional)</span>' : '') + '</label>' +
      (type === 'textarea'
        ? '<textarea class="inp" id="' + id + '" rows="4"' + (extra || '') + '></textarea>'
        : '<input class="inp" id="' + id + '" type="' + type + '"' + (extra || '') + '>') +
      '<div class="f-err" id="' + id + '-e" hidden></div></div>';
  }

  function renderTalk() {
    var T = COPY.talk;
    var back = state.talkFrom === 6 ? '<button type="button" class="ulink" data-act="toresult">Back to my result</button>' : '';
    var attach = state.goal
      ? '<label class="chk"><input type="checkbox" id="t-attach"><span>' + esc(T.attachLabel) + '</span></label>'
      : '';
    elBody.innerHTML = '<div class="f-grid"><div class="f-left"><span class="chip">' + esc(T.chip) + '</span>' +
      '<h2 class="h2" id="f-title" tabindex="-1">Tell us what you are <span class="ty">after.</span></h2>' +
      '<p class="f-help">' + esc(T.help) + '</p>' + back + '</div>' +
      '<form class="tcard" id="talkForm" novalidate>' +
      '<div class="row2">' + fieldHTML('t-name', 'Your name', 'text', ' autocomplete="name" required') + fieldHTML('t-email', 'Your email', 'email', ' autocomplete="email" required') + '</div>' +
      fieldHTML('t-goal', 'What are you training for?', 'text', ' required') +
      fieldHTML('t-week', 'What does your training week look like?', 'text', '', true) +
      fieldHTML('t-msg', 'What is getting in the way?', 'textarea', '', true) +
      attach +
      '<p class="f-note">' + esc(T.note) + '</p>' +
      '<div class="tcard__act"><div class="f-status" id="t-status" role="status" aria-live="polite"></div>' +
      '<button type="submit" class="btn btn--lg" id="t-send">Send message ' + ico('arrow') + '</button></div></form></div>';
    var t = state.talk;
    $('#t-name').value = t.name; $('#t-email').value = t.email; $('#t-goal').value = t.goal; $('#t-week').value = t.week; $('#t-msg').value = t.msg;
    var a = $('#t-attach'); if (a) a.checked = !!t.attach;
  }

  function renderSent() {
    var live = !!CONFIG.talkEndpoint, entry = CONFIG.mode === 'entry';
    elBody.innerHTML = '<div class="sent"><div class="sent__ok">' + ico('check') + '</div>' +
      (live
        ? '<h2 class="h2" id="f-title" tabindex="-1">Thank you. Your message is <span class="ty">with us.</span></h2><p>We will read what you have written and come back to you by email.</p>'
        : '<h2 class="h2" id="f-title" tabindex="-1">This is a preview. <span class="ty">Nothing was sent.</span></h2><p>On the live site this step sends your message to the HybridX team, who reply by email.</p>' +
          '<div class="demo">This copy of the page is not connected to an inbox yet. Set <strong>talkEndpoint</strong> in <strong>window.HX_CONFIG</strong> to go live.</div>') +
      '<div class="sent__btns">' + (state.resultReady ? '<button type="button" class="btn btn--line" data-act="toresult">Back to my result</button>' : '') +
      (entry ? '<button type="button" class="btn" data-act="continue">' + esc(COPY.entry.continueLabel) + '</button>' : '<button type="button" class="btn" data-act="close">Back to homepage</button>') + '</div></div>';
  }

  function renderFoot() {
    var s = state.step, h = '';
    elFoot.hidden = s >= 7;
    if (s <= 5) {
      h = '<div class="f-foot__l">' + (s > 1 ? '<button type="button" class="btn btn--line" data-act="back">Back</button>' : '') + '</div>' +
        '<div class="f-foot__r"><span class="f-hint" id="f-hint"></span><button type="button" class="btn" id="f-next" data-act="next">' + (s === 5 ? 'See my plan' : 'Continue') + ' ' + ico('arrow') + '</button></div>';
    } else if (s === 6) {
      h = '<span class="f-q">' + esc(COPY.result.noFit) + '</span><div class="f-foot__r"><button type="button" class="btn btn--ghost" data-act="talk">' + esc(COPY.result.talkCta) + '</button>' +
        (CONFIG.mode === 'entry' ? '<button type="button" class="btn" data-act="continue">' + esc(COPY.entry.continueLabel) + ' ' + ico('arrow') + '</button>' : '') + '</div>';
    }
    elFoot.innerHTML = h;
  }

  function canNext() {
    var s = state.step;
    if (s === 1) return !!state.goal;
    if (s === 2) return !!(state.level && state.place);
    if (s === 4) return !!state.format;
    return true;
  }

  function sync() {
    $$('.opt[data-k]', elBody).forEach(function (b) {
      var k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
      var on = k === 'obst' ? state.obst.indexOf(v) > -1 : state[k] === v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var next = $('#f-next');
    if (next) {
      var ok = canNext();
      next.setAttribute('aria-disabled', ok ? 'false' : 'true');
      var hint = $('#f-hint'); if (hint) hint.textContent = ok ? '' : (STEPS[state.step].hint || '');
    }
    var sk = $('#f-skip'); if (sk) sk.hidden = state.step > 5;
  }

  function render(focus) {
    var s = state.step;
    renderStrip();
    if (s <= 5) { renderQuestion(s); stepAt = Date.now(); HXT.track('q_view', { step: s }); }
    else if (s === 6) renderResult();
    else if (s === 7) renderTalk();
    else renderSent();
    renderFoot();
    sync();
    elBody.scrollTop = 0;
    if (focus) { var t = $('#f-title'); if (t) t.focus({ preventScroll: true }); }
  }

  /* ---------------- navigation ---------------- */
  // Send the answers for the step the visitor is leaving. One event per answer.
  function commitStep(s) {
    var ms = Date.now() - stepAt, used = false;
    function ev(key, value) {
      var p = { step: s, key: key, value: value };
      if (!used) { p.ms = Math.min(ms, 3600000); used = true; }
      HXT.track('q_answer', p);
    }
    if (s === 1 && state.goal) ev('goal', state.goal);
    if (s === 2) { if (state.level) ev('level', state.level); if (state.place) ev('place', state.place); }
    if (s === 3 && state.obst.length) ev('obst', state.obst.slice());
    if (s === 4 && state.format) ev('format', state.format);
    if (s === 5) {
      if (CONFIG.captureNote && state.note.trim()) ev('note', scrubNote(state.note));
      var b = raceBucket(raceWeeks()); if (b !== 'none') ev('race', b);
    }
  }

  function go(n, focus) {
    var from = state.step;
    if (from <= 5 && n > from && n <= 6 && dlg.open) commitStep(from);
    if (n === 7) {
      if (state.step !== 7) {
        state.talkFrom = (state.step === 6 || (state.step === 8 && state.resultReady)) ? 6 : null;
        HXT.track('talk_open', { from: pendingTalkFrom || (state.talkFrom === 6 ? 'result' : 'dialog') });
        pendingTalkFrom = null;
      }
      if (!state.talkPrefilled) {
        state.talkPrefilled = true;
        if (!state.talk.goal && state.goal) state.talk.goal = by(GOALS, state.goal).label;
        if (!state.talk.msg && state.note) state.talk.msg = state.note;
      }
    }
    state.step = n;
    if (n <= 5) state.maxStep = Math.max(state.maxStep, n);
    if (n === 6) { state.resultReady = true; state.maxStep = 5; }
    render(focus !== false);
    writeHash();
  }

  function openFinder(o) {
    o = o || {};
    if (o.goal) state.goal = o.goal;
    if (o.place) state.place = o.place;
    if (o.obst) o.obst.forEach(function (x) { if (state.obst.indexOf(x) === -1) state.obst = state.obst.filter(function (y) { return y !== 'none'; }).concat([x]); });
    var step = o.step || state.step;
    if (!o.step && step >= 7) step = state.resultReady ? 6 : 1;
    lastFocus = document.activeElement;
    openedAt = Date.now(); closeReason = 'button';
    HXT.track('finder_open', { source: o.source || 'entry', step: Math.min(step, 8) });
    // A tile or story prompt answers a question before the dialog opens: record it too.
    if (o.goal) HXT.track('q_answer', { step: 1, key: 'goal', value: o.goal });
    if (o.place) HXT.track('q_answer', { step: 2, key: 'place', value: o.place });
    if (o.obst && o.obst.length) HXT.track('q_answer', { step: 3, key: 'obst', value: o.obst.slice() });
    if (o.step === 7) {
      pendingTalkFrom = o.source === 'nav' ? 'nav' : 'band';
      go(7, false);
    } else {
      state.step = step;
      if (step <= 5) state.maxStep = Math.max(state.maxStep, step);
      render(false);
    }
    document.documentElement.classList.add('lock');
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else { dlg.setAttribute('open', ''); }
    var t = $('#f-title'); if (t) t.focus({ preventScroll: true });
  }

  function closeFinder() {
    if (typeof dlg.close === 'function') { if (dlg.open) dlg.close(); }
    else { dlg.removeAttribute('open'); afterClose(); }
  }
  function afterClose() {
    HXT.track('dialog_close', { step: Math.min(state.step, 8), reason: closeReason, result: state.resultReady, ms: Math.min(Date.now() - openedAt, 3600000) });
    closeReason = 'button';
    document.documentElement.classList.remove('lock');
    clearHash();
    var target = focusAfterClose || lastFocus;
    if (focusAfterClose) window.scrollTo(0, 0);
    focusAfterClose = null;
    if (target && target.focus) { try { target.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ---------------- entry funnel: skip and continue ---------------- */
  var STORE_KEY = 'hx_entry';
  function remember(v) { try { sessionStorage.setItem(STORE_KEY, v); } catch (e) {} }
  function remembered() { try { return sessionStorage.getItem(STORE_KEY); } catch (e) { return null; } }

  function toHomepage() {
    var home = $('#hx-home');
    if (entryEl) entryEl.hidden = true;
    window.scrollTo(0, 0);
    if (dlg && dlg.open) focusAfterClose = home;
    else if (home) home.focus({ preventScroll: true });
    if (dlg && dlg.open) closeFinder();
  }
  function skip(from) {
    HXT.track('entry_skip', { from: from, step: dlg && dlg.open ? Math.min(state.step, 8) : 0, ms: Math.min(Date.now() - loadedAt, 3600000) });
    remember('skipped');
    toHomepage();
    showSkipWhy();
  }
  function continueToHomepage() {
    HXT.track('cta_click', { id: 'continue-to-homepage', kind: 'hero' });
    remember('done');
    toHomepage();
  }

  function showSkipWhy() {
    var box = $('#hx-skipwhy');
    if (!box || !HXT.on) return;
    box.hidden = false;
  }
  function initSkipWhy() {
    var box = $('#hx-skipwhy');
    if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-why],[data-why-close]');
      if (!b) return;
      if (b.hasAttribute('data-why-close')) { box.hidden = true; return; }
      HXT.track('skip_reason', { reason: b.getAttribute('data-why') });
      box.innerHTML = '<div class="wrap skipwhy__in"><span role="status">' + esc(COPY.skipWhy.thanks) + '</span><button type="button" class="ulink" data-why-close>' + esc(COPY.skipWhy.dismiss) + '</button></div>';
    });
  }

  /* ---------------- shareable result in the URL hash ---------------- */
  function writeHash() {
    if (state.step !== 6) return;
    try {
      var h = '#plan=' + [state.goal || '-', state.level || '-', state.place || '-', state.obst.join('+') || '-', state.format || '-', state.race || '-'].join('.');
      history.replaceState(null, '', h);
    } catch (e) {}
  }
  function clearHash() {
    try { if (/^#plan=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }
  function readHash() {
    var m = /^#plan=([^.]+)\.([^.]+)\.([^.]+)\.([^.]+)\.([^.]+)\.([^.]+)$/.exec(location.hash || '');
    if (!m) return false;
    var goal = by(GOALS, m[1]), level = by(LEVELS, m[2]), place = by(PLACES, m[3]), format = by(FORMATS, m[5]);
    if (!goal || !level || !place || !format) return false;
    var ob = m[4] === '-' ? [] : m[4].split('+').filter(function (x) { return by(OBSTS, x); });
    state.goal = goal.id; state.level = level.id; state.place = place.id; state.format = format.id; state.obst = ob;
    state.race = /^\d{4}-\d{2}-\d{2}$/.test(m[6]) ? m[6] : '';
    state.maxStep = 5; state.resultReady = true; state.step = 6;
    return true;
  }

  /* ---------------- events ---------------- */
  function pick(k, v) {
    if (k === 'obst') {
      var i = state.obst.indexOf(v);
      if (i > -1) state.obst.splice(i, 1);
      else if (v === 'none') state.obst = ['none'];
      else state.obst = state.obst.filter(function (x) { return x !== 'none'; }).concat([v]);
    } else {
      state[k] = v;
    }
    sync();
    if ((k === 'goal' && state.step === 1) || (k === 'format' && state.step === 4)) {
      var from = state.step;
      var to = from + 1;
      setTimeout(function () { if (state.step === from && dlg.open) go(to); }, reduce ? 0 : 200);
    }
  }

  function setErr(id, msg) {
    var box = $('#' + id + '-e'), f = $('#' + id);
    if (!box || !f) return;
    if (msg) { box.hidden = false; box.innerHTML = '<b aria-hidden="true">!</b><span>' + esc(msg) + '</span>'; f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', id + '-e'); }
    else { box.hidden = true; box.innerHTML = ''; f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); }
  }
  function answersText() {
    var R = route();
    return R.chips.join(' | ') + ' | Recommended: ' + R.primary.title;
  }

  function initFinder() {
    dlg.addEventListener('click', function (e) {
      var pl = e.target.closest('a[data-product]');
      if (pl && dlg.contains(pl)) {
        HXT.track('result_click', { product: pl.getAttribute('data-product'), slot: pl.getAttribute('data-slot'), dest: CAT[pl.getAttribute('data-product')].destinationType, affiliate: !!CAT[pl.getAttribute('data-product')].affiliate });
        if (pl.target !== '_blank') HXT.flush(true);
        return;
      }
      var t = e.target.closest('[data-k],[data-act],[data-step],[data-skip],[data-fb],[data-fbr]');
      if (!t || !dlg.contains(t)) return;
      if (t.hasAttribute('data-k')) { pick(t.getAttribute('data-k'), t.getAttribute('data-v')); return; }
      if (t.hasAttribute('data-step')) { var to = parseInt(t.getAttribute('data-step'), 10); HXT.track('q_jump', { from: Math.min(state.step, 8), to: to }); go(to); return; }
      if (t.hasAttribute('data-skip')) { skip(t.getAttribute('data-skip')); return; }
      if (t.hasAttribute('data-fb')) {
        var fit = t.getAttribute('data-fb');
        state.fb.fit = fit;
        if (fit === 'yes') { state.fb.sent = true; HXT.track('result_feedback', { fit: 'yes' }); refreshFb(); }
        else refreshFb('[data-fb][aria-pressed=true]');
        return;
      }
      if (t.hasAttribute('data-fbr')) {
        var r = t.getAttribute('data-fbr'), i = state.fb.reasons.indexOf(r);
        if (i > -1) state.fb.reasons.splice(i, 1); else state.fb.reasons.push(r);
        t.setAttribute('aria-pressed', i > -1 ? 'false' : 'true');
        return;
      }
      var a = t.getAttribute('data-act');
      if (a === 'close') { closeReason = 'button'; closeFinder(); }
      else if (a === 'back') { HXT.track('q_back', { step: Math.min(state.step, 8) }); go(Math.max(1, state.step - 1)); }
      else if (a === 'next') { if (canNext()) go(Math.min(6, state.step + 1)); }
      else if (a === 'restart') { HXT.track('result_restart'); go(1); }
      else if (a === 'talk') go(7);
      else if (a === 'toresult') go(6);
      else if (a === 'continue') continueToHomepage();
      else if (a === 'fbsend') {
        state.fb.sent = true;
        HXT.track('result_feedback', { fit: state.fb.fit, reasons: state.fb.reasons.slice() });
        refreshFb();
      }
    });
    dlg.addEventListener('input', function (e) {
      var id = e.target.id;
      if (id === 'note') state.note = e.target.value;
      else if (id === 'race') state.race = e.target.value;
      else if (id === 't-name') state.talk.name = e.target.value;
      else if (id === 't-email') state.talk.email = e.target.value;
      else if (id === 't-goal') state.talk.goal = e.target.value;
      else if (id === 't-week') state.talk.week = e.target.value;
      else if (id === 't-msg') state.talk.msg = e.target.value;
      if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') setErr(id, '');
    });
    dlg.addEventListener('change', function (e) {
      if (e.target.id === 't-attach') state.talk.attach = e.target.checked;
    });
    dlg.addEventListener('cancel', function () { closeReason = 'esc'; });
    dlg.addEventListener('close', afterClose);

    dlg.addEventListener('submit', function (e) {
      if (e.target.id !== 'talkForm') return;
      e.preventDefault();
      var t = state.talk, first = null, bad = false, badFields = [];
      function chk(id, ok, msg, name) { setErr(id, ok ? '' : msg); if (!ok) { if (!first) first = id; bad = true; badFields.push(name); } }
      chk('t-name', t.name.trim().length > 0, 'Please tell us your name.', 'name');
      chk('t-email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.email.trim()), 'Please enter an email address we can reply to.', 'email');
      chk('t-goal', t.goal.trim().length > 0, 'Please tell us what you are training for.', 'goal');
      var status = $('#t-status');
      if (bad) { HXT.track('talk_invalid', { fields: badFields }); status.textContent = 'Please check the highlighted fields.'; $('#' + first).focus(); return; }
      status.textContent = '';
      var attached = !!(state.goal && t.attach);
      // Personal details go to the talk endpoint only. The tracker never sees them, and the
      // payload carries no visit id, so a lead cannot be joined to a tracked visit.
      var payload = {
        name: t.name.trim(), email: t.email.trim(), goal: t.goal.trim(), week: t.week.trim(), message: t.msg.trim(),
        answers: attached ? answersText() : null,
        plan: attached ? { answers: answersEvt(), recommended: route().primaryId } : null,
        source: 'hybridx.club/' + CONFIG.mode
      };
      var btn = $('#t-send');
      var done = function () {
        state.talk = { name: '', email: '', goal: '', week: '', msg: '', attach: true };
        state.talkPrefilled = false;
        go(8);
      };
      if (!CONFIG.talkEndpoint) { done(); return; }
      btn.setAttribute('aria-disabled', 'true'); btn.firstChild.nodeValue = 'Sending… ';
      fetch(CONFIG.talkEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error('bad status'); HXT.track('talk_submit', { ok: true, attached: attached }); done(); })
        .catch(function () {
          HXT.track('talk_submit', { ok: false, attached: attached });
          btn.removeAttribute('aria-disabled'); btn.firstChild.nodeValue = 'Send message ';
          status.textContent = 'Sorry, your message did not send. Please try again in a moment.';
        });
    });

    /* page triggers: tiles, story prompts, nav button, talk band */
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-open],[data-goal],[data-prompt]');
      if (!t || dlg.contains(t)) return;
      var src = t.classList.contains('tile') ? 'tile' : t.hasAttribute('data-prompt') ? 'prompt' : t.closest('.nav') ? 'nav' : t.getAttribute('data-open') === 'talk' ? 'band' : 'section';
      if (t.hasAttribute('data-goal')) { openFinder({ goal: t.getAttribute('data-goal'), step: 2, source: src }); return; }
      if (t.hasAttribute('data-prompt')) {
        var p = t.getAttribute('data-prompt');
        if (p === 'first' || p === 'faster') openFinder({ goal: p, step: 2, source: src });
        else if (p === 'run') openFinder({ obst: ['run'], step: state.goal ? 2 : 1, source: src });
        else if (p === 'home') openFinder({ place: 'home', step: state.goal ? 2 : 1, source: src });
        return;
      }
      if (t.getAttribute('data-open') === 'talk') openFinder({ step: 7, source: src });
      else openFinder({ source: src });
    });
  }

  /* ---------------- entry skip link (works with or without the dialog) ---------------- */
  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-skip="bar"]');
    if (!s) return;
    e.preventDefault();
    skip('bar');
  });

  /* ---------------- page-level tracking: what attracts and what puts people off ---------------- */
  function initPageTracking() {
    if (!HXT.on) return;
    var maxPct = 0, marks = [25, 50, 75, 100], next = 0, ticking = false, hideSent = false;

    // sections reached
    if ('IntersectionObserver' in window) {
      var seen = {};
      // A section counts as reached when 40% of it, or 40% of the screen, shows it.
      var io = new IntersectionObserver(function (list) {
        list.forEach(function (en) {
          if (!en.isIntersecting) return;
          var vh = (en.rootBounds && en.rootBounds.height) || window.innerHeight;
          if (en.intersectionRatio < 0.4 && en.intersectionRect.height < vh * 0.4) return;
          var id = slug(en.target.getAttribute('data-track-section') || en.target.id, 40);
          if (id && !seen[id]) { seen[id] = 1; HXT.track('section_view', { id: id }); }
        });
      }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1] });
      $$('main section[id], [data-track-section]').forEach(function (el) { io.observe(el); });
    }

    // scroll depth
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var de = document.documentElement, total = de.scrollHeight || 1;
        var pct = Math.min(100, ((window.pageYOffset || de.scrollTop) + (window.innerHeight || de.clientHeight)) / total * 100);
        if (pct > maxPct) maxPct = pct;
        while (next < marks.length && pct >= (marks[next] === 100 ? 98 : marks[next])) { HXT.track('scroll_depth', { pct: marks[next] }); next++; }
      });
    }, { passive: true });

    // link clicks outside the dialog
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a || (dlg && dlg.contains(a)) || a.hasAttribute('data-skip')) return;
      var href = a.getAttribute('href') || '';
      if (!/^(https?:)?\/\//i.test(href) && href.charAt(0) !== '/') return;
      var kind = a.closest('.nav,.nav__panel') ? 'nav' : a.closest('.foot') ? 'footer' : a.closest('.tool,.tools__all') ? 'tool' : a.closest('.qcard') ? 'startToday' : a.closest('.hero') ? 'hero' : 'section';
      var path = (a.pathname || '').split('/').filter(Boolean).pop() || a.hostname;
      HXT.track('cta_click', { id: slug(a.getAttribute('data-track') || path, 40) || 'link', kind: kind, host: (a.hostname || '').toLowerCase() });
      if (a.target !== '_blank') HXT.flush(true);
    });

    // FAQ opens (toggle does not bubble, so listen in the capture phase)
    document.addEventListener('toggle', function (e) {
      var d = e.target;
      if (d && d.matches && d.matches('details.qa') && d.open) HXT.track('faq_open', { i: $$('details.qa').indexOf(d) });
    }, true);

    // leaving
    function onHide() {
      if (!hideSent) {
        hideSent = true;
        HXT.track('page_hide', { ms: Math.min(Math.round(performance.now()), 86400000), scroll: Math.round(maxPct), step: dlg && dlg.open ? Math.min(state.step, 8) : 0, result: state.resultReady });
      }
      HXT.flush(true);
    }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') onHide(); });
    window.addEventListener('pagehide', onHide);
  }

  /* ---------------- small page bits ---------------- */
  var tick = $('[data-privacy-tick]');
  if (tick) tick.textContent = HXT.on ? COPY.privacy.tickOn : COPY.privacy.tickOff;

  var mb = $('#menuBtn'), mp = $('#menuPanel');
  if (mb && mp) {
    mb.addEventListener('click', function () {
      var open = mp.hidden;
      mp.hidden = !open;
      mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mp.addEventListener('click', function (e) { if (e.target.closest('a')) { mp.hidden = true; mb.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mp.hidden) { mp.hidden = true; mb.setAttribute('aria-expanded', 'false'); mb.focus(); } });
  }

  /* on hybridx.club itself, open own links in the same tab */
  if (/(^|\.)hybridx\.club$/.test(location.hostname)) {
    $$('a[target="_blank"]').forEach(function (a) {
      if (CONFIG.ownHosts.test(a.href)) { a.removeAttribute('target'); a.removeAttribute('rel'); }
    });
  }

  /* ---------------- start ---------------- */
  HXT.track('page_view');
  var shared = false;
  if (dlg) {
    initFinder();
    shared = readHash();
  }
  if (entryEl) {
    initSkipWhy();
    var bypass = /[?&]entry=off(&|$)/.test(location.search) || !!remembered();
    if (bypass) entryEl.hidden = true;
    else HXT.track('entry_shown');
  }
  initPageTracking();
  if (shared) openFinder({ step: 6, source: 'hash' });
})();
