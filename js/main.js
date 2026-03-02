/* ================================================
   BULAVIN SYSTEM — MAIN PAGE LOGIC v4
   !! НЕ ТРОГАТЬ: auth, storage, SEO, анимации !!
   ================================================ */

/* ────────────────────────────────────────────────
   1. КОНТЕНТ + FOUC-FREE LOADING
   ──────────────────────────────────────────────── */
const DEFAULTS = {
    avatar_url:            '',
    bio:                   '',
    footer_text:           '© 2026 BULAVIN',
    telegram_url:          'https://t.me/imbulavin',
    instagram_url:         'https://www.instagram.com/lu4danya',
    yandex_music_url:      'https://music.yandex.kz/artist/24009925',
    vk_music_url:          'https://vk.com/artist/bulavin',
    spotify_url:           'https://open.spotify.com/artist/7Efya7yCpL4M7BPdcm6qUq',
    apple_music_url:       'https://music.apple.com/ru/artist/bulavin/1805904899',
    yt_music_url:          'https://music.youtube.com/channel/UCRyTj6rCcgg385Rg58zo_PA',
    soundcloud_url:        'https://soundcloud.com/bulavin',
    fusion_url:            'https://t.me/imbulavin_bot',
    afisha_text:           'На данный момент выступлений не запланировано.',
    organizer_url:         'https://t.me/imbulavin',
    afisha_poster_url:     '',
    afisha_tickets_url:    '',
    exclusive_blur_enabled:'true',
    ring_color:            '',
    // Блок релиза
    release_status:        'disabled', // 'disabled' | 'presave' | 'listen'
    release_cover_url:     '',
    release_track_url:     '',
    release_title:         '',
};

const FALLBACK_AVATAR = ''; // пусто = силуэт-заглушка

let _content = { ...DEFAULTS };
let _contentLoaded = false;

async function loadContent() {
    try {
        const { data, error } = await _supabase
            .from('site_content')
            .select('key, value');
        if (error) throw error;
        data.forEach(row => { if (row.value !== null) _content[row.key] = row.value; });
    } catch(e) {
        console.warn('[BULAVIN] site_content недоступен.', e.message);
    }
    _contentLoaded = true;
    applyContent();
    await loadCustomButtons();
}

function applyContent() {
    if (!_contentLoaded) return;
    const c = _content;

    // BIO — убрать скелетон, показать текст
    const bioEl = document.getElementById('bioEl');
    if (bioEl) {
        bioEl.textContent = c.bio || 'Казахстанский исполнитель и музыкальный продюсер.';
        bioEl.classList.remove('skeleton-text');
    }

    // Footer
    const footerEl = document.getElementById('footerEl');
    if (footerEl) footerEl.textContent = c.footer_text || '© 2026 BULAVIN';

    // Links
    _setLink('link-telegram',  c.telegram_url);
    _setLink('link-instagram', c.instagram_url);
    _setLink('link-yandex',    c.yandex_music_url);
    _setLink('link-vk',        c.vk_music_url);
    _setLink('link-spotify',   c.spotify_url);
    _setLink('link-apple',     c.apple_music_url);
    _setLink('link-yt',        c.yt_music_url);
    _setLink('link-soundcloud',c.soundcloud_url);
    _setLink('link-fusion',    c.fusion_url);

    // Afisha
    applyAfisha(c);

    // Release block
    applyRelease(c);

    // Avatar
    const avatarImg      = document.getElementById('mainAvatarImage');
    const avatarLink     = document.getElementById('avatarLink');
    const avatarSilhouette = document.getElementById('avatarSilhouette');
    const dynBg          = document.querySelector('.dynamic-bg');

    const avatarUrl = c.avatar_url && c.avatar_url.trim();

    // Blur toggle — устанавливаем ДО img.onload, чтобы initAvatarAnimation его увидел
    window._blurEnabled = c.exclusive_blur_enabled !== 'false';

    // Ring gradient color
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
            // 1. Ставим src и делаем фото видимым
            avatarImg.src = avatarUrl;
            avatarImg.style.opacity = '1';
            // 2. Показываем градиентное кольцо
            if (avatarLink) {
                avatarLink.classList.remove('avatar-loading');
                avatarLink.classList.add('avatar-ready');
            }
            // 3. Фон страницы
            if (dynBg) dynBg.style.backgroundImage = `url('${avatarUrl}')`;
            // 4. Убираем силуэт полностью
            if (avatarSilhouette) {
                avatarSilhouette.style.transition = 'opacity 0.4s ease';
                avatarSilhouette.style.opacity = '0';
                setTimeout(() => { avatarSilhouette.style.display = 'none'; }, 450);
            }
            // 5. Теперь запускаем EXCLUSIVE-анимацию — фото точно загружено
            initAvatarAnimation();
        };
        img.onerror = () => { /* силуэт остаётся, кольцо не показываем */ };
        img.src = avatarUrl;
    }
    // Если нет аватарки — силуэт остаётся, кольцо не появляется
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
        if (afishaTextEl) {
            afishaTextEl.style.display = 'block';
            afishaTextEl.textContent = c.afisha_text;
        }
        if (organizerWrap) organizerWrap.style.display = 'block';
        const orgLink = document.getElementById('link-organizer');
        if (orgLink && c.organizer_url) orgLink.href = c.organizer_url;
        if (posterWrap) posterWrap.style.display = 'none';
    }
}


/* ────────────────────────────────────────────────
   RELEASE BLOCK — Bandlink killer
   ──────────────────────────────────────────────── */
let _releaseUrl = '';
function applyRelease(c) {
    const block  = document.getElementById('releaseBlock');
    if (!block) return;

    const status = c.release_status || 'disabled';
    if (status === 'disabled' || !c.release_cover_url) {
        block.style.display = 'none';
        return;
    }

    _releaseUrl = c.release_track_url || '';

    // Обложка
    const cover = document.getElementById('releaseCover');
    if (cover) cover.src = c.release_cover_url;

    // Заголовок
    const titleEl = document.getElementById('releaseTitle');
    if (titleEl) titleEl.textContent = c.release_title || 'НОВЫЙ РЕЛИЗ';

    // Бейдж статуса
    const badge = document.getElementById('releaseBadge');
    if (badge) {
        badge.textContent = status === 'presave' ? 'ПРЕСЕЙВ' : 'СЛУШАТЬ';
        badge.className   = 'release-badge release-badge-' + status;
    }

    block.style.display = 'block';
}

function openRelease() {
    if (_releaseUrl) window.open(_releaseUrl, '_blank', 'noopener');
}

function _setLink(id, url) {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
}

/* ────────────────────────────────────────────────
   2. ДИНАМИЧЕСКИЕ КНОПКИ ИЗ custom_buttons
   ──────────────────────────────────────────────── */
async function loadCustomButtons() {
    try {
        const { data, error } = await _supabase
            .from('custom_buttons')
            .select('*')
            .eq('visible', true)
            .order('position', { ascending: true });
        if (error) throw error;
        renderCustomButtons(data || []);
    } catch(e) {
        console.warn('[BULAVIN] custom_buttons недоступен.', e.message);
    }
}

function renderCustomButtons(buttons) {
    const container = document.getElementById('custom-buttons-container');
    if (!container) return;
    container.innerHTML = '';
    buttons.forEach(btn => {
        const a = document.createElement('a');
        a.href = btn.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'btn';
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
   4. СТОРИС — ВИДЕО + ПРОГРЕСС-БАР
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

/* ────────────────────────────────────────────────
   5. АВТОРИЗАЦИЯ — НЕ ТРОГАТЬ
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
    if (!rememberMe) {
        sessionStorage.setItem('bulavin_no_persist', '1');
    } else {
        sessionStorage.removeItem('bulavin_no_persist');
    }

    btn.disabled = true; btn.innerText = 'СВЯЗЬ...';

    if (isLoginMode) {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) { alert(error.message); btn.disabled = false; btn.innerText = 'ПРОДОЛЖИТЬ'; }
        else window.location.href = '/dashboard/';
    } else {
        const { error } = await _supabase.auth.signUp({ email, password, options: { data: { username } } });
        if (error) { alert(error.message); btn.disabled = false; btn.innerText = 'ПРОДОЛЖИТЬ'; }
        else {
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
    } catch {
        document.getElementById('prediction').innerText = 'Продолжай делать своё дело.';
    }
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

    // Blur выключен в настройках — сразу убираем CSS-фильтр (fix вечного блюра)
    if (!window._blurEnabled) {
        avatarImg.style.transition = 'filter 0.35s ease';
        avatarImg.style.filter = 'blur(0px) brightness(1)';
        if (placeholder) placeholder.style.display = 'none';
        return;
    }

    // Накладываем блюр поверх уже загруженного фото
    avatarImg.style.transition = 'none';
    avatarImg.style.filter = 'blur(7px) brightness(0.28)';

    // Показываем оверлей EXCLUSIVE
    placeholder.style.display = 'flex';
    placeholder.style.opacity = '1';
    placeholder.style.zIndex  = '3';
    textEl.style.display = 'block';
    iconEl.style.display = 'none';

    setTimeout(() => {
        textEl.style.display = 'none';
        iconEl.style.display = 'block';
    }, 3500);
    setTimeout(() => {
        iconEl.style.display = 'none';
        textEl.style.display = 'block';
    }, 7000);
    // На 11 секунде — убираем всё
    setTimeout(() => {
        placeholder.style.transition = 'opacity 0.7s ease';
        placeholder.style.opacity = '0';
        avatarImg.style.transition = 'filter 0.9s ease';
        avatarImg.style.filter = 'blur(0px) brightness(1)';
        setTimeout(() => { placeholder.style.display = 'none'; }, 750);
    }, 11000);
}

/* ────────────────────────────────────────────────
   BOOT
   ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    await loadContent();
    // initAvatarAnimation() вызывается изнутри img.onload в applyContent()
    // — только когда фото точно загружено
});
