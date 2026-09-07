/* ═══════════════════════════════════════════════════════════════════════
   The 30-app challenge — the data.

   THIS FILE IS THE SOURCE OF TRUTH for what visitors see. Every square starts
   red and empty; click any of them to set a status, a title, a description,
   a link and images. Those edits live in this browser's localStorage only,
   so nobody else can see them. When it looks right press "Export" and paste
   the result over the APPS array below. That paste is what publishes it.

   status:
     'todo'      → red square (the default; a square with no entry here is todo)
     'started'   → amber square
     'published' → screenshot fills the square, number on a green circle.
                   With no screenshot yet, the whole square goes green.

   Images live in web/images/apps/. The editor suggests the filename and hands
   you the file already renamed — save it into that folder.
   ═══════════════════════════════════════════════════════════════════════ */

/* The in-page editor. Leave it true while you are filling the grid in.
   Set it to FALSE before publishing the site: with it on, anyone visiting
   gets the status pickers and text fields too. Flipping this to false leaves
   the editor reachable at the #edit URL, just not on by default. */
window.APPS_EDITABLE = false;

/* The offline fallback. Firestore is the live copy and always wins — the moment
   its first snapshot lands it replaces everything below. This is what the page
   draws BEFORE that answer arrives, and what it keeps drawing if the answer
   never comes: a blocked CDN, an ad-blocker or firewall that eats
   firestore.googleapis.com, a dropped connection mid-load. Left empty, every
   one of those cases showed a visitor thirty blank red squares and "0 shipped".
   Re-paste this from the Export button whenever the grid changes; stale is
   fine (the live copy overrides it), empty is not. */
window.APPS = [
  {"n":1,"status":"published","name":"30AppsbySep30 Tracker","desc":"Testing","url":"localhost:8000","shot":"images/apps/01-30appsbysep30-tracker.png","process":""},
  {"n":2,"status":"published","name":"Wizard Timer","desc":"Click the X (hide) in the corner to carry it over as a pop-up. I'll clarify it later, it is what it is for now. You'll get new pets with updates too. ","url":"https://wizard-timer.vercel.app/","shot":"images/apps/02-wizard-timer.png","process":""},
  {"n":3,"status":"published","name":"Dino Game But It EVOLVES","desc":"","url":"https://dinogamebutitevolves.vercel.app/","shot":"images/apps/03-app.png","process":""},
  {"n":4,"status":"published","name":"Magical Morning Journal","desc":"Get your Morning Journaling & Meditaiton habit easily with this app. It's much more fun when there is a wizard called Aldric waiting for your journaling.","url":"https://prompted-journal.vercel.app/","shot":"images/apps/04-magical-morning-journal.png","process":""},
  {"n":5,"status":"published","name":"Anxiety Management Gamified Course","desc":"","url":"https://anxiety-management-course.vercel.app/","shot":"images/apps/05-app.png","process":""},
  {"n":6,"status":"published","name":"Deep Work - Focused Hours Tracker","desc":"","url":"https://deep-focus-tracker.vercel.app/","shot":"","process":""},
  {"n":7,"status":"published","name":"Job Stories","desc":"","url":"https://mariannemiettinen.github.io/job-stories/","shot":"","process":""},
  {"n":8,"status":"published","name":"","desc":"","url":"","shot":"","process":""},
  {"n":9,"status":"published","name":"DJ Jam Maker","desc":"Simple Music Maker App.","url":"https://jam-maker.vercel.app/","shot":"","process":""},
  {"n":10,"status":"published","name":"Margorn: Distraction to Action","desc":"Track if you take action daily or not","url":"https://distraction-to-action.vercel.app/","shot":"","process":""},
  {"n":11,"status":"published","name":"My Meals: Meal Pattern Insights","desc":"","url":"https://my-meals-ashy.vercel.app/","shot":"","process":""},
  {"n":12,"status":"published","name":"Geo Dash 3D","desc":"","url":"","shot":"","process":""},
  {"n":13,"status":"started","name":"Dance Break Reminder","desc":"","url":"","shot":"","process":""},
  {"n":14,"status":"published","name":"Stoic Principles","desc":"This is a game where you learn the prinicples of the stoic philosophy whilst playing through the world.","url":"https://stoic-principles.vercel.app/","shot":"","process":""},
  {"n":15,"status":"started","name":"Speaking Morning Coach","desc":"","url":"","shot":"","process":""},
];

/* How many squares the grid draws, total. */
window.APPS_TARGET = 30;
