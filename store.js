/* ═══════════════════════════════════════════════════════════════════════
   Where the tracker's data lives.

   Three jobs, in order of importance:

   1. HOLD THE DATA SOMEWHERE THAT OUTLIVES THIS BROWSER. The tracker is
      stored in Firestore, so clearing browser data — or opening the site on
      a phone, or a visitor loading it from anywhere — all show the same
      thing. localStorage is kept too, but only as a fast local mirror.

   2. LET EXACTLY ONE PERSON EDIT. Anyone may read. Writing needs a signed-in
      account whose id matches OWNER_UID, and that same check is repeated in
      the security rules on Google's servers. The rules are what actually
      enforce it: hiding buttons in the page stops nobody.

   3. NEVER LOSE WORK. Every save also writes a local mirror, and the last
      few versions are kept so an accidental change can be undone.

   If firebase-config.js has not been filled in, none of the above happens and
   the module quietly falls back to localStorage — the site behaves exactly as
   it did before Firebase existed. That keeps the page working while setup is
   still half-finished.
   ═══════════════════════════════════════════════════════════════════════ */

window.Store = (function () {
  'use strict';

  var LS_KEY      = 'mm.apps.draft';
  var LS_HISTORY  = 'mm.apps.history';
  var LS_SHOTS    = 'mm.apps.shots';
  var DOC_PATH    = { collection: 'tracker', doc: 'apps' };
  /* Screenshots live one-document-per-app rather than inside the tracker
     document. Firestore caps a single document at 1MB, and 30 apps with two
     images each would blow straight past that; split up, each document holds
     well under 100KB. This is also what makes the pictures visible to
     everybody — the previous build kept them in localStorage only, so a
     visitor (or the same person on a phone) saw a bare colour. */
  var SHOTS_COLL  = 'shots';
  var HISTORY_MAX = 12;
  var SAVE_DELAY  = 900;      // ms of quiet before a write goes out

  var listeners = [];
  var saveTimer = null;
  var db = null, auth = null;

  var state = {
    ready:     false,   // first load has resolved (from anywhere)
    connected: false,   // Firebase is configured and initialised
    user:      null,    // signed-in account, or null
    canEdit:   false,   // signed in AND recognised as the owner
    saving:    false,
    error:     null,
    apps:      [],
    shots:     {}       // { <app number>: { shot: dataUrl, process: dataUrl } }
  };

  /* ── Local mirror ──────────────────────────────────────────────────── */

  function cacheRead() {
    try {
      var raw = window.localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function cacheWrite(apps) {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(apps));
      return true;
    } catch (e) {
      /* Practically always the ~5MB quota. */
      state.error = 'Local backup copy is full (' + e.message + ').';
      return false;
    }
  }

  /* The images are mirrored locally too, so the grid still draws instantly on
     a repeat visit and keeps working with no connection. Failing to write this
     is not worth surfacing — the pictures come back from the server anyway. */
  function shotsCacheRead() {
    try {
      var raw = window.localStorage.getItem(LS_SHOTS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function shotsCacheWrite(shots) {
    try { window.localStorage.setItem(LS_SHOTS, JSON.stringify(shots)); }
    catch (e) { /* quota — the server copy is the real one */ }
  }

  /* Snapshots so a bad edit is recoverable. Trimmed hard because this shares
     the same 5MB budget as everything else in localStorage. */
  function historyPush(apps) {
    try {
      var raw  = window.localStorage.getItem(LS_HISTORY);
      var list = raw ? JSON.parse(raw) : [];
      var lean = apps.map(function (a) {
        var o = {};
        for (var k in a) if (a.hasOwnProperty(k) && k.charAt(0) !== '_') o[k] = a[k];
        return o;
      });
      list.unshift({ at: Date.now(), apps: lean });
      window.localStorage.setItem(LS_HISTORY, JSON.stringify(list.slice(0, HISTORY_MAX)));
    } catch (e) { /* history is a nicety; never let it break a save */ }
  }

  function historyList() {
    try {
      var raw = window.localStorage.getItem(LS_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  /* ── Notifications ─────────────────────────────────────────────────── */

  function emit() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state); } catch (e) {}
    }
  }

  /* ── Reading and writing the remote copy ───────────────────────────── */

  function docRef() {
    return db.collection(DOC_PATH.collection).doc(DOC_PATH.doc);
  }

  /* Underscored keys are local-only scratch (image previews); they must never
     be uploaded, both to keep the document small and because the real image
     lives in Storage once uploaded. */
  function strip(apps) {
    return apps.map(function (a) {
      var o = {};
      for (var k in a) if (a.hasOwnProperty(k) && k.charAt(0) !== '_') o[k] = a[k];
      return o;
    });
  }

  function shotDoc(n) {
    return db.collection(SHOTS_COLL).doc(String(n));
  }

  /* Writes one app's picture straight away rather than through the debounced
     save — an image is a single deliberate act, not a stream of keystrokes,
     and waiting would leave the grid showing a stale square. */
  function putShot(n, kind, dataUrl) {
    var slot = state.shots[n] || (state.shots[n] = {});
    if (dataUrl) slot[kind] = dataUrl; else delete slot[kind];
    if (!slot.shot && !slot.process) delete state.shots[n];
    shotsCacheWrite(state.shots);
    emit();

    if (!state.connected || !state.canEdit) return Promise.resolve(false);

    var payload = {};
    payload[kind] = dataUrl
      ? dataUrl
      : firebase.firestore.FieldValue.delete();

    state.saving = true; emit();
    return shotDoc(n).set(payload, { merge: true }).then(function () {
      state.saving = false; state.error = null; emit();
      return true;
    }).catch(function (e) {
      state.saving = false;
      state.error  = 'Could not save the image: ' + e.message;
      emit();
      return false;
    });
  }

  function flush() {
    if (!state.connected || !state.canEdit) return Promise.resolve(false);
    state.saving = true; emit();
    return docRef().set({
      apps:      strip(state.apps),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      state.saving = false; state.error = null; emit();
      return true;
    }).catch(function (e) {
      state.saving = false;
      state.error  = 'Could not save to the server: ' + e.message;
      emit();
      return false;
    });
  }

  /* ── Public surface ────────────────────────────────────────────────── */

  var api = {
    get apps()      { return state.apps; },
    get ready()     { return state.ready; },
    get canEdit()   { return state.canEdit; },
    get connected() { return state.connected; },
    get user()      { return state.user; },
    get saving()    { return state.saving; },
    get error()     { return state.error; },
    get shots()     { return state.shots; },

    /* The picture for one app, or '' if it has none. This is what every
       visitor sees, on any device — it comes from the server, not from
       whoever happened to upload the file. */
    shotFor: function (n, kind) {
      var slot = state.shots[n];
      return (slot && slot[kind]) || '';
    },

    saveShot: function (n, kind, dataUrl) { return putShot(n, kind, dataUrl); },
    clearShot: function (n, kind)         { return putShot(n, kind, null); },

    onChange: function (fn) { listeners.push(fn); return fn; },

    /* Called after any edit. Mirrors locally at once (so a crash or a closed
       tab cannot lose the change) and schedules the remote write, coalescing
       rapid edits into one request. */
    save: function () {
      cacheWrite(state.apps);
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        historyPush(state.apps);
        flush();
      }, SAVE_DELAY);
      emit();
    },

    saveNow: function () {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      cacheWrite(state.apps);
      historyPush(state.apps);
      return flush();
    },

    replaceAll: function (apps) {
      state.apps.length = 0;
      for (var i = 0; i < apps.length; i++) state.apps.push(apps[i]);
      api.save();
    },

    /* Email/password rather than a Google popup: it is on the free Spark plan
       with no per-project setup beyond turning the provider on, and — unlike
       the OAuth providers — it does not check the page's domain against an
       authorized-domains list, so there is one less step between here and a
       working sign-in on Hostinger. The account itself is created once, by
       hand, in the Firebase console (see FIREBASE-SETUP.md); nothing here can
       create new accounts, only sign in to one that already exists. */
    signIn: function (email, password) {
      if (!state.connected) {
        window.alert('Firebase is not set up yet — see FIREBASE-SETUP.md.');
        return Promise.resolve(null);
      }
      return auth.signInWithEmailAndPassword(email, password).catch(function (e) {
        state.error = 'Sign-in failed: ' + e.message;
        emit();
        return null;
      });
    },

    signOut: function () {
      return state.connected ? auth.signOut() : Promise.resolve();
    },

    history: historyList,

    restore: function (snapshotApps) {
      api.replaceAll(snapshotApps);
      return api.saveNow();
    },

    /* A real file on disk — the backup that survives anything happening to
       either this browser or the Firebase project. */
    downloadBackup: function () {
      var payload = JSON.stringify(
        { savedAt: new Date().toISOString(), apps: strip(state.apps) }, null, 2);
      var blob = new Blob([payload], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tracker-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }
  };

  /* ── Start-up ──────────────────────────────────────────────────────── */

  function seedLocalOnly() {
    var seed = cacheRead() || (window.APPS || []).slice();
    state.apps.length = 0;
    for (var i = 0; i < seed.length; i++) state.apps.push(seed[i]);
    state.shots = shotsCacheRead();
    /* Without a backend there is no way to tell an owner from a visitor, so
       fall back to the old flag-and-hash behaviour. */
    state.canEdit = (window.APPS_EDITABLE !== false) ||
                    window.location.hash === '#edit';
    state.ready   = true;
    emit();
  }

  function init() {
    var cfg = window.FIREBASE_CONFIG;
    var configured = cfg && cfg.apiKey && cfg.apiKey.indexOf('PASTE') === -1;

    /* Paint immediately from whatever is already known, so the grid never
       flashes empty while the network call is in flight. */
    var seed = cacheRead() || (window.APPS || []).slice();
    for (var i = 0; i < seed.length; i++) state.apps.push(seed[i]);
    emit();

    if (!configured || typeof firebase === 'undefined') {
      seedLocalOnly();
      return;
    }

    try {
      firebase.initializeApp(cfg);
      db   = firebase.firestore();
      auth = firebase.auth();
      state.connected = true;
      /* Draw from the local mirror immediately; the subscription below
         replaces it as soon as the server answers. */
      state.shots = shotsCacheRead();
    } catch (e) {
      state.error = 'Firebase failed to start: ' + e.message;
      seedLocalOnly();
      return;
    }

    auth.onAuthStateChanged(function (user) {
      state.user = user ? { uid: user.uid, name: user.displayName, email: user.email } : null;
      state.canEdit = !!(user && window.OWNER_UID && user.uid === window.OWNER_UID);
      /* First sign-in on a fresh project: OWNER_UID is still blank, so show
         the value that needs pasting into firebase-config.js and the rules. */
      if (user && !window.OWNER_UID) {
        state.error = 'Signed in. Your user ID is ' + user.uid +
                      ' — paste it into firebase-config.js and the security rules.';
      }
      emit();
    });

    /* Live subscription: the owner's saves land on every open page, and a
       visitor's tracker updates without a refresh. */
    docRef().onSnapshot(function (snap) {
      var remote = snap.exists && snap.data() ? snap.data().apps : null;
      if (remote) {
        /* Carry the local-only fields across. The image previews are stripped
           before upload on purpose (Firestore caps a document at 1MB), so a
           straight replace here would wipe every picture on the page the
           moment the first snapshot landed — including right after a save. */
        var localOnly = {};
        for (var k = 0; k < state.apps.length; k++) {
          var a = state.apps[k], keep = null;
          for (var key in a) {
            if (a.hasOwnProperty(key) && key.charAt(0) === '_') {
              (keep = keep || {})[key] = a[key];
            }
          }
          if (keep) localOnly[a.n] = keep;
        }

        state.apps.length = 0;
        for (var j = 0; j < remote.length; j++) {
          var incoming = remote[j];
          var saved = localOnly[incoming.n];
          if (saved) for (var kk in saved) {
            if (saved.hasOwnProperty(kk)) incoming[kk] = saved[kk];
          }
          state.apps.push(incoming);
        }
        cacheWrite(state.apps);
      }
      state.ready = true;
      emit();
    }, function (e) {
      state.error = 'Could not read from the server: ' + e.message;
      state.ready = true;
      emit();
    });

    /* Images ride their own subscription, one document per app, established
       once alongside the tracker's — not inside its callback, which would
       stack a fresh listener on every update. Reading is open to everyone,
       which is the whole point: a visitor on a phone sees the same
       screenshots the owner saved. */
    db.collection(SHOTS_COLL).onSnapshot(function (qs) {
      var next = {};
      qs.forEach(function (d) {
        var v = d.data() || {};
        if (v.shot || v.process) {
          next[d.id] = { shot: v.shot || '', process: v.process || '' };
        }
      });
      state.shots = next;
      shotsCacheWrite(state.shots);
      emit();
    }, function (e) {
      /* Non-fatal: the tracker still works, the pictures just do not appear. */
      state.error = 'Could not load the screenshots: ' + e.message;
      emit();
    });
  }

  init();
  return api;
})();
