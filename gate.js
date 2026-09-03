// Gmail DarkBox — the on/off switch. Runs at document_start so the
// decision is made before Gmail paints. Sets <html class="gdark"> when
// DarkBox should be active; every rule in darkbox.css is scoped under
// that class, so toggling it is instant and needs no reload.
//
// Modes (stored in extension sync storage, set from the popup):
//   always   — on all the time (default)
//   schedule — on between `start` and `end` (HH:MM, may cross midnight)
//   system   — follow the OS/browser prefers-color-scheme
//   off      — never
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const DEFAULTS = { mode: 'always', start: '21:00', end: '07:00' };
  let settings = { ...DEFAULTS };

  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  function inWindow(start, end) {
    const d = new Date();
    const now = d.getHours() * 60 + d.getMinutes();
    const s = toMin(start);
    const e = toMin(end);
    if (s === e) return true; // 21:00–21:00 reads as "all day"
    return s < e ? now >= s && now < e : now >= s || now < e; // second form crosses midnight
  }

  function shouldBeOn() {
    switch (settings.mode) {
      case 'off':
        return false;
      case 'schedule':
        return inWindow(settings.start, settings.end);
      case 'system':
        return matchMedia('(prefers-color-scheme: dark)').matches;
      default:
        return true;
    }
  }

  // Google Chat documents (the standalone site, and the frames Gmail embeds
  // for the chat panel and pop-up conversations) get a marker class: they
  // have no Gmail reading-pane markup, so darkbox.css gives them a dark
  // base and content.js sweeps the whole body instead.
  const IS_CHAT =
    location.hostname === 'chat.google.com' ||
    location.pathname.startsWith('/chat/');
  if (IS_CHAT) document.documentElement.classList.add('gdb-chat');

  function apply() {
    document.documentElement.classList.toggle('gdark', shouldBeOn());
  }

  api.storage.sync.get(DEFAULTS, (stored) => {
    settings = { ...DEFAULTS, ...stored };
    apply();
  });

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [k, v] of Object.entries(changes)) settings[k] = v.newValue ?? DEFAULTS[k];
    apply();
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
  setInterval(apply, 30 * 1000); // schedule boundary check
})();
