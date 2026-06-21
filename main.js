// ===== CONFIG =====
const TMDB_KEY = '245f8c4922de78b5017c149fbfa89ab5';
const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';
const IMG_POSTER = `${IMG}/w500`;
const IMG_BACKDROP = `${IMG}/original`;
const IMG_CAST = `${IMG}/w185`;
const NO_POSTER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" fill="%231a1a2e"><rect width="500" height="750"/><text x="250" y="375" text-anchor="middle" fill="%23666" font-size="24">No Poster</text></svg>');
const VIDSRV = 'https://vidsrcme.ru/embed';

// ===== GENRES =====
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

// ===== STATE =====
let currentServer = 'vidsrc';
let currentPage = 1;
let currentMediaType = 'movie';
let currentGenreId = null;
let currentGenreName = '';
let currentSort = 'popularity.desc';
let currentYear = '';

// ===== UTILS =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const posterUrl = p => p ? `${IMG_POSTER}${p}` : NO_POSTER;
const backdropUrl = p => p ? `${IMG_BACKDROP}${p}` : '';
const year = d => d ? d.substring(0, 4) : 'N/A';
const rating = r => r ? r.toFixed(1) : '0.0';
const truncate = (s, n) => s && s.length > n ? s.slice(0, n) + '...' : s;

// ===== API =====
async function tmdb(path, params = {}) {
    const url = new URL(`${TMDB}${path}`);
    url.searchParams.set('api_key', TMDB_KEY);
    url.searchParams.set('language', 'id-ID');
    Object.entries(params).forEach(([k, v]) => { if(v) url.searchParams.set(k, v); });
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        return await res.json();
    } catch (e) { console.error('TMDB error:', e); return null; }
}

// ===== CARD =====
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
    div.onclick = () => {
        window.location.href = `detail.html?id=${item.id}&type=${mediaType}`;
    };
    return div;
}

// ===== DETAIL MODAL =====
async function openDetail(id, type = 'movie') {
    const modal = $('#detailModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const [detail, credits, similar] = await Promise.all([
        tmdb(`/${type}/${id}`),
        tmdb(`/${type}/${id}/credits`),
        tmdb(`/${type}/${id}/similar`)
    ]);
    if (!detail) { modal.classList.add('hidden'); return; }

    const title = detail.title || detail.name;
    const date = detail.release_date || detail.first_air_date;
    const runtime = detail.runtime || (detail.episode_run_time?.[0]) || 0;
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

    const castEl = $('#modalCast');
    castEl.innerHTML = '';
    credits?.cast?.slice(0, 10).forEach(c => {
        castEl.innerHTML += `<div class="cast-member"><img src="${c.profile_path ? IMG_CAST+c.profile_path : NO_POSTER}" alt="${c.name}" onerror="this.src='${NO_POSTER}'"><p>${c.name}</p></div>`;
    });

    const watchBtn = $('#modalWatchBtn');
    if (watchBtn) watchBtn.onclick = () => openPlayer(id, type, title);
    const trailerBtn = $('#modalTrailerBtn');
    if (trailerBtn) trailerBtn.onclick = () => {
        const tr = detail.videos?.results?.find(v => v.type==='Trailer'&&v.site==='YouTube');
        if(tr) window.open(`https://www.youtube.com/watch?v=${tr.key}`,'_blank');
        else alert('Trailer tidak tersedia');
    };

    const seasonsSection = $('#seasonsSection');
    if (type==='tv' && detail.seasons?.length && seasonsSection) {
        seasonsSection.classList.remove('hidden');
        const list = $('#seasonsList');
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

    const sim = $('#similarCarousel');
    if (sim) { sim.innerHTML = ''; similar?.results?.slice(0,10).forEach(i => sim.appendChild(createCard(i, type))); }
}

// ===== PLAYER =====
function getPlayerUrl(id, type, season, episode) {
    if (currentServer === 'vidsrc') {
        if (type === 'tv') return `${VIDSRV}/tv?tmdb=${id}&season=${season}&episode=${episode}`;
        return `${VIDSRV}/movie?tmdb=${id}`;
    } else {
        if (type === 'tv') return `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
        return `https://www.2embed.cc/embed/${id}`;
    }
}

async function openPlayer(id, type, title, season=1, episode=1) {
    const modal = $('#playerModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    $('#playerTitle').textContent = title;

    const epSelector = $('#episodeSelector');
    if (type==='tv' && epSelector) {
        epSelector.classList.remove('hidden');
        const tvData = await tmdb(`/tv/${id}`);
        const sel = $('#seasonSelect');
        sel.innerHTML = '';
        tvData?.seasons?.filter(s=>s.season_number>0).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.season_number;
            opt.textContent = `Season ${s.season_number}`;
            if(s.season_number===season) opt.selected=true;
            sel.appendChild(opt);
        });
        sel.onchange = () => loadEpisodes(id, parseInt(sel.value), type);
        loadEpisodes(id, season, type, episode);
    } else if (epSelector) {
        epSelector.classList.add('hidden');
    }

    $('#playerFrame').src = getPlayerUrl(id, type, season, episode);

    $$('.server-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.server===currentServer);
        btn.onclick = () => {
            currentServer = btn.dataset.server;
            $$('.server-btn').forEach(b=>b.classList.toggle('active', b===btn));
            const s = type==='tv'?parseInt($('#seasonSelect')?.value||1):1;
            const ae = document.querySelector('.ep-btn.active');
            const ep = ae?parseInt(ae.dataset.ep):1;
            $('#playerFrame').src = getPlayerUrl(id, type, s, ep);
        };
    });

    // Inject fullscreen button + info panel
    const fsBtn = document.getElementById('fullscreenBtn');
    if (!fsBtn) {
        const b = document.createElement('button');
        b.id = 'fullscreenBtn';
        b.className = 'fullscreen-btn';
        b.innerHTML = '⛶ Fullscreen';
        b.onclick = () => toggleFullscreenPlayer(id, type, title);
        $('#playerTitle').parentNode.appendChild(b);
    }
    const infoPanel = document.getElementById('playerInfoPanel');
    if (!infoPanel) {
        const el = document.createElement('div');
        el.id = 'playerInfoPanel';
        el.className = 'player-info-panel';
        el.style.display = 'none';
        el.innerHTML = `<div class="panel-header"><h4>${title}</h4><button class="panel-toggle">Sembunyikan</button></div><div class="panel-scroll"><p class="info-text">Memuat...</p></div>`;
        el.querySelector('.panel-toggle').onclick = () => { el.classList.toggle('collapsed'); el.querySelector('.panel-scroll').style.display = el.classList.contains('collapsed') ? 'none' : ''; };
        el.querySelector('.panel-toggle').textContent = 'Sembunyikan';
        $('.player-content').appendChild(el);
        // Fetch detail for info panel
        tmdb(`/${type}/${id}`).then(d => {
            if (d) {
                const txt = el.querySelector('.info-text');
                txt.innerHTML = (d.overview||'Tidak ada deskripsi.') + '<br><br><strong>Genre:</strong> ' + (d.genres?.map(g=>g.name).join(', ')||'-') + '<br><strong>Rating:</strong> ★ ' + d.vote_average?.toFixed(1)||'0.0';
            }
        });
    }
}

async function loadEpisodes(id, season, type, activeEp=1) {
    const data = await tmdb(`/tv/${id}/season/${season}`);
    const grid = $('#episodesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    data?.episodes?.forEach(ep => {
        const btn = document.createElement('button');
        btn.className = 'ep-btn'+(ep.episode_number===activeEp?' active':'');
        btn.dataset.ep = ep.episode_number;
        btn.textContent = `E${ep.episode_number}`;
        btn.title = ep.name||`Episode ${ep.episode_number}`;
        btn.onclick = () => {
            $$('.ep-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            $('#playerFrame').src = getPlayerUrl(id, type, season, ep.episode_number);
        };
        grid.appendChild(btn);
    });
}

function closeAllModals() {
    ['detailModal','playerModal'].forEach(id => {
        const m = $(`#${id}`);
        if (m) m.classList.add('hidden');
    });
    const f = $('#playerFrame');
    if (f) f.src = '';
    document.body.style.overflow = '';
    // Exit fullscreen
    const pc = $('.player-content');
    const modal = $('#playerModal');
    if (pc && pc.classList.contains('is-fullscreen')) {
        pc.classList.remove('is-fullscreen');
        if (modal) modal.classList.remove('is-fullscreen');
        const panel = $('#playerInfoPanel');
        if (panel) panel.style.display = 'none';
    }
}

// ===== PAGINATION =====
function renderPagination(containerId, total, current, callback) {
    const el = $(`#${containerId}`);
    if (!el) return;
    el.innerHTML = '';
    const maxShow = 5;
    let start = Math.max(1, current - Math.floor(maxShow/2));
    let end = Math.min(total, start + maxShow - 1);
    if(end - start < maxShow - 1) start = Math.max(1, end - maxShow + 1);

    if (current > 1) {
        const prev = document.createElement('button');
        prev.textContent = '←';
        prev.onclick = () => callback(current - 1);
        el.appendChild(prev);
    }
    for (let i = start; i <= end; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === current) btn.classList.add('active');
        btn.onclick = () => callback(i);
        el.appendChild(btn);
    }
    if (current < total) {
        const next = document.createElement('button');
        next.textContent = '→';
        next.onclick = () => callback(current + 1);
        el.appendChild(next);
    }
}

// ===== HOME PAGE =====
async function loadHero() {
    const data = await tmdb('/trending/all/day');
    if (!data?.results?.length) return;
    const items = data.results.filter(i=>i.backdrop_path).slice(0,10);
    const item = items[Math.floor(Math.random()*items.length)];
    const type = item.media_type||'movie';
    $('#hero').style.backgroundImage = `url(${backdropUrl(item.backdrop_path)})`;
    $('#heroTitle').textContent = item.title||item.name;
    $('#heroOverview').textContent = truncate(item.overview, 200);
    $('#heroMeta').innerHTML = `<span class="rating">★ ${rating(item.vote_average)}</span><span>${year(item.release_date||item.first_air_date)}</span><span>${type==='movie'?'🎬 Film':'📺 Series'}</span>`;
    $('#heroBtn').onclick = () => {
        window.location.href = `detail.html?id=${item.id}&type=${type}`;
    };
}

async function loadHomeCarousel(path, containerId, type) {
    const data = await tmdb(path);
    const c = $(`#${containerId}`);
    if (!c||!data?.results) return;
    c.innerHTML = '';
    data.results.forEach(i => c.appendChild(createCard(i, type)));
}

function initHomePage() {
    loadHero();
    loadHomeCarousel('/trending/all/day', 'trendingCarousel');
    loadHomeCarousel('/movie/popular', 'moviesCarousel', 'movie');
    loadHomeCarousel('/tv/popular', 'tvCarousel', 'tv');
    loadHomeCarousel('/movie/top_rated', 'topRatedCarousel', 'movie');
    loadHomeCarousel('/movie/now_playing', 'nowPlayingCarousel', 'movie');
}

// ===== MOVIES PAGE =====
async function loadMovies(page = 1) {
    const grid = $('#movieGrid');
    const loading = $('#loading');
    if (!grid) return;
    loading?.classList.remove('hidden');
    grid.innerHTML = '';

    const params = { page, sort_by: currentSort };
    if (currentGenreId) params.with_genres = currentGenreId;
    if (currentYear) {
        params.primary_release_date_gte = `${currentYear}-01-01`;
        params.primary_release_date_lte = `${currentYear}-12-31`;
    }

    const data = await tmdb('/discover/movie', params);
    loading?.classList.add('hidden');
    if (!data?.results) return;

    data.results.forEach(i => grid.appendChild(createCard(i, 'movie')));
    renderPagination('moviePagination', Math.min(data.total_pages, 500), page, p => {
        currentPage = p;
        loadMovies(p);
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
}

function initMoviesPage() {
    const genreSel = $('#genreFilter');
    const yearSel = $('#yearFilter');
    const sortSel = $('#sortFilter');

    if (genreSel) {
        genreSel.innerHTML = '<option value="">Semua Genre</option>';
        MOVIE_GENRES.forEach(g => {
            genreSel.innerHTML += `<option value="${g.id}">${g.name}</option>`;
        });
        genreSel.onchange = () => { currentGenreId = genreSel.value||null; currentPage=1; loadMovies(); };
    }
    if (yearSel) {
        const now = new Date().getFullYear();
        for (let y = now; y >= 1950; y--) yearSel.innerHTML += `<option value="${y}">${y}</option>`;
        yearSel.onchange = () => { currentYear = yearSel.value; currentPage=1; loadMovies(); };
    }
    if (sortSel) {
        sortSel.onchange = () => { currentSort = sortSel.value; currentPage=1; loadMovies(); };
    }
    loadMovies();
}

// ===== TV PAGE =====
async function loadTvShows(page = 1) {
    const grid = $('#tvGrid');
    const loading = $('#loading');
    if (!grid) return;
    loading?.classList.remove('hidden');
    grid.innerHTML = '';

    const params = { page, sort_by: currentSort };
    if (currentGenreId) params.with_genres = currentGenreId;
    if (currentYear) {
        params.first_air_date_gte = `${currentYear}-01-01`;
        params.first_air_date_lte = `${currentYear}-12-31`;
    }

    const data = await tmdb('/discover/tv', params);
    loading?.classList.add('hidden');
    if (!data?.results) return;

    data.results.forEach(i => grid.appendChild(createCard(i, 'tv')));
    renderPagination('tvPagination', Math.min(data.total_pages, 500), page, p => {
        currentPage = p;
        loadTvShows(p);
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
}

function initTvPage() {
    const genreSel = $('#genreFilter');
    const yearSel = $('#yearFilter');
    const sortSel = $('#sortFilter');

    if (genreSel) {
        genreSel.innerHTML = '<option value="">Semua Genre</option>';
        TV_GENRES.forEach(g => {
            genreSel.innerHTML += `<option value="${g.id}">${g.name}</option>`;
        });
        genreSel.onchange = () => { currentGenreId = genreSel.value||null; currentPage=1; loadTvShows(); };
    }
    if (yearSel) {
        const now = new Date().getFullYear();
        for (let y = now; y >= 1950; y--) yearSel.innerHTML += `<option value="${y}">${y}</option>`;
        yearSel.onchange = () => { currentYear = yearSel.value; currentPage=1; loadTvShows(); };
    }
    if (sortSel) {
        sortSel.onchange = () => { currentSort = sortSel.value; currentPage=1; loadTvShows(); };
    }
    loadTvShows();
}

// ===== GENRE PAGE =====
function initGenrePage() {
    const grid = $('#genreGrid');
    if (!grid) return;

    let activeType = 'movie';
    let activeGenre = null;

    function renderGenreCards(type) {
        grid.innerHTML = '';
        const genres = type === 'movie' ? MOVIE_GENRES : TV_GENRES;
        const colors = ['#e50914','#0077b6','#2d6a4f','#7b2cbf','#e07c24','#d62828','#023e8a','#588157','#9d4edd','#f77f00','#264653','#8338ec','#fb5607','#3a86ff','#ff006e'];
        genres.forEach((g, i) => {
            const card = document.createElement('div');
            card.className = 'genre-card';
            card.style.background = colors[i % colors.length];
            card.innerHTML = `<span class="genre-icon">${getGenreIcon(g.name)}</span><span class="genre-name">${g.name}</span>`;
            card.onclick = () => {
                activeGenre = g;
                loadGenreResults(type, g.id, g.name, 1);
                $$('.genre-card').forEach(c=>c.classList.remove('active'));
                card.classList.add('active');
            };
            grid.appendChild(card);
        });
    }

    $$('.genre-type-btn').forEach(btn => {
        btn.onclick = () => {
            activeType = btn.dataset.type;
            $$('.genre-type-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            $('#genreResults')?.classList.add('hidden');
            renderGenreCards(activeType);
        };
    });

    // Populate year filter
    const yearSel = $('#yearFilter');
    if (yearSel) {
        const now = new Date().getFullYear();
        for (let y = now; y >= 1950; y--) yearSel.innerHTML += `<option value="${y}">${y}</option>`;
        yearSel.onchange = () => {
            currentYear = yearSel.value;
            if(activeGenre) loadGenreResults(activeType, activeGenre.id, activeGenre.name, 1);
        };
    }

    const sortSel = $('#sortFilter');
    if (sortSel) {
        sortSel.onchange = () => {
            currentSort = sortSel.value;
            if(activeGenre) loadGenreResults(activeType, activeGenre.id, activeGenre.name, 1);
        };
    }

    renderGenreCards('movie');
}

async function loadGenreResults(type, genreId, genreName, page=1) {
    const section = $('#genreResults');
    const grid = $('#resultsGrid');
    const loading = $('#loading');
    if (!section||!grid) return;

    section.classList.remove('hidden');
    loading?.classList.remove('hidden');
    grid.innerHTML = '';
    $('#genreResultsTitle').textContent = `${type==='movie'?'🎬':'📺'} ${genreName}`;

    const yearSel = $('#yearFilter');
    const sortSel = $('#sortFilter');
    const params = { page, sort_by: sortSel?.value||'popularity.desc', with_genres: genreId };
    const yv = yearSel?.value;
    if (yv) {
        if(type==='movie') {
            params.primary_release_date_gte = `${yv}-01-01`;
            params.primary_release_date_lte = `${yv}-12-31`;
        } else {
            params.first_air_date_gte = `${yv}-01-01`;
            params.first_air_date_lte = `${yv}-12-31`;
        }
    }

    const data = await tmdb(`/discover/${type}`, params);
    loading?.classList.add('hidden');
    if (!data?.results) return;

    data.results.forEach(i => grid.appendChild(createCard(i, type)));
    renderPagination('resultsPagination', Math.min(data.total_pages, 500), page, p => {
        loadGenreResults(type, genreId, genreName, p);
        window.scrollTo({top: section.offsetTop - 80, behavior: 'smooth'});
    });
}

function getGenreIcon(name) {
    const icons = {
        'Action':'💥','Adventure':'🗺️','Animation':'🎨','Comedy':'😂','Crime':'🔍',
        'Documentary':'📹','Drama':'🎭','Family':'👨‍👩‍👧‍👦','Fantasy':'🧙','History':'📜',
        'Horror':'👻','Music':'🎵','Mystery':'🔮','Romance':'💕','Sci-Fi':'🚀',
        'TV Movie':'📺','Thriller':'😱','War':'⚔️','Western':'🤠',
        'Action & Adventure':'💥','Kids':'🧒','News':'📰','Reality':'📹',
        'Sci-Fi & Fantasy':'🚀','Soap':'💋','Talk':'🗣️','War & Politics':'⚔️'
    };
    return icons[name] || '🎬';
}

// ===== SEARCH =====
async function doSearch(query, page=1) {
    const data = await tmdb('/search/multi', { query, page });
    if (!data) return;

    // On home page: hide sections, show search
    ['trending','popularMovies','popularTv','topRated','nowPlaying','hero'].forEach(id => {
        const el = $(`#${id}`);
        if (el) el.classList.add('hidden');
    });

    let section = $('#searchResults');
    if (!section) {
        window.location.href = `/?q=${encodeURIComponent(query)}`;
        return;
    }
    section.classList.remove('hidden');
    $('#searchTitle').textContent = `Hasil: "${query}" (${data.total_results})`;
    const grid = $('#searchGrid');
    grid.innerHTML = '';
    data.results.filter(i=>['movie','tv'].includes(i.media_type)).forEach(i => grid.appendChild(createCard(i, i.media_type)));
    renderPagination('searchPagination', Math.min(data.total_pages, 20), page, p => doSearch(query, p));
}

function hideSearch() {
    ['trending','popularMovies','popularTv','topRated','nowPlaying','hero'].forEach(id => {
        const el = $(`#${id}`);
        if (el) el.classList.remove('hidden');
    });
    $('#searchResults')?.classList.add('hidden');
}

// ===== GLOBAL EVENTS =====
function initGlobalEvents() {
    // Search
    const searchInput = $('#searchInput');
    const searchBtn = $('#searchBtn');
    if (searchBtn) searchBtn.onclick = () => { const q=searchInput?.value.trim(); if(q) doSearch(q); };
    if (searchInput) searchInput.onkeydown = e => { if(e.key==='Enter'){const q=searchInput.value.trim();if(q)doSearch(q);} };

    // Mobile menu
    const menuBtn = $('#mobileMenuBtn');
    const mobileMenu = $('#mobileMenu');
    if (menuBtn && mobileMenu) {
        menuBtn.onclick = () => mobileMenu.classList.toggle('hidden');
    }

    // Close modals
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
        el.onclick = closeAllModals;
    });
    document.querySelectorAll('.player-close, .player-backdrop').forEach(el => {
        el.onclick = closeAllModals;
    });
    document.onkeydown = e => { if(e.key==='Escape') closeAllModals(); };
}

// ===== DETAIL PAGE (for detail.html) =====
async function loadDetailPage(id, type) {
    const loading = document.getElementById('detailLoading');
    const page = document.getElementById('detailPage');
    if (!page) return;

    const [detail, credits, similar] = await Promise.all([
        tmdb(`/${type}/${id}`),
        tmdb(`/${type}/${id}/credits`),
        tmdb(`/${type}/${id}/similar`)
    ]);

    if (!detail) {
        loading.textContent = 'Gagal memuat detail. Coba lagi.';
        return;
    }

    loading?.classList.add('hidden');
    page.classList.remove('hidden');

    const title = detail.title || detail.name;
    const date = detail.release_date || detail.first_air_date;
    const runtime = detail.runtime || (detail.episode_run_time?.[0]) || 0;
    const genres = detail.genres?.map(g => g.name).join(', ') || '';

    document.title = `${title} - NontonFilm`;

    document.getElementById('detailHero').style.backgroundImage = `url(${backdropUrl(detail.backdrop_path)})`;
    document.getElementById('detailTitle').textContent = title;
    document.getElementById('detailMeta').innerHTML = `
        <span class="detail-rating">★ ${rating(detail.vote_average)}</span>
        <span>${year(date)}</span>
        ${runtime ? `<span>⏱ ${runtime} min</span>` : ''}
        <span>${type === 'movie' ? '🎬 Film' : '📺 Series'}</span>
        ${genres ? `<span>${genres}</span>` : ''}
    `;
    document.getElementById('detailOverview').textContent = detail.overview || 'Tidak ada deskripsi.';

    const castEl = document.getElementById('detailCast');
    castEl.innerHTML = '';
    credits?.cast?.slice(0, 10).forEach(c => {
        castEl.innerHTML += `<div class="detail-cast-item"><img src="${c.profile_path ? IMG_CAST + c.profile_path : NO_POSTER}" alt="${c.name}" onerror="this.src='${NO_POSTER}'"><p>${c.name}</p></div>`;
    });

    document.getElementById('detailWatchBtn').onclick = () => openPlayer(id, type, title);
    document.getElementById('detailTrailerBtn').onclick = () => {
        const tr = detail.videos?.results?.find(v => v.type==='Trailer'&&v.site==='YouTube');
        if(tr) window.open(`https://www.youtube.com/watch?v=${tr.key}`,'_blank');
        else alert('Trailer tidak tersedia');
    };

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

// ===== FULLSCREEN PLAYER =====
function toggleFullscreenPlayer(id, type, title) {
    const pc = $('.player-content');
    if (!pc) return;
    const modal = $('#playerModal');
    if (!modal) return;
    const isActive = pc.classList.contains('is-fullscreen');
    if (isActive) {
        pc.classList.remove('is-fullscreen');
        modal.classList.remove('is-fullscreen');
        const panel = $('#playerInfoPanel');
        if (panel) panel.style.display = 'none';
        document.querySelector('.fullscreen-btn').innerHTML = '⛶ Fullscreen';
        document.body.style.overflow = 'hidden'; // restore modal state
        const guard = document.getElementById('scrollGuard');
        if (guard) guard.style.display = 'none';
    } else {
        pc.classList.add('is-fullscreen');
        modal.classList.add('is-fullscreen');
        const panel = $('#playerInfoPanel');
        if (panel) {
            panel.style.display = 'flex';
            // Scroll capture — prevent scroll propagation
            const scrollEl = panel.querySelector('.panel-scroll');
            if (scrollEl) {
                scrollEl.addEventListener('wheel', (e) => {
                    const t = scrollEl;
                    const atTop = t.scrollTop <= 0;
                    const atBottom = t.scrollTop + t.clientHeight >= t.scrollHeight;
                    if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                        // At boundary — let browser handle (no-op for volume)
                    } else {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }, { passive: false });
                scrollEl.addEventListener('touchmove', (e) => {
                    e.stopPropagation();
                }, { passive: true });
            }
        }
        document.body.style.overflow = 'hidden';
        document.querySelector('.fullscreen-btn').innerHTML = '✕ Keluar';
        // Add scroll guard overlay on iframe
        let guard = document.getElementById('scrollGuard');
        if (!guard) {
            guard = document.createElement('div');
            guard.id = 'scrollGuard';
            guard.style.cssText = 'position:absolute;inset:0;z-index:5;background:transparent;';
            guard.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
            guard.addEventListener('touchmove', (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
            const ic = $('.iframe-container');
            if (ic) { ic.style.position = 'relative'; ic.appendChild(guard); }
        }
        guard.style.display = 'block';
    }
}
// Escape key exits custom fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const pc = $('.player-content');
        if (pc && pc.classList.contains('is-fullscreen')) {
            toggleFullscreenPlayer();
        }
    }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initGlobalEvents();

    const path = window.location.pathname;

    // Check for search query in URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchQ = urlParams.get('q');
    if (searchQ && $('#searchInput')) {
        $('#searchInput').value = searchQ;
        // Will init home page, then trigger search
    }

    if (path.includes('movies.html')) {
        initMoviesPage();
    } else if (path.includes('tv.html')) {
        initTvPage();
    } else if (path.includes('genre.html')) {
        initGenrePage();
    } else {
        initHomePage();
        if (searchQ) doSearch(searchQ);
    }
});
