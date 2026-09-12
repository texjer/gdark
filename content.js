// Gmail DarkBox — two jobs:
// 1. Tag message bodies that are ALREADY dark with .gdb-no-invert so
//    darkbox.css skips inverting them (otherwise a dark-designed
//    newsletter would flip to blinding white).
// 2. Sweep the card for Gmail chrome the static CSS missed — any
//    still-white element gets .gdb-dim, any dark text on a dark
//    background gets .gdb-lighten — or .gdb-tint, if it is a color
//    carrying meaning. This catches things whose class names vary or
//    that we haven't enumerated (translate banner, "You were BCC'd"
//    banner, undo/redo pill, future Gmail churn).
//
// Gating: gate.js flags <html class="gdark"> when DarkBox is active.
// The sweeps only run while that class is present (the CSS is inert
// without it anyway), and a full sweep fires the moment it appears so a
// scheduled switch-on catches up immediately.
//
// Flash avoidance: mutations are processed SYNCHRONOUSLY in the
// MutationObserver callback, which runs as a microtask before the
// browser paints — a white element added to the DOM is dimmed before it
// is ever visible. Hidden elements (closed menus) are processed too, so
// they are already dark when they open. A periodic full sweep mops up
// anything that changed color without a childList/attribute mutation.

(() => {
  const DARK_LUMINANCE = 110; // 0–255; below this a background counts as dark
  const html = document.documentElement;
  const active = () => html.classList.contains('gdark');
  // In a Google Chat document (standalone site, or the frames Gmail embeds
  // for the chat panel and pop-up conversations) everything is Google
  // chrome — no arbitrary sender HTML — so the whole body is swept and no
  // invert filter is needed. In the Gmail document proper, the containers
  // are the reading-pane card, the pop-up "New Message" compose dialog, and
  // Gmail's pop-up menus (.J-M — appended to <body>, outside the dialog;
  // already-dark ones are untouched because the sweep only ever dims
  // near-white backgrounds).
  const IS_CHAT = html.classList.contains('gdb-chat');
  const CONTAINER = IS_CHAT ? 'body' : '.iY, .nH.Hd, .J-M';

  function parseRgb(rgb) {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) < 0.5) return null; // effectively transparent
    return [+m[1], +m[2], +m[3]];
  }

  function lumOf(c) {
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function hslOf(c) {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
    return [h, s, l];
  }

  // Colored text that is too dark for the dark surface now behind it —
  // Gmail's amber "You were BCC'd on this message" banner, warning reds,
  // link blues. The .gdb-lighten rule skips these on purpose: flattening
  // them to gray would throw away the meaning the color carries. So keep
  // the hue and lift the lightness instead. The value differs per element,
  // so it rides on a custom property that darkbox.css reads; with the
  // gdark class absent that rule is inert, like every other sweep tag.
  function processTint(el, c) {
    if (!c || el.classList.contains('gdb-tint')) return;
    if (lumOf(c) >= 120) return;
    const [h, s, l] = hslOf(c);
    if (s < 0.2 || l > 0.5) return; // gray (gdb-lighten's job), or light enough
    const sat = Math.round(Math.min(s, 0.85) * 100);
    el.style.setProperty('--gdb-tint', `hsl(${Math.round(h)}, ${sat}%, 72%)`);
    el.classList.add('gdb-tint');
  }

  // --- job 1: skip inverting emails that are already dark ---------------

  // Area-weighted vote over elements that declare an explicit background.
  // Plain-text emails declare none and fall through to "not dark" → inverted,
  // which is correct for default black-on-white text.
  function emailLooksDark(body) {
    let darkArea = 0;
    let lightArea = 0;
    const els = body.querySelectorAll('*');
    const limit = Math.min(els.length, 80);
    for (let i = 0; i < limit; i++) {
      const c = parseRgb(getComputedStyle(els[i]).backgroundColor);
      if (!c) continue;
      const r = els[i].getBoundingClientRect();
      const area = r.width * r.height;
      if (lumOf(c) < DARK_LUMINANCE) darkArea += area;
      else lightArea += area;
    }
    return darkArea > lightArea * 1.5 && darkArea > 10000;
  }

  function tagDarkEmails() {
    for (const body of document.querySelectorAll('.iY .a3s:not([data-gdb])')) {
      body.dataset.gdb = '1';
      if (emailLooksDark(body)) body.classList.add('gdb-no-invert');
    }
  }

  // --- job 2: sweep for missed white chrome / dark-on-dark text ---------

  // effective background: walk up until something paints
  function effectiveBgLuminance(el) {
    let e = el;
    while (e && !e.matches(CONTAINER)) {
      const c = parseRgb(getComputedStyle(e).backgroundColor);
      if (c) return lumOf(c);
      e = e.parentElement;
    }
    return 20; // the card itself is dark
  }

  // Material state layers (pressed / selected toolbar toggles) and some
  // backdrops are ::before/::after pseudo-elements — no classList, so tag
  // the host and let darkbox.css restyle the pseudo-element.
  function processPseudo(el) {
    for (const [pseudo, cls] of [['::before', 'gdb-dim-before'], ['::after', 'gdb-dim-after']]) {
      if (el.classList.contains(cls)) continue;
      const ps = getComputedStyle(el, pseudo);
      if (ps.content === 'none' || ps.content === 'normal') continue;
      const c = parseRgb(ps.backgroundColor);
      if (c && lumOf(c) > 210) el.classList.add(cls);
    }
  }

  // Chat-only helpers ---------------------------------------------------

  // monochrome dark SVG icons (compose row, header buttons) are invisible
  // on the dark base; invert them, but never a colorful logo
  function processSvg(el) {
    if (el.classList.contains('gdb-svg')) return;
    const s = getComputedStyle(el);
    const f = parseRgb(s.fill) || parseRgb(s.color);
    if (!f || lumOf(f) >= 120 || Math.max(...f) - Math.min(...f) >= 50) return;
    const parts = el.querySelectorAll('path, circle, rect, polygon');
    for (let i = 0; i < Math.min(parts.length, 12); i++) {
      const pf = parseRgb(getComputedStyle(parts[i]).fill);
      if (pf && Math.max(...pf) - Math.min(...pf) >= 50) return; // colorful — leave it
    }
    el.classList.add('gdb-svg');
  }

  // light gray separator borders (conversation list rows) stay glaring on
  // dark; tag them so the CSS darkens the border color
  function processBorders(el, s) {
    if (el.classList.contains('gdb-border')) return;
    for (const side of ['Top', 'Bottom', 'Left', 'Right']) {
      if (parseFloat(s[`border${side}Width`]) > 0) {
        const c = parseRgb(s[`border${side}Color`]);
        if (c && lumOf(c) > 150 && Math.max(...c) - Math.min(...c) < 50) {
          el.classList.add('gdb-border');
          return;
        }
      }
    }
  }

  // The compose box: Google paints its rounded container with a translucent
  // blue ::before (a tint over whatever is behind). Tag that container so
  // darkbox.css can repaint the tint as one solid surface for the toolbar
  // row and the message field together.
  // The wrappers between the field and that container get .gdb-field-wrap:
  // only those may go transparent — popups that Google mounts inside the
  // same container (the "+" Workspace tools menu, slash-command list) must
  // keep the dimmed background the sweep gives them.
  function processCompose(tb) {
    const chain = [];
    for (let e = tb.parentElement; e && e !== document.body; e = e.parentElement) {
      if (e.classList.contains('gdb-compose')) break;
      const ps = getComputedStyle(e, '::before');
      if (ps.content !== 'none' && ps.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        e.classList.add('gdb-compose');
        break;
      }
      chain.push(e);
    }
    for (const e of chain) e.classList.add('gdb-field-wrap');
  }

  // Chat renders some overlays (hovercards etc.) inside shadow roots, which
  // neither the injected stylesheet nor querySelectorAll can reach. Adopt
  // each open shadow root: inject the sweep styles, observe it, sweep it.
  const shadowStyles = [];
  const seenRoots = new WeakSet();
  const SHADOW_CSS = `
.gdb-dim { background-color: #26262c !important; }
.gdb-dim2 { background-color: #34343c !important; }
.gdb-dim-before::before, .gdb-dim-after::after { background-color: #3f3f48 !important; }
.gdb-lighten { color: #d8d8de !important; }
.gdb-tint { color: var(--gdb-tint) !important; }
.gdb-blue { color: #8ab4f8 !important; }
.gdb-border { border-color: #3f3f48 !important; }
.gdb-svg { filter: invert(0.75) hue-rotate(180deg); }
::selection { background-color: #3b5b8f !important; color: #f2f2f5 !important; }
`;
  function adoptShadowRoot(root) {
    if (seenRoots.has(root)) return;
    seenRoots.add(root);
    const st = document.createElement('style');
    st.textContent = SHADOW_CSS;
    root.appendChild(st);
    st.disabled = !active();
    shadowStyles.push(st);
    observer.observe(root, OBS_OPTS);
    for (const el of root.querySelectorAll('*')) processEl(el);
  }

  function processEl(el) {
    if (el.nodeType !== 1) return;
    const s = getComputedStyle(el);
    processPseudo(el);
    if (IS_CHAT) {
      if (el instanceof SVGSVGElement) return processSvg(el);
      if (el.getAttribute('role') === 'textbox') processCompose(el);
      processBorders(el, s);
      if (el.shadowRoot) adoptShadowRoot(el.shadowRoot);
    }

    // near-white background → dim (never images). Two levels so hover /
    // selected rows (light gray on white) stay distinguishable once dark.
    if (
      el.tagName !== 'IMG' &&
      el.tagName !== 'VIDEO' &&
      !el.classList.contains('gdb-dim') &&
      !el.classList.contains('gdb-dim2')
    ) {
      const c = parseRgb(s.backgroundColor);
      if (c && lumOf(c) > 210) {
        el.classList.add(lumOf(c) > 242 ? 'gdb-dim' : 'gdb-dim2');
        // the surface just went dark under whatever color it hands its
        // children, so lift that color here too — icons drawn with
        // currentColor (the banner's ⓘ) inherit it and follow along
        processTint(el, parseRgb(s.color));
        return;
      }
    }

    // dark text directly on a dark background → lighten.
    // Saturated colors (links, accents) keep their meaning — except chat's
    // deep blue (#0b57d0 on chips, links, "more unread"), which glares on
    // dark and gets swapped for Google's own dark-surface blue.
    if (el.classList.contains('gdb-lighten') || el.classList.contains('gdb-blue')) return;
    const hasText = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim()
    );
    if (hasText) {
      const c = parseRgb(s.color);
      if (IS_CHAT && c && c[2] > c[0] + 80 && c[2] > c[1] + 40 && lumOf(c) < 110) {
        el.classList.add('gdb-blue');
        return;
      }
      if (c && lumOf(c) < 120 && effectiveBgLuminance(el) < 90) {
        if (Math.max(...c) - Math.min(...c) < 50) el.classList.add('gdb-lighten');
        else processTint(el, c); // saturated — keep the hue, raise the lightness
      }
    }
  }

  function excluded(el) {
    if (IS_CHAT) return false; // everything in a chat document is Google chrome
    return !el.closest(CONTAINER) || !!el.closest('.a3s, .Am.editable');
  }

  function processTree(root) {
    if (root.nodeType !== 1 || !root.closest || excluded(root)) return;
    processEl(root);
    for (const el of root.querySelectorAll('*')) {
      if (!el.closest('.a3s, .Am.editable')) processEl(el);
    }
  }

  function fullSweep() {
    if (!active()) return;
    for (const card of document.querySelectorAll(CONTAINER)) {
      processEl(card); // a menu's own white backdrop is the container itself
      for (const el of card.querySelectorAll('*')) {
        if (!el.closest('.a3s, .Am.editable')) processEl(el);
      }
    }
    tagDarkEmails();
  }

  // An ancestor's class swap (e.g. the compose dialog finishing its open
  // animation) recolors descendants without mutating them, so the
  // per-element handling above misses it. Re-sweep the whole container
  // shortly after any burst of mutations inside it — turns a 5 s wait for
  // the safety-net sweep into ~200 ms.
  const pendingContainers = new Set();
  let containerSweepTimer;
  function scheduleContainerSweep(container) {
    pendingContainers.add(container);
    clearTimeout(containerSweepTimer);
    containerSweepTimer = setTimeout(() => {
      for (const c of pendingContainers) {
        if (!c.isConnected) continue;
        processEl(c);
        for (const el of c.querySelectorAll('*')) {
          if (!el.closest('.a3s, .Am.editable')) processEl(el);
        }
        if (c.matches('.iY')) tagDarkEmails();
      }
      pendingContainers.clear();
    }, 200);
  }

  let emailTagPending;
  const observer = new MutationObserver((mutations) => {
    // gate.js flipped us on/off → catch up, and sync shadow-root styles
    if (mutations.some((m) => m.target === html && m.type === 'attributes')) {
      for (const st of shadowStyles) st.disabled = !active();
      if (active()) fullSweep();
    }
    if (!active()) return;
    for (const m of mutations) {
      const t = m.target;
      if (t.nodeType === 1 && t.closest && !t.closest('.a3s, .Am.editable')) {
        const c = t.closest(CONTAINER); // typing in the body doesn't count
        if (c) scheduleContainerSweep(c);
      }
      if (m.type === 'childList') {
        for (const n of m.addedNodes) processTree(n);
      } else if (m.type === 'attributes') {
        // a class/style swap can turn an element white in place;
        // reprocessing is idempotent, so our own class adds are no-ops
        if (m.target.nodeType === 1 && !excluded(m.target)) {
          processEl(m.target);
        }
      }
    }
    // message bodies build progressively — debounce the dark-email vote
    clearTimeout(emailTagPending);
    emailTagPending = setTimeout(tagDarkEmails, 150);
  });
  const OBS_OPTS = {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  };
  observer.observe(document.documentElement, OBS_OPTS);

  // safety net for changes that slip past the observer
  setInterval(fullSweep, 5000);

  fullSweep();
})();
