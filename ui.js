/**
 * ui.js
 * Pure rendering functions. Nothing here talks to the network or storage
 * directly — it receives data and a few callbacks, and returns/injects DOM.
 */

import { isSaved } from './storage.js';

function timeAgo(dateString) {
  if (!dateString) return '';
  const then = new Date(dateString);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function opportunityCard(job, { onToggleSave } = {}) {
  const saved = isSaved(job.id);
  const destination = job.url ? escapeHtml(job.url) : '#';
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <div class="card__top">
      <span class="badge badge--${job.isInternship ? 'internship' : 'job'}">
        ${job.isInternship ? 'Internship' : (job.jobType || 'Opportunity').replace('_', ' ')}
      </span>
      <button class="save-btn ${saved ? 'save-btn--active' : ''}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save this opportunity'}">
        ${saved ? '★ Saved' : '☆ Save'}
      </button>
    </div>
    <h3 class="card__title">${escapeHtml(job.title)}</h3>
    <p class="card__org">${escapeHtml(job.org)}</p>
    <dl class="card__meta">
      <div><dt>Location</dt><dd>${escapeHtml(job.location)}</dd></div>
      <div><dt>Category</dt><dd>${escapeHtml(job.category)}</dd></div>
      ${job.postedAt ? `<div><dt>Posted</dt><dd>${timeAgo(job.postedAt)}</dd></div>` : ''}
    </dl>
    <a class="card__cta" href="${destination}" target="_blank" rel="noopener noreferrer">View listing →</a>
  `;
  card.querySelector('.save-btn').addEventListener('click', () => onToggleSave && onToggleSave(job, card));
  return card;
}

function scholarshipCard(s, { onToggleSave } = {}) {
  const item = { id: `scholarship-${s.id}`, title: s.name, org: s.provider, url: s.url, isInternship: false, jobType: 'scholarship', location: s.region, category: s.field, postedAt: null };
  const saved = isSaved(item.id);
  const destination = s.url ? escapeHtml(s.url) : '#';
  const card = document.createElement('article');
  card.className = 'card card--scholarship';
  card.innerHTML = `
    <div class="card__top">
      <span class="badge badge--scholarship">${escapeHtml(s.level)}</span>
      <button class="save-btn ${saved ? 'save-btn--active' : ''}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save this opportunity'}">
        ${saved ? '★ Saved' : '☆ Save'}
      </button>
    </div>
    <h3 class="card__title">${escapeHtml(s.name)}</h3>
    <p class="card__org">${escapeHtml(s.provider)}</p>
    <p class="card__summary">${escapeHtml(s.summary)}</p>
    <dl class="card__meta">
      <div><dt>Region</dt><dd>${escapeHtml(s.region)}</dd></div>
      <div><dt>Field</dt><dd>${escapeHtml(s.field)}</dd></div>
      <div><dt>Funding</dt><dd>${escapeHtml(s.funding)}</dd></div>
      <div><dt>Cycle</dt><dd>${escapeHtml(s.cycle)}</dd></div>
    </dl>
    <a class="card__cta" href="${destination}" target="_blank" rel="noopener noreferrer">Official page →</a>
  `;
  card.querySelector('.save-btn').addEventListener('click', () => onToggleSave && onToggleSave(item, card));
  return card;
}

function renderList(container, items, renderFn, opts) {
  container.innerHTML = '';
  if (!items.length) {
    container.appendChild(emptyState());
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach((item) => frag.appendChild(renderFn(item, opts)));
  container.appendChild(frag);
}

function emptyState(message = 'Nothing matches yet. Try a broader search or clear a filter.') {
  const div = document.createElement('div');
  div.className = 'state state--empty';
  div.innerHTML = `<p>${escapeHtml(message)}</p>`;
  return div;
}

function loadingState(message = 'Loading opportunities…') {
  const div = document.createElement('div');
  div.className = 'state state--loading';
  div.innerHTML = `<div class="spinner" aria-hidden="true"></div><p>${escapeHtml(message)}</p>`;
  return div;
}

function errorState(message, { onRetry } = {}) {
  const div = document.createElement('div');
  div.className = 'state state--error';
  div.innerHTML = `<p>${escapeHtml(message)}</p>${onRetry ? '<button class="retry-btn">Try again</button>' : ''}`;
  if (onRetry) div.querySelector('.retry-btn').addEventListener('click', onRetry);
  return div;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

export { opportunityCard, scholarshipCard, renderList, emptyState, loadingState, errorState };
