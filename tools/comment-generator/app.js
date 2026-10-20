(function () {
  const $ = (id) => document.getElementById(id);
  const S = 3; // export scale: 3x for crisp images
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');

  // ---------- Fonts ----------
  const SYSTEM = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const FAMILIES = {
    inter: '"Inter", ' + SYSTEM, roboto: 'Roboto, Arial, sans-serif', figtree: '"Figtree", ' + SYSTEM, system: SYSTEM,
  };
  const PLATFORM_FONT = { instagram: 'inter', youtube: 'roboto', tiktok: 'figtree' };

  // ---------- Labels ----------
  const TR = {
    en: { replying: 'Replying to', reply: 'Reply', pinnedBy: 'Pinned by', creator: 'Creator', pinned: 'Pinned', liked: 'Liked by creator' },
    es: { replying: 'Respondiendo a', reply: 'Responder', pinnedBy: 'Fijado por', creator: 'Creador', pinned: 'Fijado', liked: 'Le gusta al creador' },
    fr: { replying: 'En réponse à', reply: 'Répondre', pinnedBy: 'Épinglé par', creator: 'Créateur', pinned: 'Épinglé', liked: 'Aimé par le créateur' },
    de: { replying: 'Antwort an', reply: 'Antworten', pinnedBy: 'Angeheftet von', creator: 'Creator', pinned: 'Angeheftet', liked: 'Vom Creator geliked' },
    pt: { replying: 'Respondendo a', reply: 'Responder', pinnedBy: 'Fixado por', creator: 'Criador', pinned: 'Fixado', liked: 'Curtido pelo criador' },
    it: { replying: 'In risposta a', reply: 'Rispondi', pinnedBy: 'Fissato da', creator: 'Creator', pinned: 'Fissato', liked: 'Piace al creator' },
  };
  const PLATFORM_NAME = { instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok' };

  const BADGES = {
    instagram: [['none', 'No badge'], ['verified', 'Verified'], ['creator', 'Creator'], ['pinned', 'Pinned']],
    youtube: [['none', 'No badge'], ['verified', 'Verified'], ['creator', 'Channel owner'], ['pinned', 'Pinned']],
    tiktok: [['none', 'No badge'], ['verified', 'Verified'], ['creator', 'Creator'], ['pinned', 'Pinned']],
  };
  const THEMES = {
    instagram: [['white', 'White'], ['black', 'Black'], ['blue', 'Blue']],
    youtube: [['dark', 'Dark'], ['light', 'Light']],
    tiktok: [['dark', 'Dark'], ['light', 'Light']],
  };
  const DEFAULTS = { instagram: { time: '', likes: '' }, youtube: { time: '2 hours ago', likes: '1.2K' }, tiktok: { time: '2d ago', likes: '3.4K' } };

  // ---------- Icons (24x24 Material paths) ----------
  const P = {
    seal: new Path2D('M12 1l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 23l-2.6-1.9-3.2.1-1-3L2.6 16.3l1-3-1-3 2.6-1.9 1-3 3.2.1z'),
    check: new Path2D('M7.6 12.3l3 3 5.8-6'),
    heart: new Path2D('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'),
    thumb: new Path2D('M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z'),
    pin: new Path2D('M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z'),
  };

  function icon(g, path, x, y, size, o) {
    g.save();
    g.translate(x, y);
    g.scale(size / 24, size / 24);
    if (o.flipY) { g.translate(0, 24); g.scale(1, -1); }
    if (o.fill) { g.fillStyle = o.fill; g.fill(path); }
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = (o.lw || 1.5) * 24 / size; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(path); }
    g.restore();
  }

  // ---------- Helpers ----------
  const mw = (t) => ctx.measureText(t).width;

  function fit(t, maxW) {
    if (mw(t) <= maxW) return t;
    const a = Array.from(t);
    while (a.length > 1 && mw(a.join('') + '…') > maxW) a.pop();
    return a.join('') + '…';
  }

  function wrap(text, maxW) {
    const lines = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (mw(test) <= maxW) { line = test; continue; }
        if (line) lines.push(line);
        if (mw(word) > maxW) {
          let chunk = '';
          for (const ch of word) { if (mw(chunk + ch) > maxW) { lines.push(chunk); chunk = ch; } else chunk += ch; }
          line = chunk;
        } else line = word;
      }
      lines.push(line);
    }
    return lines;
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

  function avatar(g, img, x, y, d) {
    g.save();
    g.beginPath();
    g.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
    g.clip();
    g.drawImage(img, x, y, d, d);
    g.restore();
  }

  function pill(g, text, x, y, h, bg, color, font) {
    g.font = font;
    const w = mw(text) + 16;
    g.fillStyle = bg;
    rr(g, x, y, w, h, h / 2);
    g.fill();
    g.fillStyle = color;
    g.textBaseline = 'middle';
    g.fillText(text, x + 8, y + h / 2 + 0.5);
    return w;
  }

  // ---------- Layouts: each returns { w, h, bg, radius, paint(g) } ----------
  function buildInstagram(p) {
    const F = p.fam, T = p.tr;
    const th = {
      white: { bg: '#ffffff', ink: '#111111', sub: '#7a7a80' },
      black: { bg: '#1c1c1e', ink: '#ffffff', sub: '#9a9aa2' },
      blue: { bg: '#0095f6', ink: '#ffffff', sub: 'rgba(255,255,255,.78)' },
    }[p.theme];
    const padL = 20, padR = 28, padT = 20, padB = 20, av = 44, gap = 14, maxW = 380;
    const colMax = maxW - padL - padR - av - gap;
    const demo = !p.name && !p.comment;
    const comment = demo ? 'Create your custom Instagram comment 🔥' : p.comment;
    const reply = p.replyTo || demo ? T.replying + ' ' + (p.replyTo || 'username') : '';

    const nameFont = `700 16px ${F}`, textFont = `500 20px ${F}`, replyFont = `500 17px ${F}`, pillFont = `600 12px ${F}`;
    ctx.font = pillFont;
    const badgeLabel = p.badge === 'creator' ? T.creator : p.badge === 'pinned' ? T.pinned : '';
    const badgeW = p.badge === 'verified' ? 16 : badgeLabel ? mw(badgeLabel) + 16 : 0;
    ctx.font = nameFont;
    const name = p.name ? fit(p.name, colMax - (badgeW ? badgeW + 6 : 0)) : '';
    const nameRowW = name ? mw(name) + (badgeW ? badgeW + 6 : 0) : 0;
    ctx.font = textFont;
    const lines = wrap(comment, colMax);
    const textW = Math.max(...lines.map(mw));
    ctx.font = replyFont;
    const replyText = reply ? fit(reply, colMax) : '';
    const replyW = replyText ? mw(replyText) : 0;

    const colW = Math.min(colMax, Math.ceil(Math.max(textW, nameRowW, replyW)));
    const nameH = name ? 22 : 0, textH = lines.length * 27, replyH = replyText ? 28 : 0;
    const w = padL + av + gap + colW + padR;
    const h = Math.max(padT + nameH + textH + replyH + padB, padT + av + padB);

    return {
      w, h, bg: th.bg, radius: 28,
      paint(g) {
        avatar(g, p.avatar, padL, padT, av);
        const x = padL + av + gap;
        let y = padT;
        g.textBaseline = 'middle';
        if (name) {
          g.font = nameFont; g.fillStyle = th.ink;
          g.fillText(name, x, y + 10.5);
          const bx = x + mw(name) + 6;
          if (p.badge === 'verified') {
            icon(g, P.seal, bx, y + 2, 16, { fill: '#0095f6' });
            icon(g, P.check, bx, y + 2, 16, { stroke: '#fff', lw: 2.2 });
          } else if (badgeLabel) {
            pill(g, badgeLabel, bx, y, 20, 'rgba(128,128,138,.22)', th.sub, pillFont);
          }
          y += nameH;
        }
        g.font = textFont; g.fillStyle = th.ink;
        lines.forEach((l, i) => g.fillText(l, x, y + i * 27 + 14));
        y += textH;
        if (replyText) {
          g.font = replyFont; g.fillStyle = th.sub;
          g.fillText(replyText, x, y + 6 + 11.5);
        }
      },
    };
  }

  function buildYouTube(p) {
    const F = p.fam, T = p.tr;
    const th = p.theme === 'light'
      ? { bg: '#ffffff', ink: '#0f0f0f', sub: '#606060', chip: 'rgba(0,0,0,.07)' }
      : { bg: '#0f0f0f', ink: '#f1f1f1', sub: '#aaaaaa', chip: 'rgba(255,255,255,.14)' };
    const padL = 16, padR = 16, padT = 16, padB = 12, av = 40, gap = 16, minW = 340, maxW = 560;
    const x0 = padL + av + gap;
    const colMax = maxW - x0 - padR;
    const demo = !p.name && !p.comment;
    const comment = demo ? 'Create your custom YouTube comment 🔥' : p.comment;
    let handle = p.name || 'username';
    if (!handle.startsWith('@')) handle = '@' + handle;
    const time = p.time || DEFAULTS.youtube.time;

    const nameFont = `500 13px ${F}`, timeFont = `400 12px ${F}`, textFont = `400 14px ${F}`, smallFont = `400 12px ${F}`, btnFont = `500 12px ${F}`;
    ctx.font = nameFont;
    const nameShown = fit(handle, colMax - 120);
    const owner = p.badge === 'creator';
    const nameBoxW = mw(nameShown) + (owner ? 12 : 0);
    const verifiedW = p.badge === 'verified' ? 18 : 0;
    ctx.font = timeFont;
    const timeW = mw(time);
    const headW = nameBoxW + verifiedW + 8 + timeW;
    ctx.font = textFont;
    const lines = wrap(comment, colMax);
    const textW = Math.max(...lines.map(mw));
    ctx.font = smallFont;
    const likesW = p.likes ? mw(p.likes) : 0;
    ctx.font = btnFont;
    const replyW = mw(T.reply) + 32;
    const actionsW = 20 + (p.likes ? 6 + likesW : 0) + 16 + 20 + 12 + (p.hearted ? 24 + 12 : 0) + replyW;
    const colW = Math.min(colMax, Math.ceil(Math.max(textW, headW, actionsW)));

    const pinned = p.badge === 'pinned';
    const pinH = pinned ? 26 : 0;
    const bodyH = 20 + 2 + lines.length * 20 + 4 + 36;
    const w = Math.max(minW, x0 + colW + padR);
    const h = padT + pinH + Math.max(av, bodyH) + padB;

    return {
      w, h, bg: th.bg, radius: 14,
      paint(g) {
        g.textBaseline = 'middle';
        let y = padT;
        if (pinned) {
          icon(g, P.pin, padL, y + 1, 14, { fill: th.sub });
          g.font = smallFont; g.fillStyle = th.sub;
          g.fillText(T.pinnedBy + ' ' + (p.channel || 'creator'), padL + 20, y + 9);
          y += pinH;
        }
        avatar(g, p.avatar, padL, y, av);
        let x = x0;
        // header: name + time
        g.font = nameFont;
        if (owner) {
          g.fillStyle = th.chip; rr(g, x, y, nameBoxW, 20, 10); g.fill();
          g.fillStyle = th.ink; g.fillText(nameShown, x + 6, y + 10.5);
        } else {
          g.fillStyle = th.ink; g.fillText(nameShown, x, y + 10.5);
        }
        x += nameBoxW;
        if (verifiedW) {
          g.fillStyle = th.sub; g.beginPath(); g.arc(x + 4 + 7, y + 10, 7, 0, Math.PI * 2); g.fill();
          g.save(); g.translate(x + 4 + 7 - 5, y + 10 - 5); g.scale(10 / 24, 10 / 24);
          g.strokeStyle = th.bg; g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(3, 12.5); g.lineTo(9.5, 19); g.lineTo(21, 6); g.stroke(); g.restore();
          x += verifiedW;
        }
        g.font = timeFont; g.fillStyle = th.sub;
        g.fillText(time, x + 8, y + 10.5);
        // comment text
        let ty = y + 22;
        g.font = textFont; g.fillStyle = th.ink;
        lines.forEach((l, i) => g.fillText(l, x0, ty + i * 20 + 10));
        ty += lines.length * 20 + 4;
        // actions row
        const cy = ty + 18;
        let ax = x0;
        icon(g, P.thumb, ax, cy - 10, 20, { stroke: th.ink, lw: 1.6 });
        ax += 20;
        if (p.likes) { g.font = smallFont; g.fillStyle = th.sub; g.fillText(p.likes, ax + 6, cy + 0.5); ax += 6 + likesW; }
        ax += 16;
        icon(g, P.thumb, ax, cy - 10, 20, { stroke: th.ink, lw: 1.6, flipY: true });
        ax += 20 + 12;
        if (p.hearted) {
          avatar(g, p.avatar, ax, cy - 12, 24);
          g.fillStyle = th.bg; g.beginPath(); g.arc(ax + 20, cy + 7, 7.5, 0, Math.PI * 2); g.fill();
          icon(g, P.heart, ax + 14, cy + 1, 12, { fill: '#ff0033' });
          ax += 24 + 12;
        }
        g.font = btnFont; g.fillStyle = th.ink;
        g.fillText(T.reply, ax + 16, cy + 0.5);
      },
    };
  }

  function buildTikTok(p) {
    const F = p.fam, T = p.tr;
    const th = p.theme === 'light'
      ? { bg: '#ffffff', ink: '#161823', sub: 'rgba(22,24,35,.5)' }
      : { bg: '#121212', ink: 'rgba(255,255,255,.92)', sub: 'rgba(255,255,255,.5)' };
    const red = '#fe2c55';
    const padL = 16, padR = 16, padT = 14, padB = 14, av = 40, gap = 12, rightW = 48, minW = 320, maxW = 520;
    const x0 = padL + av + gap;
    const colMax = maxW - x0 - rightW - padR;
    const demo = !p.name && !p.comment;
    const comment = demo ? 'Create your custom TikTok comment 🔥' : p.comment;
    const name = p.name || 'username';
    const time = p.time || DEFAULTS.tiktok.time;

    const nameFont = `600 14px ${F}`, textFont = `400 15px ${F}`, smallFont = `500 13px ${F}`, boldSmall = `600 13px ${F}`;
    const tag = p.badge === 'creator' ? T.creator : p.badge === 'pinned' ? T.pinned : '';
    ctx.font = boldSmall;
    const tagW = tag ? 12 + mw(tag) : 0;
    const verW = p.badge === 'verified' ? 20 : 0;
    ctx.font = nameFont;
    const nameShown = fit(name, colMax - tagW - verW);
    const headW = mw(nameShown) + verW + tagW;
    ctx.font = textFont;
    const lines = wrap(comment, colMax);
    const textW = Math.max(...lines.map(mw));
    ctx.font = smallFont;
    ctx.font = boldSmall;
    const replyW = mw(T.reply);
    ctx.font = smallFont;
    const likedW = p.hearted ? 28 + mw(T.liked) : 0;
    const actionsW = mw(time) + 16 + replyW + likedW;
    const colW = Math.min(colMax, Math.ceil(Math.max(textW, headW, actionsW)));
    const w = Math.max(minW, x0 + colW + rightW + padR);
    const h = padT + 20 + 2 + lines.length * 20 + 6 + 20 + padB;

    return {
      w, h, bg: th.bg, radius: 16,
      paint(g) {
        g.textBaseline = 'middle';
        avatar(g, p.avatar, padL, padT, av);
        let y = padT;
        g.font = nameFont; g.fillStyle = th.sub;
        g.fillText(nameShown, x0, y + 10.5);
        let x = x0 + mw(nameShown);
        if (verW) {
          g.fillStyle = '#20d5ec'; g.beginPath(); g.arc(x + 6 + 7, y + 10, 7, 0, Math.PI * 2); g.fill();
          g.save(); g.translate(x + 6 + 7 - 5, y + 10 - 5); g.scale(10 / 24, 10 / 24);
          g.strokeStyle = '#fff'; g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(3, 12.5); g.lineTo(9.5, 19); g.lineTo(21, 6); g.stroke(); g.restore();
          x += verW;
        }
        if (tag) { g.font = boldSmall; g.fillStyle = red; g.fillText('· ' + tag, x + 6, y + 10.5); }
        y += 22;
        g.font = textFont; g.fillStyle = th.ink;
        lines.forEach((l, i) => g.fillText(l, x0, y + i * 20 + 10));
        y += lines.length * 20 + 6;
        // time / reply / liked by creator
        g.font = smallFont; g.fillStyle = th.sub;
        g.fillText(time, x0, y + 10);
        let ax = x0 + mw(time) + 16;
        g.font = boldSmall;
        g.fillText(T.reply, ax, y + 10);
        ax += replyW + 16;
        if (p.hearted) {
          icon(g, P.heart, ax, y + 3, 14, { fill: red });
          g.font = smallFont; g.fillStyle = th.sub;
          g.fillText(T.liked, ax + 18, y + 10);
        }
        // like button on the right
        const hx = w - padR - rightW / 2;
        icon(g, P.heart, hx - 10, padT + 6, 20, { stroke: th.sub, lw: 1.8 });
        if (p.likes) {
          g.font = smallFont; g.fillStyle = th.sub; g.textAlign = 'center';
          g.fillText(p.likes, hx, padT + 36);
          g.textAlign = 'left';
        }
      },
    };
  }

  // ---------- State ----------
  let platform = 'instagram';
  let avatarImg = null;
  let avatarSrc = null;
  let renderId = 0;

  function currentFamily() {
    const f = $('font').value;
    return FAMILIES[f === 'default' ? PLATFORM_FONT[platform] : f];
  }

  function params() {
    return {
      platform, fam: currentFamily(), tr: TR[$('lang').value], avatar: avatarImg,
      name: $('username').value.trim(), comment: $('comment').value.trim(),
      replyTo: $('replyto').value.trim(), channel: $('channel').value.trim(),
      time: $('time').value.trim(), likes: $('likes').value.trim(),
      badge: $('badge').value, theme: $('theme').value, hearted: $('hearted').checked,
    };
  }

  async function render() {
    const id = ++renderId;
    const p = params();
    if (!avatarImg) return;
    // Make sure the web fonts are ready before measuring or drawing text
    const sample = p.name + p.comment + p.channel + p.time + p.likes;
    try {
      await Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(`${w} 16px ${p.fam}`, sample || 'A')));
    } catch (e) {}
    if (id !== renderId) return;

    const L = ({ instagram: buildInstagram, youtube: buildYouTube, tiktok: buildTikTok })[platform](p);
    const pad = $('shadow').checked ? 32 : 0;
    const cw = Math.ceil(L.w), ch = Math.ceil(L.h);
    canvas.width = (cw + pad * 2) * S;
    canvas.height = (ch + pad * 2) * S;
    canvas.style.width = (cw + pad * 2) + 'px';
    canvas.style.filter = pad ? 'none' : '';
    ctx.setTransform(S, 0, 0, S, pad * S, pad * S);
    ctx.textAlign = 'left';

    // card background (with optional shadow)
    ctx.save();
    if (pad) { ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 24 * S; ctx.shadowOffsetY = 8 * S; }
    ctx.fillStyle = L.bg;
    rr(ctx, 0, 0, cw, ch, L.radius);
    ctx.fill();
    ctx.restore();

    ctx.save();
    rr(ctx, 0, 0, cw, ch, L.radius);
    ctx.clip();
    L.paint(ctx);
    ctx.restore();

    $('count').textContent = $('username').value.length;
    $('size').textContent = `${canvas.width} × ${canvas.height} px`;
  }

  // ---------- Avatar ----------
  function setAvatar(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => { avatarImg = im; avatarSrc = src; $('pic-thumb').src = src; render(); resolve(); };
      im.onerror = reject;
      im.src = src;
    });
  }
  function status(m) { $('pic-status').textContent = m || ''; }

  function silhouette() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#eceef2'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#8a8f9c';
    g.beginPath(); g.arc(128, 98, 42, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(46, 256); g.bezierCurveTo(46, 190, 86, 166, 128, 166); g.bezierCurveTo(170, 166, 210, 190, 210, 256); g.fill();
    return c.toDataURL('image/png');
  }

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
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob); });
  }

  function generatedAvatar() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const h = Math.floor(Math.random() * 360);
    const grad = g.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, `hsl(${h} 80% 62%)`);
    grad.addColorStop(1, `hsl(${(h + 50) % 360} 80% 48%)`);
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    const letter = ($('username').value.trim().replace(/^@/, '')[0] || String.fromCharCode(65 + Math.floor(Math.random() * 26))).toUpperCase();
    g.fillStyle = '#fff'; g.font = `700 120px ${FAMILIES.inter}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(letter, 128, 136);
    return c.toDataURL('image/png');
  }

  $('upload').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try { await setAvatar(await cropToSquare(await blobToDataURL(f))); status(''); }
    catch (err) { status('That file could not be read as an image.'); }
  });

  $('randomize').addEventListener('click', async () => {
    const btn = $('randomize');
    btn.disabled = true; status('');
    try {
      const group = Math.random() < 0.5 ? 'men' : 'women';
      const res = await fetch(`https://randomuser.me/api/portraits/${group}/${Math.floor(Math.random() * 100)}.jpg`);
      if (!res.ok) throw new Error('bad response');
      await setAvatar(await blobToDataURL(await res.blob()));
    } catch (err) {
      await setAvatar(generatedAvatar());
      status('Could not reach the photo service, so a generated avatar was used.');
    }
    btn.disabled = false;
  });

  // ---------- Controls ----------
  function fillSelect(sel, opts, keep) {
    const prev = keep ? sel.value : null;
    sel.replaceChildren(...opts.map(([v, l]) => new Option(l, v)));
    if (prev && opts.some(([v]) => v === prev)) sel.value = prev;
  }

  function setPlatform(next) {
    const prev = platform;
    platform = next;
    document.querySelectorAll('#platforms button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === next)));
    document.querySelectorAll('[data-for]').forEach((n) => { n.hidden = !n.dataset.for.split(' ').includes(next); });
    fillSelect($('badge'), BADGES[next], true);
    fillSelect($('theme'), THEMES[next], true);
    ['time', 'likes'].forEach((f) => {
      const v = $(f).value;
      if (!v || v === DEFAULTS[prev][f]) $(f).value = DEFAULTS[next][f];
    });
    render();
  }

  document.querySelectorAll('#platforms button').forEach((b) => b.addEventListener('click', () => setPlatform(b.dataset.p)));
  ['username', 'comment', 'replyto', 'channel', 'time', 'likes', 'badge', 'theme', 'lang', 'font', 'hearted', 'shadow'].forEach((id) => {
    $(id).addEventListener('input', render);
    $(id).addEventListener('change', render);
  });

  $('reset').addEventListener('click', () => {
    ['username', 'comment', 'replyto', 'channel'].forEach((id) => ($(id).value = ''));
    $('lang').value = 'en'; $('font').value = 'default'; $('hearted').checked = false; $('shadow').checked = false;
    $('time').value = DEFAULTS[platform].time; $('likes').value = DEFAULTS[platform].likes;
    fillSelect($('badge'), BADGES[platform], false);
    fillSelect($('theme'), THEMES[platform], false);
    status('');
    setAvatar(silhouette());
  });

  // ---------- Download / copy ----------
  const toBlob = () => new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/png'));

  $('download').addEventListener('click', async () => {
    const blob = await toBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = platform + '-comment.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('copy').addEventListener('click', async () => {
    const btn = $('copy');
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': await toBlob() })]);
      btn.textContent = 'Copied!';
    } catch (e) {
      btn.textContent = 'Copy failed';
    }
    setTimeout(() => (btn.textContent = 'Copy'), 1500);
  });

  // ---------- Init ----------
  setAvatar(silhouette()).then(() => setPlatform('instagram'));
})();
