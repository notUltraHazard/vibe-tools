(function () {
  const $ = (id) => document.getElementById(id);

  // Template geometry: 611 x 1048 image; the clear window for the cover is 600 x 900 at (0, 119)
  const W = 611, H = 1048, CX = 0, CY = 119, CW = 600, CH = 900;
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  const tpl = new Image();
  let tplReady = false;
  let cover = null;          // normalized 600x900 canvas
  let fileName = 'steam-case';

  function status(msg, isError) {
    const s = $('status');
    s.textContent = msg || '';
    s.classList.toggle('error', !!isError);
  }

  function loadImage(src, cors) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      if (cors) im.crossOrigin = 'anonymous';
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('load failed'));
      im.src = src;
    });
  }

  // Scale and center-crop any image to exactly 600 x 900
  function normalize(im) {
    const c = document.createElement('canvas');
    c.width = CW;
    c.height = CH;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    const s = Math.max(CW / im.naturalWidth, CH / im.naturalHeight);
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    g.drawImage(im, (CW - dw) / 2, (CH - dh) / 2, dw, dh);
    return c;
  }

  // Cover window path. Top corners stay square (the case header covers them); bottom corners round.
  function windowPath(r) {
    const x = CX, y = CY, w = CW, b = CY + CH;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, b - r);
    ctx.arcTo(x + w, b, x + w - r, b, r);
    ctx.lineTo(x + r, b);
    ctx.arcTo(x, b, x, b - r, r);
    ctx.closePath();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    windowPath(+$('radius').value);
    ctx.clip();
    if (cover) {
      ctx.drawImage(cover, CX, CY);
    } else {
      const g = ctx.createLinearGradient(0, CY, 0, CY + CH);
      g.addColorStop(0, '#2f2b5c');
      g.addColorStop(1, '#14122c');
      ctx.fillStyle = g;
      ctx.fillRect(CX, CY, CW, CH);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.font = '600 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Your cover goes here', CX + CW / 2, CY + CH / 2);
    }
    ctx.restore();
    if (tplReady) ctx.drawImage(tpl, 0, 0);
    $('download').disabled = !cover;
  }

  function setCover(im, name) {
    cover = normalize(im);
    fileName = name;
    draw();
  }

  // ---- Steam ----
  function parseAppId(input) {
    const s = input.trim();
    const m = s.match(/(?:\/apps?\/|rungameid\/|appid=)(\d+)/i);
    if (m) return m[1];
    return /^\d+$/.test(s) ? s : null;
  }

  const HOSTS = [
    'shared.fastly.steamstatic.com/store_item_assets/steam/apps',
    'cdn.cloudflare.steamstatic.com/steam/apps',
    'shared.akamai.steamstatic.com/store_item_assets/steam/apps',
  ];

  async function fetchSteamCover(id) {
    const urls = HOSTS.map((h) => `https://${h}/${id}/library_600x900.jpg`);
    try {
      // Direct from Steam's CDN (works when the CDN allows cross-origin image use)
      return await Promise.any(urls.map((u) => loadImage(u, true)));
    } catch (e) {
      // Fallback: same images through the images.weserv.nl proxy, which adds the CORS headers
      return await Promise.any(urls.map((u) => loadImage('https://images.weserv.nl/?url=' + encodeURIComponent(u), true)));
    }
  }

  async function onFetch() {
    const id = parseAppId($('steam').value);
    if (!id) {
      status('Paste a Steam store link (like store.steampowered.com/app/1245620) or an app ID.', true);
      return;
    }
    const btn = $('fetch');
    btn.disabled = true;
    status('Fetching cover…');
    try {
      setCover(await fetchSteamCover(id), 'steam-case-' + id);
      status('Cover loaded.');
    } catch (e) {
      status('Could not find cover art for app ' + id + '. Some games use a different file name, so download the 600 × 900 art from steamgriddb.com and upload it instead.', true);
    }
    btn.disabled = false;
  }

  $('fetch').addEventListener('click', onFetch);
  $('steam').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onFetch(); } });

  // ---- Upload ----
  $('upload').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const url = URL.createObjectURL(f);
    try {
      setCover(await loadImage(url), 'steam-case');
      status('Image loaded.');
    } catch (err) {
      status('That file could not be read as an image.', true);
    }
    URL.revokeObjectURL(url);
  });

  // ---- Controls ----
  $('radius').addEventListener('input', draw);

  $('reset').addEventListener('click', () => {
    cover = null;
    $('steam').value = '';
    $('radius').value = 8;
    status('');
    draw();
  });

  $('download').addEventListener('click', () => {
    if (!cover) return;
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName + '.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  });

  tpl.onload = () => { tplReady = true; draw(); };
  tpl.onerror = () => status('Could not load case.png. Make sure it sits next to index.html.', true);
  tpl.src = 'case.png';
  draw();
})();
