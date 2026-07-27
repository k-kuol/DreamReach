/**
 * custom-select.js
 * A small, dependency-free, accessible replacement for <select>.
 * Native <select> option lists can't be reliably restyled across browsers
 * (Chrome/Edge in particular ignore most CSS on the popup), so this renders
 * our own button + listbox that we fully control visually, following the
 * ARIA "listbox" pattern for keyboard and screen-reader support.
 *
 * Usage:
 *   const dropdown = createCustomSelect(containerEl, {
 *     options: [{ value: '', label: 'All categories' }, ...],
 *     value: '',
 *     ariaLabel: 'Filter by category',
 *     onChange: (value) => { ... },
 *   });
 *   dropdown.setOptions(newOptions);
 *   dropdown.getValue();
 *   dropdown.setValue('foo');
 */

let instanceCount = 0;

function createCustomSelect(root, { options = [], value = '', onChange, ariaLabel = '' } = {}) {
  if (!root.id) root.id = `custom-select-${++instanceCount}`;

  root.classList.add('custom-select');
  root.innerHTML = `
    <button type="button" class="custom-select__button" aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(ariaLabel)}">
      <span class="custom-select__value"></span>
      <span class="custom-select__arrow" aria-hidden="true">▾</span>
    </button>
    <ul class="custom-select__list" role="listbox" tabindex="-1" hidden></ul>
  `;

  const button = root.querySelector('.custom-select__button');
  const valueEl = root.querySelector('.custom-select__value');
  const list = root.querySelector('.custom-select__list');

  let currentOptions = options;
  let currentValue = value;
  let activeIndex = -1;

  function render() {
    list.innerHTML = currentOptions
      .map(
        (opt, i) => `
      <li role="option" class="custom-select__option" id="${root.id}-opt-${i}" data-value="${escapeHtml(opt.value)}" aria-selected="${opt.value === currentValue}">${escapeHtml(opt.label)}</li>
    `
      )
      .join('');
    const selected = currentOptions.find((o) => o.value === currentValue);
    valueEl.textContent = selected ? selected.label : '';
  }

  function open() {
    if (!currentOptions.length) return;
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    activeIndex = Math.max(
      currentOptions.findIndex((o) => o.value === currentValue),
      0
    );
    updateActive();
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKeydown);
  }

  function close() {
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.removeAttribute('aria-activedescendant');
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onDocKeydown);
  }

  function onDocClick(e) {
    if (!root.contains(e.target)) close();
  }

  function onDocKeydown(e) {
    if (e.key === 'Escape') {
      close();
      button.focus();
    }
  }

  function updateActive() {
    [...list.children].forEach((li, i) => li.classList.toggle('is-active', i === activeIndex));
    const activeEl = list.children[activeIndex];
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
      button.setAttribute('aria-activedescendant', activeEl.id);
    }
  }

  function selectIndex(i) {
    if (i < 0 || i >= currentOptions.length) return;
    const changed = currentOptions[i].value !== currentValue;
    currentValue = currentOptions[i].value;
    render();
    close();
    button.focus();
    if (changed && onChange) onChange(currentValue);
  }

  button.addEventListener('click', () => {
    if (list.hidden) open();
    else close();
  });

  button.addEventListener('keydown', (e) => {
    const openKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' '];
    if (list.hidden) {
      if (openKeys.includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentOptions.length - 1);
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive();
    } else if (e.key === 'Home') {
      e.preventDefault();
      activeIndex = 0;
      updateActive();
    } else if (e.key === 'End') {
      e.preventDefault();
      activeIndex = currentOptions.length - 1;
      updateActive();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectIndex(activeIndex);
    } else if (e.key === 'Tab') {
      close();
    }
  });

  list.addEventListener('click', (e) => {
    const li = e.target.closest('.custom-select__option');
    if (!li) return;
    selectIndex([...list.children].indexOf(li));
  });

  render();

  return {
    setOptions(nextOptions) {
      currentOptions = nextOptions;
      if (!currentOptions.some((o) => o.value === currentValue)) {
        currentValue = currentOptions[0] ? currentOptions[0].value : '';
      }
      render();
    },
    getValue() {
      return currentValue;
    },
    setValue(v) {
      currentValue = v;
      render();
    },
  };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

export { createCustomSelect };
