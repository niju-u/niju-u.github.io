/* =========================================================
   Jestin Villegas — Portfolio interactions
   Vanilla JS, no dependencies.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const body = document.body;

  /* ---------- Loader / page entrance ---------- */
  function initLoader() {
    const countEl = $('[data-loader-count]');
    const bar = $('.loader__bar');
    const finish = () => body.classList.add('is-loaded');

    if (reduceMotion || !countEl) { finish(); return; }

    let seen = false;
    try { seen = sessionStorage.getItem('jv-visited') === '1'; sessionStorage.setItem('jv-visited', '1'); } catch (e) { /* storage unavailable */ }

    const duration = seen ? 500 : 1500;
    const start = performance.now();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      countEl.textContent = Math.round(eased * 100);
      bar.style.setProperty('--p', eased);
      if (t < 1) requestAnimationFrame(tick);
      else fontsReady.then(() => setTimeout(finish, 150));
    };
    requestAnimationFrame(tick);

    // Safety net: never trap the visitor behind the loader.
    setTimeout(finish, 4000);
  }

  /* ---------- Nav: scrolled state, hide on scroll, progress ---------- */
  function initNav() {
    const nav = $('[data-nav]');
    const progress = $('.progress');
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      nav.classList.toggle('is-scrolled', y > 20);
      const goingDown = y > lastY && y > 400;
      if (!body.classList.contains('is-locked')) nav.classList.toggle('is-hidden', goingDown);
      progress.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
      lastY = y;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();

    // Active section highlighting
    const links = $$('[data-nav-link]');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        const link = map.get(entry.target.id);
        if (link) link.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => io.observe(s));
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    const toggle = $('[data-menu-toggle]');
    const menu = $('[data-menu]');
    if (!toggle || !menu) return;
    menu.hidden = false;

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
      body.classList.toggle('is-locked', open);
      menu.inert = !open;
      // keep keyboard focus inside the open menu (the toggle in the nav stays usable)
      [$('#main'), $('.footer'), $('.skip-link'), $('.nav__logo')].forEach((el) => { if (el) el.inert = open; });
      if (open) $('[data-nav]').classList.remove('is-hidden');
    };
    setOpen(false);

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    // Stagger siblings that reveal together
    $$('[data-reveal]').forEach((el) => {
      const siblings = $$(':scope > [data-reveal]', el.parentElement);
      const i = siblings.indexOf(el);
      if (i > 0) el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
    });
    $$('[data-reveal-group]').forEach((group) => {
      [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
    });

    const targets = $$('[data-reveal], [data-reveal-group], [data-reveal-lines]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
          if (entry.target.hasAttribute('data-reveal-group')) {
            // clear stagger delays once the entrance is done so hovers feel instant
            setTimeout(() => [...entry.target.children].forEach((c) => c.style.removeProperty('--i')), 1600);
          }
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- Count-up numbers ---------- */
  function initCounters() {
    const els = $$('[data-count]');
    if (reduceMotion) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const end = parseInt(el.dataset.count, 10);
        const start = performance.now();
        const dur = 1400;
        const step = (now) => {
          const t = Math.min((now - start) / dur, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - t, 4)));
          if (t < 1) requestAnimationFrame(step);
        };
        el.textContent = '0';
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Parallax (hero shapes + project images) ---------- */
  function initParallax() {
    if (reduceMotion) return;
    const layers = $$('[data-parallax]');
    const frames = $$('[data-parallax-img]');
    const hero = $('.hero');
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;

      if (y < hero.offsetHeight) {
        layers.forEach((el) => {
          const f = parseFloat(el.dataset.parallax) || 0;
          el.style.transform = `translate3d(0, ${(y * f).toFixed(1)}px, 0)`;
        });
      }

      frames.forEach((frame) => {
        const r = frame.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        // progress: -1 (below viewport) → 1 (above)
        const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        frame.style.setProperty('--py', `${(-6 + p * 5).toFixed(2)}%`);
      });
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Hero spotlight ---------- */
  function initSpotlight() {
    const hero = $('.hero');
    const spot = $('[data-spotlight]');
    if (!finePointer || !spot) return;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      spot.style.setProperty('--mx', `${e.clientX - r.left}px`);
      spot.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  /* ---------- Custom cursor ---------- */
  function initCursor() {
    if (!finePointer || reduceMotion) return;
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    document.documentElement.classList.add('has-cursor');

    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();

    document.addEventListener('pointerover', (e) => {
      const labelled = e.target.closest('[data-cursor]');
      const interactive = e.target.closest('a, button, .el, .chip');
      if (labelled) {
        label.textContent = labelled.dataset.cursor;
        cursor.classList.add('is-label');
        cursor.classList.remove('is-hover');
      } else if (interactive) {
        cursor.classList.add('is-hover');
        cursor.classList.remove('is-label');
      } else {
        cursor.classList.remove('is-hover', 'is-label');
      }
    });
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagnetic() {
    if (!finePointer || reduceMotion) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Skill elements: glow follow + subtle tilt ---------- */
  function initElements() {
    const items = $$('[data-tilt]');
    if (finePointer && !reduceMotion) {
      items.forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          el.style.setProperty('--gx', `${px * 100}%`);
          el.style.setProperty('--gy', `${py * 100}%`);
          el.style.transform = `perspective(600px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 8}deg)`;
        });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      });
    }

    // Category filter
    const chips = $$('[data-filter]');
    chips.forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.classList.contains('is-active')));
      chip.addEventListener('click', () => {
        const f = chip.dataset.filter;
        chips.forEach((c) => {
          const on = c === chip;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', String(on));
        });
        items.forEach((el) => el.classList.toggle('is-dim', f !== 'all' && el.dataset.cat !== f));
      });
    });
  }

  /* ---------- Copy email ---------- */
  function initCopy() {
    $$('[data-copy]').forEach((btn) => {
      const toast = btn.parentElement.querySelector('.copy-toast');
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
          toast.textContent = 'Copied to clipboard';
        } catch (e) {
          toast.textContent = 'Press Ctrl+C to copy';
        }
        toast.classList.add('is-visible');
        clearTimeout(btn._t);
        btn._t = setTimeout(() => toast.classList.remove('is-visible'), 2200);
      });
    });
  }

  /* ---------- Local time + year ---------- */
  function initClock() {
    const el = $('[data-clock]');
    const year = $('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
    if (!el) return;
    const fmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
    const tick = () => { el.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- Disabled links are not focus traps ---------- */
  function initDisabledLinks() {
    $$('a[aria-disabled="true"]').forEach((a) => {
      a.setAttribute('tabindex', '-1');
      a.addEventListener('click', (e) => e.preventDefault());
    });
  }

  initLoader();
  initNav();
  initMenu();
  initReveal();
  initCounters();
  initParallax();
  initSpotlight();
  initCursor();
  initMagnetic();
  initElements();
  initCopy();
  initClock();
  initDisabledLinks();
})();
