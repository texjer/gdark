# /commitpush extras — gdark

There is no CI on push: nothing reaches users until a zip is submitted to the
two stores. Two ways to ship, same `publish.sh` behind both — GitHub Actions on
a version tag (`.github/workflows/publish.yml`, credentials in repo secrets),
or `./publish.sh` locally (credentials in `~/secrets/_Code`).

**Never ship unasked.** A submission is public, enters store review, can't be
taken back, and a store rejects a re-upload of a version number that already
exists — so it only makes sense once per version bump. After pushing:

```bash
git diff --name-only <before>..HEAD -- manifest.json gate.js content.js darkbox.css popup.html popup.js popup.css icons
```

- **Empty output → say nothing.** Only `store/`, docs, journal or script
  changes went out; there is nothing to ship.
- **Non-empty → report it and offer the next step**, saying whether the
  `manifest.json` version changed in this push:
  - version changed → offer to tag it: `git tag v<version> && git push --tags`,
    which is what triggers the workflow. Ask first; wait for a yes.
  - version unchanged → say so plainly. Shipped files moved but the version
    still matches what's live, so it needs a bump before anything can go out
    (`./publish.sh 2.3.2 --dry-run` bumps the manifest and validates without
    uploading; commit that, then tag).

Both paths are fine to run from here once Tex says yes. `./publish.sh` needs
`Bash(./publish.sh:*)` in `.claude/settings.local.json` — without it the
classifier blocks the upload and Tex has to type `! ./publish.sh` himself.

Store *listing text* (`store/listing.md`) can't be set through the Chrome API —
wording changes there still get pasted into both dashboards by hand. Mention it
if `store/listing.md` changed.
