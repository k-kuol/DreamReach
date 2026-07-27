/**
 * scholarships.js
 * Loads the curated scholarship dataset (data/scholarships.json) and provides
 * filter/search helpers. This is a maintained, hand-curated dataset rather than
 * a live third-party API. See README for why (no reliable free scholarship
 * API exists at the time of writing). It lives alongside the live Remotive
 * internship/job data to give the app full coverage of both opportunity types.
 */

let cache = null;

async function loadScholarships() {
  if (cache) return cache;
  let response;
  try {
    response = await fetch('scholarships.json');
  } catch (err) {
    throw new Error('Could not load the scholarships dataset. Check your connection and try again.');
  }
  if (!response.ok) {
    throw new Error('The scholarships dataset failed to load.');
  }
  try {
    cache = await response.json();
  } catch (err) {
    throw new Error('The scholarships dataset is malformed.');
  }
  return cache;
}

function filterScholarships(list, { search = '', level = '' } = {}) {
  const term = search.trim().toLowerCase();
  return list.filter((s) => {
    const searchable = [
      s.name,
      s.field,
      s.region,
      s.provider,
      s.level,
      s.summary,
      ...(Array.isArray(s.tags) ? s.tags : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesTerm = !term || searchable.includes(term);
    const matchesLevel = !level || s.level.toLowerCase().includes(level.toLowerCase());
    return matchesTerm && matchesLevel;
  });
}

/**
 * Curated level filter options. Scholarship "level" fields are free text
 * (e.g. "Undergraduate & Graduate", "Graduate (Master's)"), so this filters
 * by a case-insensitive substring match rather than an exact enum.
 */
const LEVEL_OPTIONS = [
  { value: '', label: 'All levels' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'phd', label: 'PhD' },
];

export { loadScholarships, filterScholarships, LEVEL_OPTIONS };
