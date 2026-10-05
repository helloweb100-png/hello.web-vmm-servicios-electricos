/* ==========================================================================
   V.M.M. SERVICIOS DE ELECTRICIDAD · main.js
   JavaScript vanilla (sin dependencias). Módulos:
   01 Config y utilidades        07 Marquee reactivo al scroll
   02 Preloader                  08 Manifiesto, contadores y reveals
   03 Header, menú y navegación  09 Servicios (panel de interruptores)
   04 Motor de scroll            10 Hogar/negocio · Minisplit
   05 Hero: UI                   11 Autodiagnóstico
   06 Hero: canvas de circuitos  12 FAQ · Formulario · WhatsApp · Cursor
   ========================================================================== */
(() => {
    'use strict';

    /* ======================================================================
       01 · CONFIG Y UTILIDADES
       ====================================================================== */
    const CONFIG = {
        whatsapp: '528443317091',          // WhatsApp principal (con lada de país)
        autoplayMs: 7000                   // tiempo entre cambios del panel de servicios
    };

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (a, b) => a + Math.random() * (b - a);
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isDesktop = () => window.innerWidth >= 900;
    const waUrl = text => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

    // Cola de tareas que esperan a que el preloader termine
    const readyQueue = [];
    let isReady = false;
    const onReady = fn => (isReady ? fn() : readyQueue.push(fn));

    // Visibilidad compartida del hero (para pausar animaciones fuera de pantalla)
    const heroState = { visible: true };

    /* ======================================================================
       02 · PRELOADER — "Energizando sistema"
       ====================================================================== */
    function initLoader() {
        const loader = $('#loader');
        const body = document.body;
        if (!loader) { finishLoading(); return; }

        const pctEl = $('#loaderPct');
        const barEl = $('#loaderBar');
        const arcEl = $('#loaderArc');
        const statusEl = $('#loaderStatus');
        const steps = [
            [0, 'Verificando conexiones…'],
            [32, 'Balanceando cargas…'],
            [64, 'Cerrando circuito…'],
            [92, 'Sistema energizado']
        ];

        const minDuration = reduced ? 350 : 2400;
        const hardLimit = 7500;
        const t0 = performance.now();
        let loaded = document.readyState === 'complete';
        let p = 0;
        let finished = false;
        window.addEventListener('load', () => { loaded = true; }, { once: true });

        function paint(v) {
            const n = Math.round(v);
            pctEl.textContent = n;
            barEl.style.transform = `scaleX(${v / 100})`;
            arcEl.style.strokeDashoffset = v <= 0.5 ? 101 : 100 - v;
            for (let i = steps.length - 1; i >= 0; i--) {
                if (v >= steps[i][0]) { if (statusEl.textContent !== steps[i][1]) statusEl.textContent = steps[i][1]; break; }
            }
        }

        function tick(now) {
            if (finished) return;
            const elapsed = now - t0;
            const timePart = clamp(elapsed / minDuration, 0, 1);
            const canFinish = (loaded && elapsed >= minDuration) || elapsed >= hardLimit;
            const goal = canFinish ? 100 : Math.min(93, easeOut(timePart) * 93);
            p = lerp(p, goal, canFinish ? 0.18 : 0.1);
            if (canFinish && p > 99.4) { p = 100; paint(100); complete(); return; }
            paint(p);
            requestAnimationFrame(tick);
        }

        function complete() {
            finished = true;
            loader.classList.add('is-on');            // interruptor ON + destello
            setTimeout(() => {
                loader.classList.add('is-done');      // puertas se abren
                setTimeout(finishLoading, 380);       // el hero arranca mientras abren
                setTimeout(() => loader.classList.add('is-gone'), 1500);
            }, reduced ? 120 : 800);
        }

        requestAnimationFrame(tick);
    }

    function finishLoading() {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        isReady = true;
        readyQueue.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    }

    /* ======================================================================
       03 · HEADER, MENÚ MÓVIL Y NAVEGACIÓN
       ====================================================================== */
    function initHeader() {
        const header = $('#header');
        const btn = $('#menuBtn');
        const menu = $('#menu');
        if (!header || !btn || !menu) return;

        const setMenu = open => {
            btn.setAttribute('aria-expanded', String(open));
            btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            menu.classList.toggle('is-open', open);
            menu.setAttribute('aria-hidden', String(!open));
            document.body.classList.toggle('menu-open', open);
            if (open) header.classList.remove('is-hidden');
        };
        btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
        $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
        window.addEventListener('resize', () => { if (isDesktop()) setMenu(false); });

        // Sección activa en nav y rail
        const links = $$('[data-nav]');
        const dots = $$('.rail a');
        const ids = ['inicio', 'servicios', 'soluciones', 'minisplit', 'diagnostico', 'proceso', 'nosotros', 'faq', 'contacto'];
        const secs = ids.map(id => document.getElementById(id)).filter(Boolean);
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (!e.isIntersecting) return;
                    const id = e.target.id;
                    links.forEach(a => a.classList.toggle('is-active', a.dataset.nav === id));
                    dots.forEach(a => a.classList.toggle('is-active', a.dataset.target === id));
                });
            }, { rootMargin: '-45% 0px -50% 0px' });
            secs.forEach(s => io.observe(s));
        }
    }

    /* ======================================================================
       04 · MOTOR DE SCROLL (un solo listener, rAF)
       ====================================================================== */
    const scrollTasks = [];
    function initScrollEngine() {
        const header = $('#header');
        const bar = $('#progressBar');
        const rail = $('#rail');
        const heroInner = $('.hero__inner');
        let lastY = window.scrollY;
        let ticking = false;

        const update = () => {
            ticking = false;
            const y = window.scrollY;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

            if (header) {
                header.classList.toggle('is-scrolled', y > 24);
                const goingDown = y > lastY + 4;
                const goingUp = y < lastY - 4;
                if (y > 420 && goingDown && !document.body.classList.contains('menu-open')) header.classList.add('is-hidden');
                else if (goingUp || y <= 420) header.classList.remove('is-hidden');
            }
            if (rail) rail.classList.toggle('is-visible', y > window.innerHeight * 0.5);

            // El hero se desvanece suavemente al salir
            if (heroInner && y < window.innerHeight * 1.2) {
                const k = clamp(y / (window.innerHeight * 0.9), 0, 1);
                heroInner.style.transform = `translate3d(0, ${y * 0.16}px, 0)`;
                heroInner.style.opacity = String(1 - k * 0.85);
            }

            scrollTasks.forEach(fn => fn(y, y - lastY));
            lastY = y;
        };
        const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
        window.addEventListener('scroll', request, { passive: true });
        window.addEventListener('resize', request);
        update();
    }

    /* ======================================================================
       05 · HERO: UI (neón, palabras rotativas, tilt 3D, voltaje)
       ====================================================================== */
    function initHeroUI() {
        const hero = $('#inicio');
        if (!hero) return;

        // --- Neón: letras que parpadean como un tubo
        const neon = $('#neonWord');
        if (neon) {
            const text = neon.textContent;
            neon.setAttribute('aria-label', text);
            neon.textContent = '';
            const chars = [...text].map(ch => {
                const s = document.createElement('span');
                s.className = 'nc';
                s.setAttribute('aria-hidden', 'true');
                s.textContent = ch;
                neon.appendChild(s);
                return s;
            });
            if (!reduced) {
                const flicker = () => {
                    if (heroState.visible && !document.hidden) {
                        const picks = [chars[Math.floor(Math.random() * chars.length)]];
                        if (Math.random() < 0.4) picks.push(chars[Math.floor(Math.random() * chars.length)]);
                        picks.forEach(c => c.classList.add('is-off'));
                        setTimeout(() => picks.forEach(c => c.classList.remove('is-off')), 70 + Math.random() * 90);
                        if (Math.random() < 0.5) {
                            setTimeout(() => picks.forEach(c => c.classList.add('is-off')), 190);
                            setTimeout(() => picks.forEach(c => c.classList.remove('is-off')), 270);
                        }
                    }
                    setTimeout(flicker, rand(1800, 4200));
                };
                setTimeout(flicker, 3500);
            }
        }

        // --- Palabra rotativa
        const words = $$('.swap__word');
        if (words.length > 1 && !reduced) {
            let i = 0;
            setInterval(() => {
                if (!heroState.visible || document.hidden) return;
                const cur = words[i];
                i = (i + 1) % words.length;
                const next = words[i];
                cur.classList.remove('is-active');
                cur.classList.add('is-leaving');
                next.classList.add('is-active');
                setTimeout(() => cur.classList.remove('is-leaving'), 650);
            }, 2600);
        }

        // --- Tilt 3D de la tarjeta
        const card = $('#heroCard');
        const visual = $('.hero__visual');
        let swayT = 0;
        if (card && visual && !reduced) {
            if (finePointer) {
                hero.addEventListener('pointermove', e => {
                    if (e.pointerType !== 'mouse' || !isDesktop()) return;
                    const r = visual.getBoundingClientRect();
                    const x = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1);
                    const y = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1);
                    card.classList.remove('is-resting');
                    card.style.setProperty('--ry', `${x * 11}deg`);
                    card.style.setProperty('--rx', `${-y * 9}deg`);
                });
                hero.addEventListener('pointerleave', () => {
                    card.classList.add('is-resting');
                    card.style.setProperty('--ry', '0deg');
                    card.style.setProperty('--rx', '0deg');
                });
            }
        }

        // --- Onda + lectura de voltaje (≈30 fps, solo visible)
        const wave = $('#waveLine');
        const volt = $('#voltRead');
        let lastFrame = 0;
        let voltAt = 0;
        const loop = now => {
            requestAnimationFrame(loop);
            if (!heroState.visible || document.hidden || now - lastFrame < 33) return;
            lastFrame = now;
            const t = now / 1000;
            if (wave) {
                let d = '';
                const amp = 9 * (0.85 + 0.15 * Math.sin(t * 1.3));
                for (let x = 0; x <= 120; x += 4) {
                    const y = 16 + Math.sin((x / 120) * Math.PI * 4 + t * 5) * amp;
                    d += `${x ? 'L' : 'M'}${x} ${y.toFixed(1)} `;
                }
                wave.setAttribute('d', d);
            }
            if (volt && now - voltAt > 450) {
                voltAt = now;
                volt.textContent = `${(127 + (Math.random() - 0.5) * 0.8).toFixed(1)} V`;
            }
            // En pantallas táctiles la tarjeta "respira" sola
            if (card && !finePointer && !reduced) {
                swayT = t;
                card.style.setProperty('--ry', `${Math.sin(swayT * 0.8) * 5}deg`);
                card.style.setProperty('--rx', `${Math.cos(swayT * 0.6) * 3}deg`);
            }
        };
        if (!reduced) requestAnimationFrame(loop);
        else if (wave) { wave.setAttribute('d', 'M0 16 Q15 2 30 16 T60 16 T90 16 T120 16'); }
    }

    /* ======================================================================
       06 · HERO: CANVAS DE CIRCUITOS, PULSOS, RAYOS Y PARTÍCULAS
       ====================================================================== */
    function initHeroCanvas() {
        const canvas = $('#heroCanvas');
        const hero = $('#inicio');
        const flashEl = $('#heroFlash');
        if (!canvas || !hero || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');

        const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
        const TURNS = [1, -1, 1, -1, 2, -2];

        let W = 0, H = 0, dpr = 1, cell = 56;
        let staticLayer = null;
        let paths = [], vertices = [], pulses = [], particles = [], bolts = [], arcs = [];
        const mouse = { x: -9999, y: -9999, active: false };
        let running = false, raf = 0, last = 0, nextBolt = 0, nextArc = 0, jagTime = 0;
        let jag = new Array(64).fill(0);
        const tmpA = { x: 0, y: 0 }, tmpB = { x: 0, y: 0 };

        const sprite = (r, g, b) => {
            const s = document.createElement('canvas');
            s.width = s.height = 64;
            const c = s.getContext('2d');
            const grd = c.createRadialGradient(32, 32, 0, 32, 32, 32);
            grd.addColorStop(0, 'rgba(255,255,255,1)');
            grd.addColorStop(0.2, `rgba(${r},${g},${b},0.95)`);
            grd.addColorStop(0.5, `rgba(${r},${g},${b},0.32)`);
            grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
            c.fillStyle = grd;
            c.fillRect(0, 0, 64, 64);
            return s;
        };
        const glowY = sprite(255, 206, 50);
        const glowB = sprite(110, 160, 255);

        function pointAt(path, dist, out) {
            const { cum, pts } = path;
            const d = clamp(dist, 0, path.total);
            let lo = 0, hi = cum.length - 1;
            while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
            const seg = cum[hi] - cum[lo] || 1;
            const t = (d - cum[lo]) / seg;
            out.x = pts[lo].x + (pts[hi].x - pts[lo].x) * t;
            out.y = pts[lo].y + (pts[hi].y - pts[lo].y) * t;
            return out;
        }

        function newPulse(path) {
            return {
                path, d: Math.random() * path.total, lastD: 0,
                speed: rand(80, 220), dir: Math.random() < 0.5 ? 1 : -1,
                len: rand(60, 130), blue: Math.random() < 0.34
            };
        }

        function build() {
            const mobile = W < 700;
            cell = mobile ? 44 : 56;
            const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
            paths = []; vertices = []; pulses = []; particles = [];
            const count = mobile ? 10 : clamp(Math.round(W / 62), 14, 30);

            for (let i = 0; i < count; i++) {
                let gx = Math.floor(Math.random() * (cols + 1));
                let gy = Math.floor(Math.random() * (rows + 1));
                let k = [0, 2, 4, 6][Math.floor(Math.random() * 4)];
                const pts = [{ x: gx * cell, y: gy * cell }];
                const segs = 3 + Math.floor(Math.random() * 4);
                for (let s = 0; s < segs; s++) {
                    const len = 2 + Math.floor(Math.random() * 5);
                    const nx = clamp(gx + DIRS[k][0] * len, 0, cols);
                    const ny = clamp(gy + DIRS[k][1] * len, 0, rows);
                    if (nx !== gx || ny !== gy) { gx = nx; gy = ny; pts.push({ x: gx * cell, y: gy * cell }); }
                    k = (k + TURNS[Math.floor(Math.random() * TURNS.length)] + 8) % 8;
                }
                if (pts.length < 3) continue;
                const cum = [0];
                for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y));
                const path = { pts, cum, total: cum[cum.length - 1], verts: [] };
                pts.forEach((pt, j) => {
                    const v = { x: pt.x, y: pt.y, e: 0, end: j === 0 || j === pts.length - 1 };
                    path.verts.push(v); vertices.push(v);
                });
                paths.push(path);
            }
            paths.forEach(p => { const n = Math.random() < 0.6 ? 1 : 2; for (let j = 0; j < n; j++) pulses.push(newPulse(p)); });

            const pc = mobile ? 26 : 64;
            for (let i = 0; i < pc; i++) {
                particles.push({ x: rand(0, W), y: rand(0, H), vy: rand(6, 26), vx: rand(-4, 4), r: rand(0.7, 1.9), ph: rand(0, 6.28), blue: Math.random() < 0.4 });
            }
            renderStatic();
        }

        function renderStatic() {
            staticLayer = document.createElement('canvas');
            staticLayer.width = W * dpr; staticLayer.height = H * dpr;
            const g = staticLayer.getContext('2d');
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.lineJoin = 'round'; g.lineCap = 'round';
            paths.forEach(p => {
                g.beginPath();
                p.pts.forEach((pt, i) => (i ? g.lineTo(pt.x, pt.y) : g.moveTo(pt.x, pt.y)));
                g.strokeStyle = 'rgba(70,120,255,0.07)'; g.lineWidth = 5; g.stroke();
                g.strokeStyle = 'rgba(110,160,255,0.2)'; g.lineWidth = 1.2; g.stroke();
            });
            vertices.forEach(v => {
                g.beginPath();
                if (v.end) {
                    g.arc(v.x, v.y, 5, 0, 6.283);
                    g.strokeStyle = 'rgba(130,175,255,0.4)'; g.lineWidth = 1.2; g.stroke();
                    g.beginPath(); g.arc(v.x, v.y, 1.8, 0, 6.283); g.fillStyle = 'rgba(180,205,255,0.55)'; g.fill();
                } else {
                    g.arc(v.x, v.y, 1.7, 0, 6.283);
                    g.fillStyle = 'rgba(130,175,255,0.38)'; g.fill();
                }
            });
        }

        function resize() {
            const r = hero.getBoundingClientRect();
            const w = Math.round(r.width), h = Math.round(r.height);
            if (w === W && Math.abs(h - H) < 120) return;   // ignora cambios mínimos (barra del navegador móvil)
            W = w; H = h;
            dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
            canvas.width = W * dpr; canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            build();
            if (reduced) frame(performance.now(), true);
        }

        /* --- Rayos --- */
        function makeBolt() {
            const x1 = W * rand(0.12, 0.95), y1 = -10;
            const x2 = x1 + rand(-0.12, 0.12) * W, y2 = H * rand(0.4, 0.82);
            const main = new Path2D(), branch = new Path2D();
            const gen = (path, ax, ay, bx, by, off, depth) => {
                if (depth === 0 || Math.hypot(bx - ax, by - ay) < 12) { path.moveTo(ax, ay); path.lineTo(bx, by); return; }
                const mx = (ax + bx) / 2 + (Math.random() - 0.5) * off;
                const my = (ay + by) / 2 + (Math.random() - 0.5) * off * 0.35;
                gen(path, ax, ay, mx, my, off / 2, depth - 1);
                gen(path, mx, my, bx, by, off / 2, depth - 1);
                if (path === main && depth === 4 && Math.random() < 0.5) {
                    gen(branch, mx, my, mx + rand(-170, 170), my + rand(80, 200), 46, 4);
                }
            };
            gen(main, x1, y1, x2, y2, Math.max(90, W * 0.1), 7);
            bolts.push({ main, branch, life: 0, dur: 0.62, ex: x2, ey: y2 });
            vertices.forEach(v => { if (Math.hypot(v.x - x2, v.y - y2) < 190) v.e = 1; });
            if (flashEl) {
                flashEl.classList.remove('is-flash'); void flashEl.offsetWidth; flashEl.classList.add('is-flash');
            }
        }

        function drawJag(ax, ay, bx, by, amp, alpha, seed) {
            const dist = Math.hypot(bx - ax, by - ay);
            const segs = Math.max(4, Math.round(dist / 16));
            const nx = -(by - ay) / (dist || 1), ny = (bx - ax) / (dist || 1);
            ctx.beginPath(); ctx.moveTo(ax, ay);
            for (let i = 1; i < segs; i++) {
                const t = i / segs;
                const o = jag[(i * 7 + seed) % jag.length] * amp * Math.sin(Math.PI * t);
                ctx.lineTo(ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o);
            }
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(255,226,110,${alpha})`; ctx.lineWidth = 1.3; ctx.stroke();
        }

        /* --- Frame --- */
        function frame(now, once) {
            if (!once) raf = requestAnimationFrame(frame);
            const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
            last = now;
            const t = now / 1000;

            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(staticLayer, 0, 0, W, H);
            ctx.globalCompositeOperation = 'lighter';

            // semilla de zigzag (≈ 11 fps para look eléctrico)
            if (now - jagTime > 90) { jagTime = now; for (let i = 0; i < jag.length; i++) jag[i] = Math.random() * 2 - 1; }

            // Partículas
            particles.forEach(p => {
                if (!once) { p.y -= p.vy * dt; p.x += p.vx * dt; }
                if (p.y < -6) { p.y = H + 6; p.x = rand(0, W); }
                const a = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + p.ph));
                ctx.fillStyle = p.blue ? `rgba(140,180,255,${a})` : `rgba(255,214,90,${a})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
            });

            // Pulsos de energía
            const N = 10;
            ctx.lineCap = 'round';
            for (let pi = 0; pi < pulses.length; pi++) {
                const pu = pulses[pi], path = pu.path;
                pu.lastD = pu.d;
                if (!once) pu.d += pu.speed * dt * pu.dir;
                const lo = Math.min(pu.lastD, pu.d), hi = Math.max(pu.lastD, pu.d);
                for (let j = 0; j < path.cum.length; j++) { const c = path.cum[j]; if (c >= lo && c <= hi) path.verts[j].e = 1; }

                const col = pu.blue ? '120,170,255' : '255,214,70';
                pointAt(path, pu.d, tmpA);
                for (let i = 1; i <= N; i++) {
                    pointAt(path, pu.d - pu.dir * (pu.len * i) / N, tmpB);
                    ctx.strokeStyle = `rgba(${col},${((1 - i / N) * 0.8).toFixed(3)})`;
                    ctx.lineWidth = 2.4 * (1 - (i / N) * 0.55);
                    ctx.beginPath(); ctx.moveTo(tmpA.x, tmpA.y); ctx.lineTo(tmpB.x, tmpB.y); ctx.stroke();
                    tmpA.x = tmpB.x; tmpA.y = tmpB.y;
                }
                pointAt(path, pu.d, tmpA);
                ctx.drawImage(pu.blue ? glowB : glowY, tmpA.x - 15, tmpA.y - 15, 30, 30);

                if ((pu.dir > 0 && pu.d - pu.len > path.total) || (pu.dir < 0 && pu.d + pu.len < 0)) {
                    const np = paths[Math.floor(Math.random() * paths.length)];
                    Object.assign(pu, newPulse(np));
                    pu.d = pu.dir > 0 ? -pu.len : np.total + pu.len;
                }
            }

            // Nodos energizados
            for (let i = 0; i < vertices.length; i++) {
                const v = vertices[i];
                if (v.e > 0.03) {
                    ctx.globalAlpha = v.e;
                    ctx.drawImage(glowY, v.x - 13, v.y - 13, 26, 26);
                    ctx.globalAlpha = 1;
                    if (!once) v.e *= 1 - dt * 2.4;
                }
            }

            // Luz y arcos que siguen al cursor
            if (mouse.active) {
                const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 190);
                g.addColorStop(0, 'rgba(255,206,60,0.13)'); g.addColorStop(1, 'rgba(255,206,60,0)');
                ctx.fillStyle = g; ctx.fillRect(mouse.x - 190, mouse.y - 190, 380, 380);
                const near = [];
                for (let i = 0; i < vertices.length; i++) {
                    const v = vertices[i]; const d = Math.hypot(v.x - mouse.x, v.y - mouse.y);
                    if (d < 190) near.push([d, v]);
                }
                near.sort((a, b) => a[0] - b[0]);
                near.slice(0, 4).forEach(([d, v], i) => {
                    drawJag(v.x, v.y, mouse.x, mouse.y, 9, (1 - d / 190) * 0.9, i * 5);
                    v.e = Math.max(v.e, (1 - d / 190) * 0.9);
                });
            }

            // Arcos ambientales entre nodos cercanos
            if (!once) {
                if (now > nextArc && vertices.length > 4) {
                    nextArc = now + rand(700, 1500);
                    const a = vertices[Math.floor(Math.random() * vertices.length)];
                    const cand = vertices.filter(v => v !== a && Math.hypot(v.x - a.x, v.y - a.y) < 220);
                    if (cand.length) arcs.push({ a, b: cand[Math.floor(Math.random() * cand.length)], life: 0 });
                }
                arcs = arcs.filter(ar => (ar.life += dt) < 0.4);
                arcs.forEach(ar => { drawJag(ar.a.x, ar.a.y, ar.b.x, ar.b.y, 12, 0.8 * (1 - ar.life / 0.4), 3); ar.a.e = ar.b.e = 1 - ar.life / 0.4; });

                // Rayos
                if (now > nextBolt) { nextBolt = now + rand(W < 700 ? 5500 : 4200, W < 700 ? 9500 : 8000); makeBolt(); }
            }
            for (let i = bolts.length - 1; i >= 0; i--) {
                const b = bolts[i];
                b.life += dt;
                const k = b.life / b.dur;
                if (k >= 1) { bolts.splice(i, 1); continue; }
                const a = k < 0.14 ? 1 : k < 0.28 ? 0.3 : k < 0.42 ? 0.9 : Math.max(0, 1 - (k - 0.42) / 0.58);
                ctx.lineJoin = 'round';
                ctx.strokeStyle = `rgba(70,130,255,${0.16 * a})`; ctx.lineWidth = 9; ctx.stroke(b.main);
                ctx.strokeStyle = `rgba(160,205,255,${0.6 * a})`; ctx.lineWidth = 3; ctx.stroke(b.main);
                ctx.strokeStyle = `rgba(255,255,255,${0.95 * a})`; ctx.lineWidth = 1.3; ctx.stroke(b.main);
                ctx.strokeStyle = `rgba(160,205,255,${0.45 * a})`; ctx.lineWidth = 1.4; ctx.stroke(b.branch);
                ctx.globalAlpha = a; ctx.drawImage(glowY, b.ex - 40, b.ey - 40, 80, 80); ctx.globalAlpha = 1;
            }

            ctx.globalCompositeOperation = 'source-over';
        }

        function start() { if (running || reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
        function stop() { running = false; cancelAnimationFrame(raf); }

        // Punteros
        hero.addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            const r = canvas.getBoundingClientRect();
            mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
        });
        hero.addEventListener('pointerleave', () => { mouse.active = false; });

        let rt;
        const queueResize = () => { clearTimeout(rt); rt = setTimeout(resize, 220); };
        if ('ResizeObserver' in window) new ResizeObserver(queueResize).observe(hero);
        else window.addEventListener('resize', queueResize);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop(); else if (heroState.visible) start();
        });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([e]) => {
                heroState.visible = e.isIntersecting;
                if (e.isIntersecting && !document.hidden) start(); else stop();
            }, { threshold: 0 }).observe(hero);
        }

        resize();
        nextBolt = performance.now() + 3200;
        nextArc = performance.now() + 900;
        onReady(() => { if (!reduced) start(); });
    }

    /* ======================================================================
       07 · MARQUEE REACTIVO AL SCROLL
       ====================================================================== */
    function initMarquee() {
        if (reduced) return;
        const tracks = $$('.marquee__track');
        const anims = tracks.map(t => t.getAnimations && t.getAnimations()[0]).filter(Boolean);
        if (!anims.length) return;
        let vel = 0, looping = false;
        const loop = () => {
            vel *= 0.92;
            const rate = 1 + clamp(Math.abs(vel) * 0.1, 0, 7);
            anims.forEach(a => { a.playbackRate = rate; });
            if (Math.abs(vel) > 0.05) requestAnimationFrame(loop); else { looping = false; anims.forEach(a => { a.playbackRate = 1; }); }
        };
        scrollTasks.push((y, dy) => {
            vel = lerp(vel, dy, 0.35);
            if (!looping) { looping = true; requestAnimationFrame(loop); }
        });
    }

    /* ======================================================================
       08 · MANIFIESTO, CONTADORES Y REVEALS
       ====================================================================== */
    function initManifesto() {
        const el = $('#manifestoText');
        const section = $('#manifiesto');
        if (!el || !section) return;
        const words = [];
        (function wrap(node) {
            Array.from(node.childNodes).forEach(child => {
                if (child.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach(tok => {
                        if (!tok) return;
                        if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const s = document.createElement('span');
                        s.className = 'w'; s.textContent = tok; frag.appendChild(s); words.push(s);
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === 1) wrap(child);
            });
        })(el);

        if (reduced) { words.forEach(w => w.classList.add('is-lit')); return; }
        let current = -1;
        scrollTasks.push(() => {
            const r = section.getBoundingClientRect();
            const total = r.height - window.innerHeight;
            if (total <= 0) return;
            const p = clamp(-r.top / total, 0, 1);
            const n = Math.ceil(clamp(p / 0.78, 0, 1) * words.length);
            if (n === current) return;
            words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
            current = n;
        });
    }

    function initCounters() {
        const els = $$('[data-count]');
        if (!els.length) return;
        const run = el => {
            const target = parseFloat(el.dataset.count);
            if (!target || reduced) { el.textContent = String(target); return; }
            const t0 = performance.now(), dur = 1500;
            const step = now => {
                const k = clamp((now - t0) / dur, 0, 1);
                el.textContent = String(Math.round(easeOutExpo(k) * target));
                if (k < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };
        if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
        const io = new IntersectionObserver(entries => entries.forEach(e => {
            if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
        }), { threshold: 0.6 });
        els.forEach(el => { if (parseFloat(el.dataset.count)) el.textContent = '0'; io.observe(el); });
    }

    function initReveal() {
        const els = $$('[data-reveal]');
        if (reduced || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                const el = e.target;
                io.unobserve(el);
                el.classList.add('is-in');
                // Al terminar, se libera el elemento para que sus propios hover/transform funcionen
                const delay = parseInt(getComputedStyle(el).getPropertyValue('--d'), 10) || 0;
                setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); }, delay + 1300);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        els.forEach(el => io.observe(el));
    }

    /* ======================================================================
       09 · SERVICIOS — PANEL DE INTERRUPTORES
       ====================================================================== */
    function initBoard() {
        const root = $('#board');
        if (!root) return;
        const tabs = $$('.breaker', root);
        const panels = $$('.svc', root);
        const cta = $('#svcCta');
        const ctaText = $('#svcCtaText');
        const ring = $('#boardRing');
        let idx = 0, auto = !reduced, hovered = false, inView = false, startT = performance.now();

        const select = (i, user = false, focus = false) => {
            idx = (i + tabs.length) % tabs.length;
            tabs.forEach((t, k) => {
                const on = k === idx;
                t.classList.toggle('is-on', on);
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
            });
            panels.forEach((p, k) => { const on = k === idx; p.hidden = !on; p.classList.toggle('is-active', on); });
            const p = panels[idx];
            cta.href = waUrl(p.dataset.wa);
            ctaText.textContent = p.dataset.cta;
            if (focus) tabs[idx].focus();
            if (user) { auto = false; ring.style.strokeDashoffset = '100'; ring.parentElement.style.opacity = '0'; }
            startT = performance.now();
        };

        tabs.forEach((t, k) => {
            t.addEventListener('click', () => select(k, true));
            t.addEventListener('keydown', e => {
                const map = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
                if (map[e.key]) { e.preventDefault(); select(idx + map[e.key], true, true); }
                else if (e.key === 'Home') { e.preventDefault(); select(0, true, true); }
                else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true, true); }
            });
        });
        root.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovered = true; });
        root.addEventListener('pointerleave', () => { hovered = false; startT = performance.now(); });
        select(0);

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([e]) => { inView = e.isIntersecting; startT = performance.now(); }, { threshold: 0.35 }).observe(root);
        } else inView = true;

        const loop = now => {
            if (auto) {
                if (inView && !hovered && !document.hidden) {
                    const k = (now - startT) / CONFIG.autoplayMs;
                    ring.style.strokeDashoffset = String(100 - clamp(k, 0, 1) * 100);
                    if (k >= 1) select(idx + 1);
                } else startT = now - (parseFloat(ring.style.strokeDashoffset) ? (100 - parseFloat(ring.style.strokeDashoffset)) / 100 * CONFIG.autoplayMs : 0);
                requestAnimationFrame(loop);
            }
        };
        if (auto) requestAnimationFrame(loop);
    }

    /* ======================================================================
       10 · HOGAR / NEGOCIO · MINISPLIT
       ====================================================================== */
    function initSegment() {
        const seg = $('.seg');
        if (!seg) return;
        const tabs = $$('.seg__tab', seg);
        const panels = $$('.seg__panel', seg);
        const select = (i, focus) => {
            tabs.forEach((t, k) => { const on = k === i; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
            panels.forEach((p, k) => { const on = k === i; p.hidden = !on; p.classList.toggle('is-active', on); });
            seg.classList.toggle('is-biz', i === 1);
            if (focus) tabs[i].focus();
        };
        tabs.forEach((t, k) => {
            t.addEventListener('click', () => select(k));
            t.addEventListener('keydown', e => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select((k + 1) % tabs.length, true); }
            });
        });
    }

    function initMinisplit() {
        const badge = $('#tempBadge');
        const num = $('#tempNum');
        const label = $('#tempLabel');
        const frame = $('.frame');
        const img = frame && $('img', frame);

        if (badge && num) {
            let done = false;
            const run = () => {
                if (done) return; done = true;
                if (reduced) { num.textContent = '24'; badge.classList.add('is-cool'); label.textContent = 'Confort en casa'; return; }
                const t0 = performance.now(), dur = 3200;
                const step = now => {
                    const k = clamp((now - t0) / dur, 0, 1);
                    const v = Math.round(31 - easeOut(k) * 7);
                    num.textContent = String(v);
                    if (v <= 28) badge.classList.add('is-cool');
                    label.textContent = k < 0.35 ? 'Calor afuera' : k < 1 ? 'Enfriando…' : 'Confort en casa';
                    if (k < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            };
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(([e], io) => { if (e.isIntersecting) { setTimeout(run, 500); io.disconnect(); } }, { threshold: 0.5 }).observe(badge);
            } else run();
        }

        // Parallax suave de la foto
        if (frame && img && !reduced) {
            scrollTasks.push(() => {
                const r = frame.getBoundingClientRect();
                if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
                const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
                img.style.setProperty('--py', `${(-p * 44).toFixed(1)}px`);
            });
        }
    }

    /* ======================================================================
       11 · AUTODIAGNÓSTICO
       ====================================================================== */
    function initDetector() {
        const ui = $('.detector__ui');
        if (!ui) return;
        const boxes = $$('.symptoms input', ui);
        const fill = $('#gaugeFill');
        const needle = $('#gaugeNeedle');
        const levelEl = $('#gaugeLevel');
        const msgEl = $('#gaugeMsg');
        const alertEl = $('#gaugeAlert');
        const cta = $('#gaugeCta');
        const ctaText = $('#gaugeCtaText');
        const max = boxes.reduce((s, b) => s + Number(b.dataset.w), 0);

        const LEVELS = [
            { label: 'Todo en calma', msg: 'Marca lo que notas y te decimos qué hacer.', cta: 'Tengo una duda, quiero escribirles', pos: 0 },
            { label: 'Prioridad baja', msg: 'Vale la pena una revisión preventiva con calma.', cta: 'Sí, quiero que lo revisen', pos: 0.2 },
            { label: 'Conviene revisarlo', msg: 'Estas señales suelen crecer con el tiempo. Mejor revisarlo pronto.', cta: 'Sí, quiero que lo revisen', pos: 0.46 },
            { label: 'Revisión pronto', msg: 'Hay señales que no conviene ignorar. Agenda una revisión cuanto antes.', cta: 'Necesito que lo revisen ya', pos: 0.72 },
            { label: 'Revisión urgente', msg: 'Te recomendamos que un electricista lo revise lo antes posible.', cta: 'Necesito que lo revisen ya', pos: 0.96 }
        ];

        const update = () => {
            const checked = boxes.filter(b => b.checked);
            const score = checked.reduce((s, b) => s + Number(b.dataset.w), 0);
            const risk = checked.some(b => b.dataset.risk);
            const pct = score / max;
            let lvl = score === 0 ? 0 : pct < 0.22 ? 1 : pct < 0.45 ? 2 : pct < 0.7 ? 3 : 4;
            if (risk) lvl = Math.max(lvl, 3);
            if (risk && checked.length >= 3) lvl = 4;
            const L = LEVELS[lvl];
            const pos = lvl === 0 ? 0 : Math.min(1, L.pos + pct * 0.04);

            ui.dataset.level = String(lvl);
            fill.style.strokeDashoffset = pos === 0 ? '101' : String(100 - pos * 100);
            needle.style.setProperty('--a', `${-90 + pos * 180}deg`);
            levelEl.textContent = L.label;
            msgEl.textContent = L.msg;
            ctaText.textContent = L.cta;
            alertEl.hidden = !risk;

            const msg = checked.length
                ? `Hola V.M.M., quiero que revisen mi instalación eléctrica. Esto es lo que noto:\n${checked.map(b => `• ${b.value}`).join('\n')}\n\n¿Me pueden ayudar?`
                : 'Hola V.M.M., tengo una duda sobre mi instalación eléctrica. ¿Me pueden orientar?';
            cta.href = waUrl(msg);
        };
        boxes.forEach(b => b.addEventListener('change', update));
        update();
    }

    /* ======================================================================
       PROCESO: línea de corriente que avanza con el scroll
       ====================================================================== */
    function initSteps() {
        const wrap = $('#steps');
        if (!wrap) return;
        const steps = $$('.step', wrap);
        let metrics = null;
        const measure = () => {
            const horizontal = isDesktop();
            metrics = {
                horizontal,
                size: horizontal ? wrap.offsetWidth - 56 : wrap.offsetHeight - 60,
                pos: steps.map(s => (horizontal ? s.offsetLeft + 24 : s.offsetTop + 28 - 30))
            };
        };
        measure();
        window.addEventListener('resize', measure);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

        scrollTasks.push(() => {
            const r = wrap.getBoundingClientRect();
            if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
            const span = metrics.horizontal ? window.innerHeight * 0.38 : r.height;
            const p = reduced ? 1 : clamp((window.innerHeight * 0.68 - r.top) / (span + window.innerHeight * 0.1), 0, 1);
            wrap.style.setProperty('--p', p.toFixed(3));
            const fillPx = p * metrics.size;
            steps.forEach((s, i) => s.classList.toggle('is-lit', fillPx >= metrics.pos[i] - 6));
        });
    }

    /* ======================================================================
       12 · FAQ · FORMULARIO · WHATSAPP · CURSOR · EFECTOS
       ====================================================================== */
    function initFaq() {
        const items = $$('.acc__item');
        items.forEach(it => {
            const btn = $('.acc__btn', it);
            it.classList.toggle('is-open', btn.getAttribute('aria-expanded') === 'true');
            btn.addEventListener('click', () => {
                const open = btn.getAttribute('aria-expanded') === 'true';
                items.forEach(o => { $('.acc__btn', o).setAttribute('aria-expanded', 'false'); o.classList.remove('is-open'); });
                if (!open) { btn.setAttribute('aria-expanded', 'true'); it.classList.add('is-open'); }
            });
        });
    }

    function initForm() {
        const form = $('#leadForm');
        if (!form) return;
        const name = $('#f-name'), phone = $('#f-phone'), service = $('#f-service'), msg = $('#f-msg');
        const btn = $('#formBtn'), ok = $('#formOk');

        const setErr = (input, text) => {
            const field = input.closest('.field');
            const err = field.querySelector('.field__err');
            field.classList.toggle('is-invalid', Boolean(text));
            input.setAttribute('aria-invalid', text ? 'true' : 'false');
            if (err) err.textContent = text || '';
            if (text) { field.style.animation = 'none'; void field.offsetWidth; field.style.animation = ''; }
            return !text;
        };
        const validate = () => {
            const n = name.value.trim();
            const ph = phone.value.replace(/\D/g, '');
            const results = [
                setErr(name, n.length < 2 ? 'Cuéntanos tu nombre para saber con quién hablamos.' : ''),
                setErr(phone, phone.value.trim() && (ph.length < 10 || ph.length > 13) ? 'Revisa tu teléfono: debe tener 10 dígitos.' : ''),
                setErr(service, !service.value ? 'Elige el servicio que necesitas.' : '')
            ];
            return results.every(Boolean);
        };
        [name, phone, service].forEach(i => i.addEventListener('input', () => setErr(i, '')));
        service.addEventListener('change', () => setErr(service, ''));

        form.addEventListener('submit', e => {
            e.preventDefault();
            if (!validate()) { const bad = $('.is-invalid input, .is-invalid select', form); if (bad) bad.focus(); return; }
            const lugar = (form.querySelector('input[name="lugar"]:checked') || {}).value || 'Hogar';
            const lines = [
                'Hola V.M.M., quiero solicitar un presupuesto sin compromiso.',
                '',
                `*Nombre:* ${name.value.trim()}`,
                `*Servicio:* ${service.value}`,
                `*Lugar:* ${lugar}`
            ];
            if (phone.value.trim()) lines.push(`*Teléfono:* ${phone.value.trim()}`);
            if (msg.value.trim()) lines.push(`*Detalles:* ${msg.value.trim()}`);
            const url = waUrl(lines.join('\n'));

            ok.hidden = false;
            btn.disabled = true;
            btn.querySelector('span').textContent = 'Abriendo WhatsApp…';
            const w = window.open(url, '_blank', 'noopener');
            if (!w) window.location.href = url;
            setTimeout(() => {
                btn.disabled = false;
                btn.querySelector('span').textContent = 'Enviar y recibir mi presupuesto';
                ok.hidden = true;
                form.reset();
            }, 4500);
        });
    }

    function initWhatsApp() {
        $$('a[data-wa]').forEach(a => { a.href = waUrl(a.dataset.wa); });
        const box = $('#waFloat');
        const bubble = $('#waBubble');
        const close = $('#waClose');
        if (!box) return;
        let closed = false;
        try { closed = sessionStorage.getItem('vmm_wa_closed') === '1'; } catch (e) { /* storage no disponible */ }
        onReady(() => {
            setTimeout(() => box.classList.add('is-visible'), 1200);
            if (!closed) {
                setTimeout(() => bubble.classList.add('is-open'), 5200);
                setTimeout(() => bubble.classList.remove('is-open'), 14000);
            }
        });
        close.addEventListener('click', () => {
            bubble.classList.remove('is-open');
            try { sessionStorage.setItem('vmm_wa_closed', '1'); } catch (e) { /* noop */ }
        });
    }

    function initInteractions() {
        // Spotlight que sigue al puntero
        document.addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            const t = e.target.closest && e.target.closest('[data-spotlight]');
            if (!t) return;
            const r = t.getBoundingClientRect();
            t.style.setProperty('--mx', `${e.clientX - r.left}px`);
            t.style.setProperty('--my', `${e.clientY - r.top}px`);
        }, { passive: true });

        // Ripple en botones
        document.addEventListener('pointerdown', e => {
            const b = e.target.closest && e.target.closest('.btn');
            if (!b || reduced) return;
            const r = b.getBoundingClientRect();
            const size = Math.max(r.width, r.height) * 0.6;
            const s = document.createElement('span');
            s.className = 'ripple';
            s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
            b.appendChild(s);
            setTimeout(() => s.remove(), 750);
        });

        if (!finePointer || reduced) return;

        // Botones magnéticos
        $$('[data-magnetic]').forEach(b => {
            b.addEventListener('pointermove', e => {
                const r = b.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height / 2);
                b.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32 - 2}px)`;
            });
            b.addEventListener('pointerleave', () => { b.style.transform = ''; });
        });

        // Cursor de chispa + estallido de chispas al hacer clic
        const cur = $('#cursor');
        if (cur) {
            let tx = -100, ty = -100, x = -100, y = -100, raf = 0;
            const loop = () => {
                x = lerp(x, tx, 0.22); y = lerp(y, ty, 0.22);
                cur.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.3) ? requestAnimationFrame(loop) : 0;
            };
            document.addEventListener('pointermove', e => {
                if (e.pointerType !== 'mouse') return;
                tx = e.clientX; ty = e.clientY; cur.classList.add('is-on');
                if (!raf) raf = requestAnimationFrame(loop);
                const hov = e.target.closest && e.target.closest('a, button, label, input, select, textarea, [data-magnetic]');
                cur.classList.toggle('is-hover', Boolean(hov));
            }, { passive: true });
            document.documentElement.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
            document.addEventListener('pointerdown', () => cur.classList.add('is-down'));
            document.addEventListener('pointerup', () => cur.classList.remove('is-down'));
        }
        document.addEventListener('pointerdown', e => {
            if (e.pointerType !== 'mouse') return;
            for (let i = 0; i < 9; i++) {
                const s = document.createElement('i');
                s.className = 'spark';
                s.style.left = `${e.clientX}px`; s.style.top = `${e.clientY}px`;
                s.style.setProperty('--a', `${(360 / 9) * i + rand(-14, 14)}deg`);
                s.style.setProperty('--dist', `${rand(22, 58)}px`);
                document.body.appendChild(s);
                s.addEventListener('animationend', () => s.remove());
            }
        });
    }

    /* ======================================================================
       ARRANQUE
       ====================================================================== */
    function boot() {
        const y = $('#year');
        if (y) y.textContent = new Date().getFullYear();

        initLoader();
        initHeader();
        initHeroUI();
        initHeroCanvas();
        initMarquee();
        initManifesto();
        initSteps();
        initBoard();
        initSegment();
        initMinisplit();
        initDetector();
        initFaq();
        initForm();
        initWhatsApp();
        initInteractions();
        initScrollEngine();

        onReady(() => { initReveal(); initCounters(); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
