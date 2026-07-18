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
        _fill('fieldYandex', c.yandex_music_url);
        _fill('fieldVk', c.vk_music_url);
        _fill('fieldSpotify', c.spotify_url);
        _fill('fieldApple', c.apple_music_url);
        _fill('fieldYt', c.yt_music_url);
        _fill('fieldSoundcloud', c.soundcloud_url);

        _fill('fieldReleaseTitle', c.release_title);
        _fill('fieldReleaseCover', c.release_cover_url);
        _fill('fieldReleaseTrack', c.release_track_url);
        _fill('fieldReleaseBtnLabel', c.release_btn_label);
        const rs = c.release_status || 'disabled';
        document.querySelectorAll('input[name="releaseStatus"]').forEach(r => { r.checked = r.value === rs; });

        /* сцена: цвета + параметры (пусто = дефолт) */
        loadSceneControls(c);
    } catch (e) { console.warn('[ADMIN] loadSettings:', e); }
}

/* ── ССЫЛКИ ──────────────────────────────────── */
async function saveAllLinks() {
    setStatus('linksStatus', 'СОХРАНЯЮ...', 'busy');
    const rows = [
        { key: 'telegram_url', value: document.getElementById('fieldTelegram').value.trim() },
        { key: 'instagram_url', value: document.getElementById('fieldInstagram').value.trim() },
        { key: 'yandex_music_url', value: document.getElementById('fieldYandex').value.trim() },
        { key: 'vk_music_url', value: document.getElementById('fieldVk').value.trim() },
        { key: 'spotify_url', value: document.getElementById('fieldSpotify').value.trim() },
        { key: 'apple_music_url', value: document.getElementById('fieldApple').value.trim() },
        { key: 'yt_music_url', value: document.getElementById('fieldYt').value.trim() },
        { key: 'soundcloud_url', value: document.getElementById('fieldSoundcloud').value.trim() },
    ].filter(r => r.value);
    try {
        await _saveMulti(rows);
        setStatus('linksStatus', '✓ СОХРАНЕНО', 'ok');
    } catch (e) { setStatus('linksStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── СЦЕНА: цвета + скорость/шум/зерно/насыщенность + живой превью ── */
const SCENE_DEF = { c1: '#ff0033', c2: '#4a000f', c3: '#080002', speed: 1.0, noise: 1.0, grain: 0.10, mix: 0.62 };

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
    const sld = (id, val, def, labId, digits) => {
        const n = parseFloat(val); const v = isFinite(n) ? n : def;
        const el = document.getElementById(id); if (el) el.value = v;
        const l = document.getElementById(labId); if (l) l.textContent = v.toFixed(digits);
    };
    sld('sceneSpeed', c.scene_speed, SCENE_DEF.speed, 'valSpeed', 1);
    sld('sceneNoise', c.scene_noise, SCENE_DEF.noise, 'valNoise', 1);
    sld('sceneGrain', c.scene_grain, SCENE_DEF.grain, 'valGrain', 2);
    sld('sceneMix', c.scene_mix, SCENE_DEF.mix, 'valMix', 2);
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
            { key: 'scene_speed', value: g('sceneSpeed') },
            { key: 'scene_noise', value: g('sceneNoise') },
            { key: 'scene_grain', value: g('sceneGrain') },
            { key: 'scene_mix', value: g('sceneMix') },
        ]);
        setStatus('sceneStatus', '✓ СОХРАНЕНО — обнови сайт (Ctrl+Shift+R)', 'ok');
    } catch (e) { setStatus('sceneStatus', 'ОШИБКА: ' + e.message, 'err'); }
}
async function resetScene() {
    setStatus('sceneStatus', 'СБРОС...', 'busy');
    try {
        await _saveMulti(['scene_color1', 'scene_color2', 'scene_color3', 'scene_speed', 'scene_noise', 'scene_grain', 'scene_mix']
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
    [['sceneSpeed', 'valSpeed', 1], ['sceneNoise', 'valNoise', 1], ['sceneGrain', 'valGrain', 2], ['sceneMix', 'valMix', 2]]
        .forEach(([id, lab, d]) => {
            const el = document.getElementById(id);
            el && el.addEventListener('input', () => {
                const l = document.getElementById(lab); if (l) l.textContent = parseFloat(el.value).toFixed(d);
                _syncPreview();
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

/* ── КОНЦЕРТЫ (таблица concerts) ─────────────── */
async function loadConcertsAdmin() {
    const list = document.getElementById('concertAdminList');
    if (!list) return;
    try {
        const { data, error } = await _supabase.from('concerts').select('*')
            .order('position', { ascending: true }).order('created_at', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
            list.innerHTML = '<div class="help-text" style="text-align:center;padding:12px 0;">Концертов нет. На сайте — «пока — тишина».</div>';
            return;
        }
        list.innerHTML = '';
        data.forEach(c => list.appendChild(buildConcertItem(c)));
    } catch (e) {
        list.innerHTML = '<div class="status-line err" style="padding:8px 0;">Ошибка: ' + escHtml(e.message) +
            '. Таблицы concerts нет? Запусти SQL-миграцию в Supabase.</div>';
    }
}
function buildConcertItem(c) {
    const div = document.createElement('div');
    div.className = 'list-item';
    const meta = [c.date_text, c.venue, c.price_text].filter(Boolean).join(' · ');
    div.innerHTML = `
        <div class="li-ic"><i class="fa-solid fa-location-dot"></i></div>
        <div class="li-info">
            <div class="li-title">${escHtml(c.city)}</div>
            <div class="li-sub">${escHtml(meta || 'без деталей')}</div>
        </div>
        <div class="li-acts">
            <button class="li-act ${c.visible ? '' : 'hidden'}" title="${c.visible ? 'Скрыть' : 'Показать'}"
                onclick="toggleConcertVisible(${c.id}, ${c.visible}, this)">
                <i class="fa-solid ${c.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </button>
            <button class="li-act del" title="Удалить" onclick="deleteConcert(${c.id}, this)"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    return div;
}
async function addConcert() {
    const city = document.getElementById('newConcCity').value.trim();
    const date_text = document.getElementById('newConcDate').value.trim();
    const venue = document.getElementById('newConcVenue').value.trim();
    const price_text = document.getElementById('newConcPrice').value.trim();
    const tickets_url = document.getElementById('newConcUrl').value.trim();
    if (!city) { setStatus('concertStatus', 'УКАЖИ ГОРОД', 'err'); return; }
    setStatus('concertStatus', 'ДОБАВЛЯЮ...', 'busy');
    try {
        const { error } = await _supabase.from('concerts')
            .insert({ city, date_text, venue, price_text, tickets_url, visible: true, position: 0 });
        if (error) throw error;
        ['newConcCity', 'newConcDate', 'newConcVenue', 'newConcPrice', 'newConcUrl']
            .forEach(id => document.getElementById(id).value = '');
        setStatus('concertStatus', '✓ КОНЦЕРТ ДОБАВЛЕН', 'ok');
        await loadConcertsAdmin();
    } catch (e) { setStatus('concertStatus', 'ОШИБКА: ' + e.message, 'err'); }
}
async function toggleConcertVisible(id, currentVisible, btn) {
    const newVisible = !currentVisible;
    try {
        const { error } = await _supabase.from('concerts').update({ visible: newVisible }).eq('id', id);
        if (error) throw error;
        btn.classList.toggle('hidden', !newVisible);
        btn.title = newVisible ? 'Скрыть' : 'Показать';
        btn.innerHTML = `<i class="fa-solid ${newVisible ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
        btn.onclick = () => toggleConcertVisible(id, newVisible, btn);
    } catch (e) { alert('Ошибка: ' + e.message); }
}
async function deleteConcert(id, btn) {
    if (!confirm('Удалить концерт?')) return;
    const item = btn.closest('.list-item');
    try {
        const { error } = await _supabase.from('concerts').delete().eq('id', id);
        if (error) throw error;
        item?.remove();
        setStatus('concertStatus', '✓ УДАЛЕНО', 'ok');
        if (!document.querySelector('#concertAdminList .list-item')) loadConcertsAdmin();
    } catch (e) { setStatus('concertStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── ДОП. КНОПКИ / СОЦСЕТИ (custom_buttons) ──── */
async function loadCustomButtons() {
    const list = document.getElementById('customBtnList');
    if (!list) return;
    try {
        const { data, error } = await _supabase.from('custom_buttons').select('*').order('position', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
            list.innerHTML = '<div class="help-text" style="text-align:center;padding:12px 0;">Нет кнопок. Добавь ниже.</div>';
            return;
        }
        list.innerHTML = '';
        data.forEach(btn => list.appendChild(buildBtnItem(btn)));
    } catch (e) {
        list.innerHTML = '<div class="status-line err" style="padding:8px 0;">Ошибка: ' + escHtml(e.message) + '</div>';
    }
}
function buildBtnItem(btn) {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
        <div class="li-ic"><i class="${escHtml(btn.icon || 'fa-solid fa-link')}"></i></div>
        <div class="li-info">
            <div class="li-title">${escHtml(btn.label)}</div>
            <div class="li-sub">${escHtml(btn.url)}</div>
        </div>
        <div class="li-acts">
            <button class="li-act ${btn.visible ? '' : 'hidden'}" title="${btn.visible ? 'Скрыть' : 'Показать'}"
                onclick="toggleBtnVisible(${btn.id}, ${btn.visible}, this)">
                <i class="fa-solid ${btn.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </button>
            <button class="li-act del" title="Удалить" onclick="deleteCustomBtn(${btn.id}, this)"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    return div;
}
async function addCustomButton() {
    const label = document.getElementById('newBtnLabel').value.trim();
    const url = document.getElementById('newBtnUrl').value.trim();
    const icon = document.getElementById('newBtnIcon').value.trim() || 'fa-solid fa-link';
    if (!label || !url) { setStatus('customBtnStatus', 'ЗАПОЛНИ НАЗВАНИЕ И URL', 'err'); return; }
    setStatus('customBtnStatus', 'ДОБАВЛЯЮ...', 'busy');
    try {
        const { error } = await _supabase.from('custom_buttons').insert({ label, url, icon, visible: true, position: 0 });
        if (error) throw error;
        document.getElementById('newBtnLabel').value = '';
        document.getElementById('newBtnUrl').value = '';
        document.getElementById('newBtnIcon').value = '';
        setStatus('customBtnStatus', '✓ КНОПКА ДОБАВЛЕНА', 'ok');
        await loadCustomButtons();
    } catch (e) { setStatus('customBtnStatus', 'ОШИБКА: ' + e.message, 'err'); }
}
async function toggleBtnVisible(id, currentVisible, btn) {
    const newVisible = !currentVisible;
    try {
        const { error } = await _supabase.from('custom_buttons').update({ visible: newVisible }).eq('id', id);
        if (error) throw error;
        btn.classList.toggle('hidden', !newVisible);
        btn.title = newVisible ? 'Скрыть' : 'Показать';
        btn.innerHTML = `<i class="fa-solid ${newVisible ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
        btn.onclick = () => toggleBtnVisible(id, newVisible, btn);
    } catch (e) { alert('Ошибка: ' + e.message); }
}
async function deleteCustomBtn(id, btn) {
    if (!confirm('Удалить кнопку?')) return;
    const item = btn.closest('.list-item');
    try {
        const { error } = await _supabase.from('custom_buttons').delete().eq('id', id);
        if (error) throw error;
        item?.remove();
        setStatus('customBtnStatus', '✓ УДАЛЕНО', 'ok');
        if (!document.querySelector('#customBtnList .list-item')) loadCustomButtons();
    } catch (e) { setStatus('customBtnStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── СТАРТ ── */
checkAuth();
