(function () {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const search = document.getElementById('search');
  const tagBox = document.getElementById('tags');
  let tools = [];
  let activeTag = null;

  document.getElementById('year').textContent = new Date().getFullYear();

  // Theme toggle
  document.getElementById('theme').addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });

  // Press "/" to jump to search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== search) {
      e.preventDefault();
      search.focus();
    }
  });

  function el(tag, props, children) {
    const n = document.createElement(tag);
    Object.assign(n, props || {});
    (children || []).forEach((c) => n.append(c));
    return n;
  }

  function renderTags() {
    const all = [...new Set(tools.flatMap((t) => t.tags || []))].sort();
    tagBox.replaceChildren(...all.map((tag) => {
      const b = el('button', { className: 'tag', type: 'button', textContent: tag });
      b.setAttribute('aria-pressed', String(tag === activeTag));
      b.addEventListener('click', () => {
        activeTag = activeTag === tag ? null : tag;
        renderTags();
        render();
      });
      return b;
    }));
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const list = tools.filter((t) => {
      const text = [t.name, t.description, ...(t.tags || [])].join(' ').toLowerCase();
      return (!q || text.includes(q)) && (!activeTag || (t.tags || []).includes(activeTag));
    });

    grid.replaceChildren(...list.map((t) => el('a', { className: 'card', href: t.path }, [
      el('span', { className: 'icon', textContent: t.icon || '🧩' }),
      el('h2', { textContent: t.name }),
      el('p', { textContent: t.description }),
      el('span', { className: 'meta', textContent: (t.tags || []).join(', ') }),
    ])));

    empty.hidden = list.length > 0;
    if (!tools.length) {
      empty.replaceChildren('No tools yet. Add one to ', el('code', { textContent: 'tools.json' }), ' and it will show up here.');
    } else {
      empty.textContent = 'No tools match that search.';
    }
  }

  search.addEventListener('input', render);

  fetch('tools.json')
    .then((r) => r.json())
    .then((data) => { tools = data; renderTags(); render(); })
    .catch(() => { empty.hidden = false; empty.textContent = 'Could not load tools.json. If you opened index.html as a file, run a local server instead (see README).'; });
})();
