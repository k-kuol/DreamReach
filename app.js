import { fetchOpportunities, RELEVANT_CATEGORIES, REGION_OPTIONS } from './api.js';
import { loadScholarships, filterScholarships, LEVEL_OPTIONS } from './scholarships.js';
import { getSaved, toggleSaved } from './storage.js';
import { opportunityCard, scholarshipCard, renderList, loadingState, errorState } from './ui.js';
import { createCustomSelect } from './custom-select.js';

const state = {
  tab: 'internships', // internships | scholarships | saved
  search: '',
  category: '',
  region: '',
  level: '',
  sort: 'newest', // newest | oldest | az
  allJobs: [],
  allScholarships: [],
};

const resultsEl = document.getElementById('results');
const searchInput = document.getElementById('search-input');
const tabButtons = document.querySelectorAll('.tab-btn');
const filterBar = document.getElementById('filter-bar');
const resultsCount = document.getElementById('results-count');
const savedActions = document.getElementById('saved-actions');
const exportBtn = document.getElementById('export-btn');
const printBtn = document.getElementById('print-btn');

const categorySelectEl = document.getElementById('category-select');
const regionSelectEl = document.getElementById('region-select');
const levelSelectEl = document.getElementById('level-select');

const categorySelect = createCustomSelect(categorySelectEl, {
  options: RELEVANT_CATEGORIES,
  value: '',
  ariaLabel: 'Filter by category',
  onChange: (value) => {
    state.category = value;
    route();
  },
});

const regionSelect = createCustomSelect(regionSelectEl, {
  options: REGION_OPTIONS,
  value: '',
  ariaLabel: 'Filter by region',
  onChange: (value) => {
    state.region = value;
    route();
  },
});

const levelSelect = createCustomSelect(levelSelectEl, {
  options: LEVEL_OPTIONS,
  value: '',
  ariaLabel: 'Filter by study level',
  onChange: (value) => {
    state.level = value;
    route();
  },
});

const sortSelect = createCustomSelect(document.getElementById('sort-select'), {
  options: [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'az', label: 'A–Z' },
  ],
  value: 'newest',
  ariaLabel: 'Sort results',
  onChange: (value) => {
    state.sort = value;
    route();
  },
});

function populateCategories() {
  categorySelect.setOptions(RELEVANT_CATEGORIES);
}

/** Shows/hides the filter controls that only make sense for the active tab. */
function updateFilterVisibility() {
  const isInternships = state.tab === 'internships';
  const isScholarships = state.tab === 'scholarships';
  categorySelectEl.hidden = !isInternships;
  regionSelectEl.hidden = !isInternships;
  levelSelectEl.hidden = !isScholarships;
  savedActions.hidden = state.tab !== 'saved';
}

function onToggleSave(item, cardEl) {
  const nowSaved = toggleSaved(item);
  const btn = cardEl.querySelector('.save-btn');
  btn.classList.toggle('save-btn--active', nowSaved);
  btn.textContent = nowSaved ? '★ Saved' : '☆ Save';
  btn.setAttribute('aria-pressed', String(nowSaved));
  if (state.tab === 'saved') renderSaved();
}

function applySort(list, key) {
  const sorted = [...list];
  if (key === 'az') sorted.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));
  if (key === 'newest') sorted.sort((a, b) => {
    const dateDiff = new Date(b.postedAt || 0) - new Date(a.postedAt || 0);
    return dateDiff || (a.title || a.name).localeCompare(b.title || b.name);
  });
  if (key === 'oldest') sorted.sort((a, b) => {
    const dateDiff = new Date(a.postedAt || 0) - new Date(b.postedAt || 0);
    return dateDiff || (a.title || a.name).localeCompare(b.title || b.name);
  });
  return sorted;
}

function getCategoryLabel(value) {
  return RELEVANT_CATEGORIES.find((category) => category.value === value)?.label || '';
}

function filterJobs(list, { search = '', category = '', region = '' } = {}) {
  const term = search.trim().toLowerCase();
  const selectedCategory = category.trim();
  const categoryLabel = getCategoryLabel(selectedCategory).toLowerCase();
  const knownCategoryLabels = RELEVANT_CATEGORIES
    .filter((categoryOption) => categoryOption.value && categoryOption.value !== 'all-others')
    .map((categoryOption) => categoryOption.label.toLowerCase());
  const regionOption = REGION_OPTIONS.find((r) => r.value === region);
  const regionKeywords = regionOption ? regionOption.match : [];

  return list.filter((job) => {
    const lowerCategory = (job.category || '').toLowerCase();
    const lowerLocation = (job.location || '').toLowerCase();
    const searchable = [
      job.title,
      job.org,
      job.category,
      job.location,
      job.jobType,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesCategory = !selectedCategory
      || (selectedCategory === 'all-others' && !knownCategoryLabels.includes(lowerCategory))
      || lowerCategory === categoryLabel;
    const matchesRegion = !region || regionKeywords.some((kw) => lowerLocation.includes(kw));
    const matchesTerm = !term || searchable.includes(term);

    return matchesCategory && matchesRegion && matchesTerm;
  });
}

async function renderInternships() {
  filterBar.hidden = false;
  resultsEl.innerHTML = '';
  resultsEl.appendChild(loadingState('Fetching live internships & entry-level roles from Remotive…'));
  try {
    const jobs = await fetchOpportunities({ search: state.search, category: state.category });
    state.allJobs = jobs;
    const filtered = filterJobs(jobs, { search: state.search, category: state.category, region: state.region });
    const sorted = applySort(filtered, state.sort);
    resultsCount.textContent = `${sorted.length} result${sorted.length === 1 ? '' : 's'}`;
    renderList(resultsEl, sorted, opportunityCard, { onToggleSave });
  } catch (err) {
    resultsEl.innerHTML = '';
    resultsEl.appendChild(errorState(err.message, { onRetry: renderInternships }));
  }
}

async function renderScholarships() {
  filterBar.hidden = false;
  resultsEl.innerHTML = '';
  resultsEl.appendChild(loadingState('Loading scholarship programs…'));
  try {
    const all = await loadScholarships();
    state.allScholarships = all;
    const filtered = filterScholarships(all, { search: state.search, level: state.level });
    const sorted = applySort(filtered, state.sort);
    resultsCount.textContent = `${sorted.length} result${sorted.length === 1 ? '' : 's'}`;
    renderList(resultsEl, sorted, scholarshipCard, { onToggleSave });
  } catch (err) {
    resultsEl.innerHTML = '';
    resultsEl.appendChild(errorState(err.message, { onRetry: renderScholarships }));
  }
}

function renderSaved() {
  filterBar.hidden = true;
  const saved = getSaved();
  resultsCount.textContent = `${saved.length} saved`;
  resultsEl.innerHTML = '';
  if (!saved.length) {
    resultsEl.appendChild(loadingState('')); // placeholder replaced below
    resultsEl.innerHTML = '';
  }
  renderList(
    resultsEl,
    saved,
    (item, opts) => (item.jobType === 'scholarship'
      ? scholarshipCard({ id: item.id.replace('scholarship-', ''), name: item.title, provider: item.org, url: item.url, region: item.location, field: item.category, level: '', funding: '', cycle: '', summary: '' }, opts)
      : opportunityCard(item, opts)),
    { onToggleSave }
  );
}

function route() {
  updateFilterVisibility();
  if (state.tab === 'internships') return renderInternships();
  if (state.tab === 'scholarships') return renderScholarships();
  return renderSaved();
}

/** Escapes a value for safe inclusion in a CSV cell. */
function csvCell(value) {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function exportSavedAsCsv() {
  const saved = getSaved();
  const header = ['Title', 'Organization', 'Type', 'Location', 'Category', 'URL'];
  const rows = saved.map((item) => [
    item.title,
    item.org,
    item.jobType === 'scholarship' ? 'Scholarship' : (item.isInternship ? 'Internship' : 'Job'),
    item.location,
    item.category,
    item.url,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dreamreach-saved.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener('click', exportSavedAsCsv);
printBtn.addEventListener('click', () => window.print());

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('tab-btn--active'));
    btn.classList.add('tab-btn--active');
    state.tab = btn.dataset.tab;
    route();
  });
});

let searchTimeout;
searchInput.addEventListener('input', (e) => {
  state.search = e.target.value;
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(route, 400); // debounce so we don't hammer the API per keystroke
});

populateCategories();
route();
