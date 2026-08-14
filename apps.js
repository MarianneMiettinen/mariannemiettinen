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
window.APPS_EDITABLE = true;

/* Empty on purpose — all 30 squares start identical. */
window.APPS = [];

/* How many squares the grid draws, total. */
window.APPS_TARGET = 30;
