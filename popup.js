// DarkBox popup — reads/writes settings in sync storage; gate.js in the
// Gmail tab reacts to storage.onChanged, so there is nothing to message.
// See the header of gate.js for what each field means.
const api = globalThis.browser ?? globalThis.chrome;
const DEFAULTS = { dark: true, auto: 'schedule', override: null, start: '21:00', end: '06:00' };

const switchBtns = [...document.querySelectorAll('#switch button')];
const radios = [...document.querySelectorAll('input[name="auto"]')];
const schedule = document.getElementById('schedule');
const startEl = document.getElementById('start');
const endEl = document.getElementById('end');
const noteEl = document.getElementById('note');

let settings = { ...DEFAULTS };

const toMin = (t) => t.split(':').map(Number).reduce((h, m) => h * 60 + m);

function inWindow(start, end) {
  const d = new Date();
  const now = d.getHours() * 60 + d.getMinutes();
  const s = toMin(start);
  const e = toMin(end);
  if (s === e) return true;
  return s < e ? now >= s && now < e : now >= s || now < e;
}

function autoValue(s) {
  if (s.auto === 'schedule') return inWindow(s.start, s.end);
  if (s.auto === 'system') return matchMedia('(prefers-color-scheme: dark)').matches;
  return null;
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

function overrideLive(s, a) {
  const o = s.override;
  if (!o || a === null || o.base !== a) return false;
  if (s.auto === 'schedule' && crossedSince(o.at, s.start, s.end)) return false;
  return true;
}

function effective(s) {
  const a = autoValue(s);
  if (a === null) return s.dark;
  return overrideLive(s, a) ? s.override.value : a;
}

function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Explains an active manual override: when automation takes back over.
function noteText(s) {
  const a = autoValue(s);
  if (!overrideLive(s, a)) return '';
  if (s.auto === 'schedule') {
    const next = a ? s.end : s.start;
    return `Flipped by hand — schedule resumes at ${fmtTime(next)}.`;
  }
  return 'Flipped by hand — resumes when your system theme changes.';
}

function render() {
  const on = effective(settings);
  switchBtns.forEach((b) => {
    const isDark = b.dataset.dark === 'true';
    b.setAttribute('aria-checked', String(isDark === on));
  });
  radios.forEach((r) => (r.checked = r.value === settings.auto));
  schedule.classList.toggle('open', settings.auto === 'schedule');
  startEl.value = settings.start;
  endEl.value = settings.end;
  noteEl.textContent = noteText(settings);
  noteEl.hidden = !noteEl.textContent;
}

function save() {
  render();
  const { dark, auto, override, start, end } = settings;
  api.storage.sync.set({ dark, auto, override, start, end });
}

function setDark(want) {
  const a = autoValue(settings);
  if (a === null) {
    settings.dark = want;
    settings.override = null;
  } else {
    // Flip against automation for now; it takes over again once the
    // schedule/system theme next changes. Agreeing with it clears the flip.
    settings.override = a === want ? null : { value: want, base: a, at: Date.now() };
  }
  save();
}

function setAuto(auto) {
  // Keep what's on screen right now so switching modes never flashes.
  settings.dark = effective(settings);
  settings.auto = auto;
  settings.override = null;
  save();
}

function setTimes() {
  settings.start = startEl.value || DEFAULTS.start;
  settings.end = endEl.value || DEFAULTS.end;
  settings.override = null;
  save();
}

api.storage.sync.get(null, (raw) => {
  raw = raw ?? {};
  settings = { ...DEFAULTS, ...raw };
  if (raw.auto === undefined && raw.mode) {
    // Pre-2.3 single `mode` field → new shape; write it back once.
    settings.auto = raw.mode === 'schedule' || raw.mode === 'system' ? raw.mode : 'none';
    settings.dark = raw.mode !== 'off';
    settings.override = null;
    save();
    api.storage.sync.remove('mode');
    return;
  }
  // A flip whose automation state has since changed is spent; tidy it up.
  if (settings.override && !overrideLive(settings, autoValue(settings))) {
    settings.override = null;
    save();
    return;
  }
  render();
});

switchBtns.forEach((b) => b.addEventListener('click', () => setDark(b.dataset.dark === 'true')));
radios.forEach((r) => r.addEventListener('change', () => setAuto(r.value)));
startEl.addEventListener('change', setTimes);
endEl.addEventListener('change', setTimes);
