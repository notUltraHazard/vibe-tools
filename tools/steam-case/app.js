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
  let nameTouched = false;   // true once the user edits the file name themselves

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

  function draw() {
    ctx.clearRect(0, 0, W, H);
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
    if (tplReady) ctx.drawImage(tpl, 0, 0);
    $('download').disabled = !cover;
  }

  function setCover(im) {
    cover = normalize(im);
    draw();
  }

  // ---- File name ----
  function setName(name) { $('fname').value = name; }
  function safeName() {
    const n = $('fname').value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim();
    return n || 'steam-case';
  }
  $('fname').addEventListener('input', () => { nameTouched = true; });

  // ---- Steam ----
  function parseAppId(input) {
    const s = input.trim();
    const m = s.match(/(?:\/apps?\/|rungameid\/|appid=)(\d+)/i);
    if (m) return m[1];
    return /^\d+$/.test(s) ? s : null;
  }

  // store.steampowered.com/app/1245620/Elden_Ring/  ->  "Elden Ring"
  function nameFromLink(input) {
    const m = input.match(/\/app\/\d+\/([^\/?#]+)/i);
    if (!m) return null;
    try { return decodeURIComponent(m[1]).replace(/_/g, ' ').trim() || null; } catch (e) { return null; }
  }

  // Best effort: ask Steam's store API for the exact title (via a CORS proxy, since Steam blocks direct browser calls)
  async function lookupName(id) {
    const target = 'https://store.steampowered.com/api/appdetails?appids=' + id + '&filters=basic';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(target), { signal: ctrl.signal });
      const data = (await res.json())[id];
      return data && data.success && data.data && data.data.name ? data.data.name : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
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
    const input = $('steam').value;
    const id = parseAppId(input);
    if (!id) {
      status('Paste a Steam store link (like store.steampowered.com/app/1245620) or an app ID.', true);
      return;
    }
    const btn = $('fetch');
    btn.disabled = true;
    status('Fetching cover…');
    try {
      setCover(await fetchSteamCover(id));
    } catch (e) {
      status('Could not find cover art for app ' + id + '. Some games use a different file name, so download the 600 × 900 art from steamgriddb.com and upload it instead.', true);
      btn.disabled = false;
      return;
    }
    btn.disabled = false;

    // Name the file after the game: the link's title first, then try for the exact title from Steam
    nameTouched = false;
    const fromLink = nameFromLink(input);
    setName(fromLink || 'steam-case-' + id);
    status('Cover loaded.');
    const exact = await lookupName(id);
    if (exact && !nameTouched) setName(exact);
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
      setCover(await loadImage(url));
      status('Image loaded.');
    } catch (err) {
      status('That file could not be read as an image.', true);
    }
    URL.revokeObjectURL(url);
  });

  $('reset').addEventListener('click', () => {
    cover = null;
    nameTouched = false;
    $('steam').value = '';
    setName('');
    status('');
    draw();
  });

  // ---- Download ----
  function canvasToBlob() {
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/png'));
  }

  function classicDownload(blob, fileName) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  $('download').addEventListener('click', async () => {
    if (!cover) return;
    const fileName = safeName() + '.png';

    // Chrome / Edge: let the user pick where to save
    if (window.showSaveFilePicker) {
      let handle;
      try {
        handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'PNG image', accept: { 'image/png': ['.png'] } }],
        });
      } catch (e) {
        if (e && e.name === 'AbortError') return;   // user closed the dialog
        handle = null;                               // picker unavailable, use the normal download
      }
      if (handle) {
        try {
          const writable = await handle.createWritable();
          await writable.write(await canvasToBlob());
          await writable.close();
          status('Saved ' + handle.name);
          return;
        } catch (e) {
          status('Could not save to that location. Downloading normally instead.', true);
        }
      }
    }

    // Firefox / Safari: normal download (the browser decides where it goes)
    try {
      classicDownload(await canvasToBlob(), fileName);
    } catch (e) {
      status('Download failed. Try again.', true);
    }
  });

  tpl.onload = () => { tplReady = true; draw(); };
  tpl.onerror = () => status('Could not load case.png. Make sure it sits next to index.html.', true);
  tpl.src = 'case.png';
  draw();
})();
