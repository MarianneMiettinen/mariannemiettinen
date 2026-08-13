# Putting the tracker online

Right now the site works, but every edit lives only in your browser. This guide
connects it to Firebase so that:

- your progress — status, title, description, link — shows for **everyone who
  visits**, from any device
- your edits **survive clearing your browser**, or getting a new laptop
- **only you** can change anything
- you never edit a `.js` file again to update a square's status or text

Budget for about 20 minutes. Everything here stays on Firebase's free **Spark**
plan — no card required, nothing to accidentally get billed for.

**You keep Hostinger**, for two things:

1. Your domain and site files stay exactly where they are — no DNS changes.
2. **Screenshots stay files you upload yourself**, exactly like today. Firebase
   changed its pricing in 2024 so that image hosting (Cloud Storage) now needs
   the paid Blaze plan — see [Google's own notice on the
   change](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
   Since only the *status* needs to be shared live, this build skips Storage
   entirely and keeps images on Hostinger, which avoids that cost completely.

---

## Step 1 — Make the Firebase project

1. Go to <https://console.firebase.google.com> and sign in with whichever
   Google account you want to own this (it's just the project owner — visitors
   never see or need this account).
2. **Create a project**. Name it anything (`marianne-portfolio` is fine).
3. Google Analytics — turn it **off**. You don't need it.

## Step 2 — Create the database

1. Left sidebar → **Build → Firestore Database** → **Create database**.
2. Choose **Start in production mode**. (Test mode leaves it open to the world
   for 30 days — we paste proper rules in Step 4 anyway.)
3. Location: pick a European one — `eur3` or `europe-west1`. Pick carefully:
   **this cannot be changed later.**

## Step 3 — Turn on sign-in, and make your one account

This is **not** a Google sign-in — it's a plain email and password, and you
choose both. Nobody else can create an account; there's no public sign-up.

1. **Build → Authentication** → **Get started**.
2. In the provider list, choose **Email/Password** → toggle **Enable** →
   **Save**.
3. Go to the **Users** tab → **Add user**.
4. Enter any email address (it doesn't need to be real or ever checked — it's
   just an identifier) and a password you'll remember. This is what you'll type
   into the site to edit it, so keep it somewhere safe. **Save**.

## Step 4 — Copy your connection details into the site

1. Click the **gear icon** (top left) → **Project settings**.
2. Scroll to **Your apps** → click the **web icon** (`</>`).
3. Nickname it anything → **Register app**. Skip "Firebase Hosting" — you're
   not using it.
4. You'll see a `firebaseConfig` block. Copy each value into
   **`firebase-config.js`**, replacing every `PASTE_FROM_FIREBASE`.

It should end up looking like this — real values, quotes kept:

```js
window.FIREBASE_CONFIG = {
  apiKey:            'AIzaSy...',
  authDomain:        'your-project.firebaseapp.com',
  projectId:         'your-project',
  storageBucket:     'your-project.firebasestorage.app',
  messagingSenderId: '123456789012',
  appId:             '1:1234:web:abcd'
};
```

> **These values are meant to be public.** A Firebase `apiKey` is not a
> password — it only names which project the page is talking to. What actually
> protects your tracker is Step 5. Don't skip Step 5.

## Step 5 — Find your user ID, then lock it down

**First, get your ID:**

1. Open the site (locally, `http://localhost:8000` is fine for this step) and
   click **Sign in** (top right). A small form drops down.
2. Enter the email and password you set in Step 3 → **Sign in**.
3. A bar appears at the bottom reading *"Your user ID is …"*. Copy that value.
4. Paste it into `firebase-config.js` as `OWNER_UID`:
   ```js
   window.OWNER_UID = 'the-long-string-you-copied';
   ```

**Then, lock the doors:**

5. Firebase console → **Firestore Database → Rules**. Delete what's there,
   paste the contents of **`firestore.rules`**, replace `PASTE_YOUR_UID_HERE`
   with the same ID, and press **Publish**.

This is the step that makes it safe to leave on the public internet. Without
it, anyone signed in — or reading the page's source — could rewrite your
tracker. The page hides its edit buttons from visitors, but hiding a button
stops nobody; this rule runs on Google's servers and refuses the write itself.

*(There's no domain-authorization step here — that only applies to Google-style
sign-in. Plain email/password isn't restricted by domain, so it works on
Hostinger with no extra setup.)*

## Step 6 — Upload to Hostinger

Upload the whole `web` folder's contents to your Hostinger public folder
(usually `public_html`), via **hPanel → File Manager** or FTP:

```
index.html   app.js   apps.js   store.js   firebase-config.js
styles.css   images/
```

`firestore.rules` and this guide are for you, not the server — uploading them
does nothing, but they're also harmless if you do.

---

## After it's working

Open your site, click **Sign in**, enter your email and password, and the edit
controls appear. Change a square, and the status/title/description/link are
live for everyone in about a second. Sign out and you see exactly what a
visitor sees.

The bottom bar tells you which mode you're in:

| It says | What that means |
|---|---|
| *Live — saved for everyone* | Connected. Text and status are saving to Firebase. |
| *Saving…* | A write is in flight. |
| *Offline — changes stay in this browser* | Not connected. Check Steps 4–5. |

## Screenshots — the one manual step

Drop an image on a card exactly as before. You'll see it immediately (a local
preview, just for you), and a **Download as …** button appears with the file
already renamed correctly. Save that file into `web/images/apps/` and upload it
to Hostinger the same way you upload everything else. Once it's there, everyone
sees it — the *path* to the file synced the instant you dropped it; only the
file itself needs the manual step.

## Your safety net

Three layers, because losing this work would be miserable:

1. **Firestore** holds the real copy of your text and statuses. Independent of
   your browser.
2. **A local mirror** in your browser means a dropped connection or a closed
   tab never loses the change in front of you.
3. **Download backup** writes a `.json` file to your computer. *Restore from
   file* reads it back. This is the one that survives everything, including
   the Firebase project itself. Worth clicking every so often.

**Undo last change** steps back through the last dozen saves if you break
something by accident.

## If something goes wrong

| Symptom | Cause |
|---|---|
| *Sign-in failed* under the password field | Wrong email/password, or Step 3's account wasn't created. |
| Signed in, but no edit controls appear | `OWNER_UID` doesn't match the account you signed in with — recheck Step 5. |
| *Missing or insufficient permissions* | Rules not published, or the UID inside them doesn't match. |
| Bar says *Offline* | A `PASTE_FROM_FIREBASE` value is still in `firebase-config.js`. |
| Screenshot doesn't show for visitors | The file hasn't been uploaded to Hostinger yet — the path saves before the file exists. |
