/* ================================================
   BULAVIN SYSTEM — MAIN PAGE LOGIC v6
   !! НЕ ТРОГАТЬ: auth, SEO, анимации аватарки !!
   ================================================ */

/* ────────────────────────────────────────────────
   0. СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ
   ──────────────────────────────────────────────── */
let _currentUser    = null;
let _currentUsername = '';

async function initUserState() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session && session.user) {
        _currentUser = session.user;
        _currentUsername = session.user.user_metadata?.username
            || ('@' + session.user.email.split('@')[0]);
        showUserBadge(_currentUsername);
        // Убираем красную точку с кнопки профиля
        document.getElementById('authNavBtn')?.classList.remove('has-dot');
    }
}

function showUserBadge(username) {
    const badge = document.getElementById('userBadge');
    if (!badge) return;
    badge.textContent = username.toUpperCase();
    badge.style.display = 'block';
}

// Клик по кнопке профиля: если залогинен — ничего (или можно добавить выход),
// если не залогинен — открыть AuthChoice
function onAuthNavClick() {
    if (_currentUser) {
        // Уже авторизован — предлагаем перейти к ленте
        handleAvatarClick();
    } else {
        openAuthChoice();
    }
}

/* ────────────────────────────────────────────────
   1. КОНТЕНТ + FOUC-FREE LOADING
   ──────────────────────────────────────────────── */
const DEFAULTS = {
    avatar_url:              '',
    bio:                     '',
    footer_text:             '© 2026 BULAVIN',
    telegram_url:            'https://t.me/imbulavin',
    instagram_url:           'https://www.instagram.com/lu4danya',
    yandex_music_url:        'https://music.yandex.kz/artist/24009925',
    vk_music_url:            'https://vk.com/artist/bulavin',
    spotify_url:             'https://open.spotify.com/artist/7Efya7yCpL4M7BPdcm6qUq',
    apple_music_url:         'https://music.apple.com/ru/artist/bulavin/1805904899',
    yt_music_url:            'https://music.youtube.com/channel/UCRyTj6rCcgg385Rg58zo_PA',
    soundcloud_url:          'https://soundcloud.com/bulavin',
    fusion_url:              'https://t.me/imbulavin_bot',
    afisha_text:             'На данный момент выступлений не запланировано.',
    organizer_url:           'https://t.me/imbulavin',
    afisha_poster_url:       '',
    afisha_tickets_url:      '',
    exclusive_blur_enabled:  'true',
    ring_color:              '',
    release_status:          'disabled',
    release_cover_url:       '',
    release_track_url:       '',
    release_title:           '',
    release_btn_label:       'ПРЕСЕЙВ',
    release_btn_color:       '',
    active_story_url:        '',
    active_story_type:       'video',
    // B.S. STORY v2
    bs_story_global_enabled: 'false',
    bs_story_label:          'B.S. STORY',
    bs_story_label_color:    '',
    bs_tooltip_text:         'Здесь публикуются ваши фото. Свайпай вверх. Фото автоматически исчезают через 24 часа.',
};

let _content = { ...DEFAULTS };
let _contentLoaded = false;

async function loadContent() {
    try {
        const { data, error } = await _supabase.from('site_content').select('key, value');
        if (error) throw error;
        data.forEach(row => { if (row.value !== null) _content[row.key] = row.value; });
    } catch(e) { console.warn('[BULAVIN] site_content недоступен.', e.message); }
    _contentLoaded = true;
    applyContent();
    await loadCustomButtons();
}

function applyContent() {
    if (!_contentLoaded) return;
    const c = _content;

    const bioEl = document.getElementById('bioEl');
    if (bioEl) {
        bioEl.textContent = c.bio || 'Казахстанский исполнитель и музыкальный продюсер.';
        bioEl.classList.remove('skeleton-text');
    }
    const footerEl = document.getElementById('footerEl');
    if (footerEl) footerEl.textContent = c.footer_text || '© 2026 BULAVIN';

    _setLink('link-telegram',  c.telegram_url);
    _setLink('link-instagram', c.instagram_url);
    _setLink('link-yandex',    c.yandex_music_url);
    _setLink('link-vk',        c.vk_music_url);
    _setLink('link-spotify',   c.spotify_url);
    _setLink('link-apple',     c.apple_music_url);
    _setLink('link-yt',        c.yt_music_url);
    _setLink('link-soundcloud',c.soundcloud_url);
    _setLink('link-fusion',    c.fusion_url);

    applyAfisha(c);
    applyRelease(c);

    // B.S. STORY label + tooltip
    const labelEl = document.getElementById('bsModalLabel');
    if (labelEl) {
        labelEl.textContent = c.bs_story_label || 'B.S. STORY';
        if (c.bs_story_label_color) labelEl.style.color = c.bs_story_label_color;
    }
    const tooltipEl = document.getElementById('bsTooltipBox');
    if (tooltipEl && c.bs_tooltip_text) tooltipEl.textContent = c.bs_tooltip_text;

    // Avatar
    const avatarImg        = document.getElementById('mainAvatarImage');
    const avatarLink       = document.getElementById('avatarLink');
    const avatarSilhouette = document.getElementById('avatarSilhouette');
    const dynBg            = document.querySelector('.dynamic-bg');
    const avatarUrl        = c.avatar_url && c.avatar_url.trim();

    window._blurEnabled = c.exclusive_blur_enabled !== 'false';

    if (c.ring_color && c.ring_color.trim()) {
        const col = c.ring_color.trim();
        document.documentElement.style.setProperty(
            '--ring-gradient',
            `linear-gradient(45deg, ${col} 0%, transparent 50%, ${col} 100%)`
        );
    }

    if (avatarUrl) {
        const img = new Image();
        img.onload = () => {
            avatarImg.src = avatarUrl;
            avatarImg.style.opacity = '1';
            if (avatarLink) {
                avatarLink.classList.remove('avatar-loading');
                avatarLink.classList.add('avatar-ready');
            }
            if (dynBg) dynBg.style.backgroundImage = `url('${avatarUrl}')`;
            if (avatarSilhouette) {
                avatarSilhouette.style.transition = 'opacity 0.4s ease';
                avatarSilhouette.style.opacity = '0';
                setTimeout(() => { avatarSilhouette.style.display = 'none'; }, 450);
            }
            initAvatarAnimation();
        };
        img.onerror = () => {};
        img.src = avatarUrl;
    }
}

function applyAfisha(c) {
    const afishaTextEl  = document.getElementById('afisha-text');
    const organizerWrap = document.getElementById('organizer-wrap');
    const posterWrap    = document.getElementById('afisha-poster-wrap');
    const hasPoster = c.afisha_poster_url && c.afisha_poster_url.trim();
    if (hasPoster) {
        if (afishaTextEl)  afishaTextEl.style.display = 'none';
        if (organizerWrap) organizerWrap.style.display = 'none';
        if (posterWrap) {
            posterWrap.style.display = 'block';
            const img = posterWrap.querySelector('.afisha-poster-img');
            if (img) img.src = c.afisha_poster_url;
            if (c.afisha_tickets_url && c.afisha_tickets_url.trim()) {
                posterWrap.onclick = () => window.open(c.afisha_tickets_url, '_blank');
                posterWrap.style.cursor = 'pointer';
                const badge = posterWrap.querySelector('.poster-badge');
                if (badge) badge.style.display = 'flex';
            }
        }
    } else {
        if (afishaTextEl) { afishaTextEl.style.display = 'block'; afishaTextEl.textContent = c.afisha_text; }
        if (organizerWrap) organizerWrap.style.display = 'block';
        const orgLink = document.getElementById('link-organizer');
        if (orgLink && c.organizer_url) orgLink.href = c.organizer_url;
        if (posterWrap) posterWrap.style.display = 'none';
    }
}

/* ────────────────────────────────────────────────
   RELEASE BLOCK v2
   ──────────────────────────────────────────────── */
let _releaseUrl = '';
let _releaseTapHintTimer = null;

function applyRelease(c) {
    const block = document.getElementById('releaseBlock');
    if (!block) return;
    const status = c.release_status || 'disabled';
    if (status === 'disabled' || !c.release_cover_url) { block.style.display = 'none'; return; }

    _releaseUrl = c.release_track_url || '';
    const cover = document.getElementById('releaseCover');
    if (cover) cover.src = c.release_cover_url;

    const titleEl = document.getElementById('releaseTitle');
    if (titleEl) {
        if (c.release_title && c.release_title.trim()) {
            titleEl.textContent = c.release_title;
            titleEl.style.display = 'block';
        } else { titleEl.style.display = 'none'; }
    }

    const btn = document.getElementById('releaseCTA');
    if (btn) {
        btn.textContent = (c.release_btn_label && c.release_btn_label.trim())
            ? c.release_btn_label
            : (status === 'presave' ? 'ПРЕСЕЙВ' : 'СЛУШАТЬ');
        const col = c.release_btn_color && c.release_btn_color.trim();
        if (col) {
            btn.style.background  = col + '30';
            btn.style.borderColor = col + '80';
            btn.style.color       = col;
        } else if (status === 'presave') {
            btn.style.background  = 'rgba(0,149,246,0.22)';
            btn.style.borderColor = 'rgba(0,149,246,0.5)';
            btn.style.color       = '#6ec6ff';
        } else {
            btn.style.background  = 'rgba(30,215,96,0.18)';
            btn.style.borderColor = 'rgba(30,215,96,0.45)';
            btn.style.color       = '#1ed760';
        }
    }

    block.style.display = 'block';
    const hint = document.getElementById('releaseTapHint');
    if (hint) {
        hint.style.display = 'flex'; hint.style.opacity = '1';
        if (_releaseTapHintTimer) clearTimeout(_releaseTapHintTimer);
        _releaseTapHintTimer = setTimeout(() => {
            hint.style.transition = 'opacity 0.8s ease';
            hint.style.opacity = '0';
            setTimeout(() => { hint.style.display = 'none'; }, 850);
        }, 10000);
    }
}

function openRelease() {
    if (_releaseUrl) window.open(_releaseUrl, '_blank', 'noopener');
    const hint = document.getElementById('releaseTapHint');
    if (hint) { if (_releaseTapHintTimer) clearTimeout(_releaseTapHintTimer); hint.style.display = 'none'; }
}

function _setLink(id, url) {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
}

/* ────────────────────────────────────────────────
   2. ДИНАМИЧЕСКИЕ КНОПКИ
   ──────────────────────────────────────────────── */
async function loadCustomButtons() {
    try {
        const { data, error } = await _supabase
            .from('custom_buttons').select('*')
            .eq('visible', true).order('position', { ascending: true });
        if (error) throw error;
        renderCustomButtons(data || []);
    } catch(e) { console.warn('[BULAVIN] custom_buttons недоступен.', e.message); }
}

function renderCustomButtons(buttons) {
    const container = document.getElementById('custom-buttons-container');
    if (!container) return;
    container.innerHTML = '';
    if (!buttons.length) { container.style.display = 'none'; return; }
    container.style.display = 'flex';
    buttons.forEach(btn => {
        const a = document.createElement('a');
        a.href = btn.url; a.target = '_blank'; a.rel = 'noopener'; a.className = 'btn';
        a.innerHTML = `<i class="${btn.icon || 'fa-solid fa-link'}"></i><span>${btn.label}</span>`;
        container.appendChild(a);
    });
}

/* ────────────────────────────────────────────────
   3. QR / МОДАЛЬНЫЕ ОКНА
   ──────────────────────────────────────────────── */
function openQR()          { document.getElementById('qrModal').classList.add('show'); }
function closeQR()         { document.getElementById('qrModal').classList.remove('show'); }
function openAuthChoice()  { document.getElementById('authChoiceModal').classList.add('show'); }
function closeAuthChoice() { document.getElementById('authChoiceModal').classList.remove('show'); }

/* ────────────────────────────────────────────────
   4. КЛИК ПО АВАТАРКЕ — ВЕТВЛЕНИЕ
   ──────────────────────────────────────────────── */
function handleAvatarClick() {
    const isGlobal = _content.bs_story_global_enabled === 'true';
    if (isGlobal) {
        openBSStory();
    } else {
        // Проверяем: есть ли загруженная личная сторис
        const storyUrl = _content.active_story_url && _content.active_story_url.trim();
        if (!storyUrl) return; // Пустая — не открываем
        handleStoryOpen();
    }
}

/* ────────────────────────────────────────────────
   4a. ЛИЧНАЯ СТОРИС — ВИДЕО + ПРОГРЕСС-БАР
   !! НЕ ТРОГАТЬ !!
   ──────────────────────────────────────────────── */
const videoElement = document.getElementById('storyVideo');
const progressBar  = document.getElementById('progress-bar');

videoElement.addEventListener('timeupdate', () => {
    const pct = (videoElement.currentTime / videoElement.duration) * 100;
    progressBar.style.width = pct + '%';
});
videoElement.addEventListener('ended', closeStory);

function openStory() {
    document.getElementById('storyModal').classList.add('show');
    videoElement.src = STORY_URL_BASE + '?v=' + Date.now();
    progressBar.style.width = '0%';
    videoElement.currentTime = 0;
    videoElement.play();
}
function closeStory() {
    document.getElementById('storyModal').classList.remove('show');
    videoElement.pause();
}

let _storyImageTimer = null;

function handleStoryOpen() {
    const storyType = (_content.active_story_type || 'video').toLowerCase();
    const storyUrl  = _content.active_story_url && _content.active_story_url.trim();
    const imgEl     = document.getElementById('storyImage');
    const modal     = document.getElementById('storyModal');

    if (storyType === 'image' && storyUrl) {
        videoElement.style.display = 'none';
        imgEl.src = storyUrl; imgEl.style.display = 'block';
        modal.classList.add('show');
        progressBar.style.transition = 'none'; progressBar.style.width = '0%';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                progressBar.style.transition = 'width 7s linear';
                progressBar.style.width = '100%';
            });
        });
        if (_storyImageTimer) clearTimeout(_storyImageTimer);
        _storyImageTimer = setTimeout(() => handleStoryClose(), 7000);
    } else {
        if (imgEl) imgEl.style.display = 'none';
        videoElement.style.display = 'block';
        const url = storyUrl || (STORY_URL_BASE + '?v=' + Date.now());
        modal.classList.add('show');
        videoElement.src = url;
        progressBar.style.transition = 'none'; progressBar.style.width = '0%';
        videoElement.currentTime = 0;
        videoElement.play().catch(() => {});
    }
}

function handleStoryClose() {
    if (_storyImageTimer) { clearTimeout(_storyImageTimer); _storyImageTimer = null; }
    const imgEl = document.getElementById('storyImage');
    if (imgEl) { imgEl.style.display = 'none'; imgEl.src = ''; }
    progressBar.style.transition = 'none'; progressBar.style.width = '0%';
    closeStory();
}

/* ────────────────────────────────────────────────
   4b. B.S. STORY MODAL (TikTok-лента на главной)
   ──────────────────────────────────────────────── */
let _bsSwipeHintDismissed = false;
let _bsLoaded = false;

function openBSStory() {
    document.getElementById('bsStoryModal').classList.add('show');
    // Блокируем скролл страницы
    document.body.style.overflow = 'hidden';
    if (!_bsLoaded) {
        loadBSStory();
    }
}

function closeBSStory() {
    document.getElementById('bsStoryModal').classList.remove('show');
    document.body.style.overflow = '';
    // Скрываем тултип
    document.getElementById('bsTooltipBox')?.classList.remove('show');
}

function toggleBSTooltip() {
    const box = document.getElementById('bsTooltipBox');
    box.classList.toggle('show');
    if (box.classList.contains('show')) {
        setTimeout(() => box.classList.remove('show'), 4000);
    }
}
document.addEventListener('click', e => {
    if (!e.target.closest('#bsTooltipBtn')) {
        document.getElementById('bsTooltipBox')?.classList.remove('show');
    }
});

async function loadBSStory() {
    const skeleton = document.getElementById('bsSkeleton');
    const reel     = document.getElementById('bsReel');

    try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await _supabase
            .from('community_photos')
            .select('id, image_url, username, email, created_at, comment')
            .gte('created_at', since)
            .order('created_at', { ascending: false });

        if (error) throw error;

        skeleton.style.transition = 'opacity 0.4s ease';
        skeleton.style.opacity = '0';
        setTimeout(() => { skeleton.style.display = 'none'; }, 420);

        if (!data || data.length === 0) {
            reel.innerHTML = `
                <div class="reel-empty">
                    <div class="reel-empty-icon"></div>
                    <p>ПОКА ПУСТО</p>
                    <span>Будь первым — загрузи фото</span>
                </div>`;
            _bsLoaded = true;
            return;
        }

        reel.innerHTML = '';
        data.forEach(photo => {
            const slide = document.createElement('div');
            slide.className = 'reel-slide';
            slide.dataset.id = photo.id;
            const name = photo.username || ('@' + (photo.email || 'anon').split('@')[0]);
            const ago  = _timeAgo(photo.created_at);
            const commentHTML = photo.comment ? `
                <div class="reel-comment" onclick="toggleBSComment(event, this)">
                    <span class="reel-comment-text">${_escHtml(photo.comment)}</span>
                </div>` : '';
            slide.innerHTML = `
                <img src="${_escHtml(photo.image_url)}" alt="" loading="lazy"
                     onerror="this.closest('.reel-slide').style.display='none'">
                ${commentHTML}
                <div class="reel-meta">
                    <span class="reel-author">${_escHtml(name)}</span>
                    <span class="reel-time">${ago}</span>
                </div>`;
            reel.appendChild(slide);
        });

        if (!_bsSwipeHintDismissed && data.length > 1) {
            _showBSSwipeHint();
        } else {
            const hint = document.getElementById('bsSwipeHint');
            if (hint) hint.style.display = 'none';
        }

        reel.addEventListener('scroll', () => _dismissBSSwipeHint(), { once: true });
        _bsLoaded = true;

    } catch(e) {
        console.warn('[BS STORY]', e);
        if (skeleton) skeleton.innerHTML = '<p style="font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:1px;">ОШИБКА ЗАГРУЗКИ</p>';
    }
}

function _showBSSwipeHint() {
    const hint = document.getElementById('bsSwipeHint');
    if (!hint) return;
    hint.style.display = 'flex';
    setTimeout(() => _dismissBSSwipeHint(), 3500);
}
function _dismissBSSwipeHint() {
    if (_bsSwipeHintDismissed) return;
    _bsSwipeHintDismissed = true;
    const hint = document.getElementById('bsSwipeHint');
    if (!hint) return;
    hint.style.transition = 'opacity 0.5s ease';
    hint.style.opacity = '0';
    setTimeout(() => { hint.remove(); }, 550);
}

function toggleBSComment(e, el) {
    e.stopPropagation();
    el.classList.toggle('expanded');
}

/* ── ВОРОНКА АВТОРИЗАЦИИ: загрузка фото ─────── */
function triggerBSPhotoUpload() {
    if (!_currentUser) {
        // Гость → показываем форму входа с кастомным заголовком
        _openAuthForUpload();
        return;
    }
    // Авторизован → открываем Cropper
    document.getElementById('bsPhotoInput').click();
}

function _openAuthForUpload() {
    // Меняем заголовок и подзаголовок AuthChoice
    const badge = document.getElementById('authChoiceBadge');
    const sub   = document.getElementById('authChoiceSub');
    if (badge) badge.textContent = 'INNER CIRCLE';
    if (sub)   sub.textContent   = 'Для публикации фото требуется авторизация';
    openAuthChoice();
    // Сбрасываем тексты обратно при закрытии
    const modal = document.getElementById('authChoiceModal');
    const reset = () => {
        if (badge) badge.textContent = 'SYSTEM ACCESS';
        if (sub)   sub.textContent   = 'BULAVIN INNER CIRCLE';
        modal.removeEventListener('click', reset);
    };
    modal.addEventListener('click', reset);
}

document.getElementById('bsPhotoInput').addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;

    /* ── Anti-spam: max 2 photos per 24h ─────────────────────
       NOTE: async здесь безопасен — .click() уже случился
       синхронно. Мобильный браузер не блокирует этот await.
    ──────────────────────────────────────────────────────── */
    const statusEl = document.getElementById('bsUploadStatus');
    try {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count, error: cntErr } = await _supabase
            .from('community_photos')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', _currentUser.id)
            .gte('created_at', since24h);

        if (!cntErr && count >= 2) {
            this.value = ''; // сбрасываем выбор файла
            if (statusEl) {
                statusEl.textContent = '⚠️ Лимит: 2 фото в сутки — приходи завтра!';
                statusEl.className = 'bs-upload-status err';
                setTimeout(() => {
                    statusEl.textContent = '';
                    statusEl.className = 'bs-upload-status';
                }, 4000);
            }
            return; // Cropper НЕ открывается
        }
    } catch (spamErr) {
        // При ошибке проверки — пропускаем (fail open, не блокируем честных)
        console.warn('[SPAM CHECK]', spamErr);
    }

    // Лимит не исчерпан — открываем Cropper
    _openBSCropper(file);
    this.value = '';
});

/* ── CROPPER ─────────────────────────────────── */
let _bsCropper = null;

function _openBSCropper(file) {
    const modal = document.getElementById('bsCropperModal');
    const img   = document.getElementById('bsCropperImage');
    modal.classList.add('show');

    if (_bsCropper) { _bsCropper.destroy(); _bsCropper = null; }

    const reader = new FileReader();
    reader.onload = e => {
        img.src = e.target.result;
        img.onload = () => {
            _bsCropper = new Cropper(img, {
                aspectRatio: 3/4, viewMode: 1, dragMode: 'move',
                autoCropArea: 0.85, restore: false, guides: false,
                center: true, highlight: false,
                cropBoxMovable: true, cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
    };
    reader.readAsDataURL(file);
}

function closeBSCropper() {
    document.getElementById('bsCropperModal').classList.remove('show');
    if (_bsCropper) { _bsCropper.destroy(); _bsCropper = null; }
    document.getElementById('bsCropperStatus').textContent = '';
    document.getElementById('bsPhotoComment').value = '';
    updateBSCommentCounter();
}

function updateBSCommentCounter() {
    const el = document.getElementById('bsPhotoComment');
    const c  = document.getElementById('bsCommentCounter');
    if (el && c) c.textContent = el.value.length + ' / 150';
}

async function confirmBSCrop() {
    if (!_bsCropper) return;
    const statusEl = document.getElementById('bsCropperStatus');
    statusEl.textContent = 'ЗАГРУЗКА...';
    statusEl.className = 'status-line busy';

    _bsCropper.getCroppedCanvas({ maxWidth: 1080, maxHeight: 1440 }).toBlob(async blob => {
        if (!blob) { statusEl.textContent = 'ОШИБКА ОБРЕЗКИ'; statusEl.className = 'status-line err'; return; }

        const path = `${_currentUser.id}/${Date.now()}.jpg`;
        const { error: storErr } = await _supabase.storage
            .from('community_photos')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

        if (storErr) { statusEl.textContent = 'ОШИБКА: ' + storErr.message; statusEl.className = 'status-line err'; return; }

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/community_photos/${path}`;
        const commentVal = (document.getElementById('bsPhotoComment')?.value || '').trim();

        const { error: dbErr } = await _supabase.from('community_photos').insert({
            user_id:      _currentUser.id,
            email:        _currentUser.email,
            username:     _currentUsername,
            image_url:    publicUrl,
            storage_path: path,
            comment:      commentVal || null,
        });

        if (dbErr) { statusEl.textContent = 'ОШИБКА БД: ' + dbErr.message; statusEl.className = 'status-line err'; return; }

        statusEl.textContent = '✓ ФОТО ОПУБЛИКОВАНО!';
        statusEl.className = 'status-line ok';
        setTimeout(() => {
            closeBSCropper();
            // Перезагружаем ленту
            _bsLoaded = false;
            const reel = document.getElementById('bsReel');
            if (reel) reel.innerHTML = '';
            const sk = document.getElementById('bsSkeleton');
            if (sk) { sk.style.display = 'flex'; sk.style.opacity = '1'; }
            loadBSStory();
        }, 1200);
    }, 'image/jpeg', 0.88);
}

/* ────────────────────────────────────────────────
   5. АВТОРИЗАЦИЯ — НЕ ТРОГАТЬ (маршрутизация обновлена)
   ──────────────────────────────────────────────── */
let isLoginMode = true;

function openAuth(loginMode) {
    closeAuthChoice();
    isLoginMode = loginMode;
    document.getElementById('authTitle').innerText = loginMode ? 'ВХОД' : 'РЕГИСТРАЦИЯ';
    document.getElementById('authBtn').innerText = 'ПРОДОЛЖИТЬ';
    document.getElementById('authUsername').style.display = loginMode ? 'none' : 'block';
    document.getElementById('forgotPasswordLink').style.display = loginMode ? 'block' : 'none';
    const rememberRow = document.getElementById('rememberMeRow');
    if (rememberRow) rememberRow.style.display = loginMode ? 'flex' : 'none';
    document.getElementById('authInputs').style.display = 'block';
    document.getElementById('authSuccess').style.display = 'none';
    document.getElementById('authModal').classList.add('show');
}
function closeAuth() { document.getElementById('authModal').classList.remove('show'); }

document.getElementById('authUsername').addEventListener('input', function() {
    let val = this.value.replace(/\s/g, '');
    if (val.length > 0 && !val.startsWith('@')) val = '@' + val;
    this.value = val;
});

async function executeAuth() {
    const email    = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const username = document.getElementById('authUsername').value;
    const btn      = document.getElementById('authBtn');
    if (!email || !password) return alert('Заполни поля!');

    const rememberMeEl = document.getElementById('rememberMeCheck');
    const rememberMe = rememberMeEl ? rememberMeEl.checked : true;
    if (!rememberMe) sessionStorage.setItem('bulavin_no_persist', '1');
    else sessionStorage.removeItem('bulavin_no_persist');

    btn.disabled = true; btn.innerText = 'СВЯЗЬ...';

    if (isLoginMode) {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(error.message);
            btn.disabled = false; btn.innerText = 'ПРОДОЛЖИТЬ';
        } else {
            // ── МАРШРУТИЗАЦИЯ ПОСЛЕ ВХОДА ──
            if (_content.bs_story_global_enabled === 'true') {
                // Остаёмся на главной: обновляем состояние
                _currentUser = data.user;
                _currentUsername = data.user.user_metadata?.username
                    || ('@' + data.user.email.split('@')[0]);
                showUserBadge(_currentUsername);
                document.getElementById('authNavBtn')?.classList.remove('has-dot');
                closeAuth();
                // Открываем B.S. STORY сразу
                openBSStory();
            } else {
                window.location.href = '/dashboard/';
            }
        }
    } else {
        const { error } = await _supabase.auth.signUp({ email, password, options: { data: { username } } });
        if (error) {
            alert(error.message);
            btn.disabled = false; btn.innerText = 'ПРОДОЛЖИТЬ';
        } else {
            document.getElementById('authSuccessText').innerHTML = 'Проверьте почту для подтверждения.';
            document.getElementById('authIcon').className = 'fa-regular fa-envelope';
            document.getElementById('authInputs').style.display = 'none';
            document.getElementById('authSuccess').style.display = 'block';
        }
    }
}

async function resetPasswordTrigger() {
    const email = document.getElementById('authEmail').value;
    if (!email) return alert('Введите Email!');
    const link = document.getElementById('forgotPasswordLink');
    const orig = link.innerText;
    link.innerText = 'ОТПРАВКА...';
    const { error } = await _supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://bulavin.space/password-reset/' });
    link.innerText = orig;
    if (error) alert(error.message);
    else {
        document.getElementById('authSuccessText').innerText = 'Ссылка отправлена на почту.';
        document.getElementById('authIcon').className = 'fa-solid fa-paper-plane';
        document.getElementById('authInputs').style.display = 'none';
        document.getElementById('authSuccess').style.display = 'block';
    }
}

/* ────────────────────────────────────────────────
   6. АККОРДЕОН — НЕ ТРОГАТЬ
   ──────────────────────────────────────────────── */
function setupCollapse(btnId, wrapperId) {
    document.getElementById(btnId).onclick = () => {
        const el = document.getElementById(wrapperId);
        document.querySelectorAll('.collapse-wrapper').forEach(w => {
            if (w.id !== wrapperId) w.classList.remove('show');
        });
        el.classList.toggle('show');
    };
}
setupCollapse('music-btn',  'music-wrapper');
setupCollapse('afisha-btn', 'afisha-wrapper');

/* ────────────────────────────────────────────────
   7. ПЛАВАЮЩИЕ ЭМОДЗИ — НЕ ТРОГАТЬ
   ──────────────────────────────────────────────── */
const canvas = document.getElementById('global-canvas');
const ctx    = canvas.getContext('2d');
let emojis = [], lastW = window.innerWidth;

class FloatingEmoji {
    constructor() { this.init(true); }
    init(first) {
        this.x    = Math.random() * window.innerWidth;
        this.y    = first ? Math.random() * window.innerHeight : -50;
        this.emoji= ['🖤','💼','🎧'][Math.floor(Math.random() * 3)];
        this.size = Math.random() * 20 + 20;
        this.vx   = (Math.random() - 0.5) * 0.4;
        this.vy   = (Math.random() - 0.5) * 0.4;
        this.rot  = Math.random() * Math.PI * 2;
        this.rs   = (Math.random() - 0.5) * 0.01;
        this.op   = Math.random() * 0.18 + 0.08;
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.rot += this.rs;
        if (this.y > window.innerHeight + 50 || this.x < -50 || this.x > window.innerWidth + 50) this.init(false);
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.globalAlpha = this.op;
        ctx.font = `${this.size}px serif`; ctx.textAlign = 'center';
        ctx.fillText(this.emoji, 0, 0);
        ctx.restore();
    }
}
function initEmojis() {
    if (Math.abs(lastW - window.innerWidth) > 50 || emojis.length === 0) {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        lastW = window.innerWidth;
        emojis = Array.from({ length: 15 }, () => new FloatingEmoji());
    } else { canvas.height = window.innerHeight; }
}
function animEmojis() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    emojis.forEach(e => { e.update(); e.draw(); });
    requestAnimationFrame(animEmojis);
}
window.addEventListener('resize', initEmojis);
initEmojis(); animEmojis();

/* ────────────────────────────────────────────────
   8. API ПРЕДСКАЗАНИЙ — НЕ ТРОГАТЬ
   ──────────────────────────────────────────────── */
async function fetchPrediction() {
    try {
        const r = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://fucking-great-advice.ru/api/random'));
        const d = await r.json();
        document.getElementById('prediction').innerText = JSON.parse(d.contents).text;
    } catch { document.getElementById('prediction').innerText = 'Продолжай делать своё дело.'; }
}
fetchPrediction();

/* ────────────────────────────────────────────────
   9. АНИМАЦИЯ АВАТАРКИ — НЕ ТРОГАТЬ
   ──────────────────────────────────────────────── */
function initAvatarAnimation() {
    const avatarImg   = document.getElementById('mainAvatarImage');
    const placeholder = document.getElementById('avatarPlaceholder');
    const textEl      = document.getElementById('avatarText');
    const iconEl      = document.getElementById('avatarIcon');

    if (!window._blurEnabled) {
        avatarImg.style.transition = 'filter 0.35s ease';
        avatarImg.style.filter = 'blur(0px) brightness(1)';
        if (placeholder) placeholder.style.display = 'none';
        return;
    }

    avatarImg.style.transition = 'none';
    avatarImg.style.filter = 'blur(7px) brightness(0.28)';
    placeholder.style.display = 'flex';
    placeholder.style.opacity = '1';
    placeholder.style.zIndex  = '3';
    textEl.style.display = 'block';
    iconEl.style.display = 'none';

    setTimeout(() => { textEl.style.display = 'none'; iconEl.style.display = 'block'; }, 3500);
    setTimeout(() => { iconEl.style.display = 'none'; textEl.style.display = 'block'; }, 7000);
    setTimeout(() => {
        placeholder.style.transition = 'opacity 0.7s ease';
        placeholder.style.opacity = '0';
        avatarImg.style.transition = 'filter 0.9s ease';
        avatarImg.style.filter = 'blur(0px) brightness(1)';
        setTimeout(() => { placeholder.style.display = 'none'; }, 750);
    }, 11000);
}

/* ────────────────────────────────────────────────
   УТИЛИТЫ
   ──────────────────────────────────────────────── */
function _escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'только что';
    if (m < 60) return `${m} мин назад`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ч назад`;
    return `${Math.floor(h/24)} дн назад`;
}

/* ────────────────────────────────────────────────
   BOOT
   ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([initUserState(), loadContent()]);
    // initAvatarAnimation() вызывается из img.onload
});
