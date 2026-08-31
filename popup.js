// DarkBox popup — reads/writes the mode in sync storage; gate.js in the
// Gmail tab reacts to storage.onChanged, so there is nothing to message.
const api = globalThis.browser ?? globalThis.chrome;
const DEFAULTS = { mode: 'always', start: '21:00', end: '07:00' };

const radios = [...document.querySelectorAll('input[name="mode"]')];
const schedule = document.getElementById('schedule');
const startEl = document.getElementById('start');
const endEl = document.getElementById('end');
const statusEl = document.getElementById('status');

const toMin = (t) => t.split(':').map(Number).reduce((h, m) => h * 60 + m);

function activeNow({ mode, start, end }) {
  if (mode === 'off') return false;
  if (mode === 'system') return matchMedia('(prefers-color-scheme: dark)').matches;
  if (mode !== 'schedule') return true;
  const d = new Date();
  const now = d.getHours() * 60 + d.getMinutes();
  const s = toMin(start);
  const e = toMin(end);
  if (s === e) return true;
  return s < e ? now >= s && now < e : now >= s || now < e;
}

function render(settings) {
  radios.forEach((r) => (r.checked = r.value === settings.mode));
  schedule.classList.toggle('open', settings.mode === 'schedule');
  startEl.value = settings.start;
  endEl.value = settings.end;
  const on = activeNow(settings);
  statusEl.textContent = on ? 'on now' : 'off now';
  statusEl.classList.toggle('on', on);
}

function read() {
  return {
    mode: radios.find((r) => r.checked)?.value ?? DEFAULTS.mode,
    start: startEl.value || DEFAULTS.start,
    end: endEl.value || DEFAULTS.end,
  };
}

function save() {
  const s = read();
  render(s);
  api.storage.sync.set(s);
}

api.storage.sync.get(DEFAULTS, (stored) => render({ ...DEFAULTS, ...stored }));
radios.forEach((r) => r.addEventListener('change', save));
startEl.addEventListener('change', save);
endEl.addEventListener('change', save);
