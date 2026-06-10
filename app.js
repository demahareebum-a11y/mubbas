// Mubbas Quran Player - Application Code

// --- STATE MANAGEMENT ---
let currentTrack = null;
let currentPlaylist = [];
let activePlaylistId = null; // 'cloud', 'local', 'liked', or custom playlist ID
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isRepeat = 'none'; // 'none', 'all', 'one'
let lastVolume = 0.8;

// Persistent Data
let likedTracks = JSON.parse(localStorage.getItem('mubbas_liked_tracks')) || [];
let customPlaylists = JSON.parse(localStorage.getItem('mubbas_playlists')) || [];

// View Navigation History
let viewHistory = ['home'];
let historyIndex = 0;

// --- DOM ELEMENTS ---
const audio = document.getElementById('main-audio');

// Navigation & Views
const viewItems = document.querySelectorAll('.nav-item, #liked-songs-nav');
const views = {
  home: document.getElementById('view-home'),
  search: document.getElementById('view-search'),
  library: document.getElementById('view-library'),
  playlist: document.getElementById('view-playlist')
};
const navBackBtn = document.getElementById('nav-back');
const navForwardBtn = document.getElementById('nav-forward');
const headerSearchContainer = document.getElementById('header-search-container');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');

// Lists and Grids
const featuredGrid = document.getElementById('featured-grid');
const compactGrid = document.getElementById('all-surahs-compact-grid');
const playlistSongsRows = document.getElementById('playlist-songs-rows');
const sidebarPlaylistsUl = document.getElementById('sidebar-playlists');
const libraryGrid = document.getElementById('library-grid');

// Search Specific
const searchCategories = document.getElementById('search-categories');
const searchResultsSection = document.getElementById('search-results-section');
const topResultCard = document.getElementById('top-result-card');
const searchSongsList = document.getElementById('search-songs-list');

// View Details
const cardCloudPlaylist = document.getElementById('card-cloud-playlist');
const cardLocalPlaylist = document.getElementById('card-local-playlist');
const heroPlayBtn = document.getElementById('hero-play-btn');

// Playlist Details View
const playlistViewTitle = document.getElementById('playlist-view-title');
const playlistViewDescription = document.getElementById('playlist-view-description');
const playlistViewCount = document.getElementById('playlist-view-count');
const playlistViewCover = document.getElementById('playlist-view-cover');
const playlistPlayBtn = document.getElementById('playlist-play-btn');
const playlistHeartBtn = document.getElementById('playlist-heart-btn');
const playlistDeleteBtn = document.getElementById('playlist-delete-btn');

// Player Footer
const playerTrackTitle = document.getElementById('player-track-title');
const playerTrackArtist = document.getElementById('player-track-artist');
const playerTrackCover = document.getElementById('player-track-cover');
const playerLikeBtn = document.getElementById('player-like-btn');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');
const btnRepeat = document.getElementById('btn-repeat');
const progressSlider = document.getElementById('progress-slider');
const currentTimeLabel = document.getElementById('current-time');
const totalDurationLabel = document.getElementById('total-duration');
const btnVolume = document.getElementById('btn-volume');
const volumeSlider = document.getElementById('volume-slider');
const miniVisualizer = document.getElementById('mini-visualizer');

// Fullscreen Visualizer Overlay
const btnFullscreen = document.getElementById('btn-fullscreen');
const fullscreenOverlay = document.getElementById('fullscreen-overlay');
const closeFullscreenBtn = document.getElementById('close-fullscreen-btn');
const fullscreenArt = document.getElementById('fullscreen-art');
const fullscreenTitle = document.getElementById('fullscreen-title');
const fullscreenArtist = document.getElementById('fullscreen-artist');
const fsBtnPlayPause = document.getElementById('fs-btn-play-pause');
const fsBtnPrev = document.getElementById('fs-btn-prev');
const fsBtnNext = document.getElementById('fs-btn-next');
const waveBars = document.querySelectorAll('.wave-bar');

// Modal Creation
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const playlistModal = document.getElementById('playlist-modal');
const closePlaylistModal = document.getElementById('close-playlist-modal');
const playlistNameInput = document.getElementById('playlist-name-input');
const playlistDescInput = document.getElementById('playlist-desc-input');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSaveBtn = document.getElementById('modal-save-btn');

// Context Menu
const trackContextMenu = document.getElementById('track-context-menu');
const cmLikeTrack = document.getElementById('cm-like-track');
const cmPlaylistSubmenu = document.getElementById('cm-playlist-submenu');
const cmRemoveFromPlaylist = document.getElementById('cm-remove-from-playlist');

// Toast
const toastContainer = document.getElementById('toast-container');

// State for context menu target
let contextMenuTrack = null;
let contextMenuPlaylistId = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  // Setup SVG icons
  lucide.createIcons();
  
  // Set default volume
  audio.volume = lastVolume;
  updateSliderProgress(volumeSlider, lastVolume * 100);
  volumeSlider.value = lastVolume * 100;
  
  // Render grids
  renderFeaturedGrid();
  renderCompactCatalog();
  renderSidebarPlaylists();
  
  // Setup Event Listeners
  setupEventListeners();
  
  // Show home view by default
  navigateTo('home');
});

// --- HELPER FUNCTION: TOASTS ---
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  toastContainer.appendChild(toast);
  
  // Auto remove
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// --- SLIDER PROGRESS HELPERS ---
function updateSliderProgress(slider, value) {
  slider.style.setProperty('--progress', `${value}%`);
}

// --- DATA QUERIES ---
function getTrackById(id) {
  if (id.startsWith('cloud-')) {
    return songsData.cloud.find(s => s.id === id);
  } else if (id.startsWith('local-')) {
    return songsData.local.find(s => s.id === id);
  }
  return null;
}

// --- VIEW ROUTER ---
function navigateTo(viewName, playlistId = null) {
  // Add to navigation history
  if (viewHistory[historyIndex] !== viewName || (viewName === 'playlist' && activePlaylistId !== playlistId)) {
    // Truncate forward history if we were in the middle of it
    viewHistory = viewHistory.slice(0, historyIndex + 1);
    viewHistory.push(playlistId ? `playlist:${playlistId}` : viewName);
    historyIndex = viewHistory.length - 1;
  }
  
  updateNavArrows();
  showView(viewName, playlistId);
}

function showView(viewName, playlistId = null) {
  // Hide all views
  Object.values(views).forEach(v => v.classList.add('hidden'));
  
  // Show header search only in Search View
  if (viewName === 'search') {
    headerSearchContainer.classList.remove('hidden');
  } else {
    headerSearchContainer.classList.add('hidden');
  }
  
  // Set active class in sidebar
  viewItems.forEach(item => {
    item.classList.remove('active');
    const targetView = item.getAttribute('data-view');
    const targetId = item.getAttribute('id');
    if (viewName === 'liked' && targetId === 'liked-songs-nav') {
      item.classList.add('active');
    } else if (targetView === viewName) {
      item.classList.add('active');
    }
  });

  // Activate view
  if (viewName === 'home') {
    views.home.classList.remove('hidden');
    // Check if current playlist matches default hero playbar
    updateHeroBtnState();
  } else if (viewName === 'search') {
    views.search.classList.remove('hidden');
    triggerSearch();
  } else if (viewName === 'library') {
    views.library.classList.remove('hidden');
    renderLibraryView();
  } else if (viewName === 'liked') {
    activePlaylistId = 'liked';
    views.playlist.classList.remove('hidden');
    setupPlaylistView('liked');
  } else if (viewName === 'playlist' && playlistId) {
    activePlaylistId = playlistId;
    views.playlist.classList.remove('hidden');
    setupPlaylistView(playlistId);
  }
  
  // Scroll to top
  document.querySelector('.content-scroll-area').scrollTop = 0;
}

function updateNavArrows() {
  navBackBtn.disabled = historyIndex <= 0;
  navForwardBtn.disabled = historyIndex >= viewHistory.length - 1;
}

function goBack() {
  if (historyIndex > 0) {
    historyIndex--;
    const destination = viewHistory[historyIndex];
    parseNavigation(destination);
  }
}

function goForward() {
  if (historyIndex < viewHistory.length - 1) {
    historyIndex++;
    const destination = viewHistory[historyIndex];
    parseNavigation(destination);
  }
}

function parseNavigation(destination) {
  updateNavArrows();
  if (destination.startsWith('playlist:')) {
    const id = destination.split(':')[1];
    showView('playlist', id);
  } else if (destination === 'liked') {
    showView('liked');
  } else {
    showView(destination);
  }
}

// --- DOM RENDERERS ---

// 1. Home Grids
function renderFeaturedGrid() {
  featuredGrid.innerHTML = '';
  songsData.cloud.forEach(track => {
    const card = document.createElement('div');
    card.className = 'mubbas-card';
    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${track.cover}" alt="${track.title}">
        <button class="card-play-btn" data-id="${track.id}"><i data-lucide="play"></i></button>
      </div>
      <h3>${track.title}</h3>
      <p>Surah ${track.surahNo} • Idris Abkar</p>
    `;
    card.addEventListener('click', (e) => {
      // If play button clicked, play it. Otherwise, open the cloud album/playlist
      if (e.target.closest('.card-play-btn')) {
        e.stopPropagation();
        playSingleTrack(track.id, songsData.cloud, 'cloud');
      } else {
        navigateTo('playlist', 'cloud');
      }
    });
    featuredGrid.appendChild(card);
  });
}

function renderCompactCatalog() {
  compactGrid.innerHTML = '';
  // Show first 12 Surahs in home screen catalog
  const featuredLocal = songsData.local.slice(0, 12);
  featuredLocal.forEach(track => {
    const card = document.createElement('div');
    card.className = 'compact-card';
    card.innerHTML = `
      <img src="${track.cover}" class="compact-card-img" alt="${track.title}">
      <div class="compact-card-title-box">
        <h4>${track.title}</h4>
        <p>Surah ${track.surahNo} • Local</p>
      </div>
      <button class="compact-play-btn" data-id="${track.id}"><i data-lucide="play"></i></button>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.compact-play-btn')) {
        e.stopPropagation();
        playSingleTrack(track.id, songsData.local, 'local');
      } else {
        navigateTo('playlist', 'local');
      }
    });
    compactGrid.appendChild(card);
  });
  lucide.createIcons();
}

// 2. Playlists Sidebar
function renderSidebarPlaylists() {
  sidebarPlaylistsUl.innerHTML = '';
  
  // Liked songs link is handled statically
  customPlaylists.forEach(pl => {
    const li = document.createElement('li');
    li.innerText = pl.name;
    li.setAttribute('data-pl-id', pl.id);
    li.addEventListener('click', () => {
      navigateTo('playlist', pl.id);
    });
    sidebarPlaylistsUl.appendChild(li);
  });
}

// 3. Library Grid
function renderLibraryView() {
  libraryGrid.innerHTML = '';

  const addCard = (id, title, desc, cover, type) => {
    const card = document.createElement('div');
    card.className = 'mubbas-card';
    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${cover}" alt="${title}">
        <button class="card-play-btn"><i data-lucide="play"></i></button>
      </div>
      <h3>${title}</h3>
      <p>${type} • ${desc}</p>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-play-btn')) {
        e.stopPropagation();
        if (id === 'cloud') {
          playPlaylistDirectly(songsData.cloud, 'cloud');
        } else if (id === 'local') {
          playPlaylistDirectly(songsData.local, 'local');
        } else if (id === 'liked') {
          const tracks = likedTracks.map(tid => getTrackById(tid)).filter(t => t !== null);
          playPlaylistDirectly(tracks, 'liked');
        } else {
          const pl = customPlaylists.find(p => p.id === id);
          if (pl) {
            const tracks = pl.tracks.map(tid => getTrackById(tid)).filter(t => t !== null);
            playPlaylistDirectly(tracks, id);
          }
        }
      } else {
        if (id === 'liked') {
          navigateTo('liked');
        } else {
          navigateTo('playlist', id);
        }
      }
    });
    libraryGrid.appendChild(card);
  };

  // Add default albums
  addCard('cloud', 'Cloud Recitations', 'Idris Abkar', 'idris Abkar_Full/idrees-abkar-banner.jpg', 'Album');
  addCard('local', 'Full Quran Recitation', 'Idris Abkar', 'idris Abkar_Full/idrees-abkar-banner.jpg', 'Album');

  // Add Liked Songs
  if (likedTracks.length > 0) {
    addCard('liked', 'Liked Songs', `${likedTracks.length} songs`, 'idris Abkar_Full/idrees-abkar-banner.jpg', 'Playlist');
  }

  // Add custom playlists
  customPlaylists.forEach(pl => {
    addCard(pl.id, pl.name, `${pl.tracks.length} songs`, 'idris Abkar_Full/idrees-abkar-banner.jpg', 'Playlist');
  });
  
  lucide.createIcons();
}

// 4. Playlist Detail Page
function setupPlaylistView(id) {
  let name = '';
  let desc = '';
  let cover = 'idris Abkar_Full/idrees-abkar-banner.jpg';
  let tracks = [];
  let isCustom = false;

  if (id === 'cloud') {
    name = 'Featured Cloud Recitations';
    desc = '6 Cloud-hosted recitations by Idris Abkar, optimized for streaming.';
    tracks = songsData.cloud;
    playlistHeartBtn.classList.add('hidden');
    playlistDeleteBtn.classList.add('hidden');
  } else if (id === 'local') {
    name = 'Full Quran Recitation';
    desc = 'All 114 Surahs from the Holy Quran, recited beautifully by Idris Abkar.';
    tracks = songsData.local;
    playlistHeartBtn.classList.add('hidden');
    playlistDeleteBtn.classList.add('hidden');
  } else if (id === 'liked') {
    name = 'Liked Songs';
    desc = 'Your favorite Quran recitations.';
    tracks = likedTracks.map(tid => getTrackById(tid)).filter(t => t !== null);
    playlistHeartBtn.classList.add('hidden');
    playlistDeleteBtn.classList.add('hidden');
  } else {
    // Custom Playlist
    const pl = customPlaylists.find(p => p.id === id);
    if (!pl) {
      navigateTo('home');
      return;
    }
    name = pl.name;
    desc = pl.description || 'Custom playlist created by Reciter.';
    tracks = pl.tracks.map(tid => getTrackById(tid)).filter(t => t !== null);
    isCustom = true;
    
    playlistHeartBtn.classList.add('hidden');
    playlistDeleteBtn.classList.remove('hidden');
  }

  playlistViewTitle.innerText = name;
  playlistViewDescription.innerText = desc;
  playlistViewCount.innerText = `${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'}`;
  playlistViewCover.src = cover;

  // Build Track List Rows
  renderTracksTable(tracks, id);
  
  // Highlight active row if current playlist playing matches this view
  highlightPlayingTrackRow();
  
  // Update playlist play/pause buttons
  updatePlaylistPlayBtnState(id);
}

function renderTracksTable(tracks, playlistId) {
  playlistSongsRows.innerHTML = '';
  
  if (tracks.length === 0) {
    playlistSongsRows.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <i data-lucide="music" style="width: 48px; height: 48px; margin-bottom: 12px; stroke-width: 1;"></i>
          <div>No songs in this playlist yet.</div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  tracks.forEach((track, idx) => {
    const isLiked = likedTracks.includes(track.id);
    const row = document.createElement('tr');
    row.className = 'track-row';
    row.setAttribute('data-id', track.id);
    row.setAttribute('data-index', idx);
    
    row.innerHTML = `
      <td class="col-num">
        <div class="track-num-cell">
          <span class="track-index">${idx + 1}</span>
          <i data-lucide="play" class="track-play-icon"></i>
          <i data-lucide="pause" class="track-pause-icon"></i>
        </div>
      </td>
      <td class="col-title">
        <div class="title-cell-container">
          <img src="${track.cover}" class="track-thumbnail" alt="${track.title}">
          <div class="track-info-text">
            <a href="#" class="track-title-link">${track.title}</a>
            <span class="track-reciter">${track.artist}</span>
          </div>
        </div>
      </td>
      <td class="col-album">${track.album}</td>
      <td class="col-duration">
        <div style="display: flex; align-items: center; justify-content: flex-end;">
          <button class="track-heart-btn ${isLiked ? 'liked' : ''}">
            <i data-lucide="heart"></i>
          </button>
          <span style="margin-left: 12px;">${track.duration}</span>
        </div>
      </td>
    `;
    
    // Play on Row Click / Title Click
    row.addEventListener('click', (e) => {
      // Prevent trigger if clicking on Heart icon or contextual button
      if (e.target.closest('.track-heart-btn')) {
        e.stopPropagation();
        toggleLikeTrack(track.id, e.target.closest('.track-heart-btn'));
        return;
      }
      
      playSingleTrack(track.id, tracks, playlistId);
    });

    // Right Click Context Menu
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, track.id, playlistId);
    });

    playlistSongsRows.appendChild(row);
  });
  
  lucide.createIcons();
}

// Helper to highlight currently playing track in playlists table
function highlightPlayingTrackRow() {
  const rows = playlistSongsRows.querySelectorAll('.track-row');
  rows.forEach(row => {
    row.classList.remove('active-row', 'playing-state');
    const titleLink = row.querySelector('.track-title-link');
    const indexSpan = row.querySelector('.track-index');
    if (titleLink) titleLink.classList.remove('active-text');
    if (indexSpan) indexSpan.style.display = 'block';

    const trackId = row.getAttribute('data-id');
    if (currentTrack && currentTrack.id === trackId) {
      row.classList.add('active-row');
      if (titleLink) titleLink.classList.add('active-text');
      
      // Update play/pause icon state in row
      if (isPlaying) {
        row.classList.add('playing-state');
        // Replace number with speaker/wave icon or just change play icon
        if (indexSpan) {
          indexSpan.innerHTML = `<div class="playing-mini-wave"><span class="bar bar1"></span><span class="bar bar2"></span><span class="bar bar3"></span></div>`;
        }
      }
    }
  });
}

// --- CONTEXT MENU SYSTEM ---
function showContextMenu(x, y, trackId, playlistId) {
  contextMenuTrack = getTrackById(trackId);
  contextMenuPlaylistId = playlistId;

  // Toggle Context items
  const isLiked = likedTracks.includes(trackId);
  cmLikeTrack.querySelector('span').innerText = isLiked ? 'Remove from Liked Songs' : 'Like Track';
  cmLikeTrack.querySelector('i').setAttribute('data-lucide', isLiked ? 'heart-off' : 'heart');

  // If we are looking at a custom playlist, show option to remove from it
  if (playlistId !== 'cloud' && playlistId !== 'local' && playlistId !== 'liked') {
    cmRemoveFromPlaylist.classList.remove('hidden');
  } else {
    cmRemoveFromPlaylist.classList.add('hidden');
  }

  // Populate Playlist Submenu
  cmPlaylistSubmenu.innerHTML = '';
  if (customPlaylists.length === 0) {
    cmPlaylistSubmenu.innerHTML = `<li style="font-style: italic; color: var(--text-muted);">No Playlists</li>`;
  } else {
    customPlaylists.forEach(pl => {
      // Don't show if song is already in this playlist
      const inPlaylist = pl.tracks.includes(trackId);
      const subLi = document.createElement('li');
      subLi.innerHTML = `<span>${pl.name}</span> ${inPlaylist ? '<i data-lucide="check" style="width:14px; color:var(--spotify-green);"></i>' : ''}`;
      subLi.addEventListener('click', () => {
        if (inPlaylist) {
          removeTrackFromPlaylist(trackId, pl.id);
        } else {
          addTrackToPlaylist(trackId, pl.id);
        }
        hideContextMenu();
      });
      cmPlaylistSubmenu.appendChild(subLi);
    });
  }

  lucide.createIcons();

  // Position Context Menu
  trackContextMenu.style.left = `${x}px`;
  trackContextMenu.style.top = `${y}px`;
  trackContextMenu.classList.remove('hidden');

  // Keep inside screen boundaries
  const menuWidth = trackContextMenu.offsetWidth;
  const menuHeight = trackContextMenu.offsetHeight;
  if (x + menuWidth > window.innerWidth) {
    trackContextMenu.style.left = `${x - menuWidth}px`;
  }
  if (y + menuHeight > window.innerHeight) {
    trackContextMenu.style.top = `${y - menuHeight}px`;
  }
}

function hideContextMenu() {
  trackContextMenu.classList.add('hidden');
}

// --- AUDIO PLAYER CONTROLS ---

function playSingleTrack(trackId, playlist, playlistId) {
  const track = getTrackById(trackId);
  if (!track) return;

  if (currentTrack && currentTrack.id === trackId) {
    // Clicked on already loaded song, toggle play
    togglePlay();
    return;
  }

  currentTrack = track;
  currentPlaylist = [...playlist];
  activePlaylistId = playlistId;
  currentIndex = currentPlaylist.findIndex(t => t.id === trackId);

  loadTrack(currentTrack);
  playAudio();
}

function loadTrack(track) {
  audio.src = track.url;
  audio.load();

  // Update Footer UI
  playerTrackTitle.innerText = track.title;
  playerTrackArtist.innerText = track.artist;
  playerTrackCover.src = track.cover;

  // Update Fullscreen UI
  fullscreenArt.src = track.cover;
  fullscreenTitle.innerText = track.title;
  fullscreenArtist.innerText = track.artist;

  // Like status
  updateLikeBtnState(track.id);

  // Reset progress slider
  progressSlider.value = 0;
  updateSliderProgress(progressSlider, 0);
  currentTimeLabel.innerText = '0:00';
  totalDurationLabel.innerText = track.duration || '0:00';

  // Highlight in table
  highlightPlayingTrackRow();
}

function playAudio() {
  audio.play()
    .then(() => {
      isPlaying = true;
      updatePlaybackControlsUI();
      highlightPlayingTrackRow();
      updateHeroBtnState();
      updatePlaylistPlayBtnState(activePlaylistId);
      startVisualizerAnimation();
    })
    .catch(err => {
      console.error('Audio playback failed:', err.message);
      showToast('Could not stream audio. Checking local file path...');
      // Auto move next on fail
      playNext();
    });
}

function pauseAudio() {
  audio.pause();
  isPlaying = false;
  updatePlaybackControlsUI();
  highlightPlayingTrackRow();
  updateHeroBtnState();
  updatePlaylistPlayBtnState(activePlaylistId);
  stopVisualizerAnimation();
}

function togglePlay() {
  if (!currentTrack) {
    // If no song loaded, load first song from cloud
    playSingleTrack(songsData.cloud[0].id, songsData.cloud, 'cloud');
    return;
  }
  if (isPlaying) {
    pauseAudio();
  } else {
    playAudio();
  }
}

function playNext() {
  if (currentPlaylist.length === 0) return;

  if (isRepeat === 'one') {
    // Repeat single song
    audio.currentTime = 0;
    playAudio();
    return;
  }

  if (isShuffle) {
    currentIndex = Math.floor(Math.random() * currentPlaylist.length);
  } else {
    currentIndex++;
    if (currentIndex >= currentPlaylist.length) {
      if (isRepeat === 'all') {
        currentIndex = 0;
      } else {
        currentIndex = currentPlaylist.length - 1;
        pauseAudio();
        return;
      }
    }
  }

  const nextTrack = currentPlaylist[currentIndex];
  currentTrack = nextTrack;
  loadTrack(currentTrack);
  playAudio();
}

function playPrev() {
  if (currentPlaylist.length === 0) return;

  // Restart if played for more than 3 seconds
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  if (isShuffle) {
    currentIndex = Math.floor(Math.random() * currentPlaylist.length);
  } else {
    currentIndex--;
    if (currentIndex < 0) {
      if (isRepeat === 'all') {
        currentIndex = currentPlaylist.length - 1;
      } else {
        currentIndex = 0;
      }
    }
  }

  const prevTrack = currentPlaylist[currentIndex];
  currentTrack = prevTrack;
  loadTrack(currentTrack);
  playAudio();
}

// UI Buttons states
function updatePlaybackControlsUI() {
  // Center play/pause
  if (isPlaying) {
    btnPlayPause.querySelector('.icon-play').classList.add('hidden');
    btnPlayPause.querySelector('.icon-pause').classList.remove('hidden');
    fsBtnPlayPause.querySelector('.icon-play').classList.add('hidden');
    fsBtnPlayPause.querySelector('.icon-pause').classList.remove('hidden');
  } else {
    btnPlayPause.querySelector('.icon-play').classList.remove('hidden');
    btnPlayPause.querySelector('.icon-pause').classList.add('hidden');
    fsBtnPlayPause.querySelector('.icon-play').classList.remove('hidden');
    fsBtnPlayPause.querySelector('.icon-pause').classList.add('hidden');
  }
}

function updateHeroBtnState() {
  if (activePlaylistId === 'local' || activePlaylistId === 'cloud') {
    // Hero play state matches isPlaying
    if (isPlaying) {
      heroPlayBtn.querySelector('.icon-play').classList.add('hidden');
      heroPlayBtn.querySelector('.icon-pause').classList.remove('hidden');
      heroPlayBtn.querySelector('span').innerText = 'Pause';
    } else {
      heroPlayBtn.querySelector('.icon-play').classList.remove('hidden');
      heroPlayBtn.querySelector('.icon-pause').classList.add('hidden');
      heroPlayBtn.querySelector('span').innerText = 'Play';
    }
  } else {
    heroPlayBtn.querySelector('.icon-play').classList.remove('hidden');
    heroPlayBtn.querySelector('.icon-pause').classList.add('hidden');
    heroPlayBtn.querySelector('span').innerText = 'Play';
  }
}

function updatePlaylistPlayBtnState(id) {
  if (activePlaylistId === id) {
    if (isPlaying) {
      playlistPlayBtn.querySelector('.icon-play').classList.add('hidden');
      playlistPlayBtn.querySelector('.icon-pause').classList.remove('hidden');
    } else {
      playlistPlayBtn.querySelector('.icon-play').classList.remove('hidden');
      playlistPlayBtn.querySelector('.icon-pause').classList.add('hidden');
    }
  } else {
    playlistPlayBtn.querySelector('.icon-play').classList.remove('hidden');
    playlistPlayBtn.querySelector('.icon-pause').classList.add('hidden');
  }
}

function updateLikeBtnState(trackId) {
  const isLiked = likedTracks.includes(trackId);
  if (isLiked) {
    playerLikeBtn.querySelector('.empty-heart').classList.add('hidden');
    playerLikeBtn.querySelector('.filled-heart').classList.remove('hidden');
  } else {
    playerLikeBtn.querySelector('.empty-heart').classList.remove('hidden');
    playerLikeBtn.querySelector('.filled-heart').classList.add('hidden');
  }
}

// Play a full playlist from the start
function playPlaylistDirectly(playlist, playlistId) {
  if (playlist.length === 0) {
    showToast('Playlist is empty!');
    return;
  }
  playSingleTrack(playlist[0].id, playlist, playlistId);
}

// --- SEARCH ENGINE ---
function triggerSearch() {
  const query = searchInput.value.trim().toLowerCase();
  
  if (query.length === 0) {
    searchCategories.classList.remove('hidden');
    searchResultsSection.classList.add('hidden');
    clearSearchBtn.classList.add('hidden');
    return;
  }

  clearSearchBtn.classList.remove('hidden');
  searchCategories.classList.add('hidden');
  searchResultsSection.classList.remove('hidden');

  // Perform Indexing Search
  const matches = [];
  
  // Custom tag search
  const isShortTag = query === 'short';
  const isCloudTag = query === 'cloud';
  
  // Combine all songs
  const allSongs = [...songsData.cloud, ...songsData.local];
  
  allSongs.forEach(song => {
    // Unique list check
    if (matches.some(m => m.id === song.id)) return;

    if (isShortTag) {
      // Short Surahs typically have duration < 2:00
      const parts = song.duration.split(':');
      const min = parseInt(parts[0]);
      if (min < 2) {
        matches.push(song);
      }
    } else if (isCloudTag) {
      if (song.isCloud) {
        matches.push(song);
      }
    } else {
      // General title/number search
      const numMatch = song.surahNo.toString() === query;
      const titleMatch = song.title.toLowerCase().includes(query);
      const categoryMatch = query.startsWith('surah ') && song.title.toLowerCase().includes(query.replace('surah ', ''));
      
      if (numMatch || titleMatch || categoryMatch) {
        matches.push(song);
      }
    }
  });

  renderSearchResults(matches);
}

function renderSearchResults(matches) {
  searchSongsList.innerHTML = '';
  topResultCard.innerHTML = '';

  if (matches.length === 0) {
    searchSongsList.innerHTML = `<div style="padding: 24px; color: var(--text-secondary);">No results found for your search.</div>`;
    topResultCard.innerHTML = `<div style="padding: 24px; color: var(--text-secondary);">No result.</div>`;
    return;
  }

  // 1. Render Top Result (first match)
  const topResult = matches[0];
  topResultCard.innerHTML = `
    <img src="${topResult.cover}" class="top-result-img" alt="${topResult.title}">
    <div class="top-result-title">${topResult.title}</div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="top-result-subtitle">${topResult.artist}</span>
      <span class="top-result-type-badge">${topResult.isCloud ? 'Cloud Link' : 'Local File'}</span>
    </div>
    <button class="card-play-btn" style="opacity: 1; transform: none; position: absolute; bottom: 24px; right: 24px;"><i data-lucide="play"></i></button>
  `;
  topResultCard.querySelector('.card-play-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    playSingleTrack(topResult.id, matches, 'search-results');
  });
  topResultCard.addEventListener('click', () => {
    // Open appropriate album
    navigateTo('playlist', topResult.isCloud ? 'cloud' : 'local');
  });

  // 2. Render list of matches (max 5)
  const listMatches = matches.slice(0, 5);
  listMatches.forEach((track, idx) => {
    const item = document.createElement('div');
    item.className = `song-list-item ${currentTrack && currentTrack.id === track.id ? 'playing' : ''}`;
    item.innerHTML = `
      <img src="${track.cover}" class="song-list-img" alt="${track.title}">
      <div class="song-list-meta">
        <div class="song-list-title ${currentTrack && currentTrack.id === track.id ? 'active-text' : ''}">${track.title}</div>
        <div class="song-list-artist">${track.artist}</div>
      </div>
      <div class="song-list-duration">${track.duration}</div>
    `;
    item.addEventListener('click', () => {
      playSingleTrack(track.id, matches, 'search-results');
    });
    // Context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, track.id, 'search-results');
    });
    searchSongsList.appendChild(item);
  });

  lucide.createIcons();
}

// --- FAVORITES & PLAYLISTS ACTIONS ---
function toggleLikeTrack(id, element = null) {
  const idx = likedTracks.indexOf(id);
  let isLikedNow = false;
  
  if (idx === -1) {
    likedTracks.push(id);
    isLikedNow = true;
    showToast('Added to Liked Songs');
  } else {
    likedTracks.splice(idx, 1);
    showToast('Removed from Liked Songs');
  }

  localStorage.setItem('mubbas_liked_tracks', JSON.stringify(likedTracks));
  
  // Update UI elements in tables/player
  if (element) {
    if (isLikedNow) {
      element.classList.add('liked');
    } else {
      element.classList.remove('liked');
    }
  }

  if (currentTrack && currentTrack.id === id) {
    updateLikeBtnState(id);
  }

  // If we are looking at Liked Songs view, refresh list
  if (activePlaylistId === 'liked') {
    setupPlaylistView('liked');
  }
}

function createNewPlaylist(name, description) {
  const newPl = {
    id: `playlist-${Date.now()}`,
    name: name || `My Playlist #${customPlaylists.length + 1}`,
    description: description || '',
    tracks: []
  };

  customPlaylists.push(newPl);
  localStorage.setItem('mubbas_playlists', JSON.stringify(customPlaylists));
  
  renderSidebarPlaylists();
  showToast(`Playlist "${newPl.name}" created!`);
  navigateTo('playlist', newPl.id);
}

function deletePlaylist(id) {
  customPlaylists = customPlaylists.filter(p => p.id !== id);
  localStorage.setItem('mubbas_playlists', JSON.stringify(customPlaylists));
  
  renderSidebarPlaylists();
  showToast('Playlist deleted');
  navigateTo('home');
}

function addTrackToPlaylist(trackId, playlistId) {
  const pl = customPlaylists.find(p => p.id === playlistId);
  if (!pl) return;

  if (pl.tracks.includes(trackId)) {
    showToast('Song already in playlist');
    return;
  }

  pl.tracks.push(trackId);
  localStorage.setItem('mubbas_playlists', JSON.stringify(customPlaylists));
  showToast(`Added to ${pl.name}`);

  // Refresh if looking at it
  if (activePlaylistId === playlistId) {
    setupPlaylistView(playlistId);
  }
}

function removeTrackFromPlaylist(trackId, playlistId) {
  const pl = customPlaylists.find(p => p.id === playlistId);
  if (!pl) return;

  pl.tracks = pl.tracks.filter(tid => tid !== trackId);
  localStorage.setItem('mubbas_playlists', JSON.stringify(customPlaylists));
  showToast(`Removed from ${pl.name}`);

  // Refresh if looking at it
  if (activePlaylistId === playlistId) {
    setupPlaylistView(playlistId);
  }
}

// --- SIMULATED WAVEFORM VISUALIZER LOOP ---
let visualizerInterval = null;

function startVisualizerAnimation() {
  miniVisualizer.classList.remove('hidden');
  
  if (visualizerInterval) clearInterval(visualizerInterval);
  
  visualizerInterval = setInterval(() => {
    waveBars.forEach(bar => {
      // Calculate random height between 5px and 110px
      const h = Math.floor(Math.random() * 105) + 5;
      bar.style.height = `${h}px`;
    });
  }, 120);
}

function stopVisualizerAnimation() {
  miniVisualizer.classList.add('hidden');
  if (visualizerInterval) {
    clearInterval(visualizerInterval);
    visualizerInterval = null;
  }
  
  // Reset heights
  waveBars.forEach(bar => {
    bar.style.height = '6px';
  });
}

// --- EVENT LISTENERS BINDINGS ---
function setupEventListeners() {
  // Navigation Arrows
  navBackBtn.addEventListener('click', goBack);
  navForwardBtn.addEventListener('click', goForward);

  // View Switchers
  viewItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      const id = item.getAttribute('id');
      if (id === 'liked-songs-nav') {
        navigateTo('liked');
      } else if (view) {
        navigateTo(view);
      }
    });
  });

  // Default Album Card click listeners (Home View)
  cardCloudPlaylist.addEventListener('click', () => navigateTo('playlist', 'cloud'));
  cardLocalPlaylist.addEventListener('click', () => navigateTo('playlist', 'local'));

  // Hero Play/Pause Click
  heroPlayBtn.addEventListener('click', () => {
    if (activePlaylistId === 'local') {
      togglePlay();
    } else {
      // Default playing full local Quran playlist
      playPlaylistDirectly(songsData.local, 'local');
    }
  });

  // Search Input Trigger
  searchInput.addEventListener('input', triggerSearch);
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    triggerSearch();
    searchInput.focus();
  });

  // Click on categories
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const tag = card.getAttribute('data-search-tag');
      searchInput.value = tag;
      triggerSearch();
      searchInput.focus();
    });
  });

  // Playback Control Buttons (Footer)
  btnPlayPause.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', playNext);
  btnPrev.addEventListener('click', playPrev);

  btnShuffle.addEventListener('click', () => {
    isShuffle = !isShuffle;
    btnShuffle.classList.toggle('active', isShuffle);
    showToast(isShuffle ? 'Shuffle enabled' : 'Shuffle disabled');
  });

  btnRepeat.addEventListener('click', () => {
    if (isRepeat === 'none') {
      isRepeat = 'all';
      btnRepeat.classList.add('active');
      btnRepeat.setAttribute('title', 'Repeat all');
      showToast('Repeat playlist enabled');
    } else if (isRepeat === 'all') {
      isRepeat = 'one';
      btnRepeat.classList.add('active');
      btnRepeat.querySelector('i').setAttribute('data-lucide', 'repeat-1');
      btnRepeat.setAttribute('title', 'Repeat one');
      showToast('Repeat track enabled');
    } else {
      isRepeat = 'none';
      btnRepeat.classList.remove('active');
      btnRepeat.querySelector('i').setAttribute('data-lucide', 'repeat');
      btnRepeat.setAttribute('title', 'Enable repeat');
      showToast('Repeat disabled');
    }
    lucide.createIcons();
  });

  // Audio Events
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressSlider.value = progress;
      updateSliderProgress(progressSlider, progress);
      
      // Update label
      const curM = Math.floor(audio.currentTime / 60);
      const curS = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
      currentTimeLabel.innerText = `${curM}:${curS}`;
    }
  });

  audio.addEventListener('ended', playNext);

  // Seek audio
  progressSlider.addEventListener('input', (e) => {
    if (audio.duration) {
      const seekTime = (e.target.value / 100) * audio.duration;
      audio.currentTime = seekTime;
      updateSliderProgress(progressSlider, e.target.value);
    }
  });

  // Volume control
  volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    audio.volume = val / 100;
    lastVolume = audio.volume;
    updateSliderProgress(volumeSlider, val);
    
    // Update speaker icon
    const volIcon = btnVolume.querySelector('i');
    if (val == 0) {
      volIcon.setAttribute('data-lucide', 'volume-x');
    } else if (val < 35) {
      volIcon.setAttribute('data-lucide', 'volume');
    } else if (val < 70) {
      volIcon.setAttribute('data-lucide', 'volume-1');
    } else {
      volIcon.setAttribute('data-lucide', 'volume-2');
    }
    lucide.createIcons();
  });

  btnVolume.addEventListener('click', () => {
    const volIcon = btnVolume.querySelector('i');
    if (audio.volume > 0) {
      lastVolume = audio.volume;
      audio.volume = 0;
      volumeSlider.value = 0;
      updateSliderProgress(volumeSlider, 0);
      volIcon.setAttribute('data-lucide', 'volume-x');
    } else {
      audio.volume = lastVolume;
      volumeSlider.value = lastVolume * 100;
      updateSliderProgress(volumeSlider, lastVolume * 100);
      volIcon.setAttribute('data-lucide', lastVolume < 0.35 ? 'volume' : (lastVolume < 0.7 ? 'volume-1' : 'volume-2'));
    }
    lucide.createIcons();
  });

  // Like track from footer player
  playerLikeBtn.addEventListener('click', () => {
    if (currentTrack) {
      toggleLikeTrack(currentTrack.id);
    }
  });

  // Fullscreen Overlay Toggle
  btnFullscreen.addEventListener('click', () => {
    fullscreenOverlay.classList.remove('hidden');
  });

  closeFullscreenBtn.addEventListener('click', () => {
    fullscreenOverlay.classList.add('hidden');
  });

  // Fullscreen Controls binding
  fsBtnPlayPause.addEventListener('click', togglePlay);
  fsBtnNext.addEventListener('click', playNext);
  fsBtnPrev.addEventListener('click', playPrev);

  // Modal Creation Overlay
  createPlaylistBtn.addEventListener('click', () => {
    playlistModal.classList.remove('hidden');
    playlistNameInput.focus();
  });

  const hideModal = () => {
    playlistModal.classList.add('hidden');
    playlistNameInput.value = '';
    playlistDescInput.value = '';
  };

  closePlaylistModal.addEventListener('click', hideModal);
  modalCancelBtn.addEventListener('click', hideModal);

  modalSaveBtn.addEventListener('click', () => {
    const name = playlistNameInput.value.trim();
    const desc = playlistDescInput.value.trim();
    createNewPlaylist(name, desc);
    hideModal();
  });

  // Playlist view actions
  playlistPlayBtn.addEventListener('click', () => {
    if (activePlaylistId) {
      // If we clicked play on currently playing playlist details, toggle play
      if (currentPlaylist.length > 0) {
        // Find if they are similar
        const isSame = (activePlaylistId === 'cloud' && currentPlaylist[0].id.startsWith('cloud')) ||
                       (activePlaylistId === 'local' && currentPlaylist[0].id.startsWith('local')) ||
                       (activePlaylistId === 'liked' && currentPlaylist.length === likedTracks.length); // simple check
        
        if (isSame) {
          togglePlay();
          return;
        }
      }

      // Otherwise play from start
      let tracks = [];
      if (activePlaylistId === 'cloud') tracks = songsData.cloud;
      else if (activePlaylistId === 'local') tracks = songsData.local;
      else if (activePlaylistId === 'liked') tracks = likedTracks.map(tid => getTrackById(tid)).filter(t => t !== null);
      else {
        const pl = customPlaylists.find(p => p.id === activePlaylistId);
        if (pl) tracks = pl.tracks.map(tid => getTrackById(tid)).filter(t => t !== null);
      }
      playPlaylistDirectly(tracks, activePlaylistId);
    }
  });

  playlistDeleteBtn.addEventListener('click', () => {
    if (activePlaylistId && activePlaylistId.startsWith('playlist-')) {
      if (confirm('Are you sure you want to delete this playlist?')) {
        deletePlaylist(activePlaylistId);
      }
    }
  });

  // Context Menu bindings
  cmLikeTrack.addEventListener('click', () => {
    if (contextMenuTrack) {
      toggleLikeTrack(contextMenuTrack.id);
      hideContextMenu();
    }
  });

  cmRemoveFromPlaylist.addEventListener('click', () => {
    if (contextMenuTrack && contextMenuPlaylistId && contextMenuPlaylistId.startsWith('playlist-')) {
      removeTrackFromPlaylist(contextMenuTrack.id, contextMenuPlaylistId);
      hideContextMenu();
    }
  });

  // Hide context menu on left click anywhere else
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#track-context-menu')) {
      hideContextMenu();
    }
  });
}
