(function () {
  const $ = (id) => document.getElementById(id);
  const REPLYING = { en: 'Replying to', es: 'Respondiendo a', fr: 'En réponse à', de: 'Antwort an', pt: 'Respondendo a', it: 'In risposta a' };
  const DEMO = 'Create your custom Instagram comment 🔥';

  const silhouette = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88"><rect width="88" height="88" fill="#eceef2"/>' +
    '<circle cx="44" cy="34" r="14" fill="#8a8f9c"/><path d="M16 88c0-17 12-28 28-28s28 11 28 28z" fill="#8a8f9c"/></svg>');
  const verifiedIcon = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#0095f6" d="M12 1l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 23l-2.6-1.9-3.2.1-1-3L2.6 16.3l1-3-1-3 2.6-1.9 1-3 3.2.1z"/>' +
    '<path d="M7.6 12.3l3 3 5.8-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>');

  let avatar = silhouette;
  const stage = $('stage');

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render() {
    const name = $('username').value.trim();
    let comment = $('comment').value.trim();
    const replyTo = $('replyto').value.trim();
    const badge = $('badge').value;
    const demo = !name && !comment;
    if (demo) comment = DEMO;

    const card = el('div', 'ig-card ' + $('color').value);
    const img = el('img', 'ig-avatar');
    img.src = avatar;
    img.alt = '';
    card.append(img);

    const body = el('div', 'ig-body');
    if (name) {
      const u = el('div', 'ig-user');
      u.append(el('span', null, name));
      if (badge === 'verified') { const v = el('img'); v.src = verifiedIcon; v.alt = 'Verified'; u.append(v); }
      if (badge === 'creator') u.append(el('span', 'ig-pill', 'Creator'));
      if (badge === 'pinned') u.append(el('span', 'ig-pill', 'Pinned'));
      body.append(u);
    }
    if (comment) body.append(el('div', 'ig-text', comment));
    if (replyTo || demo) body.append(el('div', 'ig-reply', REPLYING[$('lang').value] + ' ' + (replyTo || 'username')));
    card.append(body);

    stage.replaceChildren(card);
    $('pic-thumb').src = avatar;
    $('count').textContent = $('username').value.length;
  }

  // ---- Picture ----
  function status(msg) { $('pic-status').textContent = msg || ''; }

  function cropToSquare(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        const s = Math.min(im.width, im.height), size = 256;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', 0.92));
      };
      im.onerror = reject;
      im.src = src;
    });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  // Offline fallback: a gradient circle with an initial
  function generatedAvatar() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const h = Math.floor(Math.random() * 360);
    const grad = g.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, `hsl(${h} 80% 62%)`);
    grad.addColorStop(1, `hsl(${(h + 50) % 360} 80% 48%)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const letter = ($('username').value.trim()[0] || String.fromCharCode(65 + Math.floor(Math.random() * 26))).toUpperCase();
    g.fillStyle = '#fff';
    g.font = '700 120px Figtree, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(letter, 128, 136);
    return c.toDataURL('image/png');
  }

  $('upload').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      avatar = await cropToSquare(await blobToDataURL(f));
      status('');
    } catch (err) { status('That file could not be read as an image.'); }
    e.target.value = '';
    render();
  });

  $('randomize').addEventListener('click', async () => {
    const btn = $('randomize');
    btn.disabled = true;
    status('');
    try {
      const group = Math.random() < 0.5 ? 'men' : 'women';
      const n = Math.floor(Math.random() * 100);
      const res = await fetch(`https://randomuser.me/api/portraits/${group}/${n}.jpg`);
      if (!res.ok) throw new Error('bad response');
      avatar = await blobToDataURL(await res.blob());
    } catch (err) {
      avatar = generatedAvatar();
      status('Could not reach the photo service, so a generated avatar was used.');
    }
    btn.disabled = false;
    render();
  });

  // ---- Reset / Download ----
  $('reset').addEventListener('click', () => {
    ['username', 'comment', 'replyto'].forEach((id) => ($(id).value = ''));
    $('badge').value = 'none';
    $('color').value = 'white';
    $('lang').value = 'en';
    avatar = silhouette;
    status('');
    render();
  });

  $('download').addEventListener('click', async () => {
    const btn = $('download');
    btn.disabled = true;
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(stage, { backgroundColor: null, scale: 3, useCORS: true });
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'instagram-comment.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, 'image/png');
    } catch (err) {
      status('Download failed. Try again, or take a screenshot of the card.');
    }
    btn.disabled = false;
  });

  ['username', 'comment', 'replyto', 'badge', 'color', 'lang'].forEach((id) => {
    $(id).addEventListener('input', render);
    $(id).addEventListener('change', render);
  });

  render();
})();
