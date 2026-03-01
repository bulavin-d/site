/* ================================================
   BULAVIN SYSTEM — ADMIN PANEL LOGIC
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
   ЗАГРУЗКА ВИДЕО-КРУЖКА В STORIES
   !! ЛОГИКА НЕ ИЗМЕНЕНА !! Только UI обновлён.
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

/* ────────────────────────────────────────────────
   АВАТАРКА — загрузка файла ИЛИ URL
   ──────────────────────────────────────────────── */
document.getElementById('avatarFileInput').addEventListener('change', uploadAvatar);

async function uploadAvatar() {
    const file = document.getElementById('avatarFileInput').files[0];
    if (!file) return;

    setStatus('avatarStatus', 'ЗАГРУЗКА...', 'busy');

    // Загружаем в тот же бакет stories под именем avatar.jpg
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

        // Blur toggle
        const blurToggle = document.getElementById('blurToggle');
        if (blurToggle) blurToggle.checked = c.exclusive_blur_enabled !== 'false';

        // Ring color
        const colorInput = document.getElementById('ringColorInput');
        const colorSwatch = document.getElementById('ringColorSwatch');
        const colorDisplay = document.getElementById('ringColorValue');
        if (colorInput && c.ring_color) {
            colorInput.value = c.ring_color;
            colorSwatch.style.background = c.ring_color;
            colorDisplay.textContent = c.ring_color;
        }

        // Content fields
        _fillField('fieldBio',       c.bio);
        _fillField('fieldFooter',    c.footer_text);
        _fillField('fieldTelegram',  c.telegram_url);
        _fillField('fieldInstagram', c.instagram_url);
        _fillField('fieldYandex',    c.yandex_music_url);
        _fillField('fieldVk',        c.vk_music_url);
        _fillField('fieldSpotify',   c.spotify_url);
        _fillField('fieldApple',     c.apple_music_url);
        _fillField('fieldYt',        c.yt_music_url);
        _fillField('fieldSoundcloud',c.soundcloud_url);
        _fillField('fieldFusion',    c.fusion_url);
        _fillField('fieldAfisha',    c.afisha_text);
        _fillField('avatarUrlInput', c.avatar_url);

    } catch(e) {
        console.warn('[ADMIN] loadSettings error:', e);
    }
}

function _fillField(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
}

/* ────────────────────────────────────────────────
   СОХРАНЕНИЕ ОТДЕЛЬНОГО ПОЛЯ В site_content
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

/* Blur toggle */
async function saveBlurSetting() {
    const enabled = document.getElementById('blurToggle').checked;
    await saveContent('exclusive_blur_enabled', String(enabled), 'blurStatus');
}

/* Ring color */
function onColorChange(input) {
    const val = input.value;
    document.getElementById('ringColorSwatch').style.background = val;
    document.getElementById('ringColorValue').textContent = val;
}
async function saveRingColor() {
    const val = document.getElementById('ringColorInput').value;
    await saveContent('ring_color', val, 'colorStatus');
}

/* Поля контента — универсальный сохранятель */
const FIELD_MAP = {
    fieldBio:        'bio',
    fieldFooter:     'footer_text',
    fieldTelegram:   'telegram_url',
    fieldInstagram:  'instagram_url',
    fieldYandex:     'yandex_music_url',
    fieldVk:         'vk_music_url',
    fieldSpotify:    'spotify_url',
    fieldApple:      'apple_music_url',
    fieldYt:         'yt_music_url',
    fieldSoundcloud: 'soundcloud_url',
    fieldFusion:     'fusion_url',
    fieldAfisha:     'afisha_text',
};

async function saveField(fieldId, statusId) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    await saveContent(FIELD_MAP[fieldId], el.value.trim(), statusId);
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

checkAuth();
