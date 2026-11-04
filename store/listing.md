# Store listing copy — DarkBox

Same zip (`dist/gdark-<version>.zip`) goes to both stores. Keep the copy
keyword-dense for the searches people actually type: "gmail dark mode
extension", "gmail dark mode white area", "gmail reading pane white",
"gmail dark theme email still white".

## Name (33 chars — AMO cap 50, Chrome cap 75)

    GDark: Dark mode for Gmail & Chat

## Summary (AMO, ≤250 chars) / short description

Gmail's Dark theme still opens every email as a big white area, and light themes are bright all over. This tool darkens all of it, on any theme. On the Dark theme it only touches the white areas. No data collected. Optional night-only schedule.

## Description (both stores — AMO shows the first 250 chars above the fold)

Already switched Gmail to its Dark theme and still getting blinded every time you open an email? Same. Gmail's dark theme darkens the inbox, sidebar and toolbars — but the message you're actually reading, and the box you type your reply in, stay a huge bright white card. DarkBox darkens that card. On a light or picture theme, it darkens the inbox, sidebar and toolbars too.

Most "dark mode for Gmail" extensions want to re-theme all of Gmail, or invert every website you visit. If you're happy with Google's own dark theme and just want the white areas gone, this is the small, boring fix.

**What it darkens**

- The email you're reading (the white card in the reading pane)
- The inline reply / forward box, including the To / Cc / Bcc rows and the formatting toolbar
- Gmail's own controls inside that card: subject, sender, dates, Reply / Forward buttons, "Show trimmed content"
- On a light or picture theme: the inbox list, sidebar and toolbars as well (a picture theme's image is hidden while dark mode is on)

**What it leaves alone**

- On Gmail's Dark theme: the inbox list, the sidebar, everything outside the card
- Emails that were already designed dark (they're detected and not re-inverted into blinding white)
- Photos and logos — images are counter-inverted so they look normal

**Controls (click the toolbar button)**

- A Light / Dark switch — one click flips it
- Dark on a schedule — for example dark from 9 pm to 6 am (the default for new installs) and Gmail's normal look during the day, even if your system theme is dark all the time
- Follow system dark mode
- Flip the switch any time — the schedule or system rule takes back over at its next change
- Off

**How it works**

Gmail's own interface inside the card gets real dark colors. The email body — arbitrary HTML from whoever sent it — is inverted with a hue rotation, the same trick Dark Reader uses, but confined to the one white area Gmail forgot. It's one stylesheet and a small script that only runs on mail.google.com. No background process, nothing on other sites.

**Privacy**

No accounts, no analytics, no network requests. The only thing stored is your chosen mode and schedule, in the browser's own extension storage.

Works with any Gmail theme. Firefox 127 or newer. Not affiliated with Google; Gmail is a trademark of Google LLC.

## Categories / tags

- AMO category: **Appearance** (secondary: Productivity)
- AMO tags: dark mode, gmail, theme, night mode, email
- Chrome category: **Productivity** → or "Fun / Appearance" if offered
- Chrome language: English

## Permissions explanation (AMO asks; Chrome asks in "Privacy practices")

- `storage` — remembers your mode and schedule.
- Host `mail.google.com` — the only site the stylesheet and script run on.
- Data collection: **none**. Single purpose (Chrome): "Darkens the white
  email reading pane in Gmail."

## Screenshots to take (1280×800, PNG)

Use a throwaway or scrubbed inbox — screenshots are public.

1. Before/after split of a mock inbox (made-up email) — `screenshot-1-before-after.png`.
2. The same split with a reply open: To row, toolbar, Smart Compose — `screenshot-3-reply.png`.
   Both come from `node store/make-art.mjs`, so no real inbox is ever shown.
5. The same split over a Google Chat conversation — `screenshot-4-chat.png` (also make-art.mjs).
3. The popup — `node store/make-popup-shot.mjs` renders it with a schedule on and a
   hand-flipped Dark (`screenshot-2-modes.png`).
4. (optional) A dark-designed newsletter left un-inverted.

## Promo video (Chrome only — AMO has no video field)

`node store/make-video.mjs` → `store/promo-video.mp4` (1920×1080, ~34 s, silent):
the logo flies into a browser toolbar, a cursor opens the popup and flips the switch
(dark spreads out from it), then the reply and chat scenes push in with the handle sweeping.
`node store/make-video.mjs 6.5 9` writes stills at those seconds for checking a frame.
Chrome wants a YouTube URL, not a file — upload it (unlisted is fine) and paste the link.

## Submission checklist

**Firefox (AMO)** — free, needed even for your own permanent install
1. https://addons.mozilla.org/developers/ → sign in with a Firefox account.
2. Submit a New Add-on → **On this site** (listed) → upload the zip.
3. Firefox + Android: pick Firefox only.
4. Fill name/summary/description/categories/tags/icon (`icons/icon-128.png`)
   and screenshots from above. Support email or URL: your texs.org address.
5. License: pick one (MIT is fine). Privacy policy: paste the PRIVACY
   paragraph; it's required only if you collect data, but it doesn't hurt.
6. Submit. Small add-ons are usually auto-signed and public within minutes
   to hours; human review can follow later. Once approved, install it from
   the listing — that copy survives restarts.

**Chrome Web Store** — one-time US$5 developer registration
1. https://chrome.google.com/webstore/devconsole → pay the fee, verify email.
2. New item → upload the same zip.
3. Store listing: name, summary, description, category, language,
   128 px icon, screenshots (1280×800 or 640×400).
4. Privacy practices tab: single purpose (above), permission justifications
   (above), "does not collect user data", certify compliance.
5. Distribution: public, all regions. Submit for review (usually 1–3 days).

## Chrome graphic assets
- Store icon 128×128: `icons/icon-128.png`
- Screenshots: the `store/screenshot-*.png` files above (1280×800, 24-bit PNG, no alpha)
- Small promo tile 440×280 + marquee 1400×560: `node store/make-art.mjs` → `store/promo-small.png`, `store/promo-marquee.png`
  (the same run also writes screenshots 1 and 3; pass names to render only some)
