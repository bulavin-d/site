/* ================================================
   BULAVIN SYSTEM — MAIN PAGE LOGIC
   !! Не трогать auth, storage, SEO, анимации !!
   ================================================ */

/* ────────────────────────────────────────────────
   1. ДИНАМИЧЕСКИЙ КОНТЕНТ ИЗ SUPABASE
   ──────────────────────────────────────────────── */
const DEFAULTS = {
    avatar_url:            'https://avatars.yandex.net/get-music-content/16464214/8bceb93a.p.24009925/m1000x1000',
    bio:                   'Казахстанский исполнитель и музыкальный продюсер.',
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
    exclusive_blur_enabled:'true',
    ring_color:            '',   // пусто = оригинальный instagram-градиент
};

let _content = { ...DEFAULTS };

async function loadContent() {
    try {
        const { data, error } = await _supabase
            .from('site_content')
            .select('key, value');
        if (error) throw error;
        data.forEach(row => { if (row.value !== null) _content[row.key] = row.value; });
    } catch(e) {
        console.warn('[BULAVIN] site_content недоступен, работаем с дефолтами.', e.message);
    }
    applyContent();
}

function applyContent() {
    const c = _content;

    // Bio
    const bioEl = document.querySelector('.bio');
    if (bioEl) bioEl.textContent = c.bio;

    // Footer
    const footerEl = document.querySelector('.footer');
    if (footerEl) footerEl.textContent = c.footer_text;

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

    // Afisha text
    const afishaText = document.getElementById('afisha-text');
    if (afishaText) afishaText.textContent = c.afisha_text;
    _setLink('link-organizer', c.organizer_url);

    // Avatar
    const avatarImg = document.getElementById('mainAvatarImage');
    const dynBg = document.querySelector('.dynamic-bg');
    if (avatarImg && c.avatar_url) {
        avatarImg.src = c.avatar_url;
        if (dynBg) dynBg.style.backgroundImage = `url('${c.avatar_url}')`;
    }

    // Ring gradient color
    if (c.ring_color && c.ring_color.trim()) {
        const col = c.ring_color.trim();
        document.documentElement.style.setProperty(
            '--ring-gradient',
            `linear-gradient(45deg, ${col} 0%, transparent 50%, ${col} 100%)`
        );
    }

    // Blur toggle — используется в initAvatarAnimation()
    window._blurEnabled = c.exclusive_blur_enabled !== 'false';
}

function _setLink(id, url) {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
}

/* ────────────────────────────────────────────────
   2. QR / МОДАЛЬНЫЕ ОКНА
   ──────────────────────────────────────────────── */
function openQR()          { document.getElementById('qrModal').classList.add('show'); }
function closeQR()         { document.getElementById('qrModal').classList.remove('show'); }
function openAuthChoice()  { document.getElementById('authChoiceModal').classList.add('show'); }
function closeAuthChoice() { document.getElementById('authChoiceModal').classList.remove('show'); }

/* ────────────────────────────────────────────────
   3. СТОРИС — ВИДЕО + ПРОГРЕСС-БАР
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
   4. АВТОРИЗАЦИЯ (ВХОД / РЕГИСТРАЦИЯ / СБРОС)
   ──────────────────────────────────────────────── */
let isLoginMode = true;

function openAuth(loginMode) {
    closeAuthChoice();
    isLoginMode = loginMode;
    document.getElementById('authTitle').innerText = loginMode ? 'ВХОД' : 'РЕГИСТРАЦИЯ';
    document.getElementById('authBtn').innerText = 'ПРОДОЛЖИТЬ';
    document.getElementById('authUsername').style.display = loginMode ? 'none' : 'block';
    document.getElementById('forgotPasswordLink').style.display = loginMode ? 'block' : 'none';
    document.getElementById('authInputs').style.display = 'block';
    document.getElementById('authSuccess').style.display = 'none';
    document.getElementById('authModal').classList.add('show');
}
function closeAuth() { document.getElementById('authModal').classList.remove('show'); }

// Username formatting
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

    btn.disabled = true; btn.innerText = 'СВЯЗЬ...';

    if (isLoginMode) {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) { alert(error.message); btn.disabled = false; btn.innerText = 'ПРОДОЛЖИТЬ'; }
        else window.location.href = '/dashboard/';
    } else {
        const { error } = await _supabase.auth.signUp({
            email, password,
            options: { data: { username } }
        });
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

    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://bulavin.space/password-reset/',
    });
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
   5. АККОРДЕОН (МУЗЫКА / АФИША)
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
   6. ПЛАВАЮЩИЕ ЭМОДЗИ (canvas)
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
        if (this.y > window.innerHeight + 50 || this.x < -50 || this.x > window.innerWidth + 50)
            this.init(false);
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
    } else {
        canvas.height = window.innerHeight;
    }
}
function animEmojis() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    emojis.forEach(e => { e.update(); e.draw(); });
    requestAnimationFrame(animEmojis);
}
window.addEventListener('resize', initEmojis);
initEmojis(); animEmojis();

/* ────────────────────────────────────────────────
   7. API ПРЕДСКАЗАНИЙ (BULAVIN SYSTEM)
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
   8. АНИМАЦИЯ АВАТАРКИ (15-секундная логика)
   ──────────────────────────────────────────────── */
function initAvatarAnimation() {
    const avatarImg  = document.getElementById('mainAvatarImage');
    const placeholder = document.getElementById('avatarPlaceholder');
    const textEl     = document.getElementById('avatarText');
    const iconEl     = document.getElementById('avatarIcon');

    // Если blur выключен в настройках — сразу показываем фото
    if (!window._blurEnabled) {
        placeholder.style.display = 'none';
        avatarImg.classList.add('clear');
        return;
    }

    // Blur включён — оригинальная 11-секундная последовательность
    placeholder.style.display = 'flex';
    textEl.style.display = 'block';
    iconEl.style.display = 'none';

    setTimeout(() => { textEl.style.display = 'none'; iconEl.style.display = 'block'; }, 3500);
    setTimeout(() => { iconEl.style.display = 'none'; textEl.style.display = 'block'; }, 7000);
    setTimeout(() => { placeholder.style.display = 'none'; avatarImg.classList.add('clear'); }, 11000);
}

/* ────────────────────────────────────────────────
   BOOT
   ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    // Сначала дефолты (мгновенно), потом подтягиваем из БД
    applyContent();
    await loadContent();
    initAvatarAnimation();
});
