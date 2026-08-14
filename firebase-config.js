/* ═══════════════════════════════════════════════════════════════════════
   Firebase connection details.

   Fill these in by following FIREBASE-SETUP.md. Until you do, the site keeps
   working exactly as it does now — edits save to this browser only.

   ── Is it safe that these are visible in the page source? ──
   Yes. A Firebase web apiKey is not a password; it only names which project
   the page is talking to, and Google expects it to be public. What actually
   stops strangers writing to your tracker is the security rules you paste in
   during setup, which run on Google's servers and check the signed-in user.
   That is why the setup guide treats the rules step as the important one.
   ═══════════════════════════════════════════════════════════════════════ */

window.FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDHX3x8AQHYvU-YkcglNRZNhriN-_ej4N4',
  authDomain:        'app-tracker-portfolio.firebaseapp.com',
  projectId:         'app-tracker-portfolio',
  storageBucket:     'app-tracker-portfolio.firebasestorage.app',
  messagingSenderId: '526611098185',
  appId:             '1:526611098185:web:635a805f124615be93ed98'
};

/* Your Google account's user ID. Leave blank for now — sign in once and the
   site will show you the value to paste here. It is also what goes into the
   security rules, so the two must match. */
window.OWNER_UID = 'SzKdhd7KBnduFAtRq8HR0hEViHB3';
