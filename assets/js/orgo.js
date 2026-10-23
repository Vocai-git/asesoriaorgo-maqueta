// Asesoría Orgo — maqueta v2
// Movimiento con GSAP + ScrollTrigger + SplitText + Lenis. Sin librerías o con "reducir movimiento",
// la página queda estática y completa (menú, estado de oficinas, formulario y subnav siguen funcionando).
(() => {
  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const motion = !reduce && !!(window.gsap && window.ScrollTrigger && window.SplitText);
  const fmt = (n) => Math.round(n).toLocaleString('es-ES');
  const header = $('[data-header]');
  let lenis = null;

  /* ============ 1. UTILIDADES (siempre) ============ */

  // Menú móvil a pantalla completa
  const toggle = $('.menu-toggle');
  const mobileNav = $('#menu-movil');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    mobileNav.classList.toggle('is-open', open);
    doc.classList.toggle('menu-open', open);
    toggle.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
    toggle.querySelector('span').textContent = open ? 'Cerrar' : 'Menú';
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && motion) gsap.from($$('li', mobileNav), { y: 40, autoAlpha: 0, duration: .8, ease: 'expo.out', stagger: .05, delay: .15 });
  }
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    mobileNav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) setMenu(false); });
  }

  // Cabecera: sólida al bajar, se esconde al bajar y vuelve al subir
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY;
    if (header) {
      header.classList.toggle('is-solid', y > 40);
      const hide = y > lastY && y > 480 && !doc.classList.contains('menu-open');
      if (Math.abs(y - lastY) > 4) {
        header.classList.toggle('is-hidden', hide);
        doc.classList.toggle('hdr-hidden', hide);
      }
    }
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Estado de las oficinas en hora de Madrid
  const HOURS = {
    renedo: { 1: [[540, 840], [900, 1080]], 2: [[540, 840], [900, 1080]], 3: [[540, 840], [900, 1080]], 4: [[540, 840], [900, 1080]], 5: [[480, 960]] },
    santander: { 1: [[510, 1020]], 2: [[510, 1020]], 3: [[510, 1020]], 4: [[510, 1020]], 5: [[480, 960]] },
  };
  const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const hhmm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  function madridNow() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return { wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), min: +get('hour') * 60 + +get('minute') };
  }
  function officeStatus(sched) {
    const { wd, min } = madridNow();
    const today = sched[wd] || [];
    const open = today.find(([a, b]) => min >= a && min < b);
    if (open) return { open: true, text: `Abierto ahora · hasta las ${hhmm(open[1])}` };
    const later = today.find(([a]) => a > min);
    if (later) return { open: false, text: `Cerrado · abre hoy a las ${hhmm(later[0])}` };
    for (let i = 1; i <= 7; i++) {
      const d = (wd + i) % 7;
      if (sched[d]) return { open: false, text: `Cerrado · abre ${i === 1 ? 'mañana' : 'el ' + DAYS[d]} a las ${hhmm(sched[d][0][0])}` };
    }
    return null;
  }
  $$('[data-office]').forEach((el) => {
    const st = officeStatus(HOURS[el.dataset.office]);
    if (!st) return;
    el.innerHTML = `<i></i>${st.text}`;
    el.classList.toggle('is-open', st.open);
  });

  // Formulario de demostración: no envía nada
  $$('[data-demo-form]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.querySelector('.form-msg')?.classList.add('is-on');
  }));

  // Aviso de demo
  const toast = $('[data-demo-toast]');
  if (toast) {
    let closed = false;
    try { closed = sessionStorage.getItem('orgo-toast') === '0'; } catch (e) { /* almacenamiento no disponible */ }
    if (!closed) {
      setTimeout(() => {
        toast.hidden = false;
        if (motion) gsap.from(toast, { y: 40, autoAlpha: 0, duration: .8, ease: 'expo.out', clearProps: 'all' });
      }, 3200);
      setTimeout(() => toast.classList.add('is-away'), 14000); // se retira solo; la propuesta sigue en el menú y en el pie
    }
    toast.querySelector('button').addEventListener('click', () => {
      toast.hidden = true;
      try { sessionStorage.setItem('orgo-toast', '0'); } catch (e) { /* almacenamiento no disponible */ }
    });
  }

  // Subnav de servicios: marca el área visible
  const subLinks = $$('.subnav a');
  if (subLinks.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      subLinks.forEach((a) => {
        const on = a.getAttribute('href') === '#' + en.target.id;
        a.classList.toggle('is-active', on);
        if (on) a.closest('ul').scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
      });
    }), { rootMargin: '-40% 0px -55% 0px' });
    $$('[data-spy]').forEach((s) => io.observe(s));
  }

  /* ============ 2. SIN MOVIMIENTO: todo visible y estático ============ */
  if (!motion) {
    doc.classList.remove('motion');
    $('[data-intro]')?.remove();
    $$('.deck-dots').forEach((d) => d.remove());
    if (reduce) $$('[data-packets]').forEach((g) => g.remove());
    return;
  }
  doc.classList.add('anim-ready');
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ============ 3. MOVIMIENTO ============ */

  // Scroll suave (Lenis) sincronizado con ScrollTrigger
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const headerOffset = () => -((header && header.offsetHeight) || 0) - 8;
  function goTo(target, immediate) {
    if (lenis) lenis.scrollTo(target, { offset: headerOffset(), duration: 1.4, immediate: !!immediate, force: true });
    else target.scrollIntoView();
  }
  $$('a[href*="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    // Con el menú abierto, primero se cierra (reactiva Lenis) y después se navega; si no, Lenis corta el desplazamiento
    if (doc.classList.contains('menu-open')) { setMenu(false); requestAnimationFrame(() => goTo(target)); } else goTo(target);
    history.replaceState(null, '', url.hash);
  }));

  // Intro 1975 → 2025 (portada, una vez por sesión)
  function runIntro() {
    const intro = $('[data-intro]');
    if (!intro) return Promise.resolve();
    let seen = false;
    try { seen = sessionStorage.getItem('orgo-intro') === '1'; } catch (e) { /* almacenamiento no disponible */ }
    if (seen || /[?&]nointro/.test(location.search) || location.hash) { intro.remove(); return Promise.resolve(); }
    try { sessionStorage.setItem('orgo-intro', '1'); } catch (e) { /* almacenamiento no disponible */ }
    lenis?.stop();
    const yearEl = $('[data-intro-year]', intro);
    const o = { y: 1975 };
    return new Promise((resolve) => {
      gsap.timeline({ onComplete: () => { intro.remove(); lenis?.start(); } })
        .from($$('.intro-inner > *', intro), { y: 24, autoAlpha: 0, stagger: .08, duration: .6, ease: 'power3.out' })
        .to(o, { y: 2025, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { yearEl.textContent = Math.round(o.y); } }, '-=.2')
        .to($('.intro-line span', intro), { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, '<')
        .to(intro, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, '+=.25')
        .add(resolve, '-=.6');
    });
  }

  // Entrada del hero
  function heroIn() {
    const hero = $('[data-hero-section]') || $('.page-hero');
    const items = hero ? $$('[data-hero]', hero) : [];
    gsap.set(items, { autoAlpha: 1 });
    if (!hero) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    if (header) tl.from(header, { yPercent: -100, duration: 1.1, clearProps: 'transform' }, 0);
    const title = $('[data-hero-title]', hero);
    if (title) {
      const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
      tl.from(split.lines, { yPercent: 115, duration: 1.4, stagger: .11 }, .05);
    }
    const rest = items.filter((el) => el !== title);
    tl.from(rest, { y: 34, autoAlpha: 0, duration: 1.2, stagger: .09 }, .35);
    const cards = $$('.deck-card', hero);
    if (cards.length) tl.from(cards, { yPercent: 0, scale: 1, rotation: 0, duration: 1.5, stagger: .06 }, .55);
    const seal = $('.seal', hero);
    if (seal) tl.from(seal, { scale: 0, rotation: -120, duration: 1.4, ease: 'back.out(1.6)' }, .9);
    if (deckCtl) tl.add(deckCtl.start, 2);
  }

  // Mazo de fotos del hero: la de delante sale volando y pasa al fondo
  const DEPTH = [
    { yPercent: 0, scale: 1, rotation: -2, filter: 'brightness(1)' },
    { yPercent: -7, scale: .93, rotation: 3, filter: 'brightness(.8)' },
    { yPercent: -13, scale: .86, rotation: -4, filter: 'brightness(.65)' },
    { yPercent: -18, scale: .8, rotation: 5, filter: 'brightness(.55)' },
    { yPercent: -22, scale: .75, rotation: -5, filter: 'brightness(.5)' },
  ];
  let deckCtl = null;
  function deck() {
    const el = $('[data-deck]');
    if (!el) return;
    const cards = $$('.deck-card', el);
    const dots = $$('.deck-dots li', el);
    const order = cards.map((_, i) => i); // order[0] = foto que está delante
    const place = (animate) => order.forEach((ci, d) => {
      const vars = { ...DEPTH[Math.min(d, DEPTH.length - 1)], xPercent: 0, zIndex: cards.length - d };
      if (animate) gsap.to(cards[ci], { ...vars, duration: 1, ease: 'expo.out' });
      else gsap.set(cards[ci], vars);
    });
    const setDot = () => dots.forEach((d, i) => {
      d.classList.remove('is-active');
      if (i === order[0]) { void d.offsetWidth; d.classList.add('is-active'); }
    });
    place(false);
    let busy = false;
    const next = () => {
      if (busy) return;
      busy = true;
      const front = cards[order[0]];
      gsap.timeline({ onComplete: () => { busy = false; } })
        .to(front, { xPercent: 75, yPercent: -12, rotation: 16, duration: .5, ease: 'power2.in' })
        .add(() => { order.push(order.shift()); gsap.set(front, { zIndex: 0 }); place(true); setDot(); });
    };
    const tick = gsap.delayedCall(4.2, function () { next(); this.restart(true); }).pause();
    let started = false, hovering = false, inView = true;
    const sync = () => { if (started && inView && !hovering) tick.resume(); else tick.pause(); el.classList.toggle('is-paused', !(started && inView && !hovering)); };
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => { next(); tick.restart(true); if (!(started && inView && !hovering)) tick.pause(); });
    if (fine) {
      el.addEventListener('pointerenter', () => { hovering = true; sync(); });
      el.addEventListener('pointerleave', () => { hovering = false; sync(); });
    }
    ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: (self) => { inView = self.isActive; sync(); } });
    el.classList.add('is-paused');
    deckCtl = { start: () => { started = true; setDot(); sync(); } };
  }

  // Hero: parallax al bajar + inclinación con el ratón
  function heroScroll() {
    const pageWord = $('.page-hero-word');
    if (pageWord) gsap.to(pageWord, { yPercent: -25, ease: 'none', scrollTrigger: { trigger: '.page-hero', start: 'top top', end: 'bottom top', scrub: true } });
    const hero = $('.hero[data-hero-section]');
    if (!hero) return;
    const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    gsap.to($('.hero-50', hero), { yPercent: -30, ease: 'none', scrollTrigger: st });
    // El fundido del contenido solo en escritorio: en móvil el mazo queda al final del hero y se vería apagado
    gsap.matchMedia().add('(min-width: 900px)', () => {
      gsap.to($('.container', hero), { y: -80, opacity: .2, ease: 'none', scrollTrigger: { ...st } });
    });
    $$('.deck-card img', hero).forEach((img) => gsap.fromTo(img, { yPercent: -7, scale: 1.18 }, { yPercent: 7, scale: 1.18, ease: 'none', scrollTrigger: { ...st } }));
    const inner = $('[data-fan-inner]', hero);
    if (fine && inner) {
      const rx = gsap.quickTo(inner, 'rotationX', { duration: .9, ease: 'power3' });
      const ry = gsap.quickTo(inner, 'rotationY', { duration: .9, ease: 'power3' });
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - .5) * 16);
        rx(((e.clientY - r.top) / r.height - .5) * -12);
      });
      hero.addEventListener('pointerleave', () => { rx(0); ry(0); });
    }
  }

  // Cintas: bucle infinito que acelera y cambia de sentido con el scroll
  function marquee() {
    const tweens = $$('[data-marquee]').map((r) => {
      const dir = +r.dataset.marquee;
      const t = gsap.fromTo(r, { xPercent: dir > 0 ? 0 : -50 }, { xPercent: dir > 0 ? -50 : 0, duration: 34, ease: 'none', repeat: -1 });
      t.totalTime(t.duration() * 200); // margen para poder ir hacia atrás al subir
      return t;
    });
    if (!tweens.length) return;
    const speed = { v: 1 };
    const apply = () => tweens.forEach((t) => t.timeScale(speed.v));
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const dir = self.direction || 1;
        const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(self.getVelocity()) / 450);
        gsap.to(speed, { v: dir * boost, duration: .25, overwrite: true, onUpdate: apply });
        gsap.to(speed, { v: dir, duration: 1.4, delay: .25, ease: 'power2.out', onUpdate: apply });
      },
    });
    gsap.fromTo('.ribbon-wrap--front', { rotation: -4 }, { rotation: -1, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.ribbon-wrap--back', { rotation: 4 }, { rotation: 1, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  // Frase que se ilumina palabra a palabra
  function words() {
    $$('[data-words]').forEach((el) => {
      const split = SplitText.create(el, { type: 'words' });
      gsap.fromTo(split.words, { opacity: .13 }, { opacity: 1, ease: 'none', stagger: .1, scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true } });
    });
  }

  // Contadores
  function counters() {
    $$('[data-count]').forEach((el) => {
      const end = +el.dataset.count;
      const o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: end > 100 ? 2.4 : 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } }),
      });
    });
  }

  // Áreas: círculo que sigue al ratón
  function areasCursor() {
    const list = $('[data-areas]');
    const cursor = $('[data-area-cursor]');
    if (!fine || !list || !cursor) return;
    cursor.style.display = 'grid';
    const xTo = gsap.quickTo(cursor, 'x', { duration: .55, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: .55, ease: 'power3' });
    const use = $('use', cursor);
    list.addEventListener('pointerenter', (e) => { gsap.set(cursor, { x: e.clientX + 48, y: e.clientY - 40 }); gsap.to(cursor, { scale: 1, duration: .5, ease: 'back.out(2)' }); });
    list.addEventListener('pointermove', (e) => { xTo(e.clientX + 48); yTo(e.clientY - 40); });
    list.addEventListener('pointerleave', () => gsap.to(cursor, { scale: 0, duration: .35, ease: 'power3.in' }));
    $$('.area-row', list).forEach((row) => row.addEventListener('pointerenter', () => use.setAttribute('href', '#' + row.dataset.icon)));
  }

  // Historia: horizontal fijada (escritorio) / vertical con línea (móvil)
  function story() {
    const section = $('[data-story]');
    if (!section) return;
    const track = $('[data-story-track]', section);
    const chapters = $$('.chapter', track);
    const years = chapters.map((c) => +c.dataset.year);
    const counter = $('[data-story-counter]', section);
    const progress = $('[data-story-progress]', section);
    const finale = $('.chapter--finale', track);
    const finale50 = $('[data-finale-50]', section);
    const count50 = () => { const o = { v: 0 }; gsap.to(o, { v: 50, duration: 1.6, ease: 'power3.out', onUpdate: () => { finale50.textContent = Math.round(o.v); } }); };
    const mm = gsap.matchMedia();

    mm.add('(min-width: 900px)', () => {
      doc.classList.add('story-h');
      const fill = $('i', progress);
      const ticks = chapters.filter((c) => c.hasAttribute('data-tick')).map((c) => {
        const b = document.createElement('b');
        b.textContent = c.dataset.year;
        progress.appendChild(b);
        return { c, b };
      });
      const dist = () => track.scrollWidth - innerWidth;
      let centers = [];
      const measure = () => {
        centers = chapters.map((c) => c.offsetLeft + c.offsetWidth / 2);
        ticks.forEach(({ c, b }) => {
          const p = gsap.utils.clamp(0, 1, (c.offsetLeft + c.offsetWidth / 2 - innerWidth / 2) / dist());
          b.style.left = p * 100 + '%';
          b.dataset.p = p;
        });
      };
      const last = chapters.length - 1;
      const update = (p) => {
        if (!centers.length) measure();
        const x = p * dist() + innerWidth / 2;
        let i = 0;
        while (i < centers.length - 2 && x > centers[i + 1]) i++;
        const f = gsap.utils.clamp(0, 1, (x - centers[i]) / (centers[i + 1] - centers[i]));
        const e = gsap.parseEase('power2.inOut')(gsap.utils.clamp(0, 1, (f - .15) / .7));
        counter.textContent = Math.round(years[i] + (years[i + 1] - years[i]) * e);
        const fin = gsap.utils.clamp(0, 1, (x - centers[last - 1]) / (centers[last] - centers[last - 1]));
        counter.style.opacity = String(1 - fin);
        section.classList.toggle('is-finale', fin > .55);
        fill.style.transform = `scaleX(${p})`;
        ticks.forEach(({ b }) => b.classList.toggle('is-active', p >= +b.dataset.p - .003));
      };
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onRefresh: (self) => { measure(); update(self.progress); },
          onUpdate: (self) => update(self.progress),
          onToggle: (self) => $('[data-demo-toast]')?.classList.toggle('is-away', self.isActive),
        },
      });
      chapters.forEach((c, idx) => {
        if (idx === 0) return;
        const text = $('[data-chapter-text]', c);
        const media = $('[data-chapter-media]', c);
        const st = { trigger: c, containerAnimation: tween, start: 'left 72%', toggleActions: 'play none none reverse' };
        gsap.from(text, { x: 140, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: st });
        if (media) gsap.fromTo(media, { clipPath: 'inset(-12% -12% -12% 112%)' }, { clipPath: 'inset(-12% -12% -12% -12%)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { ...st, start: 'left 62%' } });
        $$('figure img', c).forEach((img) => gsap.fromTo(img, { xPercent: -7, scale: 1.18 }, { xPercent: 7, scale: 1.18, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
      });
      if (finale50) ScrollTrigger.create({ trigger: finale, containerAnimation: tween, start: 'left 55%', onEnter: count50 });
      return () => {
        doc.classList.remove('story-h');
        ticks.forEach(({ b }) => b.remove());
        counter.style.opacity = '';
        section.classList.remove('is-finale');
      };
    });

    mm.add('(max-width: 899px)', () => {
      gsap.fromTo($('[data-story-line]', section), { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: track, start: 'top 70%', end: 'bottom 70%', scrub: true } });
      chapters.forEach((c, idx) => {
        if (idx === 0) return;
        const yearEl = $('[data-chapter-year]', c);
        const st = { trigger: c, start: 'top 82%', once: true };
        gsap.from($('[data-chapter-text]', c), { y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: st });
        const media = $('[data-chapter-media]', c);
        if (media) gsap.fromTo(media, { clipPath: 'inset(100% -12% -12% -12%)' }, { clipPath: 'inset(-12% -12% -12% -12%)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { ...st, start: 'top 75%' } });
        if (yearEl && years[idx - 1] !== years[idx]) {
          const o = { v: years[idx - 1] };
          yearEl.textContent = o.v;
          gsap.to(o, { v: years[idx], duration: 1.3, ease: 'power2.out', scrollTrigger: { ...st }, onUpdate: () => { yearEl.textContent = Math.round(o.v); } });
        }
      });
      if (finale50) ScrollTrigger.create({ trigger: finale, start: 'top 70%', once: true, onEnter: count50 });
    });
  }

  // Diagrama: líneas que se dibujan y nodos que aparecen
  function network() {
    const net = $('[data-net]');
    if (!net) return;
    const st = { trigger: net, start: 'top 72%', once: true };
    gsap.from($('.net-core', net), { scale: .3, autoAlpha: 0, duration: 1.2, ease: 'expo.out', clearProps: 'transform', scrollTrigger: st });
    gsap.fromTo($$('.net-line', net), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', stagger: .1, delay: .2, scrollTrigger: { ...st } });
    gsap.from($$('.net-node', net), { scale: 0, autoAlpha: 0, duration: .9, ease: 'back.out(2)', stagger: .1, delay: .6, clearProps: 'transform', scrollTrigger: { ...st } });
    gsap.from($('[data-packets]', net), { autoAlpha: 0, duration: .8, delay: 1.5, scrollTrigger: { ...st } });
  }

  // Titulares que entran por líneas
  function splits() {
    $$('[data-split]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }),
      });
    });
  }

  // Apariciones genéricas
  function reveals() {
    gsap.set('[data-reveal]', { autoAlpha: 0, y: 44 });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 92%', once: true,
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .07, overwrite: true }),
    });
  }

  // Botones magnéticos
  function magnetic() {
    if (!fine) return;
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .25);
        yTo((e.clientY - r.top - r.height / 2) * .35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  // Barra de progreso y nombre gigante del pie
  function chrome() {
    const bar = $('.scroll-progress');
    if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
    const word = $('.footer-wordmark span');
    if (word) gsap.from(word, { yPercent: 70, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top 85%', end: 'bottom bottom', scrub: true } });
  }

  function start() {
    deck();
    heroScroll();
    marquee();
    words();
    areasCursor();
    story();
    network();
    splits();
    counters();
    reveals();
    magnetic();
    chrome();
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    runIntro().then(heroIn);
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) requestAnimationFrame(() => goTo(target, true));
    }
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
})();
