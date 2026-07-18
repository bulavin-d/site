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

        /* цвета сцены (пусто = дефолт) */
        _setSceneColor(1, c.scene_color1, '#ff0033');
        _setSceneColor(2, c.scene_color2, '#4a000f');
        _setSceneColor(3, c.scene_color3, '#080002');
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

/* ── ЦВЕТА СЦЕНЫ ─────────────────────────────── */
function _setSceneColor(n, val, def) {
    const hex = (val && /^#[0-9a-fA-F]{6}$/.test(val)) ? val : def;
    const input = document.getElementById('sceneColor' + n);
    const label = document.getElementById('sceneVal' + n);
    if (input) input.value = hex;
    if (label) label.textContent = (val && val.trim()) ? hex : hex + ' (дефолт)';
    const input2 = document.getElementById('sceneColor' + n);
    if (input2) input2.oninput = () => {
        if (label) label.textContent = input2.value;
    };
}
async function saveScene() {
    setStatus('sceneStatus', 'СОХРАНЯЮ...', 'busy');
    try {
        await _saveMulti([
            { key: 'scene_color1', value: document.getElementById('sceneColor1').value },
            { key: 'scene_color2', value: document.getElementById('sceneColor2').value },
            { key: 'scene_color3', value: document.getElementById('sceneColor3').value },
        ]);
        setStatus('sceneStatus', '✓ ЦВЕТА СОХРАНЕНЫ — обнови сайт', 'ok');
    } catch (e) { setStatus('sceneStatus', 'ОШИБКА: ' + e.message, 'err'); }
}
async function resetScene() {
    setStatus('sceneStatus', 'СБРОС...', 'busy');
    try {
        await _saveMulti([
            { key: 'scene_color1', value: '' },
            { key: 'scene_color2', value: '' },
            { key: 'scene_color3', value: '' },
        ]);
        _setSceneColor(1, '', '#ff0033');
        _setSceneColor(2, '', '#4a000f');
        _setSceneColor(3, '', '#080002');
        setStatus('sceneStatus', '✓ ВЕРНУЛ КРОВЬ — обнови сайт', 'ok');
    } catch (e) { setStatus('sceneStatus', 'ОШИБКА: ' + e.message, 'err'); }
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
