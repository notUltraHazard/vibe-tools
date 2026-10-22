(function () {
  const $ = (id) => document.getElementById(id);
  const enc = encodeURIComponent;
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');

  // ---------- Look (measured from a real Steam discount tag) ----------
  const COL = { green: '#4c6b22', blue: '#344654', lime: '#beee11', gray: '#80817a' };
  const H = 140, RADIUS = 38;
  const FONTS = {
    mulish: '"Mulish", Arial, sans-serif', nunito: '"Nunito Sans", Arial, sans-serif',
    figtree: '"Figtree", Arial, sans-serif', arial: 'Arial, Helvetica, sans-serif',
  };

  // ---------- Settings ----------
  const store = {
    get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const getProxy = () => store.get('steam-proxy').trim();
  $('proxy').value = getProxy();
  $('saveProxy').addEventListener('click', () => { store.set('steam-proxy', $('proxy').value.trim()); status('Proxy saved.'); });

  // ---------- Steam lookups ----------
  const proxied = (w, url) => w.replace(/\/+$/, '') + '/?url=' + enc(url);
  async function fetchJSON(url) {
    const tries = [url];
    const w = getProxy();
    if (w) tries.unshift(proxied(w, url));
    tries.push('https://corsproxy.io/?url=' + enc(url));
    tries.push('https://api.allorigins.win/raw?url=' + enc(url));
    let last;
    for (const u of tries) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(u, { signal: ctrl.signal });
        if (!r.ok) { last = new Error('HTTP ' + r.status); continue; }
        return await r.json();
      } catch (e) { last = e; } finally { clearTimeout(t); }
    }
    throw last || new Error('request failed');
  }

  function parseAppId(input) {
    const s = input.trim();
    const m = s.match(/(?:\/apps?\/|rungameid\/|appid=)(\d+)/i);
    if (m) return m[1];
    return /^\d+$/.test(s) ? s : null;
  }
  async function searchSteam(q) {
    const j = await fetchJSON(`https://store.steampowered.com/api/storesearch/?term=${enc(q)}&l=english&cc=${$('cc').value}`);
    return (j.items || []).filter((i) => !i.type || i.type === 'app').slice(0, 8).map((i) => ({ name: i.name, appid: i.id, img: i.tiny_image }));
  }
  async function getPrice(appid) {
    const j = await fetchJSON(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=${$('cc').value}&l=english&filters=basic,price_overview`);
    const d = j && j[appid];
    if (!d || !d.success) throw new Error('Steam has no store page for that app.');
    return { name: d.data && d.data.name, price: d.data && d.data.price_overview };
  }

  // ---------- Price helpers ----------
  function parseMoney(s) {
    const m = (s || '').replace(/[^\d.,]/g, '');
    if (!m) return NaN;
    const lc = m.lastIndexOf(','), ld = m.lastIndexOf('.');
    const dec = Math.max(lc, ld);
    if (dec < 0) return parseFloat(m);
    const after = m.length - dec - 1;
    if (after === 3 && (lc < 0 || ld < 0)) return parseFloat(m.replace(/[.,]/g, ''));
    return parseFloat(m.slice(0, dec).replace(/[.,]/g, '') + '.' + m.slice(dec + 1));
  }
  function formatPrice(raw, fmt) {
    if (!raw) return '';
    if (fmt !== '{p}' && /^[\d.,\s]+$/.test(raw)) return fmt.replace('{p}', raw);
    return raw;
  }
  function syncAuto() {
    const on = $('auto').checked;
    $('pct').disabled = on;
    if (!on) return;
    const o = parseMoney($('orig').value), f = parseMoney($('final').value);
    $('pct').value = o > 0 && f >= 0 && f < o ? String(Math.round((1 - f / o) * 100)) : '';
  }

  // ---------- Drawing ----------
  let rid = 0;

  // Pick a font size so that digits are exactly `digitH` pixels tall (works for any font)
  function sizeFor(weight, digitH, fam) {
    ctx.font = `${weight} 100px ${fam}`;
    const a = ctx.measureText('0').actualBoundingBoxAscent || 70;
    return (digitH * 100) / a;
  }
  function ink(text, font) {
    ctx.font = font;
    const m = ctx.measureText(text);
    return { l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight };
  }
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  async function render() {
    const id = ++rid;
    const fam = FONTS[$('font').value];
    const sample = $('orig').value + $('final').value + $('fmt').value + '0123456789-%';
    try { await Promise.all(['600', '700'].map((w) => document.fonts.load(`${w} 40px ${fam}`, sample))); } catch (e) {}
    if (id !== rid) return;
    paint(fam);
  }

  function paint(fam) {
    const g = ctx, S = +$('scale').value, fmt = $('fmt').value;
    const origTxt = formatPrice($('orig').value.trim(), fmt);
    const finalTxt = formatPrice($('final').value.trim(), fmt);
    const pctNum = parseInt($('pct').value.replace(/\D/g, ''), 10) || 0;
    const showPct = $('showpct').checked && pctNum > 0;
    const showOrig = $('showorig').checked && origTxt !== '';

    const szP = sizeFor(700, 80, fam), szF = sizeFor(600, 33, fam), szO = sizeFor(600, 26, fam);
    const fP = `700 ${szP}px ${fam}`, fF = `600 ${szF}px ${fam}`, fO = `600 ${szO}px ${fam}`;
    const pctText = '-' + pctNum + '%';
    const iP = showPct ? ink(pctText, fP) : null;
    const iF = finalTxt ? ink(finalTxt, fF) : { l: 0, r: 0, w: 0 };
    const iO = showOrig ? ink(origTxt, fO) : null;

    const leftW = showPct ? Math.ceil(iP.w + 18 + 23) : 0;
    const rightW = Math.ceil(Math.max(iF.w, iO ? iO.w : 0, 60) + 15 + 14);
    const W = leftW + rightW;

    canvas.width = W * S;
    canvas.height = H * S;
    canvas.style.width = W + 'px';
    g.setTransform(S, 0, 0, S, 0, 0);
    g.clearRect(0, 0, W, H);

    g.save();
    rr(g, 0, 0, W, H, RADIUS);
    g.clip();
    if (leftW) { g.fillStyle = COL.green; g.fillRect(0, 0, leftW, H); }
    g.fillStyle = COL.blue;
    g.fillRect(leftW, 0, rightW, H);
    g.restore();

    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    if (showPct) {
      g.font = fP; g.fillStyle = COL.lime;
      g.fillText(pctText, 18 + iP.l, 109);
    }
    const cx = leftW + rightW / 2;
    if (finalTxt) {
      g.font = fF; g.fillStyle = COL.lime;
      g.fillText(finalTxt, cx - (iF.r - iF.l) / 2, showOrig ? 109 : 70 + 33 / 2);
    }
    if (showOrig) {
      g.font = fO; g.fillStyle = COL.gray;
      g.fillText(origTxt, cx - (iO.r - iO.l) / 2, 54);
      // Steam's slanted strike-through
      g.save();
      g.translate(cx, 54 - 13);
      g.rotate(-10 * Math.PI / 180);
      g.fillRect(-iO.w / 2, -2.25, iO.w, 4.5);
      g.restore();
    }
    $('size').textContent = `${canvas.width} × ${canvas.height} px`;
  }

  // ---------- Status + search UI ----------
  let nameTouched = false;
  const setName = (n) => { $('fname').value = n; };
  $('fname').addEventListener('input', () => { nameTouched = true; });
  function status(msg, isError) { const s = $('status'); s.textContent = msg || ''; s.classList.toggle('error', !!isError); }
  const hint = (m) => { $('find-hint').textContent = m || ''; };

  async function useGame(game) {
    $('go').disabled = true;
    status('Getting price…');
    try {
      const r = await getPrice(game.appid);
      const name = r.name || game.name;
      nameTouched = false;
      if (name) setName(name);
      if (!r.price) {
        status(`${name || 'This game'} has no price on Steam in this region (free, unreleased or not sold there). Enter it manually.`, true);
      } else {
        const p = r.price;
        $('final').value = p.final_formatted || '';
        $('orig').value = p.discount_percent > 0 ? (p.initial_formatted || '') : '';
        $('fmt').value = '{p}';       // Steam already gives the full formatted text
        $('auto').checked = false;
        $('pct').value = p.discount_percent > 0 ? String(p.discount_percent) : '';
        syncAuto();
        $('showpct').checked = p.discount_percent > 0;
        $('showorig').checked = p.discount_percent > 0;
        status(p.discount_percent > 0
          ? `${name}: ${p.initial_formatted} → ${p.final_formatted} (-${p.discount_percent}%)`
          : `${name}: ${p.final_formatted} (not on sale right now).`);
        render();
      }
    } catch (e) {
      status('Could not get the price. Steam may be blocking the request. Try again, set up a proxy, or type the price in.', true);
    }
    $('go').disabled = false;
  }

  const results = $('results');
  function hideResults() { results.hidden = true; results.replaceChildren(); }
  function showResults(list) {
    results.replaceChildren(...list.map((g) => {
      const li = document.createElement('li');
      li.tabIndex = 0;
      if (g.img) { const im = document.createElement('img'); im.src = g.img; im.alt = ''; li.append(im); }
      const sp = document.createElement('span'); sp.className = 'nm'; sp.textContent = g.name; li.append(sp);
      const pick = () => { hideResults(); hint(''); useGame(g); };
      li.addEventListener('click', pick);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
      return li;
    }));
    results.hidden = !list.length;
  }

  let seq = 0;
  async function runSearch(q, pickFirst) {
    const my = ++seq;
    hint('Searching…');
    try {
      const list = await searchSteam(q);
      if (my !== seq) return;
      if (!list.length) { hint('No games found. Try another spelling, or paste a link.'); hideResults(); return; }
      hint('');
      if (pickFirst) { hideResults(); await useGame(list[0]); } else showResults(list);
    } catch (e) {
      if (my !== seq) return;
      hideResults();
      hint('Search is unavailable right now. Paste a Steam link or app ID instead, or set up a proxy.');
    }
  }
  async function onGo() {
    const v = $('steam').value.trim();
    if (!v) return;
    const id = parseAppId(v);
    if (id) { hideResults(); hint(''); await useGame({ appid: id }); } else await runSearch(v, true);
  }
  $('go').addEventListener('click', onGo);
  $('steam').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onGo(); } });
  let typing;
  $('steam').addEventListener('input', () => {
    clearTimeout(typing);
    const v = $('steam').value.trim();
    if (v.length < 2 || parseAppId(v)) { hideResults(); hint(''); return; }
    typing = setTimeout(() => runSearch(v, false), 450);
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.field')) hideResults(); });

  // ---------- Manual controls ----------
  ['orig', 'final', 'auto'].forEach((id) => { $(id).addEventListener('input', () => { syncAuto(); render(); }); $(id).addEventListener('change', () => { syncAuto(); render(); }); });
  ['pct', 'fmt', 'showpct', 'showorig', 'font', 'scale'].forEach((id) => { $(id).addEventListener('input', render); $(id).addEventListener('change', render); });
  $('pct').addEventListener('input', () => { if ($('auto').checked) { $('auto').checked = false; syncAuto(); } });

  $('reset').addEventListener('click', () => {
    $('orig').value = '79.99'; $('final').value = '6.39'; $('fmt').selectedIndex = 0;
    $('auto').checked = true; $('showpct').checked = true; $('showorig').checked = true;
    $('font').selectedIndex = 0; $('scale').value = '2';
    $('steam').value = ''; setName(''); hideResults(); hint(''); status('');
    syncAuto(); render();
  });

  // ---------- Save / copy ----------
  const safe = (n) => (n || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim() || 'steam-price';
  const toBlob = () => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('no blob'))), 'image/png'));

  $('download').addEventListener('click', async () => {
    const fileName = safe($('fname').value) + '.png';
    try {
      const blob = await toBlob();
      if (window.showSaveFilePicker) {
        try {
          const h = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'PNG image', accept: { 'image/png': ['.png'] } }] });
          const w = await h.createWritable();
          await w.write(blob);
          await w.close();
          status('Saved ' + h.name);
          return;
        } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { status('Download failed. Try again.', true); }
  });

  $('copy').addEventListener('click', async () => {
    const btn = $('copy');
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': await toBlob() })]); btn.textContent = 'Copied!'; }
    catch (e) { btn.textContent = 'Copy failed'; }
    setTimeout(() => (btn.textContent = 'Copy'), 1500);
  });

  syncAuto();
  render();
})();
