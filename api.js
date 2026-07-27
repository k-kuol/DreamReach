/**
 * api.js
 * Handles all communication with the Remotive public jobs API.
 * Docs: https://remotive.com/api/remote-jobs (see README for attribution)
 * No API key required. Remotive's API is free and open.
 */

const REMOTIVE_BASE = 'https://remotive.com/api/remote-jobs';
const REQUEST_TIMEOUT_MS = 10000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — Remotive listings don't change second-to-second
const CACHE_PREFIX = 'dreamreach.cache.';

/** Reads a cached response for the given search/category pair, if still fresh. */
function readCache(key) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { timestamp, jobs } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return jobs;
  } catch (err) {
    return null; // storage disabled/unavailable — just skip caching
  }
}

/** Writes a fresh response to the cache. Fails silently if storage is unavailable/full. */
function writeCache(key, jobs) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ timestamp: Date.now(), jobs }));
  } catch (err) {
    // ignore — caching is a performance nicety, not a requirement
  }
}

/**
 * Fetches jobs/internships from Remotive, with an optional search term and category.
 * Throws a descriptive Error on failure so callers can render a clear message.
 * Responses are cached in sessionStorage for a few minutes to avoid re-hitting
 * the API for the same query within a browsing session.
 */
async function fetchOpportunities({ search = '', category = '' } = {}) {
  const key = `${search.trim().toLowerCase()}|${category}`;
  const cached = readCache(key);
  if (cached) return cached;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);

  const url = params.toString() ? `${REMOTIVE_BASE}?${params.toString()}` : REMOTIVE_BASE;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('The request timed out. Remotive may be slow to respond. Try again in a moment.');
    }
    throw new Error('Could not reach Remotive. Check your internet connection and try again.');
  }
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Remotive returned an error (status ${response.status}). Try again shortly.`);
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error('Remotive sent back a response we could not read. Try again shortly.');
  }

  if (!Array.isArray(data.jobs)) {
    throw new Error('Unexpected data shape from Remotive.');
  }

  const jobs = data.jobs.map(normalizeJob);
  writeCache(key, jobs);
  return jobs;
}

/** Normalizes a raw Remotive job record into the shape the UI expects. */
function normalizeJob(job) {
  return {
    id: `remotive-${job.id}`,
    source: 'remotive',
    title: job.title || 'Untitled role',
    org: job.company_name || 'Unknown organization',
    logo: job.company_logo || '',
    category: job.category || 'General',
    jobType: job.job_type || '',
    location: job.candidate_required_location || 'Remote (unspecified)',
    postedAt: job.publication_date || null,
    url: job.url,
    salary: job.salary || '',
    isInternship: /intern/i.test(job.job_type || '') || /intern/i.test(job.title || ''),
  };
}

/** Static list of Remotive categories relevant to entry-level / student search. */
const RELEVANT_CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'software-dev', label: 'Software Development' },
  { value: 'data', label: 'Data' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'writing', label: 'Writing' },
  { value: 'business', label: 'Business' },
  { value: 'customer-support', label: 'Customer Support' },
  { value: 'product', label: 'Product' },
  { value: 'all-others', label: 'Other' },
];

/**
 * Coarse region filter for internships. Remotive's candidate_required_location
 * is free text (e.g. "USA", "UK, Europe", "Worldwide"), so this filters by a
 * simple case-insensitive substring match rather than an exact enum.
 */
const REGION_OPTIONS = [
  { value: '', label: 'All regions', match: [] },
  { value: 'worldwide', label: 'Worldwide', match: ['worldwide', 'anywhere'] },
  { value: 'usa', label: 'USA', match: ['usa', 'united states', 'u.s.'] },
  { value: 'canada', label: 'Canada', match: ['canada'] },
  { value: 'uk', label: 'UK', match: ['uk', 'united kingdom'] },
  { value: 'europe', label: 'Europe', match: ['europe'] },
  { value: 'asia', label: 'Asia', match: ['asia'] },
  { value: 'africa', label: 'Africa', match: ['africa'] },
  { value: 'latam', label: 'Latin America', match: ['latam', 'latin america', 'south america'] },
];

export { fetchOpportunities, RELEVANT_CATEGORIES, REGION_OPTIONS };
