/* ═══════════════════════════════════════════════════════════════════════
   Intentional YouTube — interactive case study
   Plain ES5-compatible JS. No modules, so it works over file:// too.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var TOTAL = 7;

  /* Which step holds the Double Diamond. It is the one screen with sub-steps,
     so several places need to know about it. Kept as a constant because it has
     already moved once — it was step 3, it is now step 6 — and three separate
     hardcoded 2s had to be found and changed by hand when it did. */
  var DIAMOND = 5;

  var screens     = [].slice.call(document.querySelectorAll('.screen'));
  var stepsWrap   = document.getElementById('trackerSteps');
  var countEl     = document.getElementById('trackerCount');
  var progressFil = document.getElementById('progressFill');
  var live        = document.getElementById('liveRegion');
  var backBtn     = document.getElementById('backBtn');
  var outro       = document.getElementById('outro');

  var current     = 0;
  var maxReached  = 0;
  var stage       = 0;   // double-diamond stage, 0..4

  var calm = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  /* ──────────────────────────────────────────────── Views ─────────
     Two top-level views share the page: the landing page and the
     Intentional YouTube case study. Both are <main>, so the inactive one
     carries the `hidden` attribute rather than only being display:none. */

  var homeEl  = document.getElementById('home');
  var stageEl = document.getElementById('stage');

  /* Looks the elements up each time rather than closing over variables that are
     declared further down this file — this runs during start-up, before those
     assignments have happened. */
  function closeOverlays() {
    var ab = document.getElementById('about');
    var wk = document.getElementById('work');
    var ou = document.getElementById('outro');
    if (ab && !ab.hidden) ab.hidden = true;
    if (wk && !wk.hidden) wk.hidden = true;
    if (ab || wk) document.body.classList.remove('about-open');
    if (ou && !ou.hidden) ou.hidden = true;
  }

  function setView(name) {
    document.body.setAttribute('data-view', name);
    homeEl.hidden  = name !== 'home';
    stageEl.hidden = name !== 'study';

    /* The About page and the outro are full-screen layers that sit above both
       <main>s, so swapping which main is hidden does nothing on its own — the
       overlay just keeps covering the page and the nav looks broken. Closing
       them here means every route into a view leaves the same clean state,
       rather than each caller having to remember. */
    closeOverlays();

    window.scrollTo(0, 0);

    if (name === 'study') {
      // The mockups could not be measured while the stage was hidden.
      fitMocks();
      live.textContent = 'Intentional YouTube case study. Step ' +
        (current + 1) + ' of ' + TOTAL + '.';
    } else {
      live.textContent = 'Portfolio home.';
    }
  }

  /* ───────────────────────────────────────────────── Navigation ─── */

  function render() {
    screens.forEach(function (s, i) {
      var on = i === current;
      s.hidden = !on;
      s.classList.remove('is-live');
      if (on) {
        void s.offsetWidth;          // restart the entrance animation
        s.classList.add('is-live');
      }
    });

    // Progress: the diamond screen also counts its four stages.
    var p = current === DIAMOND
      ? (DIAMOND + stage / 4) / (TOTAL - 1)
      : current / (TOTAL - 1);
    progressFil.style.transform = 'scaleX(' + p + ')';

    [].forEach.call(stepsWrap.children, function (li, i) {
      var b = li.firstChild;
      var state = i < current ? 'done' : i === current ? 'current' : 'todo';
      b.setAttribute('data-state', state);
      b.textContent = state === 'done' ? '✓' : String(i + 1);
      b.disabled = i > maxReached;
      b.setAttribute('aria-current', i === current ? 'step' : 'false');
    });

    var left = TOTAL - 1 - current;
    countEl.innerHTML = 'Step <b>' + (current + 1) + '</b> of <b>' + TOTAL + '</b>' +
      (left > 0 ? ' &middot; ' + left + ' to go' : ' &middot; last one');

    backBtn.hidden = current === 0;
    /* One button, relocated into whichever step is showing, so it sits under
       that step's copy instead of floating in the viewport corner. Moving it
       beats one button per screen: the click handler and hidden state stay in
       a single place. */
    if (!backBtn.hidden) {
      var textCol = screens[current].querySelector('.col--text');
      if (textCol && backBtn.parentNode !== textCol) textCol.appendChild(backBtn);
    }
    live.textContent = 'Step ' + (current + 1) + ' of ' + TOTAL + ': ' +
      screens[current].getAttribute('aria-label') + '. ' +
      (left > 0 ? left + ' steps remaining.' : 'Final step.');

    fitMocks();
  }

  function goTo(n) {
    current = Math.max(0, Math.min(TOTAL - 1, n));
    maxReached = Math.max(maxReached, current);
    render();
    // The game is the one screen where the payoff (an emoji bouncing into
    // a slot) happens below the fold, so centre it instead of jumping to top.
    if (current === TOTAL - 1 && gameEl) {
      gameEl.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }

  function advance() { goTo(current + 1); }

  function back() {
    if (current === DIAMOND && stage > 0) { setStage(stage - 1); return; }
    if (current === DIAMOND) stage = 0;
    goTo(current - 1);
  }

  // Any element carrying data-advance moves the story forward.
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-advance]');
    if (t) advance();
  });

  // data-goto switches between the landing page, the case study and About.
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-goto]');
    if (!t) return;
    var to = t.getAttribute('data-goto');

    if (to === 'about') { openAbout(); return; }
    if (to === 'study') {
      // Coming back after finishing means starting the story over.
      if (!outro.hidden) { outro.hidden = true; resetStory(); }
      setView('study');
      return;
    }
    setView('home');
  });

  backBtn.addEventListener('click', back);

  // Build the tracker
  for (var i = 0; i < TOTAL; i++) {
    var li = document.createElement('li');
    var b  = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label',
      'Step ' + (i + 1) + ' of ' + TOTAL + ': ' + screens[i].dataset.title);
    b.title = screens[i].dataset.title;
    (function (n) { b.addEventListener('click', function () { goTo(n); }); })(i);
    li.appendChild(b);
    stepsWrap.appendChild(li);
  }

  // Arrow keys, for people who'd rather not hunt for the hotspot.
  document.addEventListener('keydown', function (e) {
    /* `document` itself can be the target, and it has no .matches — calling it
       blind throws and takes arrow-key navigation down with it. */
    if (e.target && e.target.matches && e.target.matches('input, textarea')) return;
    if (!document.getElementById('about').hidden) return;   // dialog owns the keys
    if (e.key === 'ArrowRight' && current < maxReached) goTo(current + 1);
    if (e.key === 'ArrowLeft') back();
  });

  /* ──────────────────────────────────────── Scale the mockups ─── */
  /* Each mock is authored at a fixed 640x400 and scaled to whatever
     the laptop screen ends up being. One transform, no reflow.      */

  var mocks = [].slice.call(document.querySelectorAll('[data-mock]'));

  function fitMocks() {
    mocks.forEach(function (m) {
      var box = m.parentNode;                       // .laptop__viewport
      var w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      var s = Math.min(w / 640, h / 400);
      var x = (w - 640 * s) / 2;
      var y = (h - 400 * s) / 2;
      m.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
      // Lets .m-hot::before undo the scale, so touch targets stay >=46px.
      m.style.setProperty('--inv', 1 / s);
    });
  }

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(fitMocks);
    mocks.forEach(function (m) { ro.observe(m.parentNode); });
  } else {
    window.addEventListener('resize', fitMocks);
  }
  window.addEventListener('load', fitMocks);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMocks);

  /* ─────────────────────────────────────────── Double Diamond ─── */

  var STAGES = ['Discover', 'Define', 'Develop', 'Deliver'];
  var TRIS = [
    '0,100 150,0 150,200',
    '150,0 300,100 150,200',
    '300,100 450,0 450,200',
    '450,0 600,100 450,200'
  ];
  var LABEL_X = [75, 217, 383, 517];

  /* What each phase of the Double Diamond does. */
  /* Index = the stage currently highlighted on the diagram, so entry 0 describes
     Discover while Discover is the orange one. The old array began with a
     "click Discover" prompt, which pushed every description one place along —
     Define lit up while the text still described Discover. The last entry is
     the state after all four have been walked through. */
  var DIAMOND_TEXT = [
    '<b>Discover</b> — gather information and brainstorm design directions.',
    '<b>Define</b> — narrow down ideas and clarify the user need.',
    '<b>Develop</b> — brainstorm ideas and build multiple prototypes.',
    '<b>Deliver</b> — narrow down on final features and final prototype by user testing and iterating.',
    'All four stages, walked through — each one widening or narrowing on purpose.'
  ];

  var svg     = document.getElementById('diamond');
  var ddText  = document.getElementById('diamondText');
  var ddShot  = document.getElementById('interviewShot');
  var ddNote  = document.getElementById('discoverNote');
  var ddCta   = document.getElementById('diamondCta');
  var NS      = 'http://www.w3.org/2000/svg';

  var stageEls = TRIS.map(function (pts, i) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'dd__stage');

    var tri = document.createElementNS(NS, 'polygon');
    tri.setAttribute('points', pts);
    tri.setAttribute('class', 'dd__tri');
    g.appendChild(tri);

    var num = document.createElementNS(NS, 'text');
    num.setAttribute('x', LABEL_X[i]); num.setAttribute('y', 103);
    num.setAttribute('text-anchor', 'middle');
    num.setAttribute('dominant-baseline', 'middle');
    num.setAttribute('class', 'dd__num');
    num.textContent = i + 1;
    g.appendChild(num);

    var lab = document.createElementNS(NS, 'text');
    lab.setAttribute('x', LABEL_X[i]); lab.setAttribute('y', 232);
    lab.setAttribute('text-anchor', 'middle');
    lab.setAttribute('class', 'dd__label');
    lab.textContent = STAGES[i];
    g.appendChild(lab);

    var mark = document.createElementNS(NS, 'text');
    mark.setAttribute('x', LABEL_X[i]); mark.setAttribute('y', 173);
    mark.setAttribute('text-anchor', 'middle');
    mark.setAttribute('class', 'dd__mark');
    g.appendChild(mark);

    g.addEventListener('click', function () { if (i === stage) setStage(stage + 1); });
    svg.appendChild(g);
    return { g: g, mark: mark };
  });

  // A keyboard path that does not depend on clicking SVG shapes.
  var ddKeys = document.createElement('div');
  ddKeys.className = 'sr-only';
  STAGES.forEach(function (name, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Open stage ' + (i + 1) + ': ' + name;
    b.addEventListener('click', function () { if (i === stage) setStage(stage + 1); });
    ddKeys.appendChild(b);
  });
  svg.parentNode.insertBefore(ddKeys, svg.nextSibling);

  function setStage(n) {
    stage = Math.max(0, Math.min(4, n));
    stageEls.forEach(function (o, i) {
      var state = i < stage ? 'done' : i === stage ? 'next' : 'idle';
      o.g.setAttribute('class', 'dd__stage dd__stage--' + state);
      o.mark.textContent = state === 'done' ? '✓' : state === 'next' ? 'tap' : '';
    });
    ddText.innerHTML = DIAMOND_TEXT[stage];
    /* Stage 0 is Discover now. The opening research quote and the interview
       photo are both Discover's evidence, so they appear with it and nowhere
       else — Define, Develop and Deliver each show their line alone. */
    ddShot.hidden = stage !== 0;
    if (ddNote) ddNote.hidden = stage !== 0;
    ddCta.hidden  = stage !== 4;
    [].forEach.call(ddKeys.children, function (b, i) { b.disabled = i !== stage; });

    var p = (DIAMOND + stage / 4) / (TOTAL - 1);
    if (current === DIAMOND) progressFil.style.transform = 'scaleX(' + p + ')';
  }

  setStage(0);

  /* ──────────────────────────────────────────────── Emoji game ─── */

  /* Four hard feelings and four good ones, alternating.
     NOTE: the extension itself only offers difficult emotions, so these are no
     longer all "real options from the extension" — the copy on this screen was
     changed to match. Do not put that claim back without adding the positive
     options to the product first. */
  var IDEAS = [
    { e: '😟', label: 'Anxious' },
    { e: '🤩', label: 'Excited' },
    { e: '😑', label: 'Bored' },
    { e: '😌', label: 'Calm' },
    { e: '🤔', label: 'Procrastinating' },
    { e: '🧐', label: 'Curious' },
    { e: '😴', label: 'Tired' },
    { e: '😊', label: 'Happy' }
  ];
  var SPOTS = [[10,20],[31,36],[55,14],[78,30],[19,74],[44,84],[68,64],[88,78]];

  var gameEl  = document.getElementById('game');
  var sky     = document.getElementById('sky');
  var holes   = document.getElementById('holes');
  var gameWin = document.getElementById('gameWin');
  var gameTxt = document.getElementById('gameText');
  var landed  = 0;
  var busy    = false;

  function buildGame() {
    /* A mid-flight orb lives on <body>, not in the sky, so clearing the sky
       alone would leave it stranded on screen after a restart. */
    [].forEach.call(document.querySelectorAll('.orb'), function (o) { o.remove(); });

    sky.innerHTML = '';
    holes.innerHTML = '';
    gameWin.hidden = true;
    landed = 0;
    busy = false;

    IDEAS.forEach(function (item, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'orb';
      b.textContent = item.e;
      b.setAttribute('aria-label', 'Catch "' + item.label + '"');
      b.style.left  = SPOTS[i][0] + '%';
      b.style.top   = SPOTS[i][1] + '%';
      b.style.setProperty('--dur',   (2.4 + i * 0.35) + 's');
      b.style.setProperty('--delay', (i * 0.18) + 's');
      b.addEventListener('click', function () { land(b, item); });
      sky.appendChild(b);

      var slot = document.createElement('div');
      slot.className = 'slot';
      var h = document.createElement('div');
      h.className = 'hole';
      var lab = document.createElement('span');
      lab.className = 'slot__lab';
      slot.appendChild(h);
      slot.appendChild(lab);
      holes.appendChild(slot);
    });
  }

  /* A real reflection off the window edges, the way a pinball behaves: travel
     in a straight line until a wall is hit, invert that axis, repeat. Returns
     the bounce points in viewport coordinates.

     `seed` is the number already landed, so each flight leaves at a different
     angle and no two look alike — but it stays deterministic rather than
     random, which means a flight can be reproduced when debugging. */
  function bouncePath(cx, cy, seed, bounces) {
    var pad = 34;                                  // keep the orb fully on-screen
    var maxX = window.innerWidth  - pad, minX = pad;
    var maxY = window.innerHeight - pad, minY = pad;

    // Launch upward at a varying angle, alternating left/right.
    var deg = -(38 + (seed * 29) % 44);
    var rad = deg * Math.PI / 180;
    var vx  = Math.cos(rad) * (seed % 2 === 0 ? 1 : -1);
    var vy  = Math.sin(rad);

    var x = cx, y = cy, pts = [];
    for (var i = 0; i < bounces; i++) {
      // Distance along the current heading to each wall; the nearer one wins.
      var tx = vx > 0 ? (maxX - x) / vx : (minX - x) / vx;
      var ty = vy > 0 ? (maxY - y) / vy : (minY - y) / vy;
      if (!isFinite(tx) || tx <= 0) tx = Infinity;
      if (!isFinite(ty) || ty <= 0) ty = Infinity;
      var t = Math.min(tx, ty);
      if (!isFinite(t)) break;

      x += vx * t; y += vy * t;
      pts.push([x, y]);
      if (tx < ty) vx = -vx; else vy = -vy;         // reflect off that wall
    }
    return pts;
  }

  /* Click → the emoji ricochets off the real window edges a few times, then
     drops into the next free slot. Animated with the Web Animations API so the
     whole flight is one composited transform. */
  function land(orb, item) {
    if (busy || orb.classList.contains('is-flying')) return;
    busy = true;
    orb.classList.add('is-flying');

    var slot = holes.children[landed];
    var hole = slot.firstChild;

    var o  = orb.getBoundingClientRect();
    var r  = o.width / 2;
    var cx = o.left + r, cy = o.top + r;

    /* Move the orb onto <body> and pin it. Inside .game__sky it is boxed in by
       its ancestors, so it could only ever bounce within that panel; on the
       body, with position:fixed, the whole viewport is the table. Body has no
       transform, so `fixed` really is viewport-relative here. */
    orb.classList.add('is-loose');
    orb.style.left   = o.left + 'px';
    orb.style.top    = o.top + 'px';
    orb.style.width  = o.width + 'px';
    orb.style.height = o.height + 'px';
    document.body.appendChild(orb);

    var path = bouncePath(cx, cy, landed, calm ? 1 : 5);
    var h = hole.getBoundingClientRect();
    path.push([h.left + h.width / 2, h.top + h.height / 2]);   // into the slot

    var frames = [{ transform: 'translate(0px,0px) scale(1)', easing: 'linear' }];
    path.forEach(function (p, i) {
      var last = i === path.length - 1;
      frames.push({
        transform: 'translate(' + (p[0] - cx) + 'px,' + (p[1] - cy) + 'px) scale(' +
                   (last ? 0.8 : 1.05) + ')',
        /* Linear between bounces: a ball does not slow down in mid-air, and
           easing each segment made it look like it was being dragged. Only the
           final drop into the slot decelerates. */
        easing: last ? 'cubic-bezier(.45,0,.9,.75)' : 'linear',
        offset: (i + 1) / path.length
      });
    });

    var ms = calm ? 200 : 1150;
    var flight = calm
      ? orb.animate([frames[0], frames[frames.length - 1]], { duration: ms, fill: 'forwards' })
      : orb.animate(frames, { duration: ms, fill: 'forwards' });

    var settled = false;
    function settle() {
      if (settled) return;          // onfinish and the fallback must not both run
      settled = true;

      orb.remove();

      slot.classList.add('is-filled');
      hole.classList.add('is-filled', 'is-hit');
      var s = document.createElement('span');
      s.textContent = item.e;
      hole.appendChild(s);
      slot.lastChild.textContent = item.label;

      landed++;
      busy = false;
      live.textContent = landed + ' of 8 named: ' + item.label + '.';

      if (landed === IDEAS.length) {
        gameTxt.textContent =
          'That is the whole check-in. One tap, a name for the feeling — and in testing, ' +
          'people stopped skipping it.';
        setTimeout(function () {
          gameWin.hidden = false;
          setTimeout(finish, 1200);
        }, 500);
      }
    }

    flight.onfinish = settle;
    // Safety net: if the animation never reports finishing, `busy` would
    // stay true and the game would lock for good. Land it anyway.
    setTimeout(settle, ms + 600);
  }

  function finish() {
    outro.hidden = false;
    backBtn.hidden = true;
    progressFil.style.transform = 'scaleX(1)';
    var first = outro.querySelector('a, button');
    if (first) first.focus();
  }

  /* ─────────────────────────────────────────────────────── About Me ───
     A full page, not a dialog — no focus trap or scroll lock needed.
     It just replaces the view, the same way the outro does. */

  var about      = document.getElementById('about');
  var aboutBtn   = document.getElementById('aboutBtn');
  var aboutClose = document.getElementById('aboutClose');
  var aboutH1    = document.getElementById('aboutH');
  var lastFocus  = null;

  function openAbout() {
    lastFocus = document.activeElement;
    /* One full-page layer at a time, in both directions — see openWork. */
    var wk = document.getElementById('work');
    if (wk && !wk.hidden) wk.hidden = true;
    about.hidden = false;
    about.scrollTop = 0;
    /* Drives which bits of the fixed bar show: the nav stays, the walkthrough's
       step tracker does not belong on this page. */
    document.body.classList.add('about-open');
    aboutH1.focus();          // land on the heading, like arriving at a new page
  }
  function closeAbout() {
    about.hidden = true;
    document.body.classList.remove('about-open');
    var target = (lastFocus && lastFocus !== document.body && lastFocus.focus)
      ? lastFocus : aboutBtn;
    target.focus();
  }

  aboutBtn.addEventListener('click', openAbout);
  aboutClose.addEventListener('click', closeAbout);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !about.hidden) closeAbout();
  });

  /* ─────────────────────────────────────────────────── Mobile menu ───
     Only meaningful below 720px, where CSS collapses the nav behind the
     hamburger. Above that the panel class is inert, so nothing here needs to
     know the breakpoint. */

  var navToggle = document.getElementById('navToggle');
  var topnav    = document.getElementById('topnav');

  function setNav(open) {
    if (!topnav) return;
    topnav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (navToggle && topnav) {
    navToggle.addEventListener('click', function () {
      setNav(!topnav.classList.contains('is-open'));
    });

    /* Picking a destination closes the menu — otherwise the panel stays over
       the page you just asked for. The sign-in control is excluded: it opens
       its own form inside the panel rather than navigating away. */
    topnav.addEventListener('click', function (e) {
      var link = e.target.closest('.navlink');
      if (link && !link.closest('.authwrap')) setNav(false);
    });

    document.addEventListener('click', function (e) {
      if (topnav.classList.contains('is-open') &&
          !topnav.contains(e.target) && !navToggle.contains(e.target)) {
        setNav(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && topnav.classList.contains('is-open')) {
        setNav(false);
        navToggle.focus();
      }
    });
  }

  /* ──────────────────────────────────────────────── Other projects ───
     Same mechanics as About Me: a full page layered over whatever is
     underneath, closed by its own back button, Escape, or any nav link. */

  var work      = document.getElementById('work');
  var workBtn   = document.getElementById('workBtn');
  var workClose = document.getElementById('workClose');
  var workH1    = document.getElementById('workH');
  var workLastFocus = null;

  function openWork() {
    workLastFocus = document.activeElement;
    /* Only one full-page layer at a time — opening this from the About page
       would otherwise stack them and leave About underneath. */
    if (!about.hidden) closeAbout();
    work.hidden = false;
    work.scrollTop = 0;
    document.body.classList.add('about-open');   // same chrome rules apply
    workH1.focus();
  }
  function closeWork() {
    work.hidden = true;
    document.body.classList.remove('about-open');
    var target = (workLastFocus && workLastFocus !== document.body && workLastFocus.focus)
      ? workLastFocus : workBtn;
    target.focus();
  }

  workBtn.addEventListener('click', openWork);
  workClose.addEventListener('click', closeWork);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !work.hidden) closeWork();
  });

  /* Put the case study back to its opening state. Used by "Start over" and
     by re-entering the study from the nav after finishing it. */
  function resetStory() {
    stage = 0;
    setStage(0);
    buildGame();
    gameTxt.textContent =
      'Good feelings and hard ones. Click each one to catch it — that single tap is ' +
      'the entire check-in.';
    maxReached = 0;
    goTo(0);
  }

  document.getElementById('restart').addEventListener('click', function () {
    outro.hidden = true;
    resetStory();
  });

  /* ─────────────────────────────────────────────── Hero hotspot ─────
     "Go to challenge" is painted into the hero artwork, so the real control
     is a transparent button laid over it.

     The coordinates are fractions of the image's OWN pixels, not CSS pixels,
     so re-exporting the art at a different resolution cannot break them. They
     are recomputed from the painted rectangle on every resize, because
     object-fit: cover crops the image by a different amount at every width —
     a fixed percentage offset would drift out of place as the window changes.

     If the hotspot ever sits off the button, these four numbers are the only
     thing to adjust: x/y are the button's top-left corner, w/h its size, each
     as a fraction of the full image. */
  /* Measured off the artwork itself rather than estimated: the painted button
     occupies pixels 70–890 across and 981–1156 down in the 1800x1200 export.
     The earlier hand-guessed x was ~5 rendered pixels too far right, which put
     the hover ring on top of the button's left edge instead of around it. */
  var HERO_HOTSPOT = { x: 0.0389, y: 0.8175, w: 0.4556, h: 0.1458 };

  var heroImg   = document.getElementById('heroImg');
  var heroHot   = document.getElementById('heroHotspot');
  var heroMedia = document.getElementById('heroMedia');
  var heroRo    = null;

  function placeHeroHotspot() {
    if (!heroImg || !heroHot || !heroImg.naturalWidth) return;
    var bw = heroImg.clientWidth, bh = heroImg.clientHeight;
    if (!bw || !bh) return;

    /* Mirror whatever object-fit the stylesheet is actually using, rather than
       assuming one: `contain` scales to the smaller ratio and centres on both
       axes, `cover` to the larger. Reading it back means the two cannot drift
       apart if the CSS changes. */
    var fit = window.getComputedStyle(heroImg).objectFit;
    var rw = bw / heroImg.naturalWidth, rh = bh / heroImg.naturalHeight;
    var scale = fit === 'contain' ? Math.min(rw, rh) : Math.max(rw, rh);
    var dw = heroImg.naturalWidth  * scale;
    var dh = heroImg.naturalHeight * scale;
    var offX = (bw - dw) / 2;
    var offY = (bh - dh) / 2;

    heroHot.style.left   = (offX + HERO_HOTSPOT.x * dw) + 'px';
    heroHot.style.top    = (offY + HERO_HOTSPOT.y * dh) + 'px';
    heroHot.style.width  = (HERO_HOTSPOT.w * dw) + 'px';
    heroHot.style.height = (HERO_HOTSPOT.h * dh) + 'px';
    /* Match the painted button's corner rounding so the hover ring traces its
       edge instead of cutting across the corners. Proportional to height, so
       it stays right at every window size. */
    heroHot.style.borderRadius = Math.round(HERO_HOTSPOT.h * dh * 0.24) + 'px';
    heroHot.hidden = false;
  }

  if (heroImg && heroHot && heroMedia) {
    heroImg.addEventListener('load', placeHeroHotspot);

    /* No artwork saved yet: fall back to the dashed placeholder and drop the
       hotspot, so there is never an invisible button floating over nothing. */
    var heroFailed = false;
    function heroFallback() {
      if (heroFailed) return;
      heroFailed = true;
      heroHot.hidden = true;
      heroImg.remove();
      heroMedia.className = 'hero__media ph';
      heroMedia.setAttribute('role', 'img');
      heroMedia.setAttribute('aria-label', 'Hero image placeholder');
      var lab = document.createElement('span');
      lab.className = 'ph__label';
      lab.textContent = 'Save your hero image to images/hero.png';
      heroMedia.appendChild(lab);
    }

    heroImg.addEventListener('error', heroFallback);

    /* The <img> carries its src in the HTML, so the browser starts fetching it
       during parse — well before this script runs at the end of <body>. A fast
       failure (a 404 from localhost, say) has therefore already fired `error`
       by now, and the listener above would never hear it. `complete` with a
       zero naturalWidth is how you detect that already-failed case. */
    if (heroImg.complete) {
      if (heroImg.naturalWidth) placeHeroHotspot();
      else heroFallback();
    }

    heroHot.addEventListener('click', function () {
      var target = document.querySelector('.challenge');
      if (target) {
        target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      }
    });

    /* The hotspot has to be re-placed every time the painted rectangle moves,
       and it moves more often than you would think: the image's height is
       driven by the copy column beside it, so it changes again when the web
       fonts land and the headline re-wraps. Placing it once on `load` catches
       the image too early and leaves the hotspot at a stale size. */
    if (window.ResizeObserver) {
      // Held in a variable deliberately — an unreferenced ResizeObserver can
      // be garbage-collected, and then it silently stops firing.
      heroRo = new ResizeObserver(placeHeroHotspot);
      heroRo.observe(heroMedia);
    } else {
      window.addEventListener('resize', placeHeroHotspot);
    }
    window.addEventListener('load', placeHeroHotspot);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(placeHeroHotspot);
    }
  }

  /* ──────────────────────────────────────── The 30-app challenge ───
     The data itself lives in store.js. This section only draws it and collects
     edits; it no longer knows or cares whether the bytes end up in Firestore or
     in localStorage, which is what let the same code serve a published site and
     an offline one.

     Who may edit is decided by the store — an account check when Firebase is
     connected, the old flag-and-hash rule when it is not. Either way the page
     only hides controls; the security rules on the server are what actually
     refuse a stranger's write. */

  var TARGET = window.APPS_TARGET || 30;
  var grid   = document.getElementById('grid30');

  var editMode = Store.canEdit;
  var appData  = Store.apps;          // live array, owned by the store

  /* Kept under the old name so every existing call site still reads naturally.
     The store mirrors locally at once and batches the remote write. */
  function writeDraft() { Store.save(); }

  var STATUSES = [
    { id: 'todo',      label: 'Not started' },
    { id: 'started',   label: 'Started' },
    { id: 'published', label: 'Published' }
  ];

  function appAt(n) {
    for (var i = 0; i < appData.length; i++) if (appData[i].n === n) return appData[i];
    return null;
  }

  function ensureApp(n) {
    var a = appAt(n);
    if (!a) {
      a = { n: n, status: 'todo', name: '', desc: '', url: '', shot: '', process: '' };
      appData.push(a);
      appData.sort(function (x, y) { return x.n - y.n; });
    }
    return a;
  }

  function statusOf(app) { return (app && app.status) || 'todo'; }

  /* A dropped image is held two ways: `shot` is the path that ships, and
     `_shotPreview` is a downscaled data URL kept in localStorage so the square
     fills in immediately, before the real file has been saved into the folder.
     Underscored keys are stripped on export — they must never reach apps.js. */
  /* Paths that have already 404'd once. A path points at a file that has not
     been uploaded to the server yet, which is the normal state right after
     dropping an image — so without this, every single redraw asked for the
     missing file again, showed a blank frame, and only then swapped in the
     preview. That blank-then-image step is what flashed on each render. */
  var brokenPaths = {};

  function pick(path, preview) {
    if (path && !brokenPaths[path]) return path;
    return preview || '';
  }
  function markBroken(path) { if (path) brokenPaths[path] = true; }

  /* The synced copy wins over everything. It is the only version that exists
     for a visitor, on a phone, or in any browser that did not upload it — the
     old order tried a hand-uploaded file path first and fell back to a
     localStorage preview, which is why a published app showed a bare green
     square to everyone except the person who added the picture. */
  function shotSrc(app) {
    if (!app) return '';
    return Store.shotFor(app.n, 'shot') || pick(app.shot, app._shotPreview);
  }
  function processSrc(app) {
    if (!app) return '';
    return Store.shotFor(app.n, 'process') || pick(app.process, app._processPreview);
  }

  function slug(s) {
    return String(s).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'app';
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function suggestedPath(app, kind) {
    return 'images/apps/' + pad2(app.n) + '-' + slug(app.name) +
           (kind === 'process' ? '-process' : '') + '.png';
  }

  var openN = null;
  /* Which card is currently being *edited*, as opposed to merely open. Being
     signed in no longer means every card renders as a form: the polished view
     is what you see until you press the pencil, which is also what a visitor
     would see, so there is no separate preview mode to keep in sync. */
  var editingCard = null;

  /* The grid's column count changes at two breakpoints. Read the real one
     rather than hardcoding it, so the card lands under the right row. */
  function columnCount() {
    var t = window.getComputedStyle(grid).gridTemplateColumns;
    var n = t ? t.split(' ').filter(Boolean).length : 5;
    return n > 0 ? n : 5;
  }

  /* ── The squares ───────────────────────────────────────────────────── */

  function buildSquare(i) {
    var app = appAt(i);
    var st  = statusOf(app);
    var src = shotSrc(app);
    var showShot = st === 'published' && src;

    /* Visitors can only open squares that have something to show; in edit mode
       every square opens, because that is how a status gets set in the first
       place. */
    var openable = editMode || (app && (st !== 'todo' || app.name));

    var li   = document.createElement('li');
    var tile = document.createElement(openable ? 'button' : 'div');
    tile.className = 'sq sq--' + st + (showShot ? ' sq--shot' : '') +
                     (openable ? ' sq--live' : '');

    if (showShot) {
      var img = document.createElement('img');
      img.className = 'sq__shot';
      img.alt = '';
      /* NOT lazy, and `src` is assigned LAST, after the error handler below is
         attached. Setting src first lets a fast 404 fire `error` before anyone
         is listening, which is exactly how a dropped screenshot silently failed
         to appear. Lazy-loading made it worse by deferring the load entirely. */
      /* The saved path is tried first, because it is the full-quality file that
         actually ships. It will 404 right after a drop, though — the image is
         only in localStorage until it is saved into images/apps/ — so fall back
         to the stored preview before giving up on the flat colour. Without this
         step a freshly dropped screenshot never appears on the square. */
      img.addEventListener('error', function onErr() {
        img.removeEventListener('error', onErr);
        markBroken(app.shot);              // do not try this path again
        if (app._shotPreview && img.src !== app._shotPreview) {
          img.src = app._shotPreview;
          img.addEventListener('error', function () {
            img.remove();
            tile.className = 'sq sq--' + st + ' sq--live';
          });
          return;
        }
        img.remove();
        tile.className = 'sq sq--' + st + (openable ? ' sq--live' : '');
      });
      img.src = src;                     // last: the handler above is now live
      tile.appendChild(img);
    }

    var num = document.createElement('span');
    num.className = 'sq__n';
    num.textContent = i;
    tile.appendChild(num);

    var label = 'App ' + i;
    if (app && app.name) label += ': ' + app.name;
    label += ' — ' + (st === 'published' ? 'published' : st === 'started' ? 'started' : 'not started');

    if (openable) {
      tile.type = 'button';
      tile.setAttribute('aria-expanded', openN === i ? 'true' : 'false');
      tile.setAttribute('aria-label', label + '. Open details.');
      (function (n) {
        tile.addEventListener('click', function () { toggleCard(n); });
      })(i);
    } else {
      tile.setAttribute('aria-label', label);
    }

    li.appendChild(tile);
    return li;
  }

  /* ── Image drop zones ──────────────────────────────────────────────── */

  /* Shrink a dropped file to something small enough to keep in localStorage.
     Full-size screenshots would blow the 5MB quota after two or three apps. */
  function downscale(file, maxW, cb) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var scale = Math.min(1, maxW / img.width);
      var c = document.createElement('canvas');
      c.width  = Math.max(1, Math.round(img.width  * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      try { cb(c.toDataURL('image/jpeg', 0.72)); }
      catch (e) { cb(null); }        // tainted canvas, in theory
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }

  function buildDropzone(app, kind, onChange) {
    var isShot = kind === 'shot';
    var wrap = document.createElement('div');
    wrap.className = 'drop' + (isShot ? ' drop--shot' : ' drop--process');

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.className = 'sr-only';
    input.id = 'file-' + kind + '-' + app.n;

    var preview = document.createElement('img');
    preview.className = 'drop__img';
    preview.alt = '';

    var empty = document.createElement('div');
    empty.className = 'drop__empty';
    empty.innerHTML = '<b>' + (isShot ? 'App screenshot' : 'Behind the scenes') + '</b>' +
      '<span>Drag an image here, or click to choose</span>';

    var caption = document.createElement('p');
    caption.className = 'drop__caption';

    /* Clears both the path and the stored preview. With no image left, a
       published square falls back to its flat status colour, which is the
       behaviour the grid already has for an app that has none yet. */
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'drop__remove';
    remove.textContent = 'Remove image';
    remove.hidden = true;
    remove.addEventListener('click', function (e) {
      e.stopPropagation();                 // the wrapper opens the file picker
      if (!window.confirm('Remove this image?')) return;
      if (isShot) { app.shot = ''; delete app._shotPreview; }
      else        { app.process = ''; delete app._processPreview; }
      Store.clearShot(app.n, kind);     // remove it for everyone, not just here
      var dl = wrap.querySelector('.drop__save');
      if (dl) dl.remove();
      writeDraft();
      paint();
      onChange();
    });

    function paint() {
      var src = isShot ? shotSrc(app) : processSrc(app);
      var stashed = isShot ? app._shotPreview : app._processPreview;
      remove.hidden = !src;

      if (src) {
        /* Handler before src, for the same reason as the squares: a 404 that
           resolves fast would otherwise fire before anything is listening. */
        preview.onerror = function () {
          preview.onerror = null;
          markBroken(isShot ? app.shot : app.process);
          if (stashed && preview.src !== stashed) { preview.src = stashed; return; }
          preview.hidden = true;
          empty.hidden = false;
        };
        preview.src = src;
        preview.hidden = false;
        empty.hidden = true;
      } else {
        preview.hidden = true;
        empty.hidden = false;
      }

      /* The old caption told you which filename to save by hand. Images now go
         to the server themselves, so the only thing worth saying is whether
         this one has actually got there. */
      if (!src) {
        caption.hidden = true;
      } else if (!Store.connected || !Store.canEdit) {
        /* Checked before the stored copy, not after: state.shots is filled in
           locally too, so testing it alone would promise "everyone can see
           this" while the page was offline and nothing had left the browser. */
        caption.textContent = 'Stays in this browser until you sign in.';
        caption.hidden = false;
      } else if (Store.shotFor(app.n, kind)) {
        caption.textContent = Store.saving ? 'Saving…' : 'Saved — visible to everyone.';
        caption.hidden = false;
      } else {
        caption.textContent = 'Saving…';
        caption.hidden = false;
      }
    }

    /* Firebase Storage is not part of this build (Google requires the paid
       Blaze plan for it), so an image is never uploaded anywhere by the site.
       The downscaled preview is local-only — Store never syncs it, on purpose,
       since 30 apps' worth would blow past Firestore's 1MB document limit —
       so it just lets you see what you dropped without waiting. Everyone else
       sees the real image once you've placed the file into web/images/apps/
       on Hostinger, exactly as before Firebase existed. */
    function accept(file) {
      if (!file || !/^image\//.test(file.type)) {
        window.alert('That does not look like an image file.');
        return;
      }

      downscale(file, isShot ? 760 : 560, function (dataUrl) {
        if (!dataUrl) {
          window.alert('That image could not be read. Try a PNG or JPEG.');
          return;
        }
        /* Straight to the server, so it is visible to everyone on every
           device. No file to upload by hand any more, so the path field is
           cleared — leaving a stale one would have the square prefer a file
           that may not exist. */
        if (isShot) { app.shot = ''; app._shotPreview = dataUrl; }
        else        { app.process = ''; app._processPreview = dataUrl; }

        Store.saveShot(app.n, kind, dataUrl);
        writeDraft();
        paint();
        onChange();
      });
    }

    /* Offers the file back under the name the site expects, so saving it into
       web/images/apps/ is a drag rather than a rename. Deliberately a button
       the user presses — nothing downloads on its own. */
    function offerDownload(file, path) {
      var dl = wrap.querySelector('.drop__save');
      if (dl) dl.remove();
      var save = document.createElement('button');
      save.type = 'button';
      save.className = 'drop__save';
      save.textContent = 'Download as ' + path.split('/').pop();
      save.addEventListener('click', function (e) {
        e.stopPropagation();
        var a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = path.split('/').pop();
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      });
      wrap.appendChild(save);
    }

    wrap.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) accept(input.files[0]);
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      wrap.addEventListener(ev, function (e) {
        e.preventDefault(); e.stopPropagation();
        wrap.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      wrap.addEventListener(ev, function (e) {
        e.preventDefault(); e.stopPropagation();
        wrap.classList.remove('is-over');
      });
    });
    wrap.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (dt && dt.files && dt.files[0]) accept(dt.files[0]);
    });

    wrap.appendChild(preview);
    wrap.appendChild(empty);
    wrap.appendChild(input);
    paint();

    var holder = document.createElement('div');
    holder.className = 'dropwrap' + (isShot ? ' dropwrap--shot' : ' dropwrap--process');
    holder.appendChild(wrap);
    holder.appendChild(remove);
    holder.appendChild(caption);
    return holder;
  }

  /* ── The opened card ───────────────────────────────────────────────── */

  function buildCard(n) {
    var editing = editMode && editingCard === n;
    var app = editMode ? ensureApp(n) : (appAt(n) || { n: n, status: 'todo' });

    var li = document.createElement('li');
    li.className = 'appcard' + (editing ? ' appcard--editing' : '');
    li.setAttribute('tabindex', '-1');
    li.appendChild(editing ? cardEditView(app, n) : cardReadView(app, n));
    return li;
  }

  /* ── The card as everyone sees it ──────────────────────────────────── */

  function cardReadView(app, n) {
    var st = statusOf(app);
    var frag = document.createDocumentFragment();

    /* Images first and full width: the screenshot is the point of the card,
       so it gets the space rather than sharing a row with the text. */
    var media = document.createElement('div');
    media.className = 'appcard__media';
    var shot = shotSrc(app), proc = processSrc(app);

    if (shot) media.appendChild(readImage(shot, app._shotPreview,
      'Screenshot of ' + (app.name || 'app ' + n), 'shot'));
    if (proc) media.appendChild(readImage(proc, app._processPreview,
      'Behind the scenes of ' + (app.name || 'app ' + n), 'process'));
    if (shot || proc) frag.appendChild(media);

    var body = document.createElement('div');
    body.className = 'appcard__body';

    var head = document.createElement('div');
    head.className = 'appcard__head';

    var eyebrow = document.createElement('p');
    eyebrow.className = 'appcard__num';
    eyebrow.textContent = 'App ' + n + ' of ' + TARGET;
    head.appendChild(eyebrow);

    var badge = document.createElement('span');
    badge.className = 'appcard__badge appcard__badge--' + st;
    badge.textContent = st === 'published' ? 'Published'
                      : st === 'started'   ? 'Started' : 'Not started';
    head.appendChild(badge);
    body.appendChild(head);

    var h = document.createElement('h3');
    h.className = 'appcard__name';
    h.textContent = app.name || (st === 'started' ? 'Being built now' : 'Not started yet');
    body.appendChild(h);

    if (app.desc) {
      var d = document.createElement('p');
      d.className = 'appcard__desc';
      d.textContent = app.desc;
      body.appendChild(d);
    }

    if (app.url) {
      var a = document.createElement('a');
      a.className = 'appcard__link';
      a.href = app.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = app.url.replace(/^https?:\/\//, '');
      body.appendChild(a);
    }

    var foot = document.createElement('div');
    foot.className = 'appcard__foot';

    if (app.caseStudy) {
      var cs = document.createElement('button');
      cs.type = 'button';
      cs.className = 'ghostbtn';
      cs.setAttribute('data-goto', 'study');
      cs.textContent = 'Read the case study';
      foot.appendChild(cs);
    }

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'appcard__close';
    close.textContent = 'Close';
    close.addEventListener('click', function () { toggleCard(n); });
    foot.appendChild(close);
    body.appendChild(foot);

    /* The pencil floats over the corner so it never pushes the content around,
       and only exists for the signed-in owner. */
    if (editMode) {
      var pen = document.createElement('button');
      pen.type = 'button';
      pen.className = 'appcard__edit';
      pen.setAttribute('aria-label', 'Edit app ' + n);
      pen.title = 'Edit';
      pen.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
        '<path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 ' +
        '7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
      pen.addEventListener('click', function () {
        editingCard = n;
        renderGrid();
      });
      body.appendChild(pen);
    }

    frag.appendChild(body);
    return frag;
  }

  function readImage(src, fallback, alt, kind) {
    var fig = document.createElement('figure');
    fig.className = 'appshot appshot--' + kind;
    var img = document.createElement('img');
    img.alt = alt;
    /* The saved path is tried first — it is the full-quality file that ships —
       but it 404s until that file has actually been uploaded, which is the
       normal state right after dropping an image. Fall back to the stored
       preview before giving up, or the picture silently disappears from the
       card while still showing on the square. Handler before src, so a fast
       404 cannot fire before anything is listening. */
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      markBroken(src);                     // do not try this path again
      if (fallback && img.src !== fallback) {
        img.addEventListener('error', function () { fig.remove(); });
        img.src = fallback;
        return;
      }
      fig.remove();
    });
    img.src = src;
    fig.appendChild(img);
    return fig;
  }

  /* ── The card while it is being edited ─────────────────────────────── */

  function cardEditView(app, n) {
    var frag = document.createDocumentFragment();

    var media = document.createElement('div');
    media.className = 'appcard__media';
    media.appendChild(buildDropzone(app, 'shot', function () {
      writeDraft(); renderGrid();
    }));
    media.appendChild(buildDropzone(app, 'process', function () {
      writeDraft(); renderGrid();
    }));
    frag.appendChild(media);

    var body = document.createElement('div');
    body.className = 'appcard__body';

    var eyebrow = document.createElement('p');
    eyebrow.className = 'appcard__num';
    eyebrow.textContent = 'Editing app ' + n + ' of ' + TARGET;
    body.appendChild(eyebrow);

    body.appendChild(fieldLabel('Title', 'app-name-' + n));
    var nameField = document.createElement('input');
    nameField.type = 'text';
    nameField.id = 'app-name-' + n;
    nameField.className = 'appcard__nameinput';
    nameField.value = app.name || '';
    nameField.placeholder = 'Add title here';
    nameField.addEventListener('input', function () { app.name = nameField.value; });
    body.appendChild(nameField);

    body.appendChild(fieldLabel('Description', 'app-desc-' + n));
    var descField = document.createElement('textarea');
    descField.id = 'app-desc-' + n;
    descField.className = 'appcard__descinput';
    descField.rows = 4;
    descField.value = app.desc || '';
    descField.placeholder = 'Add description here';
    descField.addEventListener('input', function () { app.desc = descField.value; });
    body.appendChild(descField);

    body.appendChild(fieldLabel('Link to the published app', 'app-url-' + n));
    var urlField = document.createElement('input');
    urlField.type = 'url';
    urlField.id = 'app-url-' + n;
    urlField.className = 'appcard__urlinput';
    urlField.value = app.url || '';
    urlField.placeholder = 'https://link-to-the-published-app';
    urlField.addEventListener('input', function () { app.url = urlField.value; });
    body.appendChild(urlField);

    body.appendChild(buildStatusPicker(app));

    var foot = document.createElement('div');
    foot.className = 'appcard__foot';

    /* Edits are already written as they are typed — this button is about
       leaving edit mode, so it also flushes rather than only closing. */
    var save = document.createElement('button');
    save.type = 'button';
    save.className = 'appcard__save';
    save.textContent = 'Save';
    save.addEventListener('click', function () {
      editingCard = null;
      if (Store.saveNow) Store.saveNow(); else writeDraft();
      renderGrid();
    });
    foot.appendChild(save);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'appcard__close';
    close.textContent = 'Close';
    close.addEventListener('click', function () {
      editingCard = null;
      writeDraft();
      toggleCard(n);
    });
    foot.appendChild(close);

    body.appendChild(foot);
    frag.appendChild(body);
    return frag;
  }

  /* A real <label>, not just a styled span: it names the field for screen
     readers and makes the whole caption a click target for it. */
  function fieldLabel(text, forId) {
    var l = document.createElement('label');
    l.className = 'editlabel';
    l.setAttribute('for', forId);
    l.textContent = text;
    return l;
  }

  function wrapFramed(img, kind) {
    var w = document.createElement('div');
    w.className = 'appcard__shotwrap' + (kind === 'process' ? ' appcard__shotwrap--process' : '');
    w.appendChild(img);
    return w;
  }

  function emptyFrame(text, kind) {
    var w = document.createElement('div');
    w.className = 'appcard__shotwrap' + (kind === 'process' ? ' appcard__shotwrap--process' : '');
    var e = document.createElement('div');
    e.className = 'appcard__shot appcard__shot--empty';
    e.textContent = text;
    w.appendChild(e);
    return w;
  }

  /* Radios rather than buttons: keyboard support, arrow-key movement between
     options and correct screen-reader semantics all come for free. */
  function buildStatusPicker(app) {
    var set = document.createElement('fieldset');
    set.className = 'statusset';

    var legend = document.createElement('legend');
    legend.className = 'statusset__legend';
    legend.textContent = 'Status';
    set.appendChild(legend);

    var row = document.createElement('div');
    row.className = 'statusset__row';

    STATUSES.forEach(function (s) {
      var lab = document.createElement('label');
      lab.className = 'statusopt statusopt--' + s.id;

      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'status-' + app.n;
      radio.value = s.id;
      radio.className = 'statusopt__input';
      radio.checked = statusOf(app) === s.id;
      radio.addEventListener('change', function () {
        if (!radio.checked) return;
        app.status = s.id;
        writeDraft(appData);
        renderGrid();
      });

      var dot = document.createElement('span');
      dot.className = 'statusopt__dot';

      var txt = document.createElement('span');
      txt.className = 'statusopt__txt';
      txt.textContent = s.label;

      lab.appendChild(radio);
      lab.appendChild(dot);
      lab.appendChild(txt);
      row.appendChild(lab);
    });

    set.appendChild(row);
    return set;
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  /* Named renderGrid, NOT render: there is already a render() above that draws
     the case-study screens, and two function declarations in one scope means
     the later one silently wins. Calling this one from goTo() left the story
     frozen on screen 0 with no error anywhere. */
  function renderGrid() {
    /* Every redraw records what it drew, so a store event arriving straight
       afterwards (our own save echoing back) is recognised as a no-op instead
       of causing a second, identical redraw. */
    lastSig = appsSignature();

    /* Keep focus where the user left it — this redraws on every keystroke's
       change event and on every status flip. */
    var active = document.activeElement;
    var restore = null;
    if (active && grid.contains(active)) {
      restore = { cls: active.className, val: active.value,
                  start: active.selectionStart, end: active.selectionEnd };
    }

    grid.innerHTML = '';
    for (var i = 1; i <= TARGET; i++) grid.appendChild(buildSquare(i));

    if (openN !== null) {
      var cols  = columnCount();
      var row   = Math.floor((openN - 1) / cols);
      var after = Math.min((row + 1) * cols, TARGET);
      var card  = buildCard(openN);
      if (after >= grid.children.length) grid.appendChild(card);
      else grid.insertBefore(card, grid.children[after]);
    }

    if (restore) {
      var again = grid.querySelector('.' + restore.cls.split(' ')[0]);
      if (again && again.focus) {
        again.focus();
        if (again.setSelectionRange && restore.start != null) {
          try { again.setSelectionRange(restore.start, restore.end); } catch (e) {}
        }
      }
    }

    var published = 0;
    for (var k = 0; k < appData.length; k++) {
      if (statusOf(appData[k]) === 'published') published++;
    }
    document.getElementById('shippedCount').textContent = published;
    document.getElementById('meterFill').style.transform =
      'scaleX(' + (published / TARGET) + ')';
    document.querySelector('.meter')
      .setAttribute('aria-label', published + ' of ' + TARGET + ' apps published');
  }

  function toggleCard(n) {
    var wasOpen = openN === n;
    openN = wasOpen ? null : n;
    /* Closing a card, or opening a different one, always drops back to the
       read view — otherwise a card reopens mid-edit for no obvious reason. */
    if (editingCard !== null && editingCard !== openN) editingCard = null;
    renderGrid();
    if (!wasOpen) {
      var card = grid.querySelector('.appcard');
      if (card) card.focus();
    } else {
      var sq = grid.children[n - 1] && grid.children[n - 1].firstChild;
      if (sq && sq.focus) sq.focus();
    }
  }

  if (window.ResizeObserver) {
    /* Only a change in COLUMN COUNT needs a re-render — that is the one thing
       that moves the open card to a different row. Re-rendering on any size
       change fed back on itself: the render rebuilt the card, the card's image
       loaded and changed the grid's height, the observer fired again, and the
       card flickered for as long as it took the image sizes to settle.

       Held in a variable: an unreferenced ResizeObserver can be collected. */
    var lastCols = columnCount();
    var gridRo = new ResizeObserver(function () {
      var cols = columnCount();
      if (cols === lastCols) return;
      lastCols = cols;
      if (openN !== null) renderGrid();
    });
    gridRo.observe(grid);
  }

  /* ── Export ────────────────────────────────────────────────────────── */

  function exportApps() {
    var lines = appData.map(function (a) {
      var o = { n: a.n, status: a.status || 'todo', name: a.name || '', desc: a.desc || '',
                url: a.url || '', shot: a.shot || '', process: a.process || '' };
      if (a.caseStudy) o.caseStudy = true;
      return '  ' + JSON.stringify(o) + ',';
    });
    var text = 'window.APPS = [\n' + lines.join('\n') + '\n];';

    var box = document.createElement('textarea');
    box.value = text;
    box.className = 'exportbox';
    document.body.appendChild(box);
    box.focus();
    box.select();

    var done = document.createElement('button');
    done.type = 'button';
    done.className = 'exportbox__done';
    done.textContent = 'Done';
    done.addEventListener('click', function () { box.remove(); done.remove(); });
    document.body.appendChild(done);
  }

  /* ── The edit bar ──────────────────────────────────────────────────── */

  var bar = document.createElement('div');
  bar.className = 'editbar';
  bar.hidden = true;

  var tag = document.createElement('span');
  tag.className = 'editbar__tag';
  bar.appendChild(tag);

  function barButton(label, ghost, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'editbar__btn' + (ghost ? ' editbar__btn--ghost' : '');
    b.textContent = label;
    b.addEventListener('click', fn);
    bar.appendChild(b);
    return b;
  }

  /* A real file on disk. The one backup that survives losing the browser AND
     the Firebase project, so it is the first button rather than the last. */
  barButton('Download backup', false, function () { Store.downloadBackup(); });

  var restoreInput = document.createElement('input');
  restoreInput.type = 'file';
  restoreInput.accept = 'application/json,.json';
  restoreInput.hidden = true;
  restoreInput.addEventListener('change', function () {
    var f = restoreInput.files && restoreInput.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var parsed = JSON.parse(r.result);
        var apps = parsed.apps || parsed;
        if (!apps.length) throw new Error('no apps in that file');
        if (!window.confirm('Replace the current tracker with the ' + apps.length +
                            ' squares in this backup?')) return;
        Store.restore(apps);
        renderGrid();
      } catch (e) {
        window.alert('That file could not be read as a backup: ' + e.message);
      }
      restoreInput.value = '';
    };
    r.readAsText(f);
  });
  bar.appendChild(restoreInput);
  barButton('Restore from file', true, function () { restoreInput.click(); });

  /* Undo, one step at a time, from the snapshots kept on every save. */
  barButton('Undo last change', true, function () {
    var hist = Store.history();
    if (hist.length < 2) {
      window.alert('Nothing to undo yet — snapshots start once you make changes.');
      return;
    }
    if (!window.confirm('Go back to how the tracker looked before the last change?')) return;
    Store.restore(hist[1].apps);
    renderGrid();
  });

  /* Kept for the offline case: with no Firebase, apps.js is still the only way
     to publish, so the copy-paste route has to remain available. */
  var expBtn = barButton('Export to apps.js', true, exportApps);

  /* Inside the challenge section, directly after the squares: that ties it to
     the thing it edits and means it disappears with the rest of the home view
     when the case study or About page is open, without needing its own
     visibility rule. */
  grid.parentNode.appendChild(bar);

  /* ── Reacting to the store ─────────────────────────────────────────── */

  var authWrap   = document.getElementById('authWrap');
  var authBtn    = document.getElementById('authBtn');
  var authBtnTxt = document.getElementById('authBtnTxt');
  var authArrow  = document.getElementById('authArrow');
  var authPanel  = document.getElementById('authPanel');
  var authForm   = document.getElementById('authForm');
  var authSignedIn = document.getElementById('authSignedIn');
  var authWho    = document.getElementById('authWho');
  var authOut    = document.getElementById('authOut');
  var authEmail = document.getElementById('authEmail');
  var authPass  = document.getElementById('authPass');
  var authErr   = document.getElementById('authErr');

  /* One place that opens and closes the panel, so the arrow, the aria state and
     the panel can never disagree with each other. Every path below goes through
     it — that is what the first version got wrong: signing out returned early
     and left the form stuck open. */
  function setAuthPanel(open) {
    if (!authPanel) return;
    authPanel.hidden = !open;
    authBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    /* Only send focus into the email field when that is actually what opened;
       when signed in the panel holds a sign-out button instead. */
    if (open) (Store.user ? authOut : authEmail).focus();
  }

  /* The button always just opens and closes the panel. What is *inside* the
     panel changes with sign-in state — the form when signed out, a sign-out
     button when signed in — so the button never has two different jobs and can
     never leave the panel stranded open. */
  if (authBtn) {
    authBtn.addEventListener('click', function () {
      setAuthPanel(authPanel.hidden);
    });
  }

  if (authOut) {
    authOut.addEventListener('click', function () {
      setAuthPanel(false);
      Store.signOut();
    });
  }

  if (authPanel) {
    authForm.addEventListener('submit', function (e) {
      e.preventDefault();
      authErr.hidden = true;
      Store.signIn(authEmail.value.trim(), authPass.value).then(function (result) {
        /* Close only on success. A wrong password has to leave the form open,
           or the error message under it would vanish before it was read. */
        if (result) { setAuthPanel(false); authPass.value = ''; }
      });
    });

    /* Closing on outside-click matches every other small overlay on the site
       (the export box, the About page) rather than trapping focus in a modal
       that has to be explicitly dismissed. */
    document.addEventListener('click', function (e) {
      if (!authPanel.hidden && authWrap && !authWrap.contains(e.target)) {
        setAuthPanel(false);
      }
    });

    /* Escape is the other way out people reach for. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !authPanel.hidden) {
        setAuthPanel(false);
        authBtn.focus();
      }
    });
  }

  /* Pictures added before images were syncable live in this browser only, as
     `_shotPreview` in localStorage — which is why they showed on the machine
     that added them and nowhere else. The first time the owner signs in with a
     working connection, push any of those to the server so they become visible
     to everyone. Runs once per page load and skips anything already up. */
  var migratedImages = false;

  function migrateLocalImages() {
    if (migratedImages || !Store.connected || !Store.canEdit) return;
    migratedImages = true;

    var pending = [];
    appData.forEach(function (a) {
      if (a._shotPreview && !Store.shotFor(a.n, 'shot')) {
        pending.push({ n: a.n, kind: 'shot', data: a._shotPreview });
      }
      if (a._processPreview && !Store.shotFor(a.n, 'process')) {
        pending.push({ n: a.n, kind: 'process', data: a._processPreview });
      }
    });
    if (!pending.length) return;

    /* One at a time rather than all at once: 30 simultaneous writes is a good
       way to get rate-limited, and there is no hurry. */
    (function next(i) {
      if (i >= pending.length) { renderGrid(); return; }
      var job = pending[i];
      Store.saveShot(job.n, job.kind, job.data).then(function () { next(i + 1); });
    })(0);
  }

  function syncFromStore(s) {
    /* Deliberately after the store reports ready, so shotFor() reflects what is
       actually on the server before deciding what still needs uploading. */
    if (s.ready) migrateLocalImages();
    /* Whether the editor is available can now change while the page is open —
       signing in or out flips it — so the grid has to be redrawn, not just
       shown or hidden. */
    var wasEditing = editMode;
    editMode = s.canEdit;

    if (authWrap) authWrap.hidden = !s.connected;
    /* Only the label changes — writing to the button's textContent would delete
       the arrow element inside it. The arrow stays visible in both states: it
       is the affordance that says this control opens something, and hiding it
       when signed in made the button change shape on sign-in. */
    if (authBtnTxt) authBtnTxt.textContent = s.user ? 'Signed in' : 'Sign in';
    /* Swap the panel's contents to match the state. */
    if (authForm)     authForm.hidden     = !!s.user;
    if (authSignedIn) authSignedIn.hidden = !s.user;
    if (authWho && s.user) authWho.textContent = s.user.email || 'Signed in';

    /* A failed sign-in is shown right where the password was typed, not in
       the edit bar — that bar is about to be hidden anyway, since a failed
       sign-in means canEdit is still false. */
    if (authErr && s.error && /Sign-in failed/.test(s.error)) {
      authErr.textContent = s.error.replace('Sign-in failed: ', '');
      authErr.hidden = false;
    }

    bar.hidden = !s.canEdit;
    /* Shown to the owner again, not hidden once Firestore is live. Export is
       no longer about publishing the grid — the server does that — it is how
       the offline fallback in apps.js gets refreshed. With no way to re-export,
       that fallback silently rots into last month's grid. Still hidden from
       visitors, who have nothing to export.
    */
    expBtn.hidden = !s.canEdit;
    tag.textContent = !s.connected
      ? 'Offline — changes stay in this browser'
      : (s.saving ? 'Saving…' : 'Live — saved for everyone');

    /* A sign-in error already went to the form above; showing it here too
       would also force the edit bar open for a signed-out visitor who just
       mistyped a password, which is not theirs to see. Every other error
       (a save failing, the read subscription dying) is real operator news and
       belongs in the bar. */
    if (s.error && !/Sign-in failed/.test(s.error)) {
      tag.textContent = s.error;
      bar.hidden = false;
    }

    if (wasEditing !== s.canEdit) renderGrid();
  }

  Store.onChange(syncFromStore);
  syncFromStore(Store);

  /* Remote updates replace the shared array, so the squares do need repainting
     — but the store also emits for things that change no data at all: a save
     starting, the same save finishing, Firestore echoing our own write back
     locally and then again from the server. Rebuilding the grid for each of
     those is what made an open card flash repeatedly after every edit.

     So: compare a signature of what is actually drawn, and only redraw when it
     differs. Typing is unaffected either way — the inputs write to the model
     without re-rendering, and this now stays quiet while they do. */
  var lastSig = appsSignature();

  function appsSignature() {
    var parts = [];
    for (var i = 0; i < appData.length; i++) {
      var a = appData[i];
      parts.push([a.n, a.status || '', a.name || '', a.desc || '', a.url || '',
                  a.shot || '', a.process || '',
                  a._shotPreview ? 1 : 0, a._processPreview ? 1 : 0].join(''));
    }
    /* The synced screenshots belong in this signature too. They arrive on
       their OWN Firestore subscription, separate from the tracker document
       and normally a moment later, because the image documents are far
       bigger. Built from appData alone, the signature looked identical when
       that second delivery landed, so the redraw was skipped and the squares
       kept the flat colour they were first drawn with. Visitors saw a stale
       grid until some unrelated event forced a full render — opening a card
       was the usual one, which is exactly the reported "tap one square and
       the rest appear". The owner never saw it, because shotsCacheRead()
       fills the pictures in from localStorage before the very first render. */
    return parts.join('') + '' + shotsSignature();
  }

  /* Length rather than content: comparing thirty data URLs character by
     character on every store event is real work for no gain, and a replaced
     screenshot practically never encodes to exactly the same size. */
  function shotsSignature() {
    var shots = Store.shots || {};
    var parts = [];
    for (var n in shots) {
      if (!shots.hasOwnProperty(n)) continue;
      var s = shots[n] || {};
      parts.push(n + '' + (s.shot || '').length + '' + (s.process || '').length);
    }
    return parts.sort().join('');
  }

  Store.onChange(function () {
    var sig = appsSignature();
    if (sig === lastSig) return;
    lastSig = sig;
    renderGrid();
  });

  renderGrid();

  buildGame();
  render();
  setView('home');
})();
