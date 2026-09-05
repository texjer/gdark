// Gmail DarkBox — the on/off switch. Runs at document_start so the
// decision is made before Gmail paints. Sets <html class="gdark"> when
// DarkBox should be active; every rule in darkbox.css is scoped under
// that class, so toggling it is instant and needs no reload.
//
// Settings (extension sync storage, written by the popup):
//   dark     — the manual switch (true = dark). Used when `auto` is 'none'.
//   auto     — 'none' | 'schedule' | 'system': what decides dark/light
//              automatically. 'schedule' is dark between `start` and `end`
//              (HH:MM, may cross midnight); 'system' follows prefers-color-scheme.
//   override — {value, base, at} | null. A manual flip made while `auto` is
//              on: `value` is what the user asked for, `base` is what
//              automation said at that moment, `at` is when. It stays in
//              force only until automation next changes — a schedule
//              boundary passing since `at`, or the system theme flipping —
//              after which automation takes over again and the override
//              is cleared from storage.
//   start/end — the schedule window.
//
// A fresh install has nothing stored, so DEFAULTS is what new users get:
// dark on a 21:00–06:00 schedule. Stored settings always win over it.
//
// Pre-2.3 installs stored a single `mode` (always/schedule/system/off);
// normalize() maps it onto the fields above.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const DEFAULTS = { dark: true, auto: 'schedule', override: null, start: '21:00', end: '06:00' };
  let settings = { ...DEFAULTS };

  function normalize(raw) {
    const s = { ...DEFAULTS, ...raw };
    if (raw.auto === undefined && raw.mode) {
      s.auto = raw.mode === 'schedule' || raw.mode === 'system' ? raw.mode : 'none';
      s.dark = raw.mode !== 'off';
    }
    return s;
  }

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

  // What automation says right now, or null when it's switched off.
  function autoValue() {
    switch (settings.auto) {
      case 'schedule':
        return inWindow(settings.start, settings.end);
      case 'system':
        return matchMedia('(prefers-color-scheme: dark)').matches;
      default:
        return null;
    }
  }

  // Has a schedule boundary (start or end) passed since `at`?
  function crossedSince(at, start, end) {
    const s = toMin(start);
    const e = toMin(end);
    if (!at || s === e) return false;
    const now = Date.now();
    if (now - at >= 864e5) return true;
    const d0 = new Date(at);
    const d1 = new Date(now);
    const a0 = d0.getHours() * 60 + d0.getMinutes();
    const n = d1.getHours() * 60 + d1.getMinutes();
    const between = (x) => (a0 <= n ? x > a0 && x <= n : x > a0 || x <= n);
    return between(s) || between(e);
  }

  function overrideLive(a) {
    const o = settings.override;
    if (!o || a === null || o.base !== a) return false;
    if (settings.auto === 'schedule' && crossedSince(o.at, settings.start, settings.end)) return false;
    return true;
  }

  function shouldBeOn() {
    const a = autoValue();
    if (a === null) return settings.dark;
    if (settings.override && !overrideLive(a)) {
      // Spent: automation moved on. Retire it so it can't resurface when
      // automation later returns to the same state.
      settings.override = null;
      api.storage.sync.set({ override: null });
    }
    return settings.override ? settings.override.value : a;
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

  api.storage.sync.get(null, (stored) => {
    settings = normalize(stored ?? {});
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
