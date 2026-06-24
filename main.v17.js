// CONFIG
const TMDB_KEY = '245f8c4922de78b5017c149fbfa89ab5';
const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';
const IMG_POSTER = `${IMG}/w500`;
const IMG_BACKDROP = `${IMG}/original`;
const IMG_CAST = `${IMG}/w185`;
const NO_POSTER = 'https://placehold.co/200x300/1a1a2e/666?text=';
const VIDSRV = 'https://vidsrcme.ru/embed';
const VIDSRV2 = 'https://vidsrc.pm/embed';
const VIDSRV4 = 'https://www.2embed.cc/embed';
const VIDSRV5 = 'https://vixsrc.to/movie';
const VIDSRV5_TV = 'https://vixsrc.to/tv';
const APIPLAYER = 'https://apiplayer.ru/embed';
const VIDSRV_VESY = 'https://streamsrcs.2embed.cc/vesy';

// Subtitle state
let subCues = [];
let subIdx = 0;
let currentImdbId = '';
let currentTmdbId = 0;

// GENRES
const MOVIE_GENRES = [
    {id:28,name:"Action"},{id:12,name:"Adventure"},{id:16,name:"Animation"},{id:35,name:"Comedy"},
    {id:80,name:"Crime"},{id:99,name:"Documentary"},{id:18,name:"Drama"},{id:10751,name:"Family"},
    {id:14,name:"Fantasy"},{id:36,name:"History"},{id:27,name:"Horror"},{id:10402,name:"Music"},
    {id:9648,name:"Mystery"},{id:10749,name:"Romance"},{id:878,name:"Sci-Fi"},{id:10770,name:"TV Movie"},
    {id:53,name:"Thriller"},{id:10752,name:"War"},{id:37,name:"Western"}
];
const TV_GENRES = [
    {id:10759,name:"Action & Adventure"},{id:16,name:"Animation"},{id:35,name:"Comedy"},
    {id:80,name:"Crime"},{id:99,name:"Documentary"},{id:18,name:"Drama"},{id:10751,name:"Family"},
    {id:10762,name:"Kids"},{id:9648,name:"Mystery"},{id:10763,name:"News"},{id:10764,name:"Reality"},
    {id:10765,name:"Sci-Fi & Fantasy"},{id:10766,name:"Soap"},{id:10767,name:"Talk"},
    {id:10768,name:"War & Politics"},{id:37,name:"Western"}
];

// NETWORKS (for TV filter)
const NETWORKS = [
  {id:213,name:'Netflix'},{id:49,name:'HBO'},{id:453,name:'Hulu'},{id:1024,name:'Amazon Prime'},
  {id:335984,name:'Disney+'},{id:2552,name:'Apple TV+'},{id:4330,name:'Paramount+'},
  {id:335977,name:'Peacock'},{id:19,name:'FOX'},{id:16,name:'CBS'},{id:35,name:'NBC'},
  {id:6,name:'ABC'},{id:174,name:'AMC'},{id:67,name:'Showtime'},{id:110,name:'BBC One'},
  {id:332,name:'BBC Two'},{id:2739,name:'Globoplay'},{id:25,name:'MTV'},{id:30,name:'Syfy'},
  {id:99,name:'VH1'},{id:170,name:'Star TV'},{id:190,name:'TNT'},{id:226,name:'TBS'},
  {id:331,name:'PBS'},{id:343,name:'History Channel'},{id:390,name:'National Geographic'},
  {id:473,name:'FX'},{id:541,name:'Comedy Central'},{id:573,name:'ESPN'},
  {id:1286,name:'Nickelodeon'},{id:1288,name:'Cartoon Network'}
];

// URL STATE
function updateURL() {
    const params = new URLSearchParams();
    if (currentGenreId) params.set('genre', currentGenreId);
    if (currentYear) params.set('year', currentYear);
    if (currentCountry) params.set('country', currentCountry);
    if (currentNetwork) params.set('network', currentNetwork);
    if (currentSort !== 'popularity.desc') params.set('sort', currentSort);
    if (currentPage > 1) params.set('page', currentPage);
    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    window.history.replaceState(null, '', url);
}

function getURLParams() {
    const p = new URLSearchParams(window.location.search);
    return {
        genre: p.get('genre') || null,
        year: p.get('year') || '',
        country: p.get('country') || '',
        network: p.get('network') || '',
        sort: p.get('sort') || 'popularity.desc',
        page: parseInt(p.get('page') || '1')
    };
}
let currentServer = 'vesy';
let currentPage = 1;
let currentMediaType = 'movie';
let currentGenreId = null;
let currentGenreName = '';
let currentSort = 'popularity.desc';
let currentYear = '';
let currentCountry = '';
let currentNetwork = '';

// UTILS
const el = s => document.querySelector(s);
const all = s => document.querySelectorAll(s);
const posterUrl = p => p ? `${IMG_POSTER}${p}` : NO_POSTER;
const backdropUrl = p => p ? `${IMG_BACKDROP}${p}` : '';
const year = d => d ? d.substring(0, 4) : 'N/A';
const rating = r => r ? r.toFixed(1) : '0.0';
const truncate = (s, n) => s && s.length > n ? s.slice(0, n) + '...' : s;
const displayTitle = item => {
    const t = item.title || item.name || 'Untitled';
    return item.original_language === 'id' ? (item.original_title || t) : t;
};

// API
async function tmdb(path, params = {}) {
    const url = new URL(`${TMDB}${path}`);
    url.searchParams.set('api_key', TMDB_KEY);
    url.searchParams.set('language', 'en-US');
    Object.entries(params).forEach(([k, v]) => { if(v) url.searchParams.set(k, v); });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(res.status);
        return await res.json();
    } catch (e) { console.error('TMDB error:', e); return null; }
}

// COUNTRIES
async function loadCountries(selectEl, selectedValue) {
    const data = await tmdb('/configuration/countries');
    if (!data) return;
    selectEl.innerHTML = '<option value="">Semua Negara</option>';
    data.sort((a,b) => a.native_name.localeCompare(b.native_name));
    data.forEach(c => {
        selectEl.innerHTML += `<option value="${c.iso_3166_1}">${c.native_name}</option>`;
    });
    if (selectedValue) selectEl.value = selectedValue;
}

// CARD
function createCard(item, type) {
    const mediaType = type || item.media_type || 'movie';
    const title = displayTitle(item);
    const date = item.release_date || item.first_air_date;
    const isTv = mediaType === 'tv';
    const div = document.createElement('div');
    div.className = 'card';
    const genreName = item.genre_ids?.[0] ? (type==='movie'?MOVIE_GENRES:TV_GENRES).find(g=>g.id===item.genre_ids[0])?.name : null;
    const releaseYear = year(date);
    div.innerHTML = `
        <img class="card-poster" src="${posterUrl(item.poster_path)}" alt="${title}" loading="lazy" onerror="this.src='${NO_POSTER}'">
        <span class="card-type">${isTv ? 'TV' : 'MOVIE'}</span>
        ${item.vote_average >= 8 ? '<span class="card-badge">Top</span>' : ''}
        <div class="card-info">
            <div class="card-title" title="${title}">${title}</div>
            <div class="card-meta">
                <span>${releaseYear}</span>
                ${item.vote_average ? `<span class="card-rating">★ ${rating(item.vote_average)}</span>` : ''}
            </div>
        </div>
    `;
    div.onclick = () => { window.location.href = `detail.html?id=${item.id}&type=${mediaType}`; };
    // Watchlist heart
    const heart = document.createElement('div');
    heart.className = 'card-heart' + (isInWatchlist(item.id, mediaType) ? ' active' : '');
    heart.onclick = (e) => {
        e.stopPropagation();
        toggleWatchlist(item, mediaType);
        heart.classList.toggle('active');
    };
    div.appendChild(heart);
    return div;
}

// WATCHLIST
function getWatchlist() {
    try { return JSON.parse(localStorage.getItem('bermovie_watchlist') || '[]'); } catch { return []; }
}
function saveWatchlist(list) {
    localStorage.setItem('bermovie_watchlist', JSON.stringify(list));
}
function isInWatchlist(id, type) {
    return getWatchlist().some(i => i.id === id && i.type === type);
}
function toggleWatchlist(item, type) {
    let list = getWatchlist();
    const idx = list.findIndex(i => i.id === item.id && i.type === type);
    if (idx > -1) {
        list.splice(idx, 1);
        showToast('Dihapus dari favorit');
    } else {
        list.push({
            id: item.id, type: type || 'movie',
            title: displayTitle(item),
            poster: item.poster_path,
            year: (item.release_date || item.first_air_date || '').substring(0,4),
            rating: item.vote_average
        });
        showToast('Ditambahkan ke favorit');
    }
    saveWatchlist(list);
}

// TOAST
function showToast(msg, icon) {
    const t = el('#toast');
    if (!t) return;
    t.innerHTML = (icon||'') + msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2000);
}

// Fill empty grid spaces
function fillGrid(grid) {
    const card = grid.children[0];
    if (!card) return;
    void grid.offsetHeight;
    const w = card.offsetWidth;
    if (!w) return;
    const gap = 16;
    const containerW = grid.clientWidth;
    const cols = Math.floor((containerW + gap) / (w + gap));
    const remaining = cols - (grid.children.length % cols || cols);
    if (remaining < cols) {
        for (let i = 0; i < remaining; i++) {
            const filler = document.createElement('div');
            filler.style.cssText = `flex:0 0 ${w}px;height:0;margin:0;padding:0;pointer-events:none`;
            grid.appendChild(filler);
        }
    }
}

// DETAIL MODAL
async function openDetail(id, type = 'movie') {
    const modal = el('#detailModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const [detail, credits, similar, vids] = await Promise.all([
        tmdb(`/${type}/${id}`),
        tmdb(`/${type}/${id}/credits`),
        tmdb(`/${type}/${id}/similar`),
        tmdb(`/${type}/${id}/videos`)
    ]);
    if (!detail) { modal.classList.add('hidden'); return; }

    const title = displayTitle(detail);
    const date = detail.release_date || detail.first_air_date;
    const runtime = detail.runtime || (detail.episode_run_time?.[0]) || 0;
    const genres = detail.genres?.map(g => g.name).join(', ') || '';

    el('#modalHero').style.backgroundImage = `url(${backdropUrl(detail.backdrop_path)})`;
    el('#modalTitle').textContent = title;
    el('#modalMeta').innerHTML = `
        <span class="rating">★ ${rating(detail.vote_average)}</span>
        <span>${year(date)}</span>
        ${runtime ? `<span>${runtime} min</span>` : ''}
        <span>${type === 'movie' ? 'Film' : 'Series'}</span>
        ${detail.number_of_seasons ? `<span>${detail.number_of_seasons} Season</span>` : ''}
        ${genres ? `<span>${genres}</span>` : ''}
    `;
    el('#modalOverview').textContent = detail.overview || 'No description available.';

    const castEl = el('#modalCast');
    castEl.innerHTML = '';
    credits?.cast?.slice(0, 10).forEach(c => {
        castEl.innerHTML += `<div class="cast-member"><img src="${c.profile_path ? IMG_CAST+c.profile_path : NO_POSTER}" alt="${c.name}" onerror="this.src='${NO_POSTER}'"><p>${c.name}</p></div>`;
    });

    const watchBtn = el('#modalWatchBtn');
    if (watchBtn) watchBtn.onclick = () => openPlayer(id, type, title);
    const trailerBtn = el('#modalTrailerBtn');
    if (trailerBtn) trailerBtn.onclick = () => {
        const tr = vids?.results?.find(v => v.type==='Trailer'&&v.site==='YouTube');
        if(tr) {
            const hero = el('#modalHero');
            hero.innerHTML = `<iframe src="https://www.youtube.com/embed/${tr.key}?autoplay=1&rel=0&mute=1" allow="autoplay; fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none;z-index:5"></iframe>`;
            hero.classList.add('trailer-active');
            trailerBtn.querySelector('.t-il').textContent = '◉';
            trailerBtn.querySelector('.t-il').style.opacity = '1';
            trailerBtn.querySelector('.t-txt').textContent = 'Tutup Trailer';
            trailerBtn.querySelector('.t-ir').style.opacity = '0';
            trailerBtn.onclick = closeAllModals;
        } else alert('Trailer tidak tersedia');
    };

    const seasonsSection = el('#seasonsSection');
    if (type==='tv' && detail.seasons?.length && seasonsSection) {
        seasonsSection.classList.remove('hidden');
        const list = el('#seasonsList');
        list.innerHTML = '';
        detail.seasons.filter(s=>s.season_number>0).forEach(s => {
            const card = document.createElement('div');
            card.className = 'season-card';
            card.innerHTML = `${s.poster_path?`<img src="${IMG_POSTER}${s.poster_path}" alt="">`:''}<div class="info"><strong>Season ${s.season_number}</strong><small>${s.episode_count} Episode</small></div>`;
            card.onclick = () => openPlayer(id, type, title, s.season_number, 1);
            list.appendChild(card);
        });
    } else if (seasonsSection) {
        seasonsSection.classList.add('hidden');
    }

    const sim = el('#similarCarousel');
    if (sim) { sim.innerHTML = ''; similar?.results?.slice(0,10).forEach(i => sim.appendChild(createCard(i, type))); }
}

// PLAYER
function getPlayerUrl(id, type, season, episode) {
    let rawUrl;
    if (currentServer === 'vidsrc') {
        if (type === 'tv') rawUrl = `${VIDSRV}/tv?tmdb=${id}&season=${season}&episode=${episode}`;
        else rawUrl = `${VIDSRV}/movie?tmdb=${id}`;
    } else if (currentServer === 'vidsrc2') {
        if (type === 'tv') rawUrl = `${VIDSRV2}/tv/${id}/${season}/${episode}`;
        else rawUrl = `${VIDSRV2}/movie/${id}`;
    } else if (currentServer === '2embed') {
        if (type === 'tv') rawUrl = `${VIDSRV4}/${id}`;
        else rawUrl = `${VIDSRV4}/${id}`;
    } else if (currentServer === 'vesy') {
        if (type === 'tv') rawUrl = `${VIDSRV_VESY}?tmdb=${id}`;
        else rawUrl = `${VIDSRV_VESY}?tmdb=${id}`;
    } else if (currentServer === 'vixsrc') {
        if (type === 'tv') rawUrl = `${VIDSRV5_TV}/${id}/${season}/${episode}`;
        else rawUrl = `${VIDSRV5}/${id}`;
    } else if (currentServer === 'apiplayer') {
        if (type === 'tv') rawUrl = `${APIPLAYER}/tv/${id}/${season}/${episode}`;
        else rawUrl = `${APIPLAYER}/movie/${id}`;
    } else {
        // VidLink (default)
        if (type === 'tv') rawUrl = `https://vidlink.pro/tv/${id}/${season}/${episode}`;
        else rawUrl = `https://vidlink.pro/movie/${id}`;
    }
    return rawUrl;
}

async function openPlayer(id, type, title, season=1, episode=1) {
    const modal = el('#playerModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    el('#playerTitle').textContent = title;
    // Set iframe src ASAP before API calls
    el('#playerFrame').src = getPlayerUrl(id, type, season, episode);
    // Hide back button on detail page
    const backBtn = document.getElementById('detailBackBtn');
    if (backBtn) backBtn.style.display = 'none';

    // Show top bar + controls briefly
    const top = el('.player-top');
    const ctrl = el('.player-controls');
    if(top) top.classList.add('show');
    if(ctrl) ctrl.classList.add('show');
    setTimeout(() => { if(top) top.classList.remove('show'); if(ctrl) ctrl.classList.remove('show'); }, 3000);

    // Episode sheet for TV
    const epSheet = el('#episodeSheet');
    if (type==='tv' && epSheet) {
        el('#playerEpsBtn')?.classList.remove('hidden');
        const tvData = await tmdb(`/tv/${id}`);
        const sel = el('#seasonSelect');
        sel.innerHTML = '';
        tvData?.seasons?.filter(s=>s.season_number>0).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.season_number;
            opt.textContent = `Season ${s.season_number}`;
            if(s.season_number===season) opt.selected=true;
            sel.appendChild(opt);
        });
        sel.onchange = () => { loadEpisodes(id, parseInt(sel.value), type); };
        loadEpisodes(id, season, type, episode).catch(()=>{});
    } else if (epSheet) {
        el('#playerEpsBtn')?.classList.add('hidden');
        epSheet.classList.add('hidden');
    }

    all('.svr-btn').forEach(btn => {
        if (!btn.dataset.server) return;
        btn.classList.toggle('active', btn.dataset.server===currentServer);
        btn.onclick = () => {
            currentServer = btn.dataset.server;
            all('.svr-btn').forEach(b=>b.classList.toggle('active', b===btn));
            const s = type==='tv'?parseInt(el('#seasonSelect')?.value||1):1;
            const ae = document.querySelector('.ep-btn.active');
            const ep = ae?parseInt(ae.dataset.ep):1;
            el('#playerFrame').src = getPlayerUrl(id, type, s, ep);
        };
    });
}

async function loadEpisodes(id, season, type, activeEp=1) {
    const data = await tmdb(`/tv/${id}/season/${season}`);
    const grid = el('#episodesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    data?.episodes?.forEach(ep => {
        const btn = document.createElement('button');
        btn.className = 'ep-btn'+(ep.episode_number===activeEp?' active':'');
        btn.dataset.ep = ep.episode_number;
        btn.textContent = `E${ep.episode_number}`;
        btn.title = ep.name||`Episode ${ep.episode_number}`;
        btn.onclick = () => {
            all('.ep-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            el('#playerFrame').src = getPlayerUrl(id, type, season, ep.episode_number);
            el('#episodeSheet')?.classList.add('hidden');
        };
        grid.appendChild(btn);
    });
}

// ========== SUBTITLE FUNCTIONS ==========
async function searchAndShowSubs() {
    const sheet = el('#subSheet');
    const list = el('#subList');
    const status = el('#subSearchStatus');
    if (!sheet) return;
    sheet.classList.remove('hidden');
    list.innerHTML = '';
    status.textContent = 'Subtitle belum tersedia.';
}

async function loadSubtitle(subId) {
    el('#subSheet')?.classList.add('hidden');
}

function showSub(idx) {
    const textEl = el('#subText');
    const counter = el('#subCounter');
    if (!textEl || !counter) return;
    if (idx >= 0 && idx < subCues.length) {
        textEl.textContent = subCues[idx].text;
        counter.textContent = `${idx+1}/${subCues.length}`;
    } else {
        textEl.textContent = '';
        counter.textContent = `${idx+1}/${subCues.length}`;
    }
}

function closeSubs() {
    subCues = [];
    subIdx = 0;
    el('#subOverlay')?.classList.add('hidden');
    if (el('#subText')) el('#subText').textContent = '';
}

function closeAllModals() {
    ['detailModal','playerModal'].forEach(id => {
        const m = el(`#${id}`);
        if (m) m.classList.add('hidden');
    });
    const f = el('#playerFrame');
    if (f) f.src = '';
    document.body.style.overflow = '';
    // Hide episode sheet
    el('#episodeSheet')?.classList.add('hidden');
    // Close subtitle overlay + sheet
    closeSubs();
    el('#subSheet')?.classList.add('hidden');
    // Show back button on detail page
    const backBtn = document.getElementById('detailBackBtn');
    if (backBtn) backBtn.style.display = '';
}

// Player controls: mousemove shows top bar + controls
document.addEventListener('mousemove', () => {
    const modal = el('#playerModal');
    if (!modal || modal.classList.contains('hidden')) return;
    const top = el('.player-top');
    const ctrl = el('.player-controls');
    if(top) top.classList.add('show');
    if(ctrl) ctrl.classList.add('show');
    clearTimeout(window._playerHideTimer);
    window._playerHideTimer = setTimeout(() => {
        if(top) top.classList.remove('show');
        if(ctrl) ctrl.classList.remove('show');
    }, 2500);
});

// Player back/close buttons
el('#playerBackBtn') && (el('#playerBackBtn').onclick = closeAllModals);
el('#playerCloseBtn') && (el('#playerCloseBtn').onclick = closeAllModals);

// Episode sheet toggle
el('#playerEpsBtn') && (el('#playerEpsBtn').onclick = () => {
    const sheet = el('#episodeSheet');
    if(sheet) sheet.classList.toggle('hidden');
});
el('#epSheetClose') && (el('#epSheetClose').onclick = () => {
    el('#episodeSheet')?.classList.add('hidden');
});

// Subtitle controls
el('#subTriggerBtn') && (el('#subTriggerBtn').onclick = () => {
    if (subCues.length) {
        el('#subSheet')?.classList.toggle('hidden');
        return;
    }
    searchAndShowSubs();
});
el('#subSheetClose') && (el('#subSheetClose').onclick = () => {
    el('#subSheet')?.classList.add('hidden');
});
el('#subNextBtn') && (el('#subNextBtn').onclick = () => {
    if (subIdx < subCues.length - 1) showSub(++subIdx);
});
el('#subPrevBtn') && (el('#subPrevBtn').onclick = () => {
    if (subIdx > 0) showSub(--subIdx);
});
el('#subSyncBtn') && (el('#subSyncBtn').onclick = () => {
    subIdx = 0;
    showSub(0);
});
el('#subCloseBtn') && (el('#subCloseBtn').onclick = closeSubs);
// Click subtitle text to advance
el('#subText') && (el('#subText').onclick = () => {
    if (subIdx < subCues.length - 1) showSub(++subIdx);
});

// PAGINATION
function renderPagination(containerId, total, current, callback) {
    const container = el(`#${containerId}`);
    if (!container) return;
    container.innerHTML = '';
    const maxShow = 5;
    let start = Math.max(1, current - Math.floor(maxShow/2));
    let end = Math.min(total, start + maxShow - 1);
    if(end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);

    if (current > 1) {
        const prev = document.createElement('button');
        prev.textContent = '←';
        prev.onclick = () => callback(current - 1);
        container.appendChild(prev);
    }
    for (let i = start; i <= end; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === current) btn.classList.add('active');
        btn.onclick = () => callback(i);
        container.appendChild(btn);
    }
    if (current < total) {
        const next = document.createElement('button');
        next.textContent = '→';
        next.onclick = () => callback(current + 1);
        container.appendChild(next);
    }
}

// HERO CAROUSEL
let heroTimer = null;
let heroIdx = 0;
let heroItems = [];

function renderHeroSlide(idx) {
    const item = heroItems[idx];
    if (!item) return;
    const type = item.media_type||'movie';
    // Set all slides
    for (let i = 0; i < 5; i++) {
        const slide = el('#heroSlide' + i);
        if (!slide) continue;
        slide.classList.toggle('active', i === idx);
        slide.style.backgroundImage = i === idx ? `url(${backdropUrl(item.backdrop_path)})` : '';
    }
    if (el('#heroTitle')) el('#heroTitle').textContent = displayTitle(item);
    if (el('#heroOverview')) el('#heroOverview').textContent = truncate(item.overview, 200);
        // Hero genre tags
    const gnames = item.genre_ids?.slice(0,3).map(id => {
        const list = type==='movie' ? MOVIE_GENRES : TV_GENRES;
        const g = list.find(g=>g.id===id);
        return g ? g.name : null;
    }).filter(Boolean) || [];
    let genreHtml = gnames.length ? `<div class="hero-genres">${gnames.map(n => `<span class="hero-genre">${n}</span>`).join('')}</div>` : '';
    if (el('#heroMeta')) el('#heroMeta').innerHTML = genreHtml + `<span class="rating-badge">★ ${rating(item.vote_average)}</span><span>${year(item.release_date||item.first_air_date)}</span><span>${type==='movie'?'Film':'Series'}</span>`;
    if (el('#heroBtn')) el('#heroBtn').onclick = () => { window.location.href = `detail.html?id=${item.id}&type=${type}`; };
    // Update dots
    document.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

function goHero(i) {
    heroIdx = (i + heroItems.length) % heroItems.length;
    renderHeroSlide(heroIdx);
    resetHeroTimer();
}

function resetHeroTimer() {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => goHero(heroIdx + 1), 5000);
}

async function loadHero() {
    const data = await tmdb('/trending/all/day');
    if (!data?.results?.length) return;
    heroItems = data.results.filter(i=>i.backdrop_path).slice(0,5);
    // Create dots
    const dots = el('#heroDots');
    if (dots) {
        dots.innerHTML = '';
        heroItems.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
            dot.onclick = () => goHero(i);
            dots.appendChild(dot);
        });
    }
    // Arrow buttons
    const prev = el('#heroPrev');
    const next = el('#heroNext');
    if (prev) prev.onclick = () => goHero(heroIdx - 1);
    if (next) next.onclick = () => goHero(heroIdx + 1);
    // Hero drag swipe (mouse + touch)
    const hero = el('#hero');
    let heroDragX = 0, heroDragStart = 0, heroDragged = false;
    if (hero) {
        hero.addEventListener('mousedown', (e) => {
            heroDragStart = e.pageX; heroDragged = false;
            hero.style.cursor = 'grabbing';
        });
        hero.addEventListener('mousemove', (e) => {
            if (!heroDragStart) return;
            const dx = e.pageX - heroDragStart;
            if (Math.abs(dx) > 20) heroDragged = true;
        });
        hero.addEventListener('mouseup', (e) => {
            hero.style.cursor = '';
            if (heroDragged) {
                const dx = e.pageX - heroDragStart;
                if (Math.abs(dx) > 50) goHero(heroIdx + (dx < 0 ? 1 : -1));
            }
            heroDragStart = 0; heroDragged = false;
        });
        hero.addEventListener('mouseleave', () => {
            hero.style.cursor = '';
            heroDragStart = 0;
        });
        hero.addEventListener('touchstart', (e) => {
            heroDragStart = e.touches[0].clientX; heroDragged = false;
        }, { passive: true });
        hero.addEventListener('touchmove', (e) => {
            const dx = e.touches[0].clientX - heroDragStart;
            if (Math.abs(dx) > 20) heroDragged = true;
        }, { passive: true });
        hero.addEventListener('touchend', (e) => {
            if (!heroDragged) return;
            const dx = e.changedTouches[0].clientX - heroDragStart;
            if (Math.abs(dx) > 50) goHero(heroIdx + (dx < 0 ? 1 : -1));
            heroDragStart = 0;
        }, { passive: true });
    }
    // Render first
    heroIdx = 0;
    renderHeroSlide(0);
    resetHeroTimer();
}

async function loadHomeCarousel(path, containerId, type) {
    const data = await tmdb(path);
    const c = el(`#${containerId}`);
    if (!c||!data?.results) return;
    c.innerHTML = '';
    data.results.forEach(i => c.appendChild(createCard(i, type)));
    addCarouselArrows(c);
}

// TRENDING WITH RANK
let trendingFilter = 'all';
async function loadTrending(filter) {
    trendingFilter = filter || 'all';
    const list = el('#trendingList');
    if (!list) return;
    const data = await tmdb('/trending/all/day');
    if (!data?.results) return;
    let items = data.results.filter(i=>i.poster_path);
    if (filter === 'movie') items = items.filter(i=>i.media_type==='movie');
    else if (filter === 'tv') items = items.filter(i=>i.media_type==='tv');
    items = items.slice(0,10);
    list.innerHTML = '';
    items.forEach((item, i) => {
        const t = displayTitle(item);
        const d = item.release_date||item.first_air_date||'';
        const y = d ? d.substring(0,4) : '';
        const rate = rating(item.vote_average);
        const mt = item.media_type||'movie';
        const card = document.createElement('div');
        card.className = 'trending-card';
        card.innerHTML = '<span class="trending-rank">'+(i+1)+'</span><img src="'+posterUrl(item.poster_path)+'" alt="'+t+'" loading="lazy"><div class="trending-info"><div class="title">'+t+'</div><div class="meta">'+y+' ~ '+rate+'</div></div>';
        card.onclick = () => { window.location.href = 'detail.html?id='+item.id+'&type='+mt; };
        list.appendChild(card);
    });
    // Update filter buttons
    document.querySelectorAll('.trending-filter').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === (filter||'all'));
    });
}

function addCarouselArrows(carousel) {
    if (carousel.dataset.arrows) return;
    carousel.dataset.arrows = '1';
    
    // Disable native drag-to-scroll on click, but keep wheel + buttons
    carousel.addEventListener('mousedown', () => { carousel.style.overflowX = 'hidden'; });
    carousel.addEventListener('mouseup', () => { carousel.style.overflowX = 'auto'; });
    carousel.addEventListener('mouseleave', () => { carousel.style.overflowX = 'auto'; });
    
    const wrap = carousel.parentElement;
    if (!wrap || wrap.classList.contains('carousel-wrap')) return;
    const section = wrap.closest('.section');
    if (!section) return;
    const header = section.querySelector('.section-header');
    if (!header) return;
    const nav = document.createElement('div');
    nav.className = 'carousel-nav';
    nav.innerHTML = `<button class="carousel-btn carousel-prev">‹</button><button class="carousel-btn carousel-next">›</button>`;
    header.appendChild(nav);
    const prev = nav.querySelector('.carousel-prev');
    const next = nav.querySelector('.carousel-next');
    const scroll = (dir) => {
        const w = carousel.children[0]?.offsetWidth || 200;
        carousel.scrollBy({ left: dir * (w + 14) * 3, behavior: 'smooth' });
    };
    prev.onclick = () => scroll(-1);
    next.onclick = () => scroll(1);
    // Hide prev/next at edges
    carousel.addEventListener('scroll', () => {
        const atStart = carousel.scrollLeft < 10;
        const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 10;
        prev.style.opacity = atStart ? '0' : '1';
        prev.style.pointerEvents = atStart ? 'none' : 'auto';
        next.style.opacity = atEnd ? '0' : '1';
        next.style.pointerEvents = atEnd ? 'none' : 'auto';
    });
    // Initial check
    setTimeout(() => carousel.dispatchEvent(new Event('scroll')), 100);
}

function initHomePage() {
    loadHero();
    loadTrending('all');
    loadHomeCarousel('/movie/popular', 'moviesCarousel', 'movie');
    loadHomeCarousel('/tv/popular', 'tvCarousel', 'tv');
    loadHomeCarousel('/movie/top_rated', 'topRatedCarousel', 'movie');
    loadHomeCarousel('/movie/now_playing', 'nowPlayingCarousel', 'movie');
    // Indonesian content
    loadHomeCarousel('/discover/movie?with_origin_country=ID', 'indoMoviesCarousel', 'movie');
    loadHomeCarousel('/discover/tv?with_origin_country=ID', 'indoSeriesCarousel', 'tv');
    // Check for watchlist
    if (window.location.search.includes('watchlist')) renderWatchlist();
}

// MOVIES PAGE
let movieLoadId = 0;
async function loadMovies(page = 1) {
    const grid = el('#movieGrid');
    const loading = el('#loading');
    if (!grid) return;
    const loadId = ++movieLoadId;
    loading?.classList.remove('hidden');
    grid.innerHTML = '';

    const params = { page, sort_by: currentSort };
    if (currentGenreId) params.with_genres = currentGenreId;
    if (currentYear) {
        params['primary_release_date.gte'] = `${currentYear}-01-01`;
        params['primary_release_date.lte'] = `${currentYear}-12-31`;
    }
    if (currentCountry) params.with_origin_country = currentCountry;

    const data = await tmdb('/discover/movie', {...params, page: (currentPage - 1) * 2 + 1});
    if (loadId !== movieLoadId) return;
    loading?.classList.add('hidden');
    if (!data?.results) return;
    const data2 = data.total_pages > 1 ? await tmdb('/discover/movie', {...params, page: (currentPage - 1) * 2 + 2}) : {results:[]};
    if (loadId !== movieLoadId) return;
    [...data.results, ...data2.results]
        .filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i)
        .slice(0,21).forEach(i => grid.appendChild(createCard(i, 'movie')));
    const totalPages = Math.ceil(Math.min(data.total_pages, 500) / 2);
    renderPagination('moviePagination', totalPages, page, p => {
        currentPage = p;
        loadMovies(p);
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
}

function initMoviesPage() {
    const genreSel = el('#genreFilter');
    const yearSel = el('#yearFilter');
    const sortSel = el('#sortFilter');
    const countrySel = el('#countryFilter');

    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const urlCountry = urlParams.get('country');
    const urlGenre = urlParams.get('genre');
    const urlYear = urlParams.get('year');
    const urlSort = urlParams.get('sort');

    if (genreSel) {
        genreSel.innerHTML = '<option value="">Semua Genre</option>';
        MOVIE_GENRES.forEach(g => {
            genreSel.innerHTML += `<option value="${g.id}">${g.name}</option>`;
        });
        if (urlGenre) { genreSel.value = urlGenre; currentGenreId = urlGenre; }
        genreSel.onchange = () => { currentGenreId = genreSel.value||null; currentPage=1; loadMovies(); updateURL(); };
    }
    if (yearSel) {
        const now = new Date().getFullYear();
        yearSel.innerHTML = '<option value="">Semua Tahun</option>';
        for (let y = now; y >= 1950; y--) yearSel.innerHTML += `<option value="${y}">${y}</option>`;
        if (urlYear) { yearSel.value = urlYear; currentYear = urlYear; }
        yearSel.onchange = () => { currentYear = yearSel.value; currentPage=1; loadMovies(); updateURL(); };
    }
    if (sortSel) {
        if (urlSort) { sortSel.value = urlSort; currentSort = urlSort; }
        sortSel.onchange = () => { currentSort = sortSel.value; currentPage=1; loadMovies(); updateURL(); };
    }
    if (countrySel) {
        if (urlCountry) currentCountry = urlCountry;
        countrySel.onchange = () => { currentCountry = countrySel.value; currentPage=1; loadMovies(); updateURL(); };
        loadCountries(countrySel, urlCountry).then(() => { if (urlCountry) currentCountry = countrySel.value; });
        loadMovies();
    } else {
        loadMovies();
    }
}

// TV PAGE
// TV PAGE
let tvLoadId = 0;
async function loadTvShows(page = 1) {
    const grid = el('#tvGrid');
    const loading = el('#loading');
    if (!grid) return;
    const loadId = ++tvLoadId;
    loading?.classList.remove('hidden');
    grid.innerHTML = '';

    const params = { page, sort_by: currentSort };
    if (currentGenreId) params.with_genres = currentGenreId;
    if (currentYear) {
        params['first_air_date.gte'] = `${currentYear}-01-01`;
        params['first_air_date.lte'] = `${currentYear}-12-31`;
    }
    if (currentCountry) params.with_origin_country = currentCountry;
    if (currentNetwork) params.with_networks = currentNetwork;

    const data = await tmdb('/discover/tv', {...params, page: (currentPage - 1) * 2 + 1});
    if (loadId !== tvLoadId) return;
    loading?.classList.add('hidden');
    if (!data?.results) return;
    const data2 = data.total_pages > 1 ? await tmdb('/discover/tv', {...params, page: (currentPage - 1) * 2 + 2}) : {results:[]};
    if (loadId !== tvLoadId) return;
    [...data.results, ...data2.results]
        .filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i)
        .slice(0,21).forEach(i => grid.appendChild(createCard(i, 'tv')));
    const totalPages = Math.ceil(Math.min(data.total_pages, 500) / 2);
    renderPagination('tvPagination', totalPages, page, p => {
        currentPage = p;
        loadTvShows(p);
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
}

function initTvPage() {
    const genreSel = el('#genreFilter');
    const yearSel = el('#yearFilter');
    const sortSel = el('#sortFilter');
    const countrySel = el('#countryFilter');
    const networkSel = el('#networkFilter');

    const urlParams = new URLSearchParams(window.location.search);
    const urlCountry = urlParams.get('country');
    const urlGenre = urlParams.get('genre');
    const urlYear = urlParams.get('year');
    const urlSort = urlParams.get('sort');
    const urlNetwork = urlParams.get('network');

    // Sync filters (semua synchronous)
    if (genreSel) {
        genreSel.innerHTML = '<option value="">Semua Genre</option>';
        TV_GENRES.forEach(g => {
            genreSel.innerHTML += `<option value="${g.id}">${g.name}</option>`;
        });
        if (urlGenre) { genreSel.value = urlGenre; currentGenreId = urlGenre; }
        genreSel.onchange = () => { currentGenreId = genreSel.value||null; currentPage=1; loadTvShows(); updateURL(); };
    }
    if (yearSel) {
        const now = new Date().getFullYear();
        yearSel.innerHTML = '<option value="">Semua Tahun</option>';
        for (let y = now; y >= 1950; y--) yearSel.innerHTML += `<option value="${y}">${y}</option>`;
        if (urlYear) { yearSel.value = urlYear; currentYear = urlYear; }
        yearSel.onchange = () => { currentYear = yearSel.value; currentPage=1; loadTvShows(); updateURL(); };
    }
    if (sortSel) {
        if (urlSort) { sortSel.value = urlSort; currentSort = urlSort; }
        sortSel.onchange = () => { currentSort = sortSel.value; currentPage=1; loadTvShows(); updateURL(); };
    }
    if (networkSel) {
        networkSel.innerHTML = '<option value="">Semua Network</option>';
        NETWORKS.forEach(n => { networkSel.innerHTML += `<option value="${n.id}">${n.name}</option>`; });
        if (urlNetwork) { networkSel.value = urlNetwork; currentNetwork = urlNetwork; }
        networkSel.onchange = () => { currentNetwork = networkSel.value; currentPage=1; loadTvShows(); updateURL(); };
    }
    if (countrySel) {
        if (urlCountry) currentCountry = urlCountry;
        countrySel.onchange = () => { currentCountry = countrySel.value; currentPage=1; loadTvShows(); updateURL(); };
        loadCountries(countrySel, urlCountry).then(() => { if (urlCountry) currentCountry = countrySel.value; });
        loadTvShows();
    } else {
        loadTvShows();
    }
}

// GENRE PAGE
function initGenrePage() {
    const grid = el('#genreGrid');
    if (!grid) return;

    let activeType = 'movie';
    let activeGenre = null;

    function renderGenreCards(type) {
        grid.innerHTML = '';
        const genres = type === 'movie' ? MOVIE_GENRES : TV_GENRES;
        genres.forEach((g, i) => {
            const card = document.createElement('div');
            card.className = 'genre-card';
            card.style.background = '';
            card.innerHTML = `<span class="genre-name">${g.name}</span>`;
            card.onclick = () => {
                const base = type === 'tv' ? 'tv.html' : 'movies.html';
                window.location.href = `${base}?genre=${g.id}`;
            };
            grid.appendChild(card);
        });
    }

    all('.genre-type-btn').forEach(btn => {
        btn.onclick = () => {
            activeType = btn.dataset.type;
            all('.genre-type-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            el('#genreResults')?.classList.add('hidden');
            if (el('#genreResults')) el('#genreResults').style.display = 'none';
            el('#genreGrid')?.classList.remove('hidden');
            currentGenreId = null;
            currentGenreName = '';
            updateURL();
            renderGenreCards(activeType);
        };
    });

    // Populate year filter
    const yearSel = el('#yearFilter');
    if (yearSel) {
        const now = new Date().getFullYear();
        for (let y = now; y >= 1950; y--) yearSel.innerHTML += `<option value="${y}">${y}</option>`;
        yearSel.onchange = () => {
            currentYear = yearSel.value;
            if(activeGenre) loadGenreResults(activeType, activeGenre.id, activeGenre.name, 1);
            updateURL();
        };
    }

    const sortSel = el('#sortFilter');
    if (sortSel) {
        sortSel.onchange = () => {
            currentSort = sortSel.value;
            if(activeGenre) loadGenreResults(activeType, activeGenre.id, activeGenre.name, 1);
            updateURL();
        };
    }

    renderGenreCards('movie');

    // Auto-load genre from URL params
    const urlP = getURLParams();
    if (urlP.genre) {
        let g = MOVIE_GENRES.find(x => x.id == urlP.genre);
        let mediaType = 'movie';
        if (!g) {
            g = TV_GENRES.find(x => x.id == urlP.genre);
            if (g) mediaType = 'tv';
        }
        if (g) {
            activeGenre = g;
            activeType = mediaType;
            currentGenreId = g.id;
            currentGenreName = g.name;
            currentSort = urlP.sort;
            currentYear = urlP.year;
            const yearSel = el('#yearFilter');
            if (yearSel && urlP.year) yearSel.value = urlP.year;
            const sortSel = el('#sortFilter');
            if (sortSel && urlP.sort) sortSel.value = urlP.sort;
            // Set active toggle
            all('.genre-type-btn').forEach(b => b.classList.remove('active'));
            const activeBtn = el(`.genre-type-btn[data-type="${mediaType}"]`);
            if (activeBtn) activeBtn.classList.add('active');
            loadGenreResults(mediaType, g.id, g.name, urlP.page);
        }
    }
}

async function loadGenreResults(type, genreId, genreName, page=1) {
    const section = el('#genreResults');
    const grid = el('#resultsGrid');
    const loading = el('#loading');
    if (!section||!grid) return;

    section.classList.remove('hidden');
    section.style.display = '';
    loading?.classList.remove('hidden');
    grid.innerHTML = '';
    if (el('#genreResultsTitle')) el('#genreResultsTitle').textContent = genreName;
    el('#genreGrid')?.classList.add('hidden');
    currentGenreId = genreId;
    currentGenreName = genreName;

    // Back to genre grid on back button click or tapping empty header
    const backBtn = el('#backToGenresBtn');
    if (backBtn) {
        backBtn.onclick = () => {
            section.classList.add('hidden');
            section.style.display = 'none';
            el('#genreGrid')?.classList.remove('hidden');
            el('#genreGrid')?.scrollIntoView({behavior:'smooth', block:'start'});
            currentGenreId = null;
            currentGenreName = '';
            updateURL();
        };
    }

    const yearSel = el('#yearFilter');
    const sortSel = el('#sortFilter');
    const params = { page, sort_by: sortSel?.value||'popularity.desc', with_genres: genreId };
    const yv = yearSel?.value;
    if (yv) {
        if(type==='movie') {
            params['primary_release_date.gte'] = `${yv}-01-01`;
            params['primary_release_date.lte'] = `${yv}-12-31`;
        } else {
            params['first_air_date.gte'] = `${yv}-01-01`;
            params['first_air_date.lte'] = `${yv}-12-31`;
        }
    }

    const data = await tmdb(`/discover/${type}`, params);
    loading?.classList.add('hidden');
    if (!data?.results) return;

    data.results.forEach(i => grid.appendChild(createCard(i, type)));
        fillGrid(grid);
    renderPagination('resultsPagination', Math.min(data.total_pages, 500), page, p => {
        loadGenreResults(type, genreId, genreName, p);
        window.scrollTo({top: section.offsetTop - 80, behavior: 'smooth'});
    });
}



// SEARCH
async function doSearch(query, page=1) {
    const data = await tmdb('/search/multi', { query, page });
    if (!data) return;

    // On home page: hide sections, show search
    const homeSections = ['trending','popularMovies','popularTv','topRated','nowPlaying','hero','indoMovies','indoSeries','genrePills'];
    homeSections.forEach(id => {
        const sec = el(`#${id}`);
        if (sec) sec.classList.add('hidden');
    });
    // On movies/tv pages: hide filters and grid (not page-content — search results inside it)
    document.querySelectorAll('#movieGrid, #tvGrid, #moviePagination, #tvPagination, .filters, .page-title').forEach(s => {
        if (s) s.classList.add('hidden');
    });

    let section = el('#searchResults');
    if (!section) {
        const base = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        window.location.href = `${base}?q=${encodeURIComponent(query)}`;
        return;
    }
    section.classList.remove('hidden');
    if (el('#searchTitle')) el('#searchTitle').textContent = `Hasil: "${query}" (${data.total_results})`;
    // Update section title with count
    const st = el('.page-title');
    if (st && data.total_results > 0) {
        let c = st.querySelector('.count-badge');
        if (!c) { c = document.createElement('span'); c.className = 'count-badge'; st.appendChild(c); }
        c.textContent = data.total_results > 999 ? '999+' : data.total_results;
    }
    // Update URL so search persists on refresh
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    window.history.replaceState(null, '', url);
    const grid = el('#searchGrid');
    grid.innerHTML = '';
    const data2 = data.total_pages > 1 ? await tmdb('/search/multi', { query, page: page+1 }) : {results:[]};
    const items = [...data.results, ...data2.results]
        .filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i)
        .filter(i => ['movie','tv'].includes(i.media_type))
        .slice(0,21);
    
    if (items.length === 0) {
        grid.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><p>Film tidak ditemukan untuk "${query}"</p></div>';
    } else {
        items.forEach(i => grid.appendChild(createCard(i, i.media_type)));
    }
    renderPagination('searchPagination', Math.ceil(Math.min(data.total_pages, 20) / 2), page, p => doSearch(query, p));
}

// RENDER WATCHLIST
function renderWatchlist() {
    const section = el('#watchlistSection');
    if (!section) return;
    // Hide homepage sections
    ['hero','trending','popularMovies','popularTv','topRated','nowPlaying','indoMovies','indoSeries','genrePills'].forEach(id => {
        const sec = el(`#${id}`);
        if (sec) sec.classList.add('hidden');
    });
    section.classList.remove('hidden');
    const grid = el('#watchlistGrid');
    const empty = el('#watchlistEmpty');
    const list = getWatchlist();
    if (list.length === 0) {
        grid.innerHTML = '';
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';
    grid.innerHTML = '';
    list.forEach(item => {
        // Create card from saved data (use TMDB image URL)
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `<img class="card-poster" src="https://image.tmdb.org/t/p/w500${item.poster}" alt="${item.title}" loading="lazy" onerror="this.src='${NO_POSTER}'">
            <div class="card-info"><div class="card-title">${item.title}</div><div class="card-meta"><span>${item.year}</span><span class="card-rating">★ ${rating(item.rating)}</span></div></div>
        `;
        div.onclick = () => { window.location.href = `detail.html?id=${item.id}&type=${item.type}`; };
        // Heart to remove
        const heart = document.createElement('div');
        heart.className = 'card-heart active';
        heart.onclick = (e) => {
            e.stopPropagation();
            toggleWatchlist(item, item.type);
            renderWatchlist();
        };
        div.appendChild(heart);
        grid.appendChild(div);
    });
}

function hideSearch() {
    ['trending','popularMovies','popularTv','topRated','nowPlaying','hero','indoMovies','indoSeries','genrePills'].forEach(id => {
        const sec = el(`#${id}`);
        if (sec) sec.classList.remove('hidden');
    });
    document.querySelectorAll('#movieGrid, #tvGrid, #moviePagination, #tvPagination, .filters, .page-title').forEach(s => {
        if (s) s.classList.remove('hidden');
    });
    el('#searchResults')?.classList.add('hidden');
    // Clear search param from URL
    const url = new URL(window.location);
    url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
}

// NAV DROPDOWNS
function initNavDropdowns() {
    const genreDD = el('#genreDropdown');
    const countryDD = el('#countryDropdown');
    const yearDD = el('#yearDropdown');
    if (genreDD) {
        let html = '<a href="movies.html">Semua Genre</a>';
        MOVIE_GENRES.forEach(g => { html += '<a href="movies.html?genre='+g.id+'">'+g.name+'</a>'; });
        genreDD.innerHTML = html;
    }
    if (countryDD) {
        const countries = ['AE','AU','BR','CA','CN','DE','DK','ES','FI','FR','GB','HK','ID','IN','IT','JP','KR','MX','MY','NL','NO','PH','RU','SA','SE','SG','TH','TR','US'];
        const names = {'ID':'Indonesia','US':'Amerika Serikat','GB':'Inggris','JP':'Jepang','KR':'Korea','IN':'India','FR':'Perancis','DE':'Jerman','CN':'China','HK':'Hong Kong','MY':'Malaysia','SG':'Singapura','TH':'Thailand','PH':'Filipina','AU':'Australia','CA':'Kanada','MX':'Meksiko','BR':'Brazil','RU':'Rusia','ES':'Spanyol','IT':'Italia','NL':'Belanda','SE':'Swedia','NO':'Norwegia','DK':'Denmark','FI':'Finlandia','TR':'Turki','AE':'UEA','SA':'Arab Saudi'};
        let h = '<a href="movies.html">Semua Negara</a>';
        countries.forEach(c => { h += '<a href="movies.html?country='+c+'">'+(names[c]||c)+'</a>'; });
        countryDD.innerHTML = h;
    }
    if (yearDD) {
        const now = new Date().getFullYear();
        let h = '<a href="movies.html">Semua Tahun</a>';
        for (let y = now; y >= 1950; y--) h += '<a href="movies.html?year='+y+'">'+y+'</a>';
        yearDD.innerHTML = h;
    }
    // Dropdown toggle (click for all sizes)
    document.querySelectorAll('.nav-dropdown-trigger').forEach(trigger => {
        trigger.onclick = (e) => {
            e.preventDefault();
            const dd = trigger.parentElement.querySelector('.dropdown-menu');
            if (!dd) return;
            const isOpen = dd.classList.contains('show');
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
            if (!isOpen) dd.classList.add('show');
        };
    });
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
        }
    });
    // Close dropdown when clicking any link inside it
    document.querySelectorAll('.dropdown-menu a').forEach(a => {
        a.addEventListener('click', () => {
            a.closest('.dropdown-menu').classList.remove('show');
        });
    });
    // Trending filter clicks
    document.querySelectorAll('.trending-filter').forEach(btn => {
        btn.onclick = () => loadTrending(btn.dataset.filter);
    });
    // Init genre pills
    initGenrePills();
}

// GENRE PILLS
function initGenrePills() {
    const pills = el('#genrePills');
    if (!pills) return;
    const genres = ['Action','Comedy','Drama','Horror','Sci-Fi','Romance','Crime','Thriller','Animation','Documentary'];
    pills.innerHTML = genres.map(g => `<span class="pill" data-genre="${g}">${g}</span>`).join('');
    pills.querySelectorAll('.pill').forEach(p => {
        p.onclick = () => { window.location.href = `movies.html?genre=${MOVIE_GENRES.find(x=>x.name===p.dataset.genre)?.id||''}`; };
    });
}

// SCROLL EVENTS (back to top + progress)
function initScrollEvents() {
    const btn = el('#backTop');
    const prog = el('#scrollProgress');
    if (!btn && !prog) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scroll = window.scrollY;
                const max = document.documentElement.scrollHeight - window.innerHeight;
                if (prog) prog.style.width = `${(scroll / max) * 100}%`;
                if (btn) btn.classList.toggle('show', scroll > 300);
                document.querySelector('.navbar')?.classList.toggle('scrolled', scroll > 50);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
    btn?.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
}

// KEYBOARD SHORTCUTS
function initKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close all modals
            document.querySelectorAll('.modal, .player-modal').forEach(m => {
                if (!m.classList.contains('hidden')) {
                    m.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            });
            // Close trailer if active via click (triggers close handler)
            const hero = document.getElementById('detailHero');
            if (hero && hero.classList.contains('trailer-active')) {
                document.getElementById('detailTrailerBtn')?.click();
            }
            const mt = document.getElementById('modalTrailerBtn');
            if (mt) { mt.querySelector('.t-il').textContent = ''; mt.querySelector('.t-il').style.opacity = '0'; mt.querySelector('.t-txt').textContent = 'Trailer'; mt.querySelector('.t-ir').style.opacity = '1'; mt.onclick = null; }
            // Close episode sheet
            const epSheet = document.getElementById('episodeSheet');
            if (epSheet && !epSheet.classList.contains('hidden')) {
                epSheet.classList.add('hidden');
                e.preventDefault();
                return;
            }
            // Show back button
            const backBtn = document.getElementById('detailBackBtn');
            if (backBtn) backBtn.style.display = '';
        }
    });
}

// GLOBAL EVENTS
function initGlobalEvents() {
    initNavDropdowns();
    initScrollEvents();
    initKeyboard();
    // Set active nav link based on current page
    const curPage = window.location.pathname.split('/').pop() || 'index.html';
    const hasWatchlist = window.location.search.includes('watchlist');
    document.querySelectorAll('.nav-links a[href], .mobile-menu a[href]').forEach(a => {
        a.classList.remove('active');
        const href = a.getAttribute('href') || '';
        const dataNav = a.getAttribute('data-nav');
        if (href === './' && (curPage === 'index.html' || curPage === '') && !hasWatchlist) a.classList.add('active');
        else if (href && href.includes('watchlist') && hasWatchlist) a.classList.add('active');
        else if (dataNav === 'country' || dataNav === 'tahun') {} // handled below
        else if (href && href !== './' && href !== '#' && !href.includes('?') && href === curPage) a.classList.add('active');
    });
    // Search
    const searchInput = el('#searchInput');
    const searchBtn = el('#searchBtn');
    if (searchBtn) searchBtn.onclick = () => { const q=searchInput?.value.trim(); if(q) doSearch(q); };
    if (searchInput) searchInput.onkeydown = e => { if(e.key==='Enter'){const q=searchInput.value.trim();if(q)doSearch(q);} };

    // Mobile menu
    const menuBtn = el('#mobileMenuBtn');
    const mobileMenu = el('#mobileMenu');
    if (menuBtn && mobileMenu) {
        function toggleMenu(force) {
            const open = force !== undefined ? force : !mobileMenu.classList.contains('open');
            mobileMenu.classList.toggle('open', open);
            document.body.style.overflow = open ? 'hidden' : '';
        }
        menuBtn.onclick = (e) => { e.stopPropagation(); toggleMenu(); };
        // Country/Tahun inline expandable lists in mobile menu
        const mobExpandData = {
            country: {label:'Country', items:[
                ['','Semua Negara'],['ID','🇮🇩 Indonesia'],['US','🇺🇸 Amerika'],['JP','🇯🇵 Jepang'],['KR','🇰🇷 Korea'],['CN','🇨🇳 China'],
                ['IN','🇮🇳 India'],['GB','🇬🇧 Inggris'],['FR','🇫🇷 Perancis'],['DE','🇩🇪 Jerman'],['TH','🇹🇭 Thailand'],
                ['MY','🇲🇾 Malaysia'],['SG','🇸🇬 Singapura'],['PH','🇵🇭 Filpina'],['HK','🇭🇰 Hong Kong'],['AU','🇦🇺 Australia'],
                ['CA','🇨🇦 Kanada'],['BR','🇧🇷 Brazil'],['MX','🇲🇽 Meksiko'],['RU','🇷🇺 Rusia'],['ES','🇪🇸 Spanyol'],['IT','🇮🇹 Italia'],
                ['NL','🇳🇱 Belanda'],['SE','🇸🇪 Swedia'],['TR','🇹🇷 Turki'],['AE','🇦🇪 UEA'],['SA','🇸🇦 Arab Saudi']
            ]},
            tahun: {label:'Tahun', items: (function(){let a=[['','Semua Tahun']];for(let y=new Date().getFullYear();y>=1970;y--)a.push([y+'',y+'']);return a;})()}
        };
        // Inject sub-list CSS once
        if (!document.querySelector('#mob-sub-css')) {
            const css = document.createElement('style');
            css.id = 'mob-sub-css';
            css.textContent = `.mob-sub-list{padding:0 20px;overflow:hidden;transition:max-height .35s ease,opacity .25s ease}.mob-sub-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 0 16px;max-height:50vh;overflow-y:auto;-webkit-overflow-scrolling:touch}.mob-sub-grid a{display:flex;align-items:center;justify-content:center;padding:10px 6px;border-radius:10px;font-size:.8rem;font-weight:500;color:var(--text2);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.04);text-decoration:none;transition:all .15s ease;min-height:42px}.mob-sub-grid a:active{transform:scale(.95);background:rgba(249,115,22,.15);border-color:rgba(249,115,22,.3);color:var(--accent)}.mob-sub-grid a.mob-active{background:rgba(249,115,22,.12);border-color:rgba(249,115,22,.25);color:var(--accent);font-weight:600}.mob-sub-label{font-size:.7rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;padding:8px 0 2px}`;
            document.head.appendChild(css);
        }
        mobileMenu.querySelectorAll('a[data-nav]').forEach(a => {
            const nav = a.getAttribute('data-nav');
            if (mobExpandData[nav] && !a.dataset.mobInit) {
                a.dataset.mobInit = '1';
                a.style.cssText += 'display:flex;align-items:center;justify-content:space-between;';
                a.innerHTML += '<span class="mob-arrow" style="font-size:.7rem;color:var(--text3);transition:transform .2s">▾</span>';
                a.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const arrow = a.querySelector('span');
                    // Toggle inline list
                    let sub = a.nextElementSibling;
                    if (sub && sub.classList.contains('mob-sub-list')) {
                        sub.style.maxHeight = '0';
                        sub.style.opacity = '0';
                        if (arrow) arrow.style.transform = '';
                        a.style.color = '';
                        setTimeout(() => sub.remove(), 300);
                        return;
                    }
                    // Close any other open sub-lists
                    mobileMenu.querySelectorAll('.mob-sub-list').forEach(s => { s.style.maxHeight='0'; s.style.opacity='0'; setTimeout(()=>s.remove(),300); });
                    mobileMenu.querySelectorAll('a[data-nav]').forEach(x => { x.style.color = ''; const sp=x.querySelector('span'); if(sp) sp.style.transform=''; });
                    a.style.color = 'var(--accent)';
                    if (arrow) arrow.style.transform = 'rotate(180deg)';
                    sub = document.createElement('div');
                    sub.className = 'mob-sub-list';
                    sub.style.maxHeight = '0';
                    sub.style.opacity = '0';
                    const label = document.createElement('div');
                    label.className = 'mob-sub-label';
                    label.textContent = mobExpandData[nav].label;
                    const grid = document.createElement('div');
                    grid.className = 'mob-sub-grid';
                    const basePage = nav === 'country' ? 'movies.html?country=' : 'movies.html?year=';
                    mobExpandData[nav].items.forEach(([val,label]) => {
                        const btn = document.createElement('a');
                        btn.textContent = label;
                        btn.href = val ? basePage+val : 'movies.html';
                        grid.appendChild(btn);
                    });
                    sub.appendChild(label);
                    sub.appendChild(grid);
                    a.after(sub);
                    // Trigger animation
                    requestAnimationFrame(() => { sub.style.maxHeight = '70vh'; sub.style.opacity = '1'; });
                };
            }
        });
        mobileMenu.querySelectorAll('a').forEach(a => {
            if (!a.getAttribute('data-nav')) {
                a.onclick = () => toggleMenu(false);
            }
        });
    }

    // Mobile search
    const mobSearchBtn = el('#mobileSearchBtn');
    const mobSearchInput = el('#mobileSearchInput');
    const doMobSearch = () => { const q = mobSearchInput?.value.trim(); if (q) { mobileMenu?.classList.remove('open'); doSearch(q); } };
    if (mobSearchBtn) mobSearchBtn.onclick = doMobSearch;
    if (mobSearchInput) mobSearchInput.onkeydown = e => { if (e.key === 'Enter') doMobSearch(); };

    // Close modals
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
        el.onclick = closeAllModals;
    });
    document.querySelectorAll('.player-close, .player-backdrop').forEach(el => {
        el.onclick = closeAllModals;
    });
    document.onkeydown = e => { if(e.key==='Escape') closeAllModals(); };
}

// DETAIL PAGE (for detail.html)
async function loadDetailPage(id, type) {
    const loading = document.getElementById('detailLoading');
    const page = document.getElementById('detailPage');
    if (!page) return;

    const [detail, credits, similar, videosData] = await Promise.all([
        tmdb(`/${type}/${id}`),
        tmdb(`/${type}/${id}/credits`),
        tmdb(`/${type}/${id}/similar`),
        tmdb(`/${type}/${id}/videos`)
    ]);

    if (!detail) {
        loading.textContent = 'Gagal memuat detail. Coba lagi.';
        return;
    }

    loading?.classList.add('hidden');
    page.classList.remove('hidden');

    const title = displayTitle(detail);
    const date = detail.release_date || detail.first_air_date;
    const runtime = detail.runtime || (detail.episode_run_time?.[0]) || 0;
    const genres = detail.genres?.map(g => g.name).join(', ') || '';

    document.title = `${title} - BerMovie`;

    // Store for subtitle search
    currentImdbId = detail.imdb_id || '';
    currentTmdbId = id;

    document.getElementById('detailHero').style.backgroundImage = `url(${backdropUrl(detail.backdrop_path)})`;
    document.getElementById('detailTitle').textContent = title;
    document.getElementById('detailMeta').innerHTML = `
        <span class="detail-rating">★ ${rating(detail.vote_average)}</span>
        <span>${year(date)}</span>
        <span>${type === 'movie' ? 'Film' : 'Series'}</span>
        ${detail.number_of_seasons ? `<span>${detail.number_of_seasons} Season</span>` : ''}
        ${detail.runtime ? `<span>${detail.runtime} min</span>` : detail.episode_run_time?.[0] ? `<span>${detail.episode_run_time[0]} min</span>` : ''}
        ${detail.genres?.map(g => g.name).join(', ')}
    `;
    document.getElementById('detailOverview').textContent = detail.overview || 'No description available.';

    const castEl = document.getElementById('detailCast');
    castEl.innerHTML = '';
    credits?.cast?.slice(0, 10).forEach(c => {
        castEl.innerHTML += `<div class="detail-cast-item"><img src="${c.profile_path ? IMG_CAST + c.profile_path : NO_POSTER}" alt="${c.name}" onerror="this.src='${NO_POSTER}'"><p>${c.name}</p></div>`;
    });

    document.getElementById('detailWatchBtn').onclick = () => openPlayer(id, type, title);
    // Watchlist button
    const wlBtn = document.getElementById('detailWatchlistBtn');
    if (wlBtn) {
        const wl = getWatchlist();
        if (wl.some(w => w.id === id)) wlBtn.classList.add('active'), wlBtn.textContent = '✓ Watchlist';
        wlBtn.onclick = () => {
            const wl2 = getWatchlist();
            if (wl2.some(w => w.id === id)) {
                setWatchlist(wl2.filter(w => w.id !== id));
                wlBtn.classList.remove('active');
                wlBtn.textContent = '+ Watchlist';
            } else {
                wl2.push({ id, type, title, poster_path, vote_average });
                setWatchlist(wl2);
                wlBtn.classList.add('active');
                wlBtn.textContent = '✓ Watchlist';
            }
        };
    }
    // Inline trailer embed
    const tr = videosData?.results?.find(v => v.type==='Trailer'&&v.site=='YouTube');
    const trailerSection = document.getElementById('trailerSection');
    const trailerEmbed = document.getElementById('trailerEmbed');
    const openTrailer = () => {
        if (!tr) { alert('Trailer tidak tersedia'); return; }
        if (!trailerEmbed.querySelector('iframe')) {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${tr.key}?autoplay=0&rel=0`;
            iframe.setAttribute('allow', 'autoplay; fullscreen');
            iframe.setAttribute('allowfullscreen', 'true');
            trailerEmbed.appendChild(iframe);
        }
        trailerSection.classList.remove('hidden');
        trailerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const dtb = document.getElementById('detailTrailerBtn');
        dtb.querySelector('.t-txt').textContent = 'Tutup Trailer';
        dtb.onclick = () => {
            trailerSection.classList.add('hidden');
            dtb.querySelector('.t-txt').textContent = 'Trailer';
            dtb.onclick = openTrailer;
        };
    };
    if (tr) document.getElementById('detailTrailerBtn').onclick = openTrailer;

    // Seasons (TV)
    const seasonsSection = document.getElementById('detailSeasons');
    if (type === 'tv' && detail.seasons?.length) {
        seasonsSection.classList.remove('hidden');
        const list = document.getElementById('detailSeasonsList');
        list.innerHTML = '';
        detail.seasons.filter(s => s.season_number > 0).forEach(s => {
            const card = document.createElement('div');
            card.className = 'season-card';
            card.innerHTML = `${s.poster_path ? `<img src="${IMG_POSTER}${s.poster_path}" alt="">` : ''}<div class="info"><strong>Season ${s.season_number}</strong><small>${s.episode_count} Episode</small></div>`;
            card.onclick = () => openPlayer(id, type, title, s.season_number, 1);
            list.appendChild(card);
        });
    } else {
        seasonsSection?.classList.add('hidden');
    }

    // Similar
    const sim = document.getElementById('detailSimilar');
    sim.innerHTML = '';
    similar?.results?.slice(0, 10).forEach(i => {
        const c = createCard(i, type);
        // Card click already navigates via createCard's onclick
        sim.appendChild(c);
    });
}

// === FUTURISTIC JS ENHANCEMENTS ===

// 1. Navbar compact on scroll
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    nav.classList.toggle('compact', window.scrollY > 80);
}, { passive: true });

// 2. Card 3D tilt
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--mx', `${(e.clientX - rect.left) / rect.width * 100}%`);
        card.style.setProperty('--my', `${(e.clientY - rect.top) / rect.height * 100}%`);
        card.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0px)';
    });
});

// 3. Scroll animations (IntersectionObserver)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

function observeScroll() {
    document.querySelectorAll('.section, .genre-grid, .trending-list, .grid, .genre-card, .trending-card').forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
}

// Run observer after initial load
if (document.readyState === 'complete') {
    observeScroll();
} else {
    window.addEventListener('load', observeScroll);
}

// 4. Detail page hero reveal
function initDetailHeroReveal() {
    const hero = document.querySelector('.detail-hero');
    if (hero) setTimeout(() => hero.classList.add('reveal'), 100);
}
document.addEventListener('DOMContentLoaded', initDetailHeroReveal);


document.addEventListener('DOMContentLoaded', () => {
    initGlobalEvents();

    const path = window.location.pathname;

    // Check for search query in URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchQ = urlParams.get('q');
    if (searchQ && el('#searchInput')) {
        el('#searchInput').value = searchQ;
        // Will init home page, then trigger search
    }

    if (path.includes('movies.html')) {
        if (window._moviesInit) return; window._moviesInit = 1;
        initMoviesPage();
    } else if (path.includes('tv.html')) {
        if (window._tvInit) return; window._tvInit = 1;
        initTvPage();
    } else if (path.includes('genre.html')) {
        initGenrePage();
    } else {
        initHomePage();
        if (searchQ) doSearch(searchQ);
    }
});

// Direct init fallback (if DOMContentLoaded already fired)
const p = window.location.pathname;
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (p.includes('movies.html') && !window._moviesInit) { window._moviesInit = 1; initMoviesPage(); }
    else if (p.includes('tv.html') && !window._tvInit) { window._tvInit = 1; initTvPage(); }
    else if (p.includes('genre.html') && !window._genreInit) { window._genreInit = 1; initGenrePage(); }
    else if (!p.includes('detail.html') && !window._homeInit) { window._homeInit = 1; initHomePage(); }
}
// Ultimate fallback
setTimeout(() => {
    if (p.includes('movies.html') && !window._moviesInit) { window._moviesInit = 1; initMoviesPage(); }
    else if (p.includes('tv.html') && !window._tvInit) { window._tvInit = 1; initTvPage(); }
    else if (p.includes('genre.html') && !window._genreInit) { window._genreInit = 1; initGenrePage(); }
    else if (!p.includes('detail.html') && !window._homeInit && document.getElementById('hero')?.children.length === 0) { window._homeInit = 1; initHomePage(); }
}, 100);
