# gDark — dark mode for Gmail's white areas

Dark-modes **just the white email card** in Gmail's reading pane — the message
you're reading and the inline reply box — leaving the rest of your Gmail theme
untouched. Works in Firefox and Chrome from one folder (Manifest V3).

**Install:** [Firefox Add-ons (AMO)](https://addons.mozilla.org/firefox/) and the
Chrome Web Store — both listings are in review; links land here once live.

Toolbar popup picks the mode: **Always on**, **On a schedule** (e.g. 21:00 →
07:00, crosses midnight fine), **Follow system dark mode**, or **Off**.
Changes apply instantly in open Gmail tabs.

## Files

| file | job |
|---|---|
| `gate.js` | runs at `document_start`; reads the mode from sync storage and sets `<html class="gdark">` when DarkBox should be on; re-checks every 30 s and on any settings change |
| `darkbox.css` | every rule is scoped under `html.gdark`, so the sheet is inert unless gate.js turns it on |
| `content.js` | tags already-dark emails so they aren't inverted, and sweeps the card for white chrome the static CSS missed; only runs while active |
| `popup.html/js/css` | the toolbar popup — writes `{mode, start, end}` to `storage.sync` |
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

Lint before shipping: `npx web-ext lint --source-dir . --ignore-files 'dist/**' 'build.sh' 'README.md' 'store/**' 'icons/icon.svg'`

## Release

1. Bump `version` in `manifest.json`.
2. `./build.sh` → `dist/gdark-<version>.zip`.
3. Upload the same zip to https://addons.mozilla.org/developers/ and
   https://chrome.google.com/webstore/devconsole. Listing copy is in
   `store/listing.md`.

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
libraries. Permissions are `storage` (your mode + schedule) and
`mail.google.com` (the only site the content scripts run on). The zip uploaded
to the stores is built by `build.sh` from these exact files.

## License

[MIT](LICENSE)
