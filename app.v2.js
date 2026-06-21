// ===== CONFIG =====
const TMDB_KEY = '245f8c4922de78b5017c149fbfa89ab5';
const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';
const IMG_POSTER = `${IMG}/w500`;
const IMG_BACKDROP = `${IMG}/original`;
const IMG_CAST = `${IMG}/w185`;
const NO_POSTER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" fill="%231a1a2e"><rect width="500" height="750"/><text x="250" y="375" text-anchor="middle" fill="%23666" font-size="24">No Poster</text></svg>');
const VIDSRV = 'https://vidsrcme.ru/embed';
const EMBED2 = 'https://www.2embed.cc/embed';

// ===== STATE =====
let currentTab = 'movies';
let searchPage = 1;
let searchTotal = 1;
let searchQuery = '';

// ===== API =====
async function tmdb(path, params = {}) {
    const url = new URL(`${TMDB}${path}`);
    url.searchParams.set('api_key', TMDB_KEY);
    url.searchParams.set('language', 'id-ID');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        return await res.json();
    } catch (e) {
        console.error('TMDB error:', e);
        return null;
    }
}

// ===== UTILS =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const posterUrl = p => p ? `${IMG_POSTER}${p}` : NO_POSTER;
const backdropUrl = p => p ? `${IMG_BACKDROP}${p}` : '';
const year = d => d ? d.substring(0, 4) : 'N/A';
const rating = r => r ? r.toFixed(1) : '0.0';
const truncate = (s, n) => s && s.length > n ? s.slice(0, n) + '...' : s;

function createCard(item, type) {
    const mediaType = type || item.media_type || 'movie';
    const title = item.title || item.name || 'Untitled';
    const date = item.release_date || item.first_air_date;
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
        <img class="card-poster" src="${posterUrl(item.poster_path)}" alt="${title}" loading="lazy" onerror="this.src='${NO_POSTER}'">
        ${item.vote_average >= 8 ? '<span class="card-badge">⭐ Top</span>' : ''}
        <div class="card-info">
            <div class="card-title" title="${title}">${title}</div>
            <div class="card-meta">
                <span>${year(date)}</span>
                <span class="card-rating">★ ${rating(item.vote_average)}</span>
            </div>
        </div>
    `;
    div.onclick = () => openDetail(item.id, mediaType);
    return div;
}

// ===== HERO =====
async function loadHero() {
    const data = await tmdb('/trending/all/day');
    if (!data?.results?.length) return;
    // Pick a random top-5 item with backdrop
    const items = data.results.filter(i => i.backdrop_path).slice(0, 10);
    const item = items[Math.floor(Math.random() * items.length)];
    const type = item.media_type || 'movie';
    const title = item.title || item.name;
    const date = item.release_date || item.first_air_date;

    $('#hero').style.backgroundImage = `url(${backdropUrl(item.backdrop_path)})`;
    $('#heroTitle').textContent = title;
    $('#heroOverview').textContent = truncate(item.overview, 200);
    $('#heroMeta').innerHTML = `
        <span class="rating">★ ${rating(item.vote_average)}</span>
        <span>${year(date)}</span>
        <span>${type === 'movie' ? '🎬 Film' : '📺 Series'}</span>
    `;
    $('#heroBtn').onclick = () => openDetail(item.id, type);
}

// ===== CAROUSELS =====
async function loadCarousel(path, containerId, type) {
    const data = await tmdb(path);
    const container = $(`#${containerId}`);
    if (!data?.results) { container.innerHTML = '<p style="color:var(--text-muted)">Gagal memuat</p>'; return; }
    container.innerHTML = '';
    data.results.forEach(item => container.appendChild(createCard(item, type)));
}

// ===== SEARCH =====
async function doSearch(query, page = 1) {
    searchQuery = query;
    searchPage = page;
    const data = await tmdb('/search/multi', { query, page });
    if (!data) return;
    searchTotal = data.total_pages;
    // Hide sections, show search
    ['trending', 'popularMovies', 'popularTv', 'topRated', 'hero'].forEach(id => {
        const el = $(`#${id}`);
        if (el) el.classList.add('hidden');
    });
    const section = $('#searchResults');
    section.classList.remove('hidden');
    $('#searchTitle').textContent = `Hasil: "${query}" (${data.total_results} hasil)`;
    const grid = $('#searchGrid');
    grid.innerHTML = '';
    data.results.filter(i => ['movie', 'tv'].includes(i.media_type)).forEach(item => {
        grid.appendChild(createCard(item, item.media_type));
    });
    // Pagination
    const pag = $('#searchPagination');
    pag.innerHTML = '';
    if (searchTotal > 1) {
        for (let i = Math.max(1, page - 2); i <= Math.min(searchTotal, page + 2); i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            if (i === page) btn.classList.add('active');
            btn.onclick = () => { doSearch(query, i); window.scrollTo({ top: 0, behavior: 'smooth' }); };
            pag.appendChild(btn);
        }
    }
}

function hideSearch() {
    ['trending', 'popularMovies', 'popularTv', 'topRated', 'hero'].forEach(id => {
        const el = $(`#${id}`);
        if (el) el.classList.remove('hidden');
    });
    $('#searchResults').classList.add('hidden');
}

// ===== DETAIL MODAL =====
async function openDetail(id, type = 'movie') {
    const modal = $('#detailModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // Load data
    const [detail, credits, similar] = await Promise.all([
        tmdb(`/${type}/${id}`),
        tmdb(`/${type}/${id}/credits`),
        tmdb(`/${type}/${id}/similar`)
    ]);
    if (!detail) { modal.classList.add('hidden'); return; }

    const title = detail.title || detail.name;
    const date = detail.release_date || detail.first_air_date;
    const runtime = detail.runtime || (detail.episode_run_time && detail.episode_run_time[0]) || 0;
    const genres = detail.genres?.map(g => g.name).join(', ') || '';

    $('#modalHero').style.backgroundImage = `url(${backdropUrl(detail.backdrop_path)})`;
    $('#modalTitle').textContent = title;
    $('#modalMeta').innerHTML = `
        <span class="rating">★ ${rating(detail.vote_average)}</span>
        <span>${year(date)}</span>
        ${runtime ? `<span>⏱ ${runtime} min</span>` : ''}
        <span>${type === 'movie' ? '🎬 Film' : '📺 Series'}</span>
        ${genres ? `<span>${genres}</span>` : ''}
    `;
    $('#modalOverview').textContent = detail.overview || 'Tidak ada deskripsi.';

    // Cast
    const castEl = $('#modalCast');
    castEl.innerHTML = '';
    credits?.cast?.slice(0, 10).forEach(c => {
        castEl.innerHTML += `
            <div class="cast-member">
                <img src="${c.profile_path ? IMG_CAST + c.profile_path : NO_POSTER}" alt="${c.name}" onerror="this.src='${NO_POSTER}'">
                <p>${c.name}</p>
            </div>
        `;
    });

    // Buttons
    $('#modalWatchBtn').onclick = () => openPlayer(id, type, title);
    $('#modalTrailerBtn').onclick = () => {
        const trailer = detail.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        if (trailer) window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
        else alert('Trailer tidak tersedia');
    };

    // Seasons (TV only)
    const seasonsSection = $('#seasonsSection');
    if (type === 'tv' && detail.seasons?.length) {
        seasonsSection.classList.remove('hidden');
        const list = $('#seasonsList');
        list.innerHTML = '';
        detail.seasons.filter(s => s.season_number > 0).forEach(s => {
            const card = document.createElement('div');
            card.className = 'season-card';
            card.innerHTML = `
                ${s.poster_path ? `<img src="${IMG_POSTER}${s.poster_path}" alt="">` : ''}
                <div class="info">
                    <strong>Season ${s.season_number}</strong>
                    <small>${s.episode_count} Episode</small>
                </div>
            `;
            card.onclick = () => openPlayer(id, type, title, s.season_number, 1);
            list.appendChild(card);
        });
    } else {
        seasonsSection.classList.add('hidden');
    }

    // Similar
    const simContainer = $('#similarCarousel');
    simContainer.innerHTML = '';
    similar?.results?.slice(0, 10).forEach(item => simContainer.appendChild(createCard(item, type)));
}

// ===== PLAYER =====
let currentServer = 'vidsrc';

function getPlayerUrl(id, type, season, episode) {
    if (currentServer === 'vidsrc') {
        if (type === 'tv') return `${VIDSRV}/tv?tmdb=${id}&season=${season}&episode=${episode}`;
        return `${VIDSRV}/movie?tmdb=${id}`;
    } else {
        if (type === 'tv') return `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
        return `https://www.2embed.cc/embed/${id}`;
    }
}

async function openPlayer(id, type, title, season = 1, episode = 1) {
    const modal = $('#playerModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    $('#playerTitle').textContent = title;

    // Episode selector for TV
    const epSelector = $('#episodeSelector');
    if (type === 'tv') {
        epSelector.classList.remove('hidden');
        const tvData = await tmdb(`/tv/${id}`);
        const seasonSelect = $('#seasonSelect');
        seasonSelect.innerHTML = '';
        tvData?.seasons?.filter(s => s.season_number > 0).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.season_number;
            opt.textContent = `Season ${s.season_number}`;
            if (s.season_number === season) opt.selected = true;
            seasonSelect.appendChild(opt);
        });
        seasonSelect.onchange = () => loadEpisodes(id, parseInt(seasonSelect.value), type);
        loadEpisodes(id, season, type, episode);
    } else {
        epSelector.classList.add('hidden');
        $('#episodesGrid').innerHTML = '';
    }

    // Load player
    $('#playerFrame').src = getPlayerUrl(id, type, season, episode);

    // Server buttons
    $$('.server-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.server === currentServer);
        btn.onclick = () => {
            currentServer = btn.dataset.server;
            $$('.server-btn').forEach(b => b.classList.toggle('active', b === btn));
            const sel = type === 'tv' ? parseInt($('#seasonSelect').value) : 1;
            const activeEp = document.querySelector('.ep-btn.active');
            const ep = activeEp ? parseInt(activeEp.dataset.ep) : 1;
            $('#playerFrame').src = getPlayerUrl(id, type, sel, ep);
        };
    });
}

async function loadEpisodes(id, season, type, activeEp = 1) {
    const data = await tmdb(`/tv/${id}/season/${season}`);
    const grid = $('#episodesGrid');
    grid.innerHTML = '';
    data?.episodes?.forEach(ep => {
        const btn = document.createElement('button');
        btn.className = 'ep-btn' + (ep.episode_number === activeEp ? ' active' : '');
        btn.dataset.ep = ep.episode_number;
        btn.textContent = `E${ep.episode_number}`;
        btn.title = ep.name || `Episode ${ep.episode_number}`;
        btn.onclick = () => {
            $$('.ep-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $('#playerFrame').src = getPlayerUrl(id, type, season, ep.episode_number);
        };
        grid.appendChild(btn);
    });
}

// ===== EVENTS =====
function initEvents() {
    // Search
    const searchInput = $('#searchInput');
    const searchBtn = $('#searchBtn');
    searchBtn.onclick = () => {
        const q = searchInput.value.trim();
        if (q) doSearch(q);
    };
    searchInput.onkeydown = e => {
        if (e.key === 'Enter') {
            const q = searchInput.value.trim();
            if (q) doSearch(q);
        }
    };

    // Nav tabs
    $$('[data-tab]').forEach(a => {
        a.onclick = e => {
            e.preventDefault();
            $$('[data-tab]').forEach(x => x.classList.remove('active'));
            a.classList.add('active');
            hideSearch();
            if (a.dataset.tab === 'tv') {
                $('#popularMovies').classList.add('hidden');
                $('#popularTv').classList.remove('hidden');
            } else {
                $('#popularMovies').classList.remove('hidden');
                $('#popularTv').classList.add('hidden');
            }
        };
    });

    // Close modals
    const detailModal = $('#detailModal');
    const playerModal = $('#playerModal');

    detailModal.querySelector('.modal-close').onclick = () => {
        detailModal.classList.add('hidden');
        document.body.style.overflow = '';
    };
    detailModal.querySelector('.modal-backdrop').onclick = () => {
        detailModal.classList.add('hidden');
        document.body.style.overflow = '';
    };

    playerModal.querySelector('.player-close').onclick = () => {
        playerModal.classList.add('hidden');
        document.body.style.overflow = '';
        $('#playerFrame').src = '';
    };
    playerModal.querySelector('.player-backdrop').onclick = () => {
        playerModal.classList.add('hidden');
        document.body.style.overflow = '';
        $('#playerFrame').src = '';
    };

    // ESC key
    document.onkeydown = e => {
        if (e.key === 'Escape') {
            if (!playerModal.classList.contains('hidden')) {
                playerModal.classList.add('hidden');
                $('#playerFrame').src = '';
            } else if (!detailModal.classList.contains('hidden')) {
                detailModal.classList.add('hidden');
            }
            document.body.style.overflow = '';
        }
    };
}

// ===== INIT =====
async function init() {
    initEvents();
    await Promise.all([
        loadHero(),
        loadCarousel('/trending/all/day', 'trendingCarousel'),
        loadCarousel('/movie/popular', 'moviesCarousel', 'movie'),
        loadCarousel('/tv/popular', 'tvCarousel', 'tv'),
        loadCarousel('/movie/top_rated', 'topRatedCarousel', 'movie')
    ]);
}

document.addEventListener('DOMContentLoaded', init);
