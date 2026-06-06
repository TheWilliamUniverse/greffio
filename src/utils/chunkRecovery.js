const CHUNK_RELOAD_KEY = 'greffio_chunk_reloaded';
const CHUNK_RELOAD_AT_KEY = 'greffio_chunk_reload';

export const isChunkLoadError = (message = '') => /Loading chunk|ChunkLoadError|dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module/i.test(String(message));

export const reloadForChunkError = () => {
  if (typeof window === 'undefined') return false;
  if (window.sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
  window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.sessionStorage.setItem(CHUNK_RELOAD_AT_KEY, String(Date.now()));
  window.location.reload();
  return true;
};

export const clearChunkReloadGuard = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
};
