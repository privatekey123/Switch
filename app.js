const previewVideo = document.getElementById('previewVideo');
const programVideo = document.getElementById('programVideo');
const currentSourceSelect = document.getElementById('currentSource');
const nextSourceSelect = document.getElementById('nextSource');
const refreshSourcesBtn = document.getElementById('refreshSources');
const setCurrentBtn = document.getElementById('setCurrent');
const setNextBtn = document.getElementById('setNext');
const cutBtn = document.getElementById('cutBtn');
const fadeBtn = document.getElementById('fadeBtn');
const fadeDurationInput = document.getElementById('fadeDuration');
const openProgramWindowBtn = document.getElementById('openProgramWindow');
const favoriteNameInput = document.getElementById('favoriteName');
const saveCurrentFavorite = document.getElementById('saveCurrentFavorite');
const saveNextFavorite = document.getElementById('saveNextFavorite');
const favoritesList = document.getElementById('favoritesList');
const loadFavoriteToCurrent = document.getElementById('loadFavoriteToCurrent');
const loadFavoriteToNext = document.getElementById('loadFavoriteToNext');
const deleteFavorite = document.getElementById('deleteFavorite');

const FAVORITES_KEY = 'switch_desktop_favorites';
let sourceMap = new Map();
let current = { id: null, stream: null };
let next = { id: null, stream: null };

function getFavorites() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
}
function setFavorites(data) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(data));
}
function refreshFavoritesUI() {
  favoritesList.innerHTML = '';
  for (const fav of getFavorites()) {
    const option = document.createElement('option');
    option.value = fav.name;
    option.textContent = `${fav.name} (${fav.sourceName})`;
    favoritesList.appendChild(option);
  }
}

async function loadSources() {
  const sources = await window.switchApi.listSources();
  sourceMap = new Map(sources.map((s) => [s.id, s]));

  for (const select of [currentSourceSelect, nextSourceSelect]) {
    select.innerHTML = '';
    for (const source of sources) {
      const option = document.createElement('option');
      option.value = source.id;
      option.textContent = source.name;
      select.appendChild(option);
    }
  }
}

async function streamFromSourceId(sourceId) {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
        minWidth: 1280,
        minHeight: 720,
        maxWidth: 7680,
        maxHeight: 4320
      }
    }
  });
}

async function setCurrentFromSelection() {
  const id = currentSourceSelect.value;
  if (!id) return;
  const stream = await streamFromSourceId(id);
  if (current.stream) current.stream.getTracks().forEach((t) => t.stop());
  current = { id, stream };
  programVideo.srcObject = stream;
  window.switchApi.pushProgramStream(id);
}

async function setNextFromSelection() {
  const id = nextSourceSelect.value;
  if (!id) return;
  const stream = await streamFromSourceId(id);
  if (next.stream) next.stream.getTracks().forEach((t) => t.stop());
  next = { id, stream };
  previewVideo.srcObject = stream;
}

function cutToNext() {
  if (!next.stream) return;
  if (current.stream) current.stream.getTracks().forEach((t) => t.stop());
  current = next;
  next = { id: null, stream: null };
  programVideo.srcObject = current.stream;
  previewVideo.srcObject = null;
  window.switchApi.pushProgramStream(current.id);
}

function fadeToNext() {
  if (!next.stream) return;
  const duration = Math.max(100, Number(fadeDurationInput.value) || 800);
  const overlay = document.createElement('video');
  overlay.autoplay = true;
  overlay.muted = true;
  overlay.playsInline = true;
  overlay.srcObject = next.stream;
  Object.assign(overlay.style, {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
    opacity: '0', transition: `opacity ${duration}ms linear`
  });
  const wrapper = programVideo.parentElement;
  wrapper.style.position = 'relative';
  wrapper.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  setTimeout(() => {
    if (current.stream) current.stream.getTracks().forEach((t) => t.stop());
    current = next;
    next = { id: null, stream: null };
    programVideo.srcObject = current.stream;
    previewVideo.srcObject = null;
    overlay.remove();
    window.switchApi.pushProgramStream(current.id);
  }, duration + 40);
}

function saveFavorite(kind) {
  const name = favoriteNameInput.value.trim();
  if (!name) return;
  const ref = kind === 'current' ? current : next;
  if (!ref.id) return;
  const src = sourceMap.get(ref.id);
  const favorites = getFavorites().filter((f) => f.name !== name);
  favorites.push({ name, sourceId: ref.id, sourceName: src?.name || ref.id });
  setFavorites(favorites);
  refreshFavoritesUI();
}

function applyFavorite(target) {
  const name = favoritesList.value;
  const favorite = getFavorites().find((f) => f.name === name);
  if (!favorite) return;
  const select = target === 'current' ? currentSourceSelect : nextSourceSelect;
  select.value = favorite.sourceId;
  return target === 'current' ? setCurrentFromSelection() : setNextFromSelection();
}

refreshSourcesBtn.addEventListener('click', () => loadSources().catch((e) => alert(e.message)));
setCurrentBtn.addEventListener('click', () => setCurrentFromSelection().catch((e) => alert(e.message)));
setNextBtn.addEventListener('click', () => setNextFromSelection().catch((e) => alert(e.message)));
cutBtn.addEventListener('click', cutToNext);
fadeBtn.addEventListener('click', fadeToNext);
openProgramWindowBtn.addEventListener('click', () => window.switchApi.openProgramWindow());
saveCurrentFavorite.addEventListener('click', () => saveFavorite('current'));
saveNextFavorite.addEventListener('click', () => saveFavorite('next'));
loadFavoriteToCurrent.addEventListener('click', () => applyFavorite('current'));
loadFavoriteToNext.addEventListener('click', () => applyFavorite('next'));
deleteFavorite.addEventListener('click', () => {
  setFavorites(getFavorites().filter((f) => f.name !== favoritesList.value));
  refreshFavoritesUI();
});

refreshFavoritesUI();
loadSources().catch((e) => alert(e.message));
