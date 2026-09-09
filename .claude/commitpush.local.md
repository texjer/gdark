# /commitpush extras — gdark

There is no CI: nothing reaches users until the zip is submitted to the two
stores. `./publish.sh` builds `dist/gdark-<version>.zip` and submits it to the
Chrome Web Store and Firefox Add-ons in one go (credentials in
`~/secrets/_Code/browser-stores.env` plus the `.env` symlink; see `.env.example`).

**Do not run it automatically.** A submission is public, enters store review,
and can't be taken back — and a store rejects a re-upload of a version number
that already exists, so it only makes sense once per version bump. Instead:

```bash
git diff --name-only <before>..HEAD -- manifest.json gate.js content.js darkbox.css popup.html popup.js popup.css icons
```

- **Empty output → say nothing.** Only `store/`, `README.md`, journal or script
  changes went out; there is nothing to ship.
- **Non-empty → tell Tex in the summary** whether `manifest.json` version
  changed in this push, and offer the next step: `./publish.sh --dry-run`
  (checks credentials, uploads nothing), then `./publish.sh`. If the version
  did *not* change, say so — shipped files moved but the version still matches
  what's already live, so a bump is needed first (`./publish.sh 2.3.2` bumps
  the manifest, builds and submits in one command).

Ask before submitting, every time, even if Tex approved a publish earlier in
the session. The auto-mode classifier also blocks the upload from a tool call,
so the reliable way to run it is Tex typing `! ./publish.sh` in the prompt.

Store *listing text* (`store/listing.md`) can't be set through the Chrome API —
wording changes there still get pasted into both dashboards by hand. Mention it
if `store/listing.md` changed.
