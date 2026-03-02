/* ================================================
   BULAVIN SYSTEM — ADMIN PANEL LOGIC v4
   !! uploadFile() для stories — НЕ ТРОГАТЬ !!
   ================================================ */

let _avatarCropper = null;

/* ── АВТОРИЗАЦИЯ ─────────────────────────────── */
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
document.getElementById('passInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
async function handleLogout() { await _supabase.auth.signOut(); showLogin(); }

/* ── ВКЛАДКИ ─────────────────────────────────── */
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    // Ленивая загрузка комьюнити
    if (tabId === 'tab-community') loadCommunityPhotos();
}

/* ── ЗАГРУЗКА ВИДЕО — НЕ ТРОГАТЬ ─────────────── */
document.getElementById('videoFileInput').addEventListener('change', uploadFile);
async function uploadFile() {
    const file = document.getElementById('videoFileInput').files[0];
    if (!file) return;
    setStatus('videoStatus', 'SYNCING...', 'busy');
    const { error } = await _supabase.storage
        .from('stories')
        .upload('story.mp4', file, { upsert: true, cacheControl: '0' });
    if (error) { setStatus('videoStatus', 'ERROR: ' + error.message, 'err'); }
    else        { setStatus('videoStatus', '✓ SYNC COMPLETE — КРУЖОК ОБНОВЛЁН', 'ok'); }
}
async function deleteVideo() {
    if (!confirm('Удалить story.mp4 из хранилища?')) return;
    setStatus('videoStatus', 'УДАЛЯЮ...', 'busy');
    const { error } = await _supabase.storage.from('stories').remove(['story.mp4']);
    if (error) { setStatus('videoStatus', 'ERROR: ' + error.message, 'err'); }
    else        { setStatus('videoStatus', '✓ ВИДЕО УДАЛЕНО', 'ok'); }
}

/* ── STORY MEDIA UPLOAD (image + video) ──────── */
document.getElementById('storyMediaInput')?.addEventListener('change', uploadStoryMedia);

async function uploadStoryMedia() {
    const file = document.getElementById('storyMediaInput').files[0];
    if (!file) return;
    setStatus('videoStatus', 'ЗАГРУЗКА STORY...', 'busy');

    const isVideo = file.type.startsWith('video/');
    const storyType = isVideo ? 'video' : 'image';
    // Видео всегда сохраняем как story.mp4 (обратная совместимость)
    const ext = isVideo ? 'mp4' : (file.name.split('.').pop() || 'jpg');
    const fileName = isVideo ? 'story.mp4' : `story.${ext}`;

    const { error: uploadErr } = await _supabase.storage
        .from('stories')
        .upload(fileName, file, { upsert: true, cacheControl: '0' });

    if (uploadErr) { setStatus('videoStatus', 'ERROR: ' + uploadErr.message, 'err'); return; }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/stories/${fileName}`;

    try {
        await _saveMulti([
            { key: 'active_story_url',  value: publicUrl + '?v=' + Date.now() },
            { key: 'active_story_type', value: storyType },
        ]);
        setStatus('videoStatus', `✓ STORY ОБНОВЛЕНА (${storyType.toUpperCase()})`, 'ok');
    } catch(e) { setStatus('videoStatus', 'ОШИБКА DB: ' + e.message, 'err'); }
}

/* ── АВАТАРКА С CROPPER.JS ───────────────────── */
document.getElementById('avatarFileInput').addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    openAvatarCropper(file);
    this.value = ''; // сброс
});

function openAvatarCropper(file) {
    const modal = document.getElementById('avatarCropperModal');
    const img   = document.getElementById('avatarCropperImg');
    modal.classList.add('show');

    if (_avatarCropper) { _avatarCropper.destroy(); _avatarCropper = null; }

    const reader = new FileReader();
    reader.onload = e => {
        img.src = e.target.result;
        img.onload = () => {
            _avatarCropper = new Cropper(img, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.9,
                restore: false,
                guides: false,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
    };
    reader.readAsDataURL(file);
}

function closeAvatarCropper() {
    document.getElementById('avatarCropperModal').classList.remove('show');
    if (_avatarCropper) { _avatarCropper.destroy(); _avatarCropper = null; }
    setStatus('avatarCropStatus', '', '');
}

async function confirmAvatarCrop() {
    if (!_avatarCropper) return;
    setStatus('avatarCropStatus', 'ЗАГРУЗКА...', 'busy');

    _avatarCropper.getCroppedCanvas({ maxWidth: 800, maxHeight: 800 }).toBlob(async blob => {
        if (!blob) { setStatus('avatarCropStatus', 'ОШИБКА ОБРЕЗКИ', 'err'); return; }

        const fileName = `avatar_${Date.now()}.jpg`;

        // Загружаем в бакет avatars (НЕ в stories!)
        const { error: storErr } = await _supabase.storage
            .from('avatars')
            .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (storErr) {
            setStatus('avatarCropStatus', 'ОШИБКА STORAGE: ' + storErr.message, 'err');
            return;
        }

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}?v=${Date.now()}`;
        document.getElementById('avatarUrlInput').value = publicUrl;
        await saveContent('avatar_url', publicUrl, 'avatarCropStatus');

        setTimeout(() => closeAvatarCropper(), 1200);
    }, 'image/jpeg', 0.9);
}

async function saveAvatarUrl() {
    const url = document.getElementById('avatarUrlInput').value.trim();
    if (!url) { setStatus('avatarStatus', 'ВВЕДИТЕ URL', 'err'); return; }
    await saveContent('avatar_url', url, 'avatarStatus');
}

async function deleteAvatar() {
    if (!confirm('Удалить аватарку? На сайте появится силуэт-заглушка.')) return;
    await saveContent('avatar_url', '', 'avatarStatus');
    document.getElementById('avatarUrlInput').value = '';
}

/* ── ПОСТЕР АФИШИ ────────────────────────────── */
document.getElementById('posterFileInput').addEventListener('change', uploadPoster);
async function uploadPoster() {
    const file = document.getElementById('posterFileInput').files[0];
    if (!file) return;
    setStatus('posterStatus', 'ЗАГРУЗКА...', 'busy');
    const ext = file.name.split('.').pop() || 'jpg';
    const { error } = await _supabase.storage
        .from('stories')
        .upload(`afisha-poster.${ext}`, file, { upsert: true, cacheControl: '0' });
    if (error) { setStatus('posterStatus', 'ERROR: ' + error.message, 'err'); return; }
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/stories/afisha-poster.${ext}?v=${Date.now()}`;
    document.getElementById('fieldPosterUrl').value = publicUrl;
    setStatus('posterStatus', '✓ ФАЙЛ ЗАГРУЖЕН — нажми «СОХРАНИТЬ»', 'ok');
}
async function saveAfishaPoster() {
    const posterUrl  = document.getElementById('fieldPosterUrl').value.trim();
    const ticketsUrl = document.getElementById('fieldTicketsUrl').value.trim();
    setStatus('posterStatus', 'СОХРАНЯЮ...', 'busy');
    try {
        await _saveMulti([
            { key: 'afisha_poster_url',  value: posterUrl },
            { key: 'afisha_tickets_url', value: ticketsUrl },
        ]);
        setStatus('posterStatus', '✓ СОХРАНЕНО', 'ok');
    } catch(e) { setStatus('posterStatus', 'ОШИБКА: ' + e.message, 'err'); }
}
async function clearAfishaPoster() {
    setStatus('posterStatus', 'СОХРАНЯЮ...', 'busy');
    document.getElementById('fieldPosterUrl').value = '';
    document.getElementById('fieldTicketsUrl').value = '';
    try {
        await _saveMulti([
            { key: 'afisha_poster_url',  value: '' },
            { key: 'afisha_tickets_url', value: '' },
        ]);
        setStatus('posterStatus', '✓ ПОСТЕР УБРАН', 'ok');
    } catch(e) { setStatus('posterStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── B.S. STORY SETTINGS ─────────────────────── */
async function saveBsStory() {
    setStatus('bsStoryStatus', 'СОХРАНЯЮ...', 'busy');
    try {
        const label = document.getElementById('fieldBsLabel')?.value.trim() || 'B.S. STORY';
        const color = document.getElementById('bsLabelColorInput')?.value || '';
        const tooltip = document.getElementById('fieldBsTooltip')?.value.trim() || '';
        await _saveMulti([
            { key: 'bs_story_label',       value: label },
            { key: 'bs_story_label_color',  value: color },
            { key: 'bs_tooltip_text',       value: tooltip },
        ]);
        setStatus('bsStoryStatus', '✓ СОХРАНЕНО', 'ok');
    } catch(e) { setStatus('bsStoryStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── DASHBOARD ───────────────────────────────── */
async function saveDashboard() {
    setStatus('dashStatus', 'СОХРАНЯЮ...', 'busy');
    try {
        await _saveMulti([
            { key: 'dashboard_soul_text', value: document.getElementById('fieldSoulText').value.trim() },
            { key: 'dashboard_merge_url', value: document.getElementById('fieldMergeUrl').value.trim() || 'https://t.me/imbulavin_bot' },
        ]);
        setStatus('dashStatus', '✓ DASHBOARD ОБНОВЛЁН', 'ok');
    } catch(e) { setStatus('dashStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── АФИША ТЕКСТЫ ────────────────────────────── */
async function saveAfishaTexts() {
    setStatus('afishaTextStatus', 'СОХРАНЯЮ...', 'busy');
    try {
        await _saveMulti([
            { key: 'afisha_text',   value: document.getElementById('fieldAfisha').value.trim() },
            { key: 'organizer_url', value: document.getElementById('fieldOrgUrl').value.trim() },
        ]);
        setStatus('afishaTextStatus', '✓ СОХРАНЕНО', 'ok');
    } catch(e) { setStatus('afishaTextStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── ЗАГРУЗКА НАСТРОЕК ───────────────────────── */
async function loadSettings() {
    try {
        const { data, error } = await _supabase.from('site_content').select('key, value');
        if (error) throw error;
        const c = {};
        data.forEach(r => { c[r.key] = r.value; });

        const blurToggle = document.getElementById('blurToggle');
        if (blurToggle) blurToggle.checked = c.exclusive_blur_enabled !== 'false';
        if (c.ring_color) {
            document.getElementById('ringColorInput').value = c.ring_color;
            document.getElementById('ringColorSwatch').style.background = c.ring_color;
            document.getElementById('ringColorValue').textContent = c.ring_color;
        }

        _fill('fieldBio',        c.bio);
        _fill('fieldFooter',     c.footer_text);
        _fill('fieldAfisha',     c.afisha_text);
        _fill('fieldOrgUrl',     c.organizer_url);
        _fill('fieldPosterUrl',  c.afisha_poster_url);
        _fill('fieldTicketsUrl', c.afisha_tickets_url);
        _fill('fieldSoulText',   c.dashboard_soul_text);
        _fill('fieldMergeUrl',   c.dashboard_merge_url);
        _fill('fieldTelegram',   c.telegram_url);
        _fill('fieldInstagram',  c.instagram_url);
        _fill('fieldYandex',     c.yandex_music_url);
        _fill('fieldVk',         c.vk_music_url);
        _fill('fieldSpotify',    c.spotify_url);
        _fill('fieldApple',      c.apple_music_url);
        _fill('fieldYt',         c.yt_music_url);
        _fill('fieldSoundcloud', c.soundcloud_url);
        _fill('fieldFusion',     c.fusion_url);
        _fill('avatarUrlInput',  c.avatar_url);

        // Release block
        _fill('fieldReleaseTitle', c.release_title);
        _fill('fieldReleaseCover', c.release_cover_url);
        _fill('fieldReleaseTrack', c.release_track_url);
        _fill('fieldReleaseBtnLabel', c.release_btn_label);
        if (c.release_btn_color) {
            const rci = document.getElementById('releaseBtnColorInput');
            if (rci) { rci.value = c.release_btn_color; }
            const rcs = document.getElementById('releaseBtnColorSwatch');
            if (rcs) rcs.style.background = c.release_btn_color;
            const rcv = document.getElementById('releaseBtnColorValue');
            if (rcv) rcv.textContent = c.release_btn_color;
        }
        const rs = c.release_status || 'disabled';
        document.querySelectorAll('input[name="releaseStatus"]').forEach(r => {
            r.checked = r.value === rs;
        });
        // B.S. Story
        _fill('fieldBsLabel',   c.bs_story_label);
        _fill('fieldBsTooltip', c.bs_tooltip_text);
        if (c.bs_story_label_color) {
            const bci = document.getElementById('bsLabelColorInput');
            if (bci) { bci.value = c.bs_story_label_color; }
            const bcs = document.getElementById('bsLabelColorSwatch');
            if (bcs) bcs.style.background = c.bs_story_label_color;
        }
    } catch(e) { console.warn('[ADMIN] loadSettings:', e); }
}
function _fill(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
}

/* ── СОХРАНЕНИЕ ПОЛЯ — безопасный update→insert ─ */
async function saveContent(key, value, statusId) {
    if (statusId) setStatus(statusId, 'СОХРАНЯЮ...', 'busy');
    try {
        // Сначала UPDATE (не нарушает INSERT-политику)
        const { data: updated, error: upErr } = await _supabase
            .from('site_content')
            .update({ value })
            .eq('key', key)
            .select();
        if (upErr) throw upErr;
        // Если строка не существовала — INSERT
        if (!updated || updated.length === 0) {
            const { error: insErr } = await _supabase
                .from('site_content')
                .insert({ key, value });
            if (insErr) throw insErr;
        }
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
async function saveBlurSetting() {
    await saveContent('exclusive_blur_enabled', String(document.getElementById('blurToggle').checked), 'blurStatus');
}
function onColorChange(input) {
    document.getElementById('ringColorSwatch').style.background = input.value;
    document.getElementById('ringColorValue').textContent = input.value;
}
async function saveRingColor() {
    await saveContent('ring_color', document.getElementById('ringColorInput').value, 'colorStatus');
}
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
        await _saveMulti(rows);
        setStatus('linksStatus', '✓ СОХРАНЕНО', 'ok');
    } catch(e) { setStatus('linksStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── УТИЛИТА: безопасное батч-сохранение ─────── */
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

/* ── КАСТОМНЫЕ КНОПКИ ────────────────────────── */
async function loadCustomButtons() {
    const list = document.getElementById('customBtnList');
    if (!list) return;
    try {
        const { data, error } = await _supabase.from('custom_buttons').select('*').order('position', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
            list.innerHTML = '<div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.2);padding:12px 0;">Нет кнопок. Добавь ниже.</div>';
            return;
        }
        list.innerHTML = '';
        data.forEach(btn => list.appendChild(buildBtnItem(btn)));
    } catch(e) {
        list.innerHTML = '<div style="font-size:11px;color:#ff4b2b;padding:8px 0;">Ошибка: ' + e.message + '</div>';
    }
}
function buildBtnItem(btn) {
    const div = document.createElement('div');
    div.className = 'custom-btn-item';
    div.innerHTML = `
        <div class="cb-icon"><i class="${btn.icon || 'fa-solid fa-link'}"></i></div>
        <div class="cb-info">
            <div class="cb-label">${escHtml(btn.label)}</div>
            <div class="cb-url">${escHtml(btn.url)}</div>
        </div>
        <div class="cb-actions">
            <button class="cb-act-btn ${btn.visible ? '' : 'hidden'}" title="${btn.visible ? 'Скрыть' : 'Показать'}"
                onclick="toggleBtnVisible(${btn.id}, ${btn.visible}, this)">
                <i class="fa-solid ${btn.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </button>
            <button class="cb-act-btn del" onclick="deleteCustomBtn(${btn.id}, this)">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>`;
    return div;
}
async function addCustomButton() {
    const label = document.getElementById('newBtnLabel').value.trim();
    const url   = document.getElementById('newBtnUrl').value.trim();
    const icon  = document.getElementById('newBtnIcon').value.trim() || 'fa-solid fa-link';
    if (!label || !url) { setStatus('customBtnStatus', 'ЗАПОЛНИ НАЗВАНИЕ И URL', 'err'); return; }
    setStatus('customBtnStatus', 'ДОБАВЛЯЮ...', 'busy');
    try {
        const { error } = await _supabase.from('custom_buttons').insert({ label, url, icon, visible: true, position: 0 });
        if (error) throw error;
        document.getElementById('newBtnLabel').value = '';
        document.getElementById('newBtnUrl').value   = '';
        document.getElementById('newBtnIcon').value  = '';
        setStatus('customBtnStatus', '✓ КНОПКА ДОБАВЛЕНА', 'ok');
        await loadCustomButtons();
    } catch(e) { setStatus('customBtnStatus', 'ОШИБКА: ' + e.message, 'err'); }
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
    } catch(e) { alert('Ошибка: ' + e.message); }
}
async function deleteCustomBtn(id, btn) {
    const item = btn.closest('.custom-btn-item');
    if (!confirm('Удалить кнопку?')) return;
    try {
        const { error } = await _supabase.from('custom_buttons').delete().eq('id', id);
        if (error) throw error;
        item?.remove();
        setStatus('customBtnStatus', '✓ УДАЛЕНО', 'ok');
    } catch(e) { setStatus('customBtnStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

/* ── КОМЬЮНИТИ — МОДЕРАЦИЯ ───────────────────── */
async function loadCommunityPhotos() {
    const grid   = document.getElementById('communityGrid');
    const stats  = document.getElementById('communityStats');
    if (!grid) return;

    grid.innerHTML = '<div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.2);padding:20px 0;">Загрузка...</div>';

    try {
        const { data, error, count } = await _supabase
            .from('community_photos')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        if (error) throw error;

        if (stats) stats.textContent = `Всего фото: ${count ?? data.length}`;

        if (!data || data.length === 0) {
            grid.innerHTML = '<div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.2);padding:20px 0;">Нет фото.</div>';
            return;
        }

        grid.innerHTML = '';
        data.forEach(photo => grid.appendChild(buildPhotoItem(photo)));
    } catch(e) {
        grid.innerHTML = `<div style="font-size:11px;color:#ff4b2b;padding:8px 0;">Ошибка: ${e.message}</div>`;
    }
}

function buildPhotoItem(photo) {
    const div = document.createElement('div');
    div.className = 'community-photo-item';
    div.dataset.id = photo.id;
    const date = new Date(photo.created_at).toLocaleDateString('ru', { day:'numeric', month:'short' });
    div.innerHTML = `
        <div class="cp-img-wrap">
            <img src="${escHtml(photo.image_url)}" alt="" loading="lazy" onerror="this.style.display='none'">
        </div>
        <div class="cp-meta">
            <span class="cp-user">${escHtml(photo.username || photo.email || 'Unknown')}</span>
            <span class="cp-date">${date}</span>
        </div>
        <button class="btn-action btn-danger cp-del-btn" onclick="deleteCommunityPhoto('${photo.id}', '${escHtml(photo.storage_path || '')}', this)">
            <i class="fa-solid fa-trash" style="margin-right:6px;"></i>УДАЛИТЬ
        </button>`;
    return div;
}

async function deleteCommunityPhoto(id, storagePath, btn) {
    if (!confirm('Удалить фото из галереи?')) return;
    const item = btn.closest('.community-photo-item');
    btn.disabled = true; btn.textContent = 'УДАЛЯЮ...';

    try {
        // Удаляем из БД
        const { error: dbErr } = await _supabase.from('community_photos').delete().eq('id', id);
        if (dbErr) throw dbErr;

        // Удаляем из Storage
        if (storagePath) {
            await _supabase.storage.from('community_photos').remove([storagePath]);
        }

        item?.remove();
        setStatus('communityStatus', '✓ ФОТО УДАЛЕНО', 'ok');
    } catch(e) {
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-trash"></i>УДАЛИТЬ';
        setStatus('communityStatus', 'ОШИБКА: ' + e.message, 'err');
    }
}


/* ── РЕЛИЗ ────────────────────────────────────── */
document.getElementById('releaseCoverFile')?.addEventListener('change', uploadReleaseCover);
async function uploadReleaseCover() {
    const file = document.getElementById('releaseCoverFile').files[0];
    if (!file) return;
    setStatus('releaseStatus', 'ЗАГРУЗКА...', 'busy');
    const ext = file.name.split('.').pop() || 'jpg';
    const { error } = await _supabase.storage
        .from('stories')
        .upload(`release-cover.${ext}`, file, { upsert: true, cacheControl: '0' });
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
            { key: 'release_status',    value: status },
            { key: 'release_title',     value: document.getElementById('fieldReleaseTitle').value.trim() },
            { key: 'release_cover_url', value: document.getElementById('fieldReleaseCover').value.trim() },
            { key: 'release_track_url', value: document.getElementById('fieldReleaseTrack').value.trim() },
            { key: 'release_btn_label', value: (document.getElementById('fieldReleaseBtnLabel')?.value || '').trim() },
            { key: 'release_btn_color', value: document.getElementById('releaseBtnColorInput')?.value || '' },
        ]);
        setStatus('releaseStatus', '✓ РЕЛИЗ СОХРАНЁН', 'ok');
    } catch(e) { setStatus('releaseStatus', 'ОШИБКА: ' + e.message, 'err'); }
}

async function clearRelease() {
    setStatus('releaseStatus', 'ВЫКЛЮЧАЮ...', 'busy');
    document.querySelectorAll('input[name="releaseStatus"]').forEach(r => { r.checked = r.value === 'disabled'; });
    try {
        await _saveMulti([{ key: 'release_status', value: 'disabled' }]);
        setStatus('releaseStatus', '✓ БЛОК ВЫКЛЮЧЕН', 'ok');
    } catch(e) { setStatus('releaseStatus', 'ОШИБКА: ' + e.message, 'err'); }
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
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

checkAuth();
