/* ================================================
   BULAVIN CMS — ADMIN LOGIC (redesign 2026)
   site_content / concerts / custom_buttons
   ================================================ */

'use strict';

/* ── АВТОРИЗАЦИЯ ─────────────────────────────── */
async function checkAuth() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session && session.user.email === ADMIN_EMAIL) showPanel(session.user.email);
    else showLogin();
}
function showLogin() {
    document.getElementById('loginWrap').style.display = 'flex';
    document.getElementById('adminWrap').style.display = 'none';
}
function showPanel(email) {
    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('adminWrap').style.display = 'flex';
    document.getElementById('adminEmail').textContent = email;
    loadSettings();
    loadCustomButtons();
    loadConcertsAdmin();
    loadPlatformsAdmin();
    initScenePreview();
}
async function handleLogin() {
    const password = document.getElementById('passInput').value;
    const btn = document.getElementById('loginBtn');
    if (!password) return;
    btn.disabled = true; btn.textContent = 'ПРОВЕРКА...';
    const { error } = await _supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
    if (error) {
        setStatus('loginStatus', 'ACCESS DENIED: ' + error.message, 'err');
        btn.disabled = false; btn.textContent = 'AUTHORIZE';
    } else {
        const { data: { session } } = await _supabase.auth.getSession();
        showPanel(session.user.email);
    }
}
document.getElementById('passInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
async function handleLogout() { await _supabase.auth.signOut(); showLogin(); }

/* ── ВКЛАДКИ ─────────────────────────────────── */
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

/* ── УТИЛИТЫ ─────────────────────────────────── */
function setStatus(id, msg, type = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-line ' + type;
    if (type === 'ok') setTimeout(() => { el.textContent = ''; el.className = 'status-line'; }, 3500);
}
function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _fill(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
}
/* безопасное сохранение: UPDATE, если строки нет — INSERT (не ломает RLS) */
async function saveContent(key, value, statusId) {
    if (statusId) setStatus(statusId, 'СОХРАНЯЮ...', 'busy');
    try {
        const { data: updated, error: upErr } = await _supabase
            .from('site_content').update({ value }).eq('key', key).select();
        if (upErr) throw upErr;
        if (!updated || updated.length === 0) {
            const { error: insErr } = await _supabase.from('site_content').insert({ key, value });
            if (insErr) throw insErr;
        }
        if (statusId) setStatus(statusId, '✓ СОХРАНЕНО', 'ok');
    } catch (e) { if (statusId) setStatus(statusId, 'ОШИБКА: ' + e.message, 'err'); }
}
async function _saveMulti(rows) {
    for (const { key, value } of rows) {
        const { data: updated, error: upErr } = await _supabase
            .from('site_content').update({ value }).eq('key', key).select();
        if (upErr) throw upErr;
        if (!updated || updated.length === 0) {
            const { error: insErr } = await _supabase.from('site_content').insert({ key, value });
            if (insErr) throw insErr;
        }
    }
}
async function saveField(fieldId, key, statusId) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    await saveContent(key, el.value.trim(), statusId);
}

/* ── ЗАГРУЗКА НАСТРОЕК ───────────────────────── */
async function loadSettings() {
    try {
        const { data, error } = await _supabase.from('site_content').select('key, value');
        if (error) throw error;
        const c = {};
        data.forEach(r => { c[r.key] = r.value; });

        _fill('fieldBio', c.bio);
        _fill('fieldFooter', c.footer_text);
        _fill('fieldOrgUrl', c.organizer_url);

        _fill('fieldTelegram', c.telegram_url);
        _fill('fieldInstagram', c.instagram_url);

        /* SEO (Фаза 7) */
        _fill('fieldSeoTitle', c.seo_title);
        _fill('fieldSeoDesc', c.seo_description);
        _fill('fieldOgImage', c.og_image_url);

        /* тема сайта (Фаза 6) */
        loadThemeControls(c);

        _fill('fieldReleaseTitle', c.release_title);
        _fill('fieldReleaseCover', c.release_cover_url);
        _fill('fieldReleaseTrack', c.release_track_url);
        _fill('fieldReleaseBtnLabel', c.release_btn_label);
        const rs = c.release_status || 'disabled';
        document.querySelectorAll('input[name="releaseStatus"]').forEach(r => { r.checked = r.value === rs; });

        /* тексты интерфейса (ui_*) — пусто = дефолт (виден в placeholder) */
        _fill('fieldUiHeroName', c.ui_hero_name);
        _fill('fieldUiNavMusic', c.ui_nav_music);
        _fill('fieldUiNavAfisha', c.ui_nav_afisha);
        _fill('fieldUiNavSocial', c.ui_nav_social);
        _fill('fieldUiDoorMusic', c.ui_door_music);
        _fill('fieldUiDoorAfisha', c.ui_door_afisha);
        _fill('fieldUiDoorSocial', c.ui_door_social);
        _fill('fieldUiReleaseKicker', c.ui_release_kicker);
        _fill('fieldUiSilence', c.ui_silence_text);
        _fill('fieldUiOrganizer', c.ui_organizer_label);
        _fill('fieldUiTickets', c.ui_tickets_label);
        _fill('fieldUiBioTitle', c.ui_bio_title);
        _fill('fieldUiFootnote', c.ui_footnote);

        /* тумблеры видимости (show_*) — только 'false' = выкл, иначе вкл */
        const tgl = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val !== 'false'; };
        tgl('tglMusic', c.show_music);
        tgl('tglAfisha', c.show_afisha);
        tgl('tglSocial', c.show_social);
        tgl('tglBio', c.show_bio);
        tgl('tglHeart', c.show_heart);
        tgl('tglSplint', c.show_splint);
        tgl('tglAsh', c.show_ash);
        tgl('tglCursor', c.show_cursor);
        tgl('tglGrain', c.show_grain_page);

        /* сцена: цвета + параметры (пусто = дефолт) */
        loadSceneControls(c);
    } catch (e) { console.warn('[ADMIN] loadSettings:', e); }
}

/* ── ССЫЛКИ ──────────────────────────────────── */
async function saveAllLinks() {
    setStatus('linksStatus', 'СОХРАНЯЮ...', 'busy');
    /* площадки теперь в таблице platforms (Фаза 3); здесь — только соцсети */
    const rows = [
        { key: 'telegram_url', value: document.getElementById('fieldTelegram').value.trim() },
        { key: 'instagram_url', value: document.getElementById('fieldInstagram').value.trim() },
    ].filter(r => r.value);
    try {
        await _saveMulti(rows);
        setStatus('linksStatus', '✓ СОХРАНЕНО', 'ok');
    } catch (e) { setStatus('linksStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── ТЕМА САЙТА (Фаза 6) ──────────────────────── */
const THEME_DEF = { accent: '#a50d1d', bg: '#030303', text: '#e6e3db' };
function loadThemeControls(c) {
    const set = (inpId, labId, val, def) => {
        const hex = (val && /^#[0-9a-fA-F]{6}$/.test(val)) ? val : def;
        const inp = document.getElementById(inpId); if (inp) inp.value = hex;
        const lab = document.getElementById(labId); if (lab) lab.textContent = hex;
    };
    set('themeAccent', 'themeValAccent', c.theme_accent, THEME_DEF.accent);
    set('themeBg', 'themeValBg', c.theme_bg, THEME_DEF.bg);
    set('themeText', 'themeValText', c.theme_text, THEME_DEF.text);
}
async function saveTheme() {
    setStatus('themeStatus', 'СОХРАНЯЮ...', 'busy');
    const g = id => document.getElementById(id).value;
    try {
        await _saveMulti([
            { key: 'theme_accent', value: g('themeAccent') },
            { key: 'theme_bg', value: g('themeBg') },
            { key: 'theme_text', value: g('themeText') },
        ]);
        setStatus('themeStatus', '✓ СОХРАНЕНО — обнови сайт (Ctrl+Shift+R)', 'ok');
    } catch (e) { setStatus('themeStatus', 'ОШИБКА: ' + e.message, 'err'); }
}
async function resetTheme() {
    setStatus('themeStatus', 'СБРОС...', 'busy');
    try {
        await _saveMulti(['theme_accent', 'theme_bg', 'theme_text'].map(key => ({ key, value: '' })));
        loadThemeControls({});
        setStatus('themeStatus', '✓ ВЕРНУЛ ДЕФОЛТ — обнови сайт', 'ok');
    } catch (e) { setStatus('themeStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── SEO (Фаза 7) ─────────────────────────────── */
async function saveSeo() {
    setStatus('seoStatus', 'СОХРАНЯЮ...', 'busy');
    const g = id => document.getElementById(id).value.trim();
    try {
        await _saveMulti([
            { key: 'seo_title', value: g('fieldSeoTitle') },
            { key: 'seo_description', value: g('fieldSeoDesc') },
            { key: 'og_image_url', value: g('fieldOgImage') },
        ]);
        setStatus('seoStatus', '✓ СОХРАНЕНО — обнови сайт (Ctrl+Shift+R)', 'ok');
    } catch (e) { setStatus('seoStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── ТЕКСТЫ ИНТЕРФЕЙСА (ui_*) ─────────────────── */
/* сохраняем ВСЕ поля (в т.ч. пустые): пустое значение = откат к дефолту сайта */
async function saveAllTexts() {
    setStatus('uiTextStatus', 'СОХРАНЯЮ...', 'busy');
    const g = id => (document.getElementById(id)?.value || '').trim();
    const rows = [
        { key: 'ui_hero_name', value: g('fieldUiHeroName') },
        { key: 'ui_nav_music', value: g('fieldUiNavMusic') },
        { key: 'ui_nav_afisha', value: g('fieldUiNavAfisha') },
        { key: 'ui_nav_social', value: g('fieldUiNavSocial') },
        { key: 'ui_door_music', value: g('fieldUiDoorMusic') },
        { key: 'ui_door_afisha', value: g('fieldUiDoorAfisha') },
        { key: 'ui_door_social', value: g('fieldUiDoorSocial') },
        { key: 'ui_release_kicker', value: g('fieldUiReleaseKicker') },
        { key: 'ui_silence_text', value: g('fieldUiSilence') },
        { key: 'ui_organizer_label', value: g('fieldUiOrganizer') },
        { key: 'ui_tickets_label', value: g('fieldUiTickets') },
        { key: 'ui_bio_title', value: g('fieldUiBioTitle') },
        { key: 'ui_footnote', value: g('fieldUiFootnote') },
    ];
    try {
        await _saveMulti(rows);
        setStatus('uiTextStatus', '✓ СОХРАНЕНО — обнови сайт (Ctrl+Shift+R)', 'ok');
    } catch (e) { setStatus('uiTextStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── ТУМБЛЕРЫ ВИДИМОСТИ (show_*) ──────────────── */
async function saveToggles() {
    setStatus('toggleStatus', 'СОХРАНЯЮ...', 'busy');
    const v = id => document.getElementById(id).checked ? 'true' : 'false';
    const rows = [
        { key: 'show_music', value: v('tglMusic') },
        { key: 'show_afisha', value: v('tglAfisha') },
        { key: 'show_social', value: v('tglSocial') },
        { key: 'show_bio', value: v('tglBio') },
        { key: 'show_heart', value: v('tglHeart') },
        { key: 'show_splint', value: v('tglSplint') },
        { key: 'show_ash', value: v('tglAsh') },
        { key: 'show_cursor', value: v('tglCursor') },
        { key: 'show_grain_page', value: v('tglGrain') },
    ];
    try {
        await _saveMulti(rows);
        setStatus('toggleStatus', '✓ СОХРАНЕНО — обнови сайт (Ctrl+Shift+R)', 'ok');
    } catch (e) { setStatus('toggleStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── СЦЕНА: цвета + скорость/шум/зерно/насыщенность + живой превью ── */
const SCENE_DEF = { c1: '#ff0033', c2: '#4a000f', c3: '#080002', metal: '#cfd6e0', speed: 1.0, noise: 1.0, grain: 0.10, mix: 0.62 };
/* сцена PRO (Фаза 5): [inputId, ключ, labelId, дефолт, знаков после запятой] */
const SCENE_PRO = [
    ['sLightKey', 'scene_light_key', 'vLightKey', 1.05, 2],
    ['sLightUnder', 'scene_light_under', 'vLightUnder', 1.30, 2],
    ['sLightRim', 'scene_light_rim', 'vLightRim', 1.25, 2],
    ['sYaw', 'scene_yaw', 'vYaw', 0.55, 2],
    ['sScale', 'scene_skull_scale', 'vScale', 1.00, 2],
    ['sSway', 'scene_sway', 'vSway', 1.00, 2],
    ['sMouse', 'scene_mouse', 'vMouse', 1.00, 2],
    ['sHeartX', 'scene_heart_x', 'vHeartX', 0.95, 2],
    ['sHeartY', 'scene_heart_y', 'vHeartY', 0.32, 2],
    ['sFog', 'scene_fog', 'vFog', 1.00, 2],
    ['sAshSpeed', 'scene_ash_speed', 'vAshSpeed', 1.00, 2],
    ['sAshCount', 'scene_ash_count', 'vAshCount', 420, 0],
];

function loadSceneControls(c) {
    const col = (n, val, def) => {
        const hex = (val && /^#[0-9a-fA-F]{6}$/.test(val)) ? val : def;
        const inp = document.getElementById('sceneColor' + n);
        const lab = document.getElementById('sceneVal' + n);
        if (inp) inp.value = hex;
        if (lab) lab.textContent = hex;
    };
    col(1, c.scene_color1, SCENE_DEF.c1);
    col(2, c.scene_color2, SCENE_DEF.c2);
    col(3, c.scene_color3, SCENE_DEF.c3);
    const cm = (c.scene_metal && /^#[0-9a-fA-F]{6}$/.test(c.scene_metal)) ? c.scene_metal : SCENE_DEF.metal;
    const mInp = document.getElementById('sceneMetal'); if (mInp) mInp.value = cm;
    const mLab = document.getElementById('sceneValMetal'); if (mLab) mLab.textContent = cm;
    const sld = (id, val, def, labId, digits) => {
        const n = parseFloat(val); const v = isFinite(n) ? n : def;
        const el = document.getElementById(id); if (el) el.value = v;
        const l = document.getElementById(labId); if (l) l.textContent = v.toFixed(digits);
    };
    sld('sceneSpeed', c.scene_speed, SCENE_DEF.speed, 'valSpeed', 1);
    sld('sceneNoise', c.scene_noise, SCENE_DEF.noise, 'valNoise', 1);
    sld('sceneGrain', c.scene_grain, SCENE_DEF.grain, 'valGrain', 2);
    sld('sceneMix', c.scene_mix, SCENE_DEF.mix, 'valMix', 2);

    /* PRO: базовый цвет кости + слайдеры света/поведения/атмосферы */
    const cb = (c.scene_bone_color && /^#[0-9a-fA-F]{6}$/.test(c.scene_bone_color)) ? c.scene_bone_color : '#d4d1c8';
    const bInp = document.getElementById('sceneBone'); if (bInp) bInp.value = cb;
    const bLab = document.getElementById('sceneValBone'); if (bLab) bLab.textContent = cb;
    SCENE_PRO.forEach(([id, key, labId, def, dig]) => {
        const n = parseFloat(c[key]); const v = isFinite(n) ? n : def;
        const el = document.getElementById(id); if (el) el.value = v;
        const l = document.getElementById(labId); if (l) l.textContent = v.toFixed(dig);
    });
    _syncPreview();
}

async function saveScene() {
    setStatus('sceneStatus', 'СОХРАНЯЮ...', 'busy');
    const g = id => document.getElementById(id).value;
    try {
        await _saveMulti([
            { key: 'scene_color1', value: g('sceneColor1') },
            { key: 'scene_color2', value: g('sceneColor2') },
            { key: 'scene_color3', value: g('sceneColor3') },
            { key: 'scene_metal', value: g('sceneMetal') },
            { key: 'scene_speed', value: g('sceneSpeed') },
            { key: 'scene_noise', value: g('sceneNoise') },
            { key: 'scene_grain', value: g('sceneGrain') },
            { key: 'scene_mix', value: g('sceneMix') },
            { key: 'scene_bone_color', value: g('sceneBone') },
            ...SCENE_PRO.map(([id, key]) => ({ key, value: g(id) })),
        ]);
        setStatus('sceneStatus', '✓ СОХРАНЕНО — обнови сайт (Ctrl+Shift+R)', 'ok');
    } catch (e) { setStatus('sceneStatus', 'ОШИБКА: ' + e.message, 'err'); }
}
async function resetScene() {
    setStatus('sceneStatus', 'СБРОС...', 'busy');
    try {
        await _saveMulti(['scene_color1', 'scene_color2', 'scene_color3', 'scene_metal', 'scene_speed', 'scene_noise', 'scene_grain', 'scene_mix',
            'scene_bone_color', ...SCENE_PRO.map(([, key]) => key)]
            .map(key => ({ key, value: '' })));
        loadSceneControls({});   /* пусто → дефолты */
        setStatus('sceneStatus', '✓ ВЕРНУЛ КРОВЬ — обнови сайт', 'ok');
    } catch (e) { setStatus('sceneStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* живой превью: тот же жидкий шейдер, что на черепе (кость, тонированная палитрой) */
let _preview = null;
const _PREVIEW_FRAG = `
uniform float u_time; uniform vec2 u_res;
uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3;
uniform float u_speed; uniform float u_noise; uniform float u_grain; uniform float u_mix;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
float nz(vec2 p){ vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){ float v=0.,a=.5; mat2 r=mat2(.8,.6,-.6,.8);
  for(int i=0;i<5;i++){v+=a*nz(p);p=r*p*2.0+u_time*0.04*u_speed;a*=.5;} return v;}
void main(){
  vec2 uv = gl_FragCoord.xy/u_res.xy;
  float asp = u_res.x/u_res.y;
  vec2 p = vec2(uv.x*asp, uv.y) * (3.0*u_noise);
  vec2 q = vec2(fbm(p+u_time*0.06*u_speed), fbm(p+vec2(5.2,1.3)-u_time*0.05*u_speed));
  float f = clamp(fbm(p+3.0*q)/0.9375, 0.0, 1.0);
  vec3 pal = mix(u_c3,u_c2,smoothstep(0.10,0.50,f));
  pal = mix(pal,u_c1,smoothstep(0.40,0.90,f));
  vec3 bone = vec3(0.83,0.82,0.78);
  float k = smoothstep(0.30,0.72,f)*u_mix;
  vec3 col = mix(bone, pal, k);
  col += u_c1 * smoothstep(0.62,0.88,f) * (u_mix*0.35);
  float g = fract(sin(dot(uv+fract(u_time),vec2(12.9898,78.233)))*43758.5453);
  col += (g-0.5)*u_grain;
  gl_FragColor = vec4(col,1.0);
}`;

function initScenePreview() {
    if (_preview || !window.THREE) return;
    const canvas = document.getElementById('scenePreview');
    if (!canvas) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
    catch (e) { return; }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uni = {
        u_time: { value: 0 }, u_res: { value: new THREE.Vector2(1, 1) },
        u_c1: { value: new THREE.Color(SCENE_DEF.c1) },
        u_c2: { value: new THREE.Color(SCENE_DEF.c2) },
        u_c3: { value: new THREE.Color(SCENE_DEF.c3) },
        u_speed: { value: 1 }, u_noise: { value: 1 }, u_grain: { value: 0.1 }, u_mix: { value: 0.62 },
    };
    const mat = new THREE.ShaderMaterial({
        uniforms: uni,
        vertexShader: 'void main(){ gl_Position = vec4(position, 1.0); }',
        fragmentShader: _PREVIEW_FRAG,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    function size() {
        const w = canvas.clientWidth || 300, hh = canvas.clientHeight || 190;
        renderer.setSize(w, hh, false);
        uni.u_res.value.set(w * dpr, hh * dpr);
    }
    size();
    if (window.ResizeObserver) new ResizeObserver(size).observe(canvas);
    _preview = { uni };
    const clock = new THREE.Clock();
    (function loop() {
        requestAnimationFrame(loop);
        uni.u_time.value = clock.getElapsedTime();
        renderer.render(scene, cam);
    })();

    /* слайдеры/пипетки → лейбл + превью вживую */
    [1, 2, 3].forEach(n => {
        const el = document.getElementById('sceneColor' + n);
        el && el.addEventListener('input', () => {
            const l = document.getElementById('sceneVal' + n); if (l) l.textContent = el.value;
            _syncPreview();
        });
    });
    const mEl = document.getElementById('sceneMetal');
    mEl && mEl.addEventListener('input', () => {
        const l = document.getElementById('sceneValMetal'); if (l) l.textContent = mEl.value;
        _pushPreview();
    });
    [['sceneSpeed', 'valSpeed', 1], ['sceneNoise', 'valNoise', 1], ['sceneGrain', 'valGrain', 2], ['sceneMix', 'valMix', 2]]
        .forEach(([id, lab, d]) => {
            const el = document.getElementById(id);
            el && el.addEventListener('input', () => {
                const l = document.getElementById(lab); if (l) l.textContent = parseFloat(el.value).toFixed(d);
                _syncPreview();
            });
        });

    /* PRO-контролы: обновляют лейбл + толкают live-превью (свет/поведение видны только в iframe) */
    const bEl = document.getElementById('sceneBone');
    bEl && bEl.addEventListener('input', () => {
        const l = document.getElementById('sceneValBone'); if (l) l.textContent = bEl.value;
        _pushPreview();
    });
    SCENE_PRO.forEach(([id, , labId, , dig]) => {
        const el = document.getElementById(id);
        el && el.addEventListener('input', () => {
            const l = document.getElementById(labId); if (l) l.textContent = parseFloat(el.value).toFixed(dig);
            _pushPreview();
        });
    });

    /* тема (Фаза 6): пипетки → лейбл + live-превью */
    [['themeAccent', 'themeValAccent'], ['themeBg', 'themeValBg'], ['themeText', 'themeValText']]
        .forEach(([id, labId]) => {
            const el = document.getElementById(id);
            el && el.addEventListener('input', () => {
                const l = document.getElementById(labId); if (l) l.textContent = el.value;
                _pushPreview();
            });
        });

    _syncPreview();
}
function _syncPreview() {
    if (!_preview) return;
    const g = id => document.getElementById(id);
    _preview.uni.u_c1.value.set(g('sceneColor1').value);
    _preview.uni.u_c2.value.set(g('sceneColor2').value);
    _preview.uni.u_c3.value.set(g('sceneColor3').value);
    _preview.uni.u_speed.value = parseFloat(g('sceneSpeed').value);
    _preview.uni.u_noise.value = parseFloat(g('sceneNoise').value);
    _preview.uni.u_grain.value = parseFloat(g('sceneGrain').value);
    _preview.uni.u_mix.value = parseFloat(g('sceneMix').value);
    _pushPreview();   /* базовые контролы сцены → live-превью в iframe */
}

/* ── РЕЛИЗ ───────────────────────────────────── */
document.getElementById('releaseCoverFile')?.addEventListener('change', uploadReleaseCover);
async function uploadReleaseCover() {
    const file = document.getElementById('releaseCoverFile').files[0];
    if (!file) return;
    setStatus('releaseStatus', 'ЗАГРУЗКА...', 'busy');
    const ext = file.name.split('.').pop() || 'jpg';
    const { error } = await _supabase.storage
        .from('stories').upload(`release-cover.${ext}`, file, { upsert: true, cacheControl: '0' });
    if (error) { setStatus('releaseStatus', 'ERROR: ' + error.message, 'err'); return; }
    const url = `${SUPABASE_URL}/storage/v1/object/public/stories/release-cover.${ext}?v=${Date.now()}`;
    document.getElementById('fieldReleaseCover').value = url;
    setStatus('releaseStatus', '✓ ФАЙЛ ЗАГРУЖЕН — нажми «СОХРАНИТЬ»', 'ok');
}
async function saveRelease() {
    setStatus('releaseStatus', 'СОХРАНЯЮ...', 'busy');
    const checkedRadio = document.querySelector('input[name="releaseStatus"]:checked');
    const status = checkedRadio ? checkedRadio.value : 'disabled';
    try {
        await _saveMulti([
            { key: 'release_status', value: status },
            { key: 'release_title', value: document.getElementById('fieldReleaseTitle').value.trim() },
            { key: 'release_cover_url', value: document.getElementById('fieldReleaseCover').value.trim() },
            { key: 'release_track_url', value: document.getElementById('fieldReleaseTrack').value.trim() },
            { key: 'release_btn_label', value: (document.getElementById('fieldReleaseBtnLabel')?.value || '').trim() },
        ]);
        setStatus('releaseStatus', '✓ РЕЛИЗ СОХРАНЁН', 'ok');
    } catch (e) { setStatus('releaseStatus', 'ОШИБКА: ' + e.message, 'err'); }
}
async function clearRelease() {
    setStatus('releaseStatus', 'ВЫКЛЮЧАЮ...', 'busy');
    document.querySelectorAll('input[name="releaseStatus"]').forEach(r => { r.checked = r.value === 'disabled'; });
    try {
        await _saveMulti([{ key: 'release_status', value: 'disabled' }]);
        setStatus('releaseStatus', '✓ БЛОК ВЫКЛЮЧЕН', 'ok');
    } catch (e) { setStatus('releaseStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── CRUD-СПИСКИ (фабрика: concerts / custom_buttons / …) ──────
   Один механизм на все таблицы-списки: рендер, добавить, редактировать (инлайн),
   скрыть/показать, порядок ▲/▼ (renumber position 0..n), удалить.
   cfg: { table, container, status, order:[[col,asc]], fields:[{key,ph,type,required}],
          icon(row)->faClass, title(row)->str, sub(row)->str, empty:str } */
function makeCrudList(cfg) {
    const box = () => document.getElementById(cfg.container);
    const st = (msg, type) => setStatus(cfg.status, msg, type);

    async function fetchOrdered() {
        let q = _supabase.from(cfg.table).select('*');
        cfg.order.forEach(([col, asc]) => { q = q.order(col, { ascending: asc }); });
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    }

    async function load() {
        const el = box();
        if (!el) return;
        try {
            const rows = await fetchOrdered();
            if (!rows.length) {
                el.innerHTML = `<div class="help-text" style="text-align:center;padding:12px 0;">${escHtml(cfg.empty)}</div>`;
                return;
            }
            el.innerHTML = '';
            rows.forEach((r, i) => el.appendChild(renderItem(r, i, rows.length)));
        } catch (e) {
            el.innerHTML = '<div class="status-line err" style="padding:8px 0;">Ошибка: ' + escHtml(e.message) + '</div>';
        }
    }

    function actBtn(icon, title, extra, handler, disabled) {
        const b = document.createElement('button');
        b.className = 'li-act ' + (extra || '');
        b.title = title;
        b.innerHTML = `<i class="fa-solid ${icon}"></i>`;
        if (disabled) { b.disabled = true; b.style.opacity = '.25'; b.style.cursor = 'default'; }
        else b.addEventListener('click', handler);
        return b;
    }

    function renderItem(row, i, n) {
        const wrap = document.createElement('div');
        wrap.className = 'crud-wrap';
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML =
            `<div class="li-ic"><i class="${escHtml(cfg.icon(row))}"></i></div>
             <div class="li-info">
                 <div class="li-title">${escHtml(cfg.title(row) || '—')}</div>
                 <div class="li-sub">${escHtml(cfg.sub(row) || '')}</div>
             </div>
             <div class="li-acts"></div>`;
        const acts = item.querySelector('.li-acts');
        acts.append(
            actBtn('fa-pen', 'Редактировать', '', () => openEdit(wrap, row)),
            actBtn('fa-arrow-up', 'Выше', '', () => move(row.id, -1), i === 0),
            actBtn('fa-arrow-down', 'Ниже', '', () => move(row.id, 1), i === n - 1),
            actBtn(row.visible ? 'fa-eye' : 'fa-eye-slash', row.visible ? 'Скрыть' : 'Показать',
                row.visible ? '' : 'hidden', () => toggleVisible(row.id, row.visible)),
            actBtn('fa-trash', 'Удалить', 'del', () => del(row.id))
        );
        wrap.appendChild(item);
        return wrap;
    }

    function openEdit(wrap, row) {
        if (wrap.querySelector('.crud-edit')) { wrap.querySelector('.crud-edit').remove(); return; }
        const form = document.createElement('div');
        form.className = 'crud-edit';
        form.innerHTML = cfg.fields.map(f =>
            `<input class="input" data-k="${f.key}" type="${f.type || 'text'}" placeholder="${escHtml(f.ph)}" ` +
            `value="${escHtml(row[f.key] == null ? '' : row[f.key])}" style="margin-bottom:8px;">`
        ).join('') +
            `<div class="btn-row">
                <button class="btn-action js-save">СОХРАНИТЬ</button>
                <button class="btn-action btn-danger js-cancel">ОТМЕНА</button>
             </div>`;
        wrap.appendChild(form);
        form.querySelector('.js-cancel').addEventListener('click', () => form.remove());
        form.querySelector('.js-save').addEventListener('click', () => saveEdit(row.id, form));
    }

    async function saveEdit(id, form) {
        const patch = {};
        form.querySelectorAll('[data-k]').forEach(inp => { patch[inp.dataset.k] = inp.value.trim(); });
        const missing = cfg.fields.find(f => f.required && !patch[f.key]);
        if (missing) { st('ЗАПОЛНИ: ' + missing.ph, 'err'); return; }
        st('СОХРАНЯЮ...', 'busy');
        try {
            const { error } = await _supabase.from(cfg.table).update(patch).eq('id', id);
            if (error) throw error;
            st('✓ СОХРАНЕНО', 'ok');
            await load();
        } catch (e) { st('ОШИБКА: ' + e.message, 'err'); }
    }

    async function nextPosition() {
        const { data } = await _supabase.from(cfg.table).select('position')
            .order('position', { ascending: false }).limit(1);
        return (data && data.length ? (data[0].position || 0) + 1 : 0);
    }

    async function add(values) {
        const position = await nextPosition();
        return _supabase.from(cfg.table).insert({ ...values, visible: true, position });
    }

    async function move(id, dir) {
        try {
            const rows = await fetchOrdered();
            const i = rows.findIndex(r => r.id === id);
            const j = dir < 0 ? i - 1 : i + 1;
            if (i < 0 || j < 0 || j >= rows.length) return;
            [rows[i], rows[j]] = [rows[j], rows[i]];
            /* перенумеровать позиции в порядок массива (лечит легаси-нули) */
            for (let k = 0; k < rows.length; k++) {
                if (rows[k].position !== k) {
                    const { error } = await _supabase.from(cfg.table).update({ position: k }).eq('id', rows[k].id);
                    if (error) throw error;
                }
            }
            await load();
        } catch (e) { st('ОШИБКА: ' + e.message, 'err'); }
    }

    async function toggleVisible(id, cur) {
        try {
            const { error } = await _supabase.from(cfg.table).update({ visible: !cur }).eq('id', id);
            if (error) throw error;
            await load();
        } catch (e) { st('ОШИБКА: ' + e.message, 'err'); }
    }

    async function del(id) {
        if (!confirm('Удалить запись?')) return;
        try {
            const { error } = await _supabase.from(cfg.table).delete().eq('id', id);
            if (error) throw error;
            st('✓ УДАЛЕНО', 'ok');
            await load();
        } catch (e) { st('ОШИБКА: ' + e.message, 'err'); }
    }

    return { load, add };
}

/* ── КОНЦЕРТЫ (таблица concerts) ─────────────── */
const _concertsCrud = makeCrudList({
    table: 'concerts', container: 'concertAdminList', status: 'concertStatus',
    order: [['position', true], ['created_at', true]],
    fields: [
        { key: 'city', ph: 'Город (АЛМАТЫ)', required: true },
        { key: 'date_text', ph: 'Дата (21.12.2026)' },
        { key: 'venue', ph: 'Площадка' },
        { key: 'price_text', ph: 'Цена (от 5 000 ₸)' },
        { key: 'tickets_url', ph: 'Ссылка на билеты https://...', type: 'url' },
    ],
    icon: () => 'fa-solid fa-location-dot',
    title: r => r.city,
    sub: r => [r.date_text, r.venue, r.price_text].filter(Boolean).join(' · ') || 'без деталей',
    empty: 'Концертов нет. На сайте — «пока — тишина».',
});
function loadConcertsAdmin() { return _concertsCrud.load(); }
async function addConcert() {
    const g = id => document.getElementById(id).value.trim();
    const values = {
        city: g('newConcCity'), date_text: g('newConcDate'), venue: g('newConcVenue'),
        price_text: g('newConcPrice'), tickets_url: g('newConcUrl'),
    };
    if (!values.city) { setStatus('concertStatus', 'УКАЖИ ГОРОД', 'err'); return; }
    setStatus('concertStatus', 'ДОБАВЛЯЮ...', 'busy');
    const { error } = await _concertsCrud.add(values);
    if (error) { setStatus('concertStatus', 'ОШИБКА: ' + error.message, 'err'); return; }
    ['newConcCity', 'newConcDate', 'newConcVenue', 'newConcPrice', 'newConcUrl']
        .forEach(id => document.getElementById(id).value = '');
    setStatus('concertStatus', '✓ КОНЦЕРТ ДОБАВЛЕН', 'ok');
    loadConcertsAdmin();
}

/* ── ДОП. КНОПКИ / СОЦСЕТИ (custom_buttons) ──── */
const _buttonsCrud = makeCrudList({
    table: 'custom_buttons', container: 'customBtnList', status: 'customBtnStatus',
    order: [['position', true]],
    fields: [
        { key: 'label', ph: 'Название (TIKTOK)', required: true },
        { key: 'url', ph: 'https://...', type: 'url', required: true },
        { key: 'icon', ph: 'fa-brands fa-tiktok' },
    ],
    icon: r => r.icon || 'fa-solid fa-link',
    title: r => r.label,
    sub: r => r.url,
    empty: 'Нет кнопок. Добавь ниже.',
});
function loadCustomButtons() { return _buttonsCrud.load(); }
async function addCustomButton() {
    const g = id => document.getElementById(id).value.trim();
    const values = { label: g('newBtnLabel'), url: g('newBtnUrl'), icon: g('newBtnIcon') || 'fa-solid fa-link' };
    if (!values.label || !values.url) { setStatus('customBtnStatus', 'ЗАПОЛНИ НАЗВАНИЕ И URL', 'err'); return; }
    setStatus('customBtnStatus', 'ДОБАВЛЯЮ...', 'busy');
    const { error } = await _buttonsCrud.add(values);
    if (error) { setStatus('customBtnStatus', 'ОШИБКА: ' + error.message, 'err'); return; }
    ['newBtnLabel', 'newBtnUrl', 'newBtnIcon'].forEach(id => document.getElementById(id).value = '');
    setStatus('customBtnStatus', '✓ КНОПКА ДОБАВЛЕНА', 'ok');
    loadCustomButtons();
}

/* ── ПЛОЩАДКИ (таблица platforms, Фаза 3) ─────── */
const _platformsCrud = makeCrudList({
    table: 'platforms', container: 'platformAdminList', status: 'platformStatus',
    order: [['position', true]],
    fields: [
        { key: 'label', ph: 'Название (SPOTIFY)', required: true },
        { key: 'url', ph: 'https://...', type: 'url' },
        { key: 'icon', ph: 'fa-brands fa-spotify (или yandex-star)' },
        { key: 'color', ph: '#1DB954 (пусто = кровь)' },
    ],
    icon: p => p.icon === 'yandex-star' ? 'fa-solid fa-star' : (p.icon || 'fa-solid fa-music'),
    title: p => p.label,
    sub: p => p.url || 'без ссылки',
    empty: 'Площадок нет. Добавь ниже (или запусти SQL-миграцию v14 с сидами).',
});
function loadPlatformsAdmin() { return _platformsCrud.load(); }
async function addPlatform() {
    const g = id => document.getElementById(id).value.trim();
    const values = { label: g('newPlatLabel'), url: g('newPlatUrl'), icon: g('newPlatIcon') || 'fa-solid fa-music', color: g('newPlatColor') };
    if (!values.label) { setStatus('platformStatus', 'УКАЖИ НАЗВАНИЕ', 'err'); return; }
    setStatus('platformStatus', 'ДОБАВЛЯЮ...', 'busy');
    const { error } = await _platformsCrud.add(values);
    if (error) { setStatus('platformStatus', 'ОШИБКА: ' + error.message, 'err'); return; }
    ['newPlatLabel', 'newPlatUrl', 'newPlatIcon', 'newPlatColor'].forEach(id => document.getElementById(id).value = '');
    setStatus('platformStatus', '✓ ПЛОЩАДКА ДОБАВЛЕНА', 'ok');
    loadPlatformsAdmin();
}

/* ── LIVE-ПРЕВЬЮ САЙТА (Фаза 8) ────────────────── */
function ensurePreview() {
    const f = document.getElementById('sitePreviewFrame');
    if (f && !f.src) f.src = '/?preview=1';
}
function reloadPreview() {
    const f = document.getElementById('sitePreviewFrame');
    if (f) f.src = '/?preview=1';
}
function setPreviewWidth(mode, btn) {
    const f = document.getElementById('sitePreviewFrame');
    if (f) f.style.width = mode === 'mobile' ? '390px' : '100%';
    if (btn) {
        btn.parentElement.querySelectorAll('.btn-action').forEach(b => b.classList.remove('active-w'));
        btn.classList.add('active-w');
    }
}
/* собрать текущие значения сцены+темы и толкнуть в iframe (без записи в базу) */
function _pushPreview() {
    const f = document.getElementById('sitePreviewFrame');
    if (!f || !f.src || !f.contentWindow) return;
    const g = id => document.getElementById(id) ? document.getElementById(id).value : undefined;
    const payload = {
        scene_color1: g('sceneColor1'), scene_color2: g('sceneColor2'), scene_color3: g('sceneColor3'),
        scene_metal: g('sceneMetal'), scene_bone_color: g('sceneBone'),
        scene_speed: g('sceneSpeed'), scene_noise: g('sceneNoise'), scene_grain: g('sceneGrain'), scene_mix: g('sceneMix'),
        theme_accent: g('themeAccent'), theme_bg: g('themeBg'), theme_text: g('themeText'),
    };
    SCENE_PRO.forEach(([id, key]) => { payload[key] = g(id); });
    f.contentWindow.postMessage({ type: 'scene', payload }, location.origin);
}

/* ── СТАРТ ── */
checkAuth();
