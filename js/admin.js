/* ================================================
   BULAVIN SYSTEM — ADMIN PANEL LOGIC (CMS)
   !! uploadFile() для stories — НЕ ТРОГАТЬ !!
   ================================================ */

/* ────────────────────────────────────────────────
   АВТОРИЗАЦИЯ
   ──────────────────────────────────────────────── */
async function checkAuth() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session && session.user.email === ADMIN_EMAIL) {
        showPanel(session.user.email);
    } else {
        showLogin();
    }
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

document.getElementById('passInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
});

async function handleLogout() {
    await _supabase.auth.signOut();
    showLogin();
}

/* ────────────────────────────────────────────────
   ВКЛАДКИ
   ──────────────────────────────────────────────── */
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

/* ────────────────────────────────────────────────
   ЗАГРУЗКА ВИДЕО-КРУЖКА В STORIES
   !! ЛОГИКА НЕ ИЗМЕНЕНА !!
   ──────────────────────────────────────────────── */
document.getElementById('videoFileInput').addEventListener('change', uploadFile);

async function uploadFile() {
    const file = document.getElementById('videoFileInput').files[0];
    if (!file) return;

    setStatus('videoStatus', 'SYNCING...', 'busy');

    const { error } = await _supabase.storage
        .from('stories')
        .upload('story.mp4', file, { upsert: true, cacheControl: '0' });

    if (error) {
        setStatus('videoStatus', 'ERROR: ' + error.message, 'err');
    } else {
        setStatus('videoStatus', '✓ SYNC COMPLETE — КРУЖОК ОБНОВЛЁН', 'ok');
    }
}

/* ── УДАЛИТЬ ВИДЕО ──────────────────────────────── */
async function deleteVideo() {
    if (!confirm('Удалить story.mp4 из хранилища?')) return;
    setStatus('videoStatus', 'УДАЛЯЮ...', 'busy');
    const { error } = await _supabase.storage
        .from('stories')
        .remove(['story.mp4']);
    if (error) {
        setStatus('videoStatus', 'ERROR: ' + error.message, 'err');
    } else {
        setStatus('videoStatus', '✓ ВИДЕО УДАЛЕНО', 'ok');
    }
}

/* ────────────────────────────────────────────────
   АВАТАРКА — загрузка файла ИЛИ URL
   ──────────────────────────────────────────────── */
document.getElementById('avatarFileInput').addEventListener('change', uploadAvatar);

async function uploadAvatar() {
    const file = document.getElementById('avatarFileInput').files[0];
    if (!file) return;

    setStatus('avatarStatus', 'ЗАГРУЗКА...', 'busy');

    const ext = file.name.split('.').pop() || 'jpg';
    const { error } = await _supabase.storage
        .from('stories')
        .upload(`avatar.${ext}`, file, { upsert: true, cacheControl: '0' });

    if (error) {
        setStatus('avatarStatus', 'ERROR: ' + error.message, 'err');
        return;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/stories/avatar.${ext}?v=${Date.now()}`;
    document.getElementById('avatarUrlInput').value = publicUrl;
    await saveContent('avatar_url', publicUrl, 'avatarStatus');
}

async function saveAvatarUrl() {
    const url = document.getElementById('avatarUrlInput').value.trim();
    if (!url) { setStatus('avatarStatus', 'ВВЕДИТЕ URL', 'err'); return; }
    await saveContent('avatar_url', url, 'avatarStatus');
}

/* ────────────────────────────────────────────────
   ПОСТЕР АФИШИ
   ──────────────────────────────────────────────── */
document.getElementById('posterFileInput').addEventListener('change', uploadPoster);

async function uploadPoster() {
    const file = document.getElementById('posterFileInput').files[0];
    if (!file) return;

    setStatus('posterStatus', 'ЗАГРУЗКА...', 'busy');

    const ext = file.name.split('.').pop() || 'jpg';
    const { error } = await _supabase.storage
        .from('stories')
        .upload(`afisha-poster.${ext}`, file, { upsert: true, cacheControl: '0' });

    if (error) {
        setStatus('posterStatus', 'ERROR: ' + error.message, 'err');
        return;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/stories/afisha-poster.${ext}?v=${Date.now()}`;
    document.getElementById('fieldPosterUrl').value = publicUrl;
    setStatus('posterStatus', '✓ ФАЙЛ ЗАГРУЖЕН, нажми «СОХРАНИТЬ ПОСТЕР»', 'ok');
}

async function saveAfishaPoster() {
    const posterUrl  = document.getElementById('fieldPosterUrl').value.trim();
    const ticketsUrl = document.getElementById('fieldTicketsUrl').value.trim();
    setStatus('posterStatus', 'СОХРАНЯЮ...', 'busy');
    try {
        const rows = [
            { key: 'afisha_poster_url',  value: posterUrl },
            { key: 'afisha_tickets_url', value: ticketsUrl },
        ];
        const { error } = await _supabase.from('site_content').upsert(rows, { onConflict: 'key' });
        if (error) throw error;
        setStatus('posterStatus', '✓ СОХРАНЕНО', 'ok');
    } catch(e) {
        setStatus('posterStatus', 'ОШИБКА: ' + e.message, 'err');
    }
}

async function clearAfishaPoster() {
    setStatus('posterStatus', 'СОХРАНЯЮ...', 'busy');
    document.getElementById('fieldPosterUrl').value = '';
    document.getElementById('fieldTicketsUrl').value = '';
    try {
        const rows = [
            { key: 'afisha_poster_url',  value: '' },
            { key: 'afisha_tickets_url', value: '' },
        ];
        const { error } = await _supabase.from('site_content').upsert(rows, { onConflict: 'key' });
        if (error) throw error;
        setStatus('posterStatus', '✓ ПОСТЕР УБРАН', 'ok');
    } catch(e) {
        setStatus('posterStatus', 'ОШИБКА: ' + e.message, 'err');
    }
}

/* ────────────────────────────────────────────────
   DASHBOARD
   ──────────────────────────────────────────────── */
async function saveDashboard() {
    setStatus('dashStatus', 'СОХРАНЯЮ...', 'busy');
    const soulText = document.getElementById('fieldSoulText').value.trim();
    const mergeUrl = document.getElementById('fieldMergeUrl').value.trim();
    try {
        const rows = [
            { key: 'dashboard_soul_text', value: soulText },
            { key: 'dashboard_merge_url', value: mergeUrl || 'https://t.me/imbulavin_bot' },
        ];
        const { error } = await _supabase.from('site_content').upsert(rows, { onConflict: 'key' });
        if (error) throw error;
        setStatus('dashStatus', '✓ DASHBOARD ОБНОВЛЁН', 'ok');
    } catch(e) {
        setStatus('dashStatus', 'ОШИБКА: ' + e.message, 'err');
    }
}

/* ────────────────────────────────────────────────
   АФИША ТЕКСТЫ
   ──────────────────────────────────────────────── */
async function saveAfishaTexts() {
    setStatus('afishaTextStatus', 'СОХРАНЯЮ...', 'busy');
    const afishaText = document.getElementById('fieldAfisha').value.trim();
    const orgUrl     = document.getElementById('fieldOrgUrl').value.trim();
    try {
        const rows = [
            { key: 'afisha_text',    value: afishaText },
            { key: 'organizer_url',  value: orgUrl },
        ];
        const { error } = await _supabase.from('site_content').upsert(rows, { onConflict: 'key' });
        if (error) throw error;
        setStatus('afishaTextStatus', '✓ СОХРАНЕНО', 'ok');
    } catch(e) {
        setStatus('afishaTextStatus', 'ОШИБКА: ' + e.message, 'err');
    }
}

/* ────────────────────────────────────────────────
   ЗАГРУЗКА НАСТРОЕК ИЗ БД
   ──────────────────────────────────────────────── */
async function loadSettings() {
    try {
        const { data, error } = await _supabase
            .from('site_content')
            .select('key, value');
        if (error) throw error;

        const c = {};
        data.forEach(r => { c[r.key] = r.value; });

        // Visual
        const blurToggle = document.getElementById('blurToggle');
        if (blurToggle) blurToggle.checked = c.exclusive_blur_enabled !== 'false';

        const colorInput = document.getElementById('ringColorInput');
        if (colorInput && c.ring_color) {
            colorInput.value = c.ring_color;
            document.getElementById('ringColorSwatch').style.background = c.ring_color;
            document.getElementById('ringColorValue').textContent = c.ring_color;
        }

        // Main tab
        _fill('fieldBio',       c.bio);
        _fill('fieldFooter',    c.footer_text);
        _fill('fieldAfisha',    c.afisha_text);
        _fill('fieldOrgUrl',    c.organizer_url);
        _fill('fieldPosterUrl', c.afisha_poster_url);
        _fill('fieldTicketsUrl',c.afisha_tickets_url);

        // Dashboard tab
        _fill('fieldSoulText',  c.dashboard_soul_text);
        _fill('fieldMergeUrl',  c.dashboard_merge_url);

        // Links tab
        _fill('fieldTelegram',  c.telegram_url);
        _fill('fieldInstagram', c.instagram_url);
        _fill('fieldYandex',    c.yandex_music_url);
        _fill('fieldVk',        c.vk_music_url);
        _fill('fieldSpotify',   c.spotify_url);
        _fill('fieldApple',     c.apple_music_url);
        _fill('fieldYt',        c.yt_music_url);
        _fill('fieldSoundcloud',c.soundcloud_url);
        _fill('fieldFusion',    c.fusion_url);

        // Media tab
        _fill('avatarUrlInput', c.avatar_url);

    } catch(e) {
        console.warn('[ADMIN] loadSettings error:', e);
    }
}

function _fill(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
}

/* ────────────────────────────────────────────────
   СОХРАНЕНИЕ ОДНОГО ПОЛЯ
   ──────────────────────────────────────────────── */
async function saveContent(key, value, statusId) {
    if (statusId) setStatus(statusId, 'СОХРАНЯЮ...', 'busy');
    try {
        const { error } = await _supabase
            .from('site_content')
            .upsert({ key, value }, { onConflict: 'key' });
        if (error) throw error;
        if (statusId) setStatus(statusId, '✓ СОХРАНЕНО', 'ok');
    } catch(e) {
        if (statusId) setStatus(statusId, 'ОШИБКА: ' + e.message, 'err');
    }
}

async function saveField(fieldId, key, statusId) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    await saveContent(key, el.value.trim(), statusId);
}

/* ── Blur toggle ──────────────────────────────── */
async function saveBlurSetting() {
    const enabled = document.getElementById('blurToggle').checked;
    await saveContent('exclusive_blur_enabled', String(enabled), 'blurStatus');
}

/* ── Ring color ──────────────────────────────── */
function onColorChange(input) {
    const val = input.value;
    document.getElementById('ringColorSwatch').style.background = val;
    document.getElementById('ringColorValue').textContent = val;
}
async function saveRingColor() {
    const val = document.getElementById('ringColorInput').value;
    await saveContent('ring_color', val, 'colorStatus');
}

/* ── All links ───────────────────────────────── */
async function saveAllLinks() {
    setStatus('linksStatus', 'СОХРАНЯЮ...', 'busy');
    const rows = [
        { key: 'telegram_url',     value: document.getElementById('fieldTelegram').value.trim() },
        { key: 'instagram_url',    value: document.getElementById('fieldInstagram').value.trim() },
        { key: 'yandex_music_url', value: document.getElementById('fieldYandex').value.trim() },
        { key: 'vk_music_url',     value: document.getElementById('fieldVk').value.trim() },
        { key: 'spotify_url',      value: document.getElementById('fieldSpotify').value.trim() },
        { key: 'apple_music_url',  value: document.getElementById('fieldApple').value.trim() },
        { key: 'yt_music_url',     value: document.getElementById('fieldYt').value.trim() },
        { key: 'soundcloud_url',   value: document.getElementById('fieldSoundcloud').value.trim() },
        { key: 'fusion_url',       value: document.getElementById('fieldFusion').value.trim() },
    ].filter(r => r.value);
    try {
        const { error } = await _supabase.from('site_content').upsert(rows, { onConflict: 'key' });
        if (error) throw error;
        setStatus('linksStatus', '✓ ВСЕ ССЫЛКИ СОХРАНЕНЫ', 'ok');
    } catch(e) {
        setStatus('linksStatus', 'ОШИБКА: ' + e.message, 'err');
    }
}

/* ────────────────────────────────────────────────
   КАСТОМНЫЕ КНОПКИ
   ──────────────────────────────────────────────── */
async function loadCustomButtons() {
    const list = document.getElementById('customBtnList');
    if (!list) return;

    try {
        const { data, error } = await _supabase
            .from('custom_buttons')
            .select('*')
            .order('position', { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = '<div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.2);padding:12px 0;">Нет кнопок. Добавь ниже.</div>';
            return;
        }

        list.innerHTML = '';
        data.forEach(btn => {
            list.appendChild(buildBtnItem(btn));
        });
    } catch(e) {
        list.innerHTML = '<div style="font-size:11px;color:#ff4b2b;padding:8px 0;">Ошибка загрузки: ' + e.message + '</div>';
    }
}

function buildBtnItem(btn) {
    const div = document.createElement('div');
    div.className = 'custom-btn-item';
    div.dataset.id = btn.id;

    div.innerHTML = `
        <div class="cb-icon"><i class="${btn.icon || 'fa-solid fa-link'}"></i></div>
        <div class="cb-info">
            <div class="cb-label">${escHtml(btn.label)}</div>
            <div class="cb-url">${escHtml(btn.url)}</div>
        </div>
        <div class="cb-actions">
            <button class="cb-act-btn toggle-vis ${btn.visible ? '' : 'hidden'}"
                title="${btn.visible ? 'Скрыть' : 'Показать'}"
                onclick="toggleBtnVisible(${btn.id}, ${btn.visible}, this)">
                <i class="fa-solid ${btn.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </button>
            <button class="cb-act-btn del" title="Удалить"
                onclick="deleteCustomBtn(${btn.id}, this)">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
    return div;
}

async function addCustomButton() {
    const label = document.getElementById('newBtnLabel').value.trim();
    const url   = document.getElementById('newBtnUrl').value.trim();
    const icon  = document.getElementById('newBtnIcon').value.trim() || 'fa-solid fa-link';

    if (!label || !url) {
        setStatus('customBtnStatus', 'ЗАПОЛНИ НАЗВАНИЕ И URL', 'err');
        return;
    }
    setStatus('customBtnStatus', 'ДОБАВЛЯЮ...', 'busy');

    try {
        const { error } = await _supabase
            .from('custom_buttons')
            .insert({ label, url, icon, visible: true, position: 0 });
        if (error) throw error;

        document.getElementById('newBtnLabel').value = '';
        document.getElementById('newBtnUrl').value   = '';
        document.getElementById('newBtnIcon').value  = '';

        setStatus('customBtnStatus', '✓ КНОПКА ДОБАВЛЕНА', 'ok');
        await loadCustomButtons();
    } catch(e) {
        setStatus('customBtnStatus', 'ОШИБКА: ' + e.message, 'err');
    }
}

async function toggleBtnVisible(id, currentVisible, btn) {
    const newVisible = !currentVisible;
    try {
        const { error } = await _supabase
            .from('custom_buttons')
            .update({ visible: newVisible })
            .eq('id', id);
        if (error) throw error;

        btn.classList.toggle('hidden', !newVisible);
        btn.title = newVisible ? 'Скрыть' : 'Показать';
        btn.innerHTML = `<i class="fa-solid ${newVisible ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
        btn.onclick = () => toggleBtnVisible(id, newVisible, btn);
    } catch(e) {
        alert('Ошибка: ' + e.message);
    }
}

async function deleteCustomBtn(id, btn) {
    const item = btn.closest('.custom-btn-item');
    const label = item?.querySelector('.cb-label')?.textContent || '';
    if (!confirm(`Удалить кнопку «${label}»?`)) return;

    try {
        const { error } = await _supabase
            .from('custom_buttons')
            .delete()
            .eq('id', id);
        if (error) throw error;
        item?.remove();
        setStatus('customBtnStatus', '✓ УДАЛЕНО', 'ok');
    } catch(e) {
        setStatus('customBtnStatus', 'ОШИБКА: ' + e.message, 'err');
    }
}

/* ────────────────────────────────────────────────
   УТИЛИТЫ
   ──────────────────────────────────────────────── */
function setStatus(id, msg, type = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-line ' + type;
    if (type === 'ok') setTimeout(() => { el.textContent = ''; el.className = 'status-line'; }, 3500);
}

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

checkAuth();
