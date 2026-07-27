/**
 * storage.js
 * Manages the user's saved/bookmarked opportunities in localStorage.
 * Each saved item stores just enough to render a card without re-fetching.
 */

const STORAGE_KEY = 'dreamreach.saved.v1';

function getSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function isSaved(id) {
  return getSaved().some((item) => item.id === id);
}

function toggleSaved(item) {
  const saved = getSaved();
  const idx = saved.findIndex((s) => s.id === item.id);
  if (idx >= 0) {
    saved.splice(idx, 1);
  } else {
    saved.push(item);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (err) {
    // Storage may be full or disabled (private browsing). Fail silently,
    // the UI simply won't persist the bookmark this session.
  }
  return isSaved(item.id);
}

export { getSaved, isSaved, toggleSaved };
