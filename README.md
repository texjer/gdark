# GDark — dark mode for Gmail's white areas & Google Chat

Dark-modes **just the white email card** in Gmail's reading pane — the message
you're reading and the inline reply box — leaving the rest of your Gmail theme
untouched. Also darkens Google Chat — the chat panel and pop-up
conversations inside Gmail, and the standalone chat.google.com. Works in
Firefox and Chrome from one folder (Manifest V3).

**Install:** [Firefox Add-ons (AMO)](https://addons.mozilla.org/firefox/) and the
Chrome Web Store — both listings are in review; links land here once live.

Toolbar popup has a **Light / Dark** switch plus an optional automatic rule:
**Dark on a schedule** (new installs start on 21:00 → 06:00; crosses midnight fine) or **Follow
system dark mode**. Flipping the switch while a rule is on overrides it just for
now — the rule takes back over the next time it would have changed anyway.
Changes apply instantly in open Gmail tabs.

## Files

| file | job |
|---|---|
| `gate.js` | runs at `document_start`; reads the settings from sync storage and sets `<html class="gdark">` when DarkBox should be on; re-checks every 30 s and on any settings change |
| `darkbox.css` | every rule is scoped under `html.gdark`, so the sheet is inert unless gate.js turns it on |
| `content.js` | tags already-dark emails so they aren't inverted, and sweeps the card for white chrome the static CSS missed; only runs while active |
| `popup.html/js/css` | the toolbar popup — writes `{dark, auto, override, start, end}` to `storage.sync` |
| `icons/` | toolbar and store icon — the original envelope-shaped M scaled to fill the box, pieced together like the whatfont-ext G: coral→blue legs, a coral→blue left diagonal, a pale→blue right diagonal, no tile; `icon.svg` and the PNGs are written by `scripts/icons.mjs` |
| `scripts/icons.mjs` | parametric icon generator; `--sheet` renders a contact sheet of variants to `scripts/sheet.png` (uses `../vhs-label-maker`'s Playwright, or `PLAYWRIGHT=<path>`) |
| `build.sh` | zips the shippable files into `dist/gdark-<version>.zip` |
| `store/listing.md` | AMO / Chrome Web Store listing copy and submission checklist |

## How it works

- The reading-pane card (`div.nH.a98.iY`) gets a dark background, and Gmail's
  own chrome inside it (subject, sender, dates, Reply/Forward buttons, compose
  toolbar) gets explicit light colors.
- The email body itself is arbitrary sender HTML, so it's darkened with
  `filter: invert(1) hue-rotate(180deg)` (the Dark Reader trick) — images and
  videos are counter-inverted so photos look normal.
- `content.js` detects emails that are *already* dark-designed and skips
  inverting them, so they don't flip to blinding white.

## Develop / test locally

**Firefox** — `about:debugging#/runtime/this-firefox` → *Load Temporary
Add-on…* → pick `manifest.json`. This is discarded when Firefox restarts;
for a permanent install use the signed build from AMO (see below).

**Chrome** — `chrome://extensions` → *Developer mode* → *Load unpacked* →
pick this folder. (Chrome warns about the Firefox-only
`browser_specific_settings` key; harmless.)

Lint before shipping: `npx web-ext lint --source-dir . --ignore-files 'dist/**' 'build.sh' 'README.md' 'store/**' 'scripts/**' 'icons/icon.svg'`

## Release

`./publish.sh 2.3.1` bumps `manifest.json`, builds `dist/gdark-2.3.1.zip`, and
submits it to both stores through
[publish-browser-extension](https://github.com/aklinker1/publish-browser-extension)
(Chrome Web Store API v2 with a service account; AMO with a JWT key pair).
Credentials: `~/secrets/_Code/browser-stores.env` holds the service account,
publisher id and AMO key pair shared by all texs.org extensions; `.env` (a
symlink to `~/secrets/_Code/gdark/.env`) holds this extension's ids — keys in
`.env.example`. `./publish.sh --dry-run` checks the credentials without
uploading.

The stores' listing text can't be set through the Chrome API, so wording
changes in `store/listing.md` still get pasted into the dashboards by hand.

Or let GitHub do it: `.github/workflows/publish.yml` runs the same
`publish.sh` when a version tag is pushed, so a release is

```sh
./publish.sh 2.3.2 --dry-run   # bumps manifest.json, checks credentials
git commit -am "2.3.2" && git push
git tag v2.3.2 && git push --tags
```

The workflow refuses to run if the tag and `manifest.json` disagree. Its
credentials are repo secrets rather than `~/secrets`, set once with:

```sh
gh secret set CHROME_SERVICE_ACCOUNT_KEY < ~/secrets/_Code/<service-account>.json
gh secret set CHROME_PUBLISHER_ID        # and CHROME_EXTENSION_ID
gh secret set FIREFOX_JWT_ISSUER         # and FIREFOX_JWT_SECRET, FIREFOX_EXTENSION_ID
```

Actions tab → Publish → Run workflow does a credentials-only dry run.

Manual fallback: bump the version, `./build.sh`, upload the zip at
https://addons.mozilla.org/developers/ and
https://chrome.google.com/webstore/devconsole.

Firefox only runs Mozilla-signed extensions, so the AMO upload is what makes
the install survive restarts — even for your own use. Minimum Firefox is 127,
the first version that grants `content_scripts` host access at install time
(older MV3 Firefox left it off until the user enabled it by hand).

## Tuning

Colors live at the top of `darkbox.css` (`#1c1c21` card, `#e3e3e8`
pre-invert body → ~`#17171c` after inversion). Gmail's obfuscated class names
(`iY`, `a3s`, `M9`, `J-Z`) have been stable for years; if Google ever renames
them, update the selectors in `darkbox.css`.

Known limits:

- The standalone compose popup (bottom-right window) and the pop-out reply are
  not darkened — only the reading pane card.
- An email that mixes a dark hero section into a light layout gets whichever
  treatment the area-weighted vote in `content.js` picks for the whole message.

## Security & privacy

No accounts, no analytics, no network requests, no remote code, no third-party
libraries. Permissions are `storage` (your switch + schedule) and
`mail.google.com` + `chat.google.com` (the only sites the content scripts run on). The zip uploaded
to the stores is built by `build.sh` from these exact files.

## License

[MIT](LICENSE)
