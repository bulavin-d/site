/* ================================================
   BULAVIN.SPACE — MAIN SITE LOGIC (redesign 2026)
   Supabase-проводка: site_content / concerts / custom_buttons
   3D: /img/skull.glb + /img/splint.glb (three.js r128)
   ================================================ */

'use strict';

/* ────────────────────────────────────────────────
   0. УТИЛИТЫ
   ──────────────────────────────────────────────── */
function _esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function _setLink(id, url) {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
}
/* текст ставим ТОЛЬКО при непустом значении → пусто в базе = дефолт из index.html */
function _setText(id, val) {
    const el = document.getElementById(id);
    if (el && val && val.trim()) el.textContent = val.trim();
}
/* тумблер секции: 'false' в базе = скрыть блок (и пункт меню). Пусто/'true' = показать. */
function _toggleSection(sectionId, navId, key) {
    const hidden = _content[key] === 'false';
    const sec = document.getElementById(sectionId);
    if (sec) sec.style.display = hidden ? 'none' : '';
    if (navId) {
        const nav = document.getElementById(navId);
        if (nav) nav.style.display = hidden ? 'none' : '';
    }
}
const _ring = document.querySelector('.cur-ring');
function _bindHover(el) {
    if (!_ring) return;
    el.addEventListener('pointerenter', () => _ring.classList.add('hot'));
    el.addEventListener('pointerleave', () => _ring.classList.remove('hot'));
}

/* ────────────────────────────────────────────────
   1. КОНТЕНТ ИЗ SUPABASE (site_content)
   ──────────────────────────────────────────────── */
const DEFAULTS = {
    bio: '',
    footer_text: '© 2026 BULAVIN',
    telegram_url: 'https://t.me/imbulavin',
    instagram_url: 'https://www.instagram.com/lu4danya',
    yandex_music_url: 'https://music.yandex.kz/artist/24009925',
    vk_music_url: 'https://vk.com/artist/bulavin',
    spotify_url: 'https://open.spotify.com/artist/7Efya7yCpL4M7BPdcm6qUq',
    apple_music_url: 'https://music.apple.com/ru/artist/bulavin/1805904899',
    yt_music_url: 'https://music.youtube.com/channel/UCRyTj6rCcgg385Rg58zo_PA',
    soundcloud_url: 'https://soundcloud.com/bulavin',
    organizer_url: 'https://t.me/imbulavin',
    release_status: 'disabled',
    release_cover_url: '',
    release_track_url: '',
    release_title: '',
    release_btn_label: '',
    release_btn_color: '',
    scene_color1: '',   /* неон   (дефолт #ff0033) */
    scene_color2: '',   /* кровь  (дефолт #4a000f) */
    scene_color3: '',   /* тень   (дефолт #080002) */
    /* тексты интерфейса — пусто = дефолт из index.html (см. applyContent → _setText) */
    ui_hero_name: '',
    ui_nav_music: '', ui_nav_afisha: '', ui_nav_social: '',
    ui_door_music: '', ui_door_afisha: '', ui_door_social: '',
    ui_release_kicker: '',
    ui_silence_text: '',
    ui_organizer_label: '',
    ui_bio_title: '',
    ui_footnote: '',
    ui_tickets_label: '',
    /* тумблеры видимости — пусто/'true' = показать (дефолт), 'false' = скрыть */
    show_music: '', show_afisha: '', show_social: '', show_bio: '',
    show_heart: '', show_splint: '', show_ash: '',
    show_cursor: '', show_grain_page: '',
    /* сцена PRO (Фаза 5) — пусто = дефолт */
    scene_bone_color: '', scene_light_key: '', scene_light_under: '', scene_light_rim: '',
    scene_fog: '', scene_ash_count: '', scene_ash_speed: '',
    scene_sway: '', scene_mouse: '', scene_yaw: '', scene_skull_scale: '',
    scene_heart_x: '', scene_heart_y: '',
    /* тема сайта (Фаза 6) + SEO (Фаза 7) — пусто = дефолт */
    theme_accent: '', theme_bg: '', theme_text: '',
    seo_title: '', seo_description: '', og_image_url: '',
};

let _content = { ...DEFAULTS };

/* прелоадер: скрываем, КОГДА данные применены → нет «прыжка» текста с дефолта на значение из базы.
   Идемпотентно (первый вызов побеждает; страховочный таймаут не даст залипнуть при мёртвом Supabase). */
let _preloaderHidden = false;
function hidePreloader() {
    if (_preloaderHidden) return;
    _preloaderHidden = true;
    const pl = document.getElementById('preloader');
    if (!pl) return;
    pl.classList.add('loaded');
    setTimeout(() => pl.classList.add('gone'), 650);   /* после fade — убрать из потока */
}

async function loadContent() {
    try {
        const { data, error } = await _supabase.from('site_content').select('key, value');
        if (error) throw error;
        data.forEach(r => { if (r.value !== null) _content[r.key] = r.value; });
    } catch (e) { console.warn('[BULAVIN] site_content недоступен:', e.message); }
    applyContent();
    hidePreloader();   /* тексты/ссылки/релиз уже проставлены — можно показывать */
    loadConcerts();
    loadCustomButtons();
    loadPlatforms();
}

function applyContent() {
    const c = _content;

    applyTheme(c);   /* цвета UI (Фаза 6) — до остального, чтобы всё уже в теме */
    applySeo(c);     /* title/description/og (Фаза 7) */

    _setLink('link-telegram', c.telegram_url);
    _setLink('link-instagram', c.instagram_url);
    _setLink('link-yandex', c.yandex_music_url);
    _setLink('link-vk', c.vk_music_url);
    _setLink('link-spotify', c.spotify_url);
    _setLink('link-apple', c.apple_music_url);
    _setLink('link-yt', c.yt_music_url);
    _setLink('link-soundcloud', c.soundcloud_url);
    _setLink('link-organizer', c.organizer_url);

    const footerEl = document.getElementById('footerText');
    if (footerEl && c.footer_text) footerEl.textContent = c.footer_text;

    const bioMain = document.getElementById('bioMain');
    if (bioMain && c.bio && c.bio.trim()) bioMain.textContent = c.bio.trim();

    /* ── тексты интерфейса (ui_*) — пусто = дефолт из index.html ── */
    _setText('heroName', c.ui_hero_name);
    _setText('navBrand', c.ui_hero_name);
    _setText('navMusic', c.ui_nav_music);
    _setText('navAfisha', c.ui_nav_afisha);
    _setText('navSocial', c.ui_nav_social);
    _setText('doorMusic', c.ui_door_music);
    _setText('doorAfisha', c.ui_door_afisha);
    _setText('doorSocial', c.ui_door_social);
    _setText('releaseKicker', c.ui_release_kicker);
    _setText('silenceText', c.ui_silence_text);
    _setText('link-organizer', c.ui_organizer_label);
    _setText('bioTitle', c.ui_bio_title);
    _setText('footNote', c.ui_footnote);

    /* ── тумблеры видимости (show_*) — 'false' скрывает ── */
    _toggleSection('music', 'navMusic', 'show_music');
    _toggleSection('afisha', 'navAfisha', 'show_afisha');
    _toggleSection('connect', 'navSocial', 'show_social');
    _toggleSection('bio', null, 'show_bio');
    document.body.classList.toggle('no-cur', c.show_cursor === 'false');
    document.body.classList.toggle('no-grain', c.show_grain_page === 'false');

    applyRelease(c);
    applyScene(c);
}

/* ── ТЕМА UI (Фаза 6): акцент/фон/текст + производные (dim/line/glow) ── */
function _hexToRgb(hex) {
    const m = /^#?([0-9a-fA-F]{6})$/.exec((hex || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function applyTheme(c) {
    const root = document.documentElement.style;
    const pick = (v, def) => (v && /^#[0-9a-fA-F]{6}$/.test(v.trim())) ? v.trim() : def;
    const accent = pick(c.theme_accent, '#a50d1d');
    const bg = pick(c.theme_bg, '#030303');
    const text = pick(c.theme_text, '#e6e3db');
    root.setProperty('--blood', accent);
    root.setProperty('--bg', bg);
    root.setProperty('--bone', text);
    const ar = _hexToRgb(accent);
    if (ar) root.setProperty('--blood-glow', `rgba(${ar[0]},${ar[1]},${ar[2]},.45)`);
    const tr = _hexToRgb(text);
    if (tr) {
        root.setProperty('--bone-dim', `rgba(${tr[0]},${tr[1]},${tr[2]},.5)`);
        root.setProperty('--line', `rgba(${tr[0]},${tr[1]},${tr[2]},.09)`);
    }
}

/* ── SEO/шапка (Фаза 7): подмена title/description/og; статичные меты остаются дефолтом ── */
function _setMeta(selector, val) {
    if (!val || !val.trim()) return;
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', val.trim());
}
function applySeo(c) {
    if (c.seo_title && c.seo_title.trim()) {
        document.title = c.seo_title.trim();
        _setMeta('meta[property="og:title"]', c.seo_title);
    }
    _setMeta('meta[name="description"]', c.seo_description);
    _setMeta('meta[property="og:description"]', c.seo_description);
    _setMeta('meta[property="og:image"]', c.og_image_url);
}

/* ── РЕЛИЗ (release_*) ── */
function applyRelease(c) {
    const block = document.getElementById('releaseBlock');
    if (!block) return;
    const status = c.release_status || 'disabled';
    if (status === 'disabled') { block.style.display = 'none'; return; }

    const img = document.getElementById('releaseCoverImg');
    const ph = document.getElementById('releaseCoverPh');
    if (c.release_cover_url && c.release_cover_url.trim()) {
        img.src = c.release_cover_url;
        img.style.display = 'block';
        if (ph) ph.style.display = 'none';
    } else {
        img.style.display = 'none';
        if (ph) ph.style.display = 'block';
    }

    const titleEl = document.getElementById('releaseTitle');
    if (titleEl && c.release_title && c.release_title.trim()) titleEl.textContent = c.release_title;

    const cta = document.getElementById('releaseCTA');
    if (cta) {
        cta.textContent = (c.release_btn_label && c.release_btn_label.trim())
            ? c.release_btn_label
            : (status === 'presave' ? 'Пресейв' : 'Слушать');
        if (c.release_track_url && c.release_track_url.trim()) cta.href = c.release_track_url;
        const col = c.release_btn_color && c.release_btn_color.trim();
        if (col) {
            cta.style.borderColor = col + '99';
            cta.style.background = col + '18';
        }
    }

    block.style.display = 'grid';
}

/* ────────────────────────────────────────────────
   2. КОНЦЕРТЫ (таблица concerts)
   ──────────────────────────────────────────────── */
async function loadConcerts() {
    const list = document.getElementById('concertList');
    const silence = document.getElementById('afishaSilence');
    if (!list) return;
    let rows = [];
    try {
        const { data, error } = await _supabase
            .from('concerts').select('*')
            .eq('visible', true)
            .order('position', { ascending: true });
        if (error) throw error;
        rows = data || [];
    } catch (e) { console.warn('[BULAVIN] concerts недоступен:', e.message); }

    if (!rows.length) return;   /* тишина остаётся */

    const ticketsLabel = (_content.ui_tickets_label && _content.ui_tickets_label.trim())
        ? _content.ui_tickets_label.trim() : 'Билеты';
    list.innerHTML = '';
    rows.forEach((c, i) => {
        const row = document.createElement('a');
        row.className = 'concert';
        row.href = c.tickets_url || '#';
        row.target = '_blank';
        row.rel = 'noopener';
        const meta = [c.date_text, c.venue, c.price_text].filter(v => v && v.trim());
        row.innerHTML = `
            <span class="cn">${String(i + 1).padStart(2, '0')}</span>
            <div>
                <div class="city">${_esc(c.city)}</div>
                ${meta.length ? `<div class="cmeta"><b>${_esc(meta[0])}</b>${meta.slice(1).map(m => ' · ' + _esc(m)).join('')}</div>` : ''}
            </div>
            <span class="btn-doom sm">${_esc(ticketsLabel)}</span>`;
        if (!c.tickets_url) row.addEventListener('click', e => e.preventDefault());
        _bindHover(row);
        list.appendChild(row);
    });
    list.style.display = 'block';
    if (silence) silence.style.display = 'none';
    _syncAccordion('afishaToggle', 'afishaAcc');
}

/* ────────────────────────────────────────────────
   3. КАСТОМНЫЕ КНОПКИ (в ящик SOCIAL)
   ──────────────────────────────────────────────── */
async function loadCustomButtons() {
    const ledger = document.getElementById('socialLedger');
    if (!ledger) return;
    try {
        const { data, error } = await _supabase
            .from('custom_buttons').select('*')
            .eq('visible', true)
            .order('position', { ascending: true });
        if (error) throw error;
        (data || []).forEach(btn => {
            const a = document.createElement('a');
            a.href = btn.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.innerHTML = `<i class="${_esc(btn.icon || 'fa-solid fa-link')} row-ic"></i>` +
                `<span class="row-end">${_esc(String(btn.label).toUpperCase())}</span>`;
            _bindHover(a);
            ledger.appendChild(a);
        });
        _syncAccordion('socialToggle', 'socialAcc');
    } catch (e) { console.warn('[BULAVIN] custom_buttons недоступен:', e.message); }
}

/* ── ПЛОЩАДКИ (таблица platforms, Фаза 3) ──────
   Есть строки → заменяем статический список в #musicAcc. Пусто/ошибка → оставляем хардкод из index.html. */
const YANDEX_STAR = '<svg viewBox="0 0 24 24" fill="currentColor" style="height:1em;width:auto;display:block;"><path d="M11.8 3.3 L12.7 9.4 L17.2 4.0 L14.2 9.9 L20.6 7.5 L14.6 11.4 L23.1 13.5 L14.6 13.0 L20.7 19.7 L13.5 14.5 L13.9 20.2 L11.7 14.8 L9.9 20.4 L10.4 14.8 L4.5 19.0 L9.4 13.3 L3.7 13.2 L9.3 11.7 L3.2 7.8 L9.7 10.0 L6.9 4.2 L11.2 8.9 Z"/></svg>';
async function loadPlatforms() {
    const ledger = document.querySelector('#musicAcc .ledger');
    if (!ledger) return;
    let rows = [];
    try {
        const { data, error } = await _supabase
            .from('platforms').select('*')
            .eq('visible', true)
            .order('position', { ascending: true });
        if (error) throw error;
        rows = data || [];
    } catch (e) { console.warn('[BULAVIN] platforms недоступен:', e.message); return; }

    if (!rows.length) return;   /* фолбэк: статические строки из index.html */

    ledger.innerHTML = '';
    rows.forEach(p => {
        const a = document.createElement('a');
        a.href = p.url || '#';
        a.target = '_blank';
        a.rel = 'noopener';
        if (p.color && p.color.trim()) a.style.setProperty('--pc', p.color.trim());
        const iconHtml = (p.icon === 'yandex-star')
            ? `<i class="row-ic">${YANDEX_STAR}</i>`
            : `<i class="${_esc(p.icon || 'fa-solid fa-music')} row-ic"></i>`;
        a.innerHTML = iconHtml + `<span class="row-end">${_esc(String(p.label).toUpperCase())}</span>`;
        if (!p.url) a.addEventListener('click', e => e.preventDefault());
        _bindHover(a);
        ledger.appendChild(a);
    });
    _syncAccordion('musicToggle', 'musicAcc');
}

/* ────────────────────────────────────────────────
   4. UI: курсор / появление / шапка / аккордеоны
   ──────────────────────────────────────────────── */
(function () {
    const dot = document.querySelector('.cur-dot');
    if (!dot || !_ring) return;
    let rx = innerWidth / 2, ry = innerHeight / 2, mx = rx, my = ry;
    addEventListener('pointermove', e => {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = `translate(${mx - 2.5}px,${my - 2.5}px)`;
    }, { passive: true });
    (function loop() {
        requestAnimationFrame(loop);
        rx += (mx - rx) * .14; ry += (my - ry) * .14;
        _ring.style.transform = `translate(${rx - _ring.offsetWidth / 2}px,${ry - _ring.offsetHeight / 2}px)`;
    })();
    document.querySelectorAll('[data-h]').forEach(_bindHover);
    document.addEventListener('mouseleave', () => {
        document.querySelectorAll('.cur-dot,.cur-ring').forEach(el => el.style.opacity = '0');
    });
    document.addEventListener('mouseenter', () => {
        document.querySelectorAll('.cur-dot,.cur-ring').forEach(el => el.style.opacity = '1');
    });
})();

(function () {
    const io = new IntersectionObserver(es => {
        es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    document.querySelectorAll('.rv').forEach(el => io.observe(el));
})();

(function () {
    const nav = document.querySelector('nav');
    addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', scrollY > innerHeight * 0.72);
    }, { passive: true });
})();

function bindAccordion(btnId, accId) {
    const btn = document.getElementById(btnId);
    const acc = document.getElementById(accId);
    if (!btn || !acc) return;
    btn.addEventListener('click', () => {
        const open = btn.classList.toggle('open');
        acc.classList.toggle('open', open);
        acc.style.maxHeight = open ? acc.scrollHeight + 'px' : '0px';
    });
}
/* контент ящика подгрузился ПОСЛЕ открытия — пересчитать высоту */
function _syncAccordion(btnId, accId) {
    const btn = document.getElementById(btnId);
    const acc = document.getElementById(accId);
    if (btn && acc && btn.classList.contains('open')) acc.style.maxHeight = acc.scrollHeight + 'px';
}
bindAccordion('musicToggle', 'musicAcc');
bindAccordion('afishaToggle', 'afishaAcc');
bindAccordion('socialToggle', 'socialAcc');

/* глушим переход только у ссылок, которые ПРЯМО СЕЙЧАС ведут на "#"
   (releaseCTA получает настоящий href позже — его глушить нельзя) */
document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a && a.getAttribute('href') === '#') e.preventDefault();
});

/* ────────────────────────────────────────────────
   5. 3D-СЦЕНА: череп + шина + сердце + пепел
   ──────────────────────────────────────────────── */
const _sceneUniforms = [];   /* {uTime, uC1, uC2, uC3} на каждый материал */

let _underLight = null;   /* нижний «свет настроения» — красится в акцентный цвет сцены */
let _heartGroup = null, _ashPoints = null, _splintScene = null;   /* ссылки для тумблеров show_* */
let _applyScenePro = null;   /* ставится внутри IIFE сцены — расширенные параметры (Фаза 5) */
function applyScene(c) {
    const hexOr = (v, def) => (v && /^#[0-9a-fA-F]{6}$/.test(v.trim())) ? v.trim() : def;
    const num = (v, def) => { const n = parseFloat(v); return isFinite(n) ? n : def; };
    const c1 = hexOr(c.scene_color1, '#ff0033');
    const c2 = hexOr(c.scene_color2, '#4a000f');
    const c3 = hexOr(c.scene_color3, '#080002');
    const cmetal = hexOr(c.scene_metal, '#cfd6e0');
    const speed = num(c.scene_speed, 1.0);
    const noise = num(c.scene_noise, 1.0);
    const grain = num(c.scene_grain, 0.10);
    const mixv = num(c.scene_mix, 0.62);
    if (_underLight) _underLight.color.set(c1);
    _sceneUniforms.forEach(s => {
        if (!s.uC1) return;
        s.uC1.value.set(c1);
        s.uC2.value.set(c2);
        s.uC3.value.set(c3);
        if (s.uMetal) s.uMetal.value.set(cmetal);
        s.uSpeed.value = speed;
        s.uNoise.value = noise;
        s.uMix.value = mixv;
        s.uGrain.value = s.isMetal ? Math.min(grain * 2.0, 0.5) : grain;
    });
    /* тумблеры 3D-элементов (ссылки могут быть ещё не готовы — тогда применится при их создании) */
    if (_heartGroup) _heartGroup.visible = c.show_heart !== 'false';
    if (_ashPoints) _ashPoints.visible = c.show_ash !== 'false';
    if (_splintScene) _splintScene.visible = c.show_splint !== 'false';
    if (_applyScenePro) _applyScenePro(c);
}

(function () {
    const stage = document.getElementById('stage');
    if (!stage || !window.THREE) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) { console.warn('[BULAVIN] WebGL недоступен — сайт работает без 3D'); return; }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0035);

    const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 3000);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    stage.appendChild(renderer.domElement);

    /* свет: холодный ключ сверху, кровавое свечение снизу, костяной контровой */
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(0.5, 1.4, 1.2);
    scene.add(key);
    const under = new THREE.DirectionalLight(0xa50d1d, 1.3);
    under.position.set(0, -1.2, 0.6);
    scene.add(under);
    _underLight = under;   /* красится в акцентный цвет через applyScene */
    const rim = new THREE.DirectionalLight(0xe6e3db, 1.25);
    rim.position.set(-1.7, 0.3, -1.3);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.09));

    const world = new THREE.Group();
    scene.add(world);
    const holder = new THREE.Group();
    world.add(holder);

    /* ── жидкие материалы: fbm-шум внутри освещённого шейдера ── */
    const NOISE_GLSL = `
uniform float uTime; uniform float uSpeed; uniform float uNoise; uniform float uGrain; uniform float uMix;
uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uMetal;
varying vec3 vLiq;
float lhash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float lnoise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(lhash(i),lhash(i+vec2(1.,0.)),u.x), mix(lhash(i+vec2(0.,1.)),lhash(i+vec2(1.,1.)),u.x), u.y); }
float lfbm(vec2 p){ float v=0.0; float a=0.5; mat2 rot=mat2(0.8,0.6,-0.6,0.8);
  for(int i=0;i<4;i++){ v+=a*lnoise(p); p=rot*p*2.0+uTime*0.04*uSpeed; a*=0.5; } return v; }`;

    const BONE_CHUNK = `
{
    vec2 q = vec2(lfbm(vLiq.xy*0.06*uNoise + uTime*0.06*uSpeed), lfbm(vLiq.yz*0.06*uNoise - uTime*0.05*uSpeed));
    float lf = lfbm(vLiq.xz*0.06*uNoise + q*3.0) / 0.9375;
    vec3 lpal = mix(uC3, uC2, smoothstep(0.10, 0.50, lf));
    lpal = mix(lpal, uC1, smoothstep(0.40, 0.90, lf));
    float lk = smoothstep(0.30, 0.72, lf) * uMix;
    diffuseColor.rgb = mix(diffuseColor.rgb, lpal, lk);
    diffuseColor.rgb += uC1 * smoothstep(0.62, 0.88, lf) * (uMix * 0.35);
}`;

    const METAL_CHUNK = `
{
    diffuseColor.rgb *= uMetal * 1.35;                 /* базовый оттенок шины (из админки) */
    float mf = lfbm(vLiq.xy*0.9*uNoise + uTime*0.30*uSpeed) / 0.9375;
    vec3 cool = mix(vec3(0.72,0.80,0.95), uMetal, 0.4);
    vec3 warm = mix(vec3(1.05,0.88,0.66), uMetal, 0.4);
    vec3 irid = mix(cool, warm, smoothstep(0.30, 0.70, mf));
    diffuseColor.rgb *= irid;
    diffuseColor.rgb += uC1 * smoothstep(0.72, 0.92, mf) * 0.35;
}`;

    const boneMats = [];   /* базовые костяные материалы — для scene_bone_color (Фаза 5) */
    function makeLiquidMat(kind) {
        const metal = kind === 'metal';
        const m = new THREE.MeshStandardMaterial(metal
            ? { color: 0xd9dee6, roughness: 0.24, metalness: 0.78 }
            : { color: 0xd4d1c8, roughness: 0.5, metalness: 0.05 });
        if (!metal) boneMats.push(m);
        m.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uSpeed = { value: 1.0 };
            shader.uniforms.uNoise = { value: 1.0 };
            shader.uniforms.uGrain = { value: metal ? 0.20 : 0.10 };
            shader.uniforms.uMix = { value: 0.62 };
            shader.uniforms.uC1 = { value: new THREE.Color('#ff0033') };
            shader.uniforms.uC2 = { value: new THREE.Color('#4a000f') };
            shader.uniforms.uC3 = { value: new THREE.Color('#080002') };
            shader.uniforms.uMetal = { value: new THREE.Color('#cfd6e0') };
            _sceneUniforms.push({
                isMetal: metal,
                uTime: shader.uniforms.uTime, uSpeed: shader.uniforms.uSpeed,
                uNoise: shader.uniforms.uNoise, uGrain: shader.uniforms.uGrain, uMix: shader.uniforms.uMix,
                uC1: shader.uniforms.uC1, uC2: shader.uniforms.uC2, uC3: shader.uniforms.uC3,
                uMetal: shader.uniforms.uMetal
            });
            applyScene(_content);   /* контент мог загрузиться раньше шейдера */
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vLiq;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLiq = position;');
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>' + NOISE_GLSL)
                .replace('vec4 diffuseColor = vec4( diffuse, opacity );',
                    'vec4 diffuseColor = vec4( diffuse, opacity );' + (metal ? METAL_CHUNK : BONE_CHUNK))
                .replace('#include <dithering_fragment>', `#include <dithering_fragment>
float lg = lhash(gl_FragCoord.xy + vec2(fract(uTime)*371.0, fract(uTime*1.7)*713.0));
gl_FragColor.rgb += (lg - 0.5) * uGrain;`);
        };
        return m;
    }
    const makeBoneMat = () => makeLiquidMat('bone');

    /* ── калиброванная база: голова в КТ повёрнута ~30° влево ── */
    const BASE_YAW = 0.55;
    const base = new THREE.Group();
    base.rotation.y = BASE_YAW;
    holder.add(base);

    let skull = null, R = 60;

    /* ── расширенные параметры сцены (Фаза 5): свет/туман/поведение — вживую; пепел-кол-во при старте ── */
    let swayMul = 1, mouseMul = 1, ashSpeedMul = 1;
    function applyScenePro(c) {
        const n = (v, d) => { const x = parseFloat(v); return isFinite(x) ? x : d; };
        key.intensity = n(c.scene_light_key, 1.05);
        under.intensity = n(c.scene_light_under, 1.30);
        rim.intensity = n(c.scene_light_rim, 1.25);
        const bone = (c.scene_bone_color && /^#[0-9a-fA-F]{6}$/.test(c.scene_bone_color.trim()))
            ? c.scene_bone_color.trim() : '#d4d1c8';
        boneMats.forEach(m => m.color.set(bone));
        base.rotation.y = n(c.scene_yaw, BASE_YAW);
        holder.scale.setScalar(n(c.scene_skull_scale, 1.0));
        if (scene.fog && skull) scene.fog.density = (0.55 / (R * 2.3)) * n(c.scene_fog, 1.0);
        if (_heartGroup) {
            const portrait = innerWidth < innerHeight;
            const hx = isFinite(parseFloat(c.scene_heart_x)) ? parseFloat(c.scene_heart_x) : (portrait ? 0.52 : 0.95);
            const hy = isFinite(parseFloat(c.scene_heart_y)) ? parseFloat(c.scene_heart_y) : (portrait ? 0.55 : 0.32);
            _heartGroup.position.set(R * hx, R * hy, -R * 0.25);
        }
        swayMul = n(c.scene_sway, 1.0);
        mouseMul = n(c.scene_mouse, 1.0);
        ashSpeedMul = n(c.scene_ash_speed, 1.0);
    }
    _applyScenePro = applyScenePro;

    function fitCamera() {
        const halfW = R * 0.60;
        const need = halfW / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
        camera.position.set(0, 0, Math.max(R * 2.3, need));
        camera.lookAt(0, 0, 0);
    }

    const loader = new THREE.GLTFLoader();
    loader.load('/img/skull.glb', (gltf) => {
        skull = gltf.scene;
        skull.traverse(o => { if (o.isMesh) { o.material = makeBoneMat(); o.geometry.computeVertexNormals(); } });
        const box = new THREE.Box3().setFromObject(skull);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        skull.position.copy(center).negate();
        base.add(skull);
        base.userData.centerOff = skull.position.clone();
        R = Math.max(size.x, size.y, size.z);
        fitCamera();
        scene.fog.density = 0.55 / (R * 2.3);
        buildExtras();

        /* шина Тигерштедта — те же координаты, металл */
        loader.load('/img/splint.glb', (g2) => {
            g2.scene.traverse(o => { if (o.isMesh) { o.material = makeLiquidMat('metal'); o.geometry.computeVertexNormals(); } });
            g2.scene.position.copy(base.userData.centerOff);
            base.add(g2.scene);
            _splintScene = g2.scene;
            applyScene(_content);   /* шина готова — применить тумблер show_splint */
        }, undefined, e => console.warn('[BULAVIN] splint:', e));

        stage.style.opacity = '0';
        requestAnimationFrame(() => {
            stage.style.transition = 'opacity 2s ease';
            stage.style.opacity = '1';
            setTimeout(() => { stage.style.transition = 'opacity .15s linear'; }, 2100);
        });
    }, undefined, e => console.warn('[BULAVIN] skull:', e));

    /* ── разбитое сердце ── */
    const heartGroup = new THREE.Group();
    world.add(heartGroup);
    _heartGroup = heartGroup;   /* для тумблера show_heart */

    const CRACK = [
        new THREE.Vector2(0, -11.5),
        new THREE.Vector2(-1.6, -7.5),
        new THREE.Vector2(1.4, -4),
        new THREE.Vector2(-1.4, -0.5),
        new THREE.Vector2(1.6, 3),
        new THREE.Vector2(-1, 5.8),
        new THREE.Vector2(0, 7.5)
    ];

    function makeHalfGeo(left) {
        const m = left ? 1 : -1;
        const s = new THREE.Shape();
        s.moveTo(0, 7.5);
        s.bezierCurveTo(-1.5 * m, 11, -4.5 * m, 13.5, -7.5 * m, 13.5);
        s.bezierCurveTo(-12.5 * m, 13.5, -14.5 * m, 9.5, -14.5 * m, 6);
        s.bezierCurveTo(-14.5 * m, 1, -9 * m, -3.5, 0, -11.5);
        for (let i = 1; i < CRACK.length; i++) s.lineTo(CRACK[i].x, CRACK[i].y);
        const g = new THREE.ExtrudeGeometry(s, { depth: 4.5, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 1.1, bevelSegments: 4, curveSegments: 22 });
        g.translate(0, -1, -2.25);
        return g;
    }

    let ash = null;

    function buildExtras() {
        const scale = R * 0.014;
        const hL = new THREE.Mesh(makeHalfGeo(true), makeBoneMat());
        const hR = new THREE.Mesh(makeHalfGeo(false), makeBoneMat());
        hL.position.set(-2.1, 0.4, 0); hL.rotation.z = 0.18; hL.rotation.y = 0.12;
        hR.position.set(2.1, -0.6, 0.6); hR.rotation.z = -0.22; hR.rotation.y = -0.14;
        heartGroup.add(hL, hR);
        heartGroup.scale.setScalar(scale);
        const portrait = innerWidth < innerHeight;
        heartGroup.position.set(R * (portrait ? 0.52 : 0.95), R * (portrait ? 0.55 : 0.32), -R * 0.25);

        const N = Math.max(0, Math.min(3000, Math.round(parseFloat(_content.scene_ash_count) || 420)));
        const pos = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
            pos[i * 3] = (Math.random() - 0.5) * R * 4.5;
            pos[i * 3 + 1] = (Math.random() - 0.5) * R * 3;
            pos[i * 3 + 2] = (Math.random() - 0.5) * R * 2.5;
        }
        const pg = new THREE.BufferGeometry();
        pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pm = new THREE.PointsMaterial({ color: 0xe6e3db, size: R * 0.006, transparent: true, opacity: 0.38, depthWrite: false });
        ash = new THREE.Points(pg, pm);
        world.add(ash);
        _ashPoints = ash;
        applyScene(_content);   /* сердце/пепел готовы — применить их тумблеры */
    }

    /* размер берём у контейнера (#stage), а не у окна: он прибит к 100lvh в CSS,
       поэтому скрытие адресной строки на мобиле НЕ меняет его высоту → череп не плющит */
    function resize() {
        const w = stage.clientWidth || innerWidth;
        const h = stage.clientHeight || innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        if (skull) fitCamera();
    }
    resize();
    if (window.ResizeObserver) {
        new ResizeObserver(resize).observe(stage);
    } else {
        addEventListener('orientationchange', () => setTimeout(resize, 200));
    }

    /* мышь / гироскоп / скролл-призрак */
    let tx = 0, ty = 0, lastMove = 0;
    addEventListener('pointermove', e => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        tx = (e.clientX / innerWidth - 0.5) * 2.0;
        ty = (e.clientY / innerHeight - 0.5) * 0.7;
        lastMove = performance.now();
    }, { passive: true });

    let _gyroBound = false;
    function bindGyro() {
        if (_gyroBound) return;
        _gyroBound = true;
        addEventListener('deviceorientation', (e) => {
            if (e.gamma === null || e.gamma === undefined) return;
            tx = Math.max(-1, Math.min(1, e.gamma / 32)) * 0.9;
            ty = Math.max(-1, Math.min(1, (e.beta - 45) / 38)) * 0.5;
            lastMove = performance.now();
        }, { passive: true });
    }
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        /* iOS 13+: разрешение выдаётся ТОЛЬКО из обработчика явного тапа (click) */
        const askGyro = () => {
            DeviceOrientationEvent.requestPermission()
                .then(s => { if (s === 'granted') bindGyro(); })
                .catch(() => { });
            document.removeEventListener('click', askGyro);
        };
        document.addEventListener('click', askGyro, { once: true });
    } else {
        /* Android / прочие — без запроса */
        bindGyro();
    }

    addEventListener('scroll', () => {
        const k = Math.min(scrollY / innerHeight, 1);
        stage.style.opacity = 1 - k * 0.94;
    }, { passive: true });

    const clock = new THREE.Clock();
    (function tick() {
        requestAnimationFrame(tick);
        const t = clock.getElapsedTime();
        for (let i = 0; i < _sceneUniforms.length; i++) _sceneUniforms[i].uTime.value = t;
        if (skull) {
            const idle = performance.now() - lastMove > 3500;
            const gx = idle ? Math.sin(t * 0.38) * 0.42 * swayMul : tx * mouseMul;
            const gy = idle ? Math.sin(t * 0.26) * 0.15 * swayMul : ty * mouseMul;
            holder.rotation.y += (gx - holder.rotation.y) * 0.055;
            holder.rotation.x += (gy - holder.rotation.x) * 0.055;
            holder.position.y = Math.sin(t * 0.75) * (R * 0.02);
        }
        heartGroup.rotation.y = Math.sin(t * 0.45) * 0.55;
        heartGroup.rotation.x = Math.sin(t * 0.3) * 0.14;
        heartGroup.rotation.z = Math.sin(t * 0.22) * 0.08;
        heartGroup.position.y += Math.sin(t * 0.6) * R * 0.0004;
        if (ash) {
            ash.rotation.y = t * 0.016;
            const p = ash.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
                let y = p.getY(i) + R * 0.0006 * ashSpeedMul;
                if (y > R * 1.5) y = -R * 1.5;
                p.setY(i, y);
            }
            p.needsUpdate = true;
        }
        renderer.render(scene, camera);
    })();
})();

/* ── LIVE-ПРЕВЬЮ (Фаза 8): страница в iframe админки слушает изменения сцены/темы ── */
if (new URLSearchParams(location.search).get('preview') === '1') {
    window.addEventListener('message', (e) => {
        if (e.origin !== location.origin) return;
        const m = e.data;
        if (!m || m.type !== 'scene' || !m.payload) return;
        Object.assign(_content, m.payload);
        applyScene(_content);
        applyTheme(_content);
    });
}

/* ── СТАРТ ── */
setTimeout(hidePreloader, 4000);   /* страховка: не держать экран, если Supabase завис */
loadContent();
