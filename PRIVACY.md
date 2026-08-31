# Privacy Policy — gDark

*Effective: August 31, 2026*

gDark (the "extension") darkens parts of Gmail's interface. It is designed to
collect no data whatsoever.

## Data collection

None. The extension does not collect, store, transmit, sell, or share any
user data, and has no way to: it makes no network requests, loads no remote
code, and contains no analytics or telemetry of any kind.

## What is stored

Your display preference — the chosen mode (always on / on a schedule /
follow system / off) and two schedule times — is saved in your browser's
extension storage (`storage.sync`). This stays in your browser (and, if you
use your browser's built-in sync, your browser account's sync service, under
the browser vendor's own privacy policy). The developer never receives it.

## What is read

The extension's content scripts run only on mail.google.com. They inspect
the colors of page elements to decide what to darken. The content of your
email is never read as text, stored, or transmitted.

## Permissions

- `storage` — saves the preference described above.
- `mail.google.com` — the only site the extension runs on.

## Changes and contact

Any change to this policy will appear in this file's history in the public
source repository: https://github.com/texjer/gdark

Questions: open an issue on the repository above.
