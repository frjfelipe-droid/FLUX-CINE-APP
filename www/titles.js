/* FLUX CINE — modelos de título cinematográfico.
 * layout(id, textos) devolve uma lista de camadas em coordenadas 1080x1920.
 * draw(ctx, camadas, t, fim) desenha o quadro no tempo t (segundos).
 * O app Android (CineRenderer.java) desenha as MESMAS camadas no vídeo final. */
(function (root) {
  var W = 1080, H = 1920;
  var YEAR = String(new Date().getFullYear());

  var MODELS = [
    { id: 'classico', name: 'Clássico Dourado', vibe: 'serifa de cinema', accent: '#F2D13A', media: 39878, demo: { title: 'Cinematic', sub: 'Simples, mas marcante', brand: 'Sua Marca' } },
    { id: 'camp', name: 'Neon Camp', vibe: 'bloco + assinatura', accent: '#D4FF3A', media: 1240, demo: { title: 'Midyear', sub: 'Camp', brand: 'Sua Marca' } },
    { id: 'escape', name: 'Escape', vibe: 'viagem e lifestyle', accent: '#FFD21F', media: 39765, demo: { title: 'One Day', sub: 'escape', brand: 'Sua Marca' } },
    { id: 'insano', name: 'Insano', vibe: 'videoclipe alto', accent: '#FFB000', media: 1232, vip: true, demo: { title: 'Insane', sub: 'Novo lançamento', brand: 'Sua Marca' } },
    { id: 'paladar', name: 'Paladar', vibe: 'editorial de lente', accent: '#F5D90A', media: 39875, demo: { title: 'Taste', sub: 'Uma experiência', brand: 'Sua Marca' } },
    { id: 'retro', name: 'Retrô 70', vibe: 'documentário anos 70', accent: '#FFD21F', media: 1238, vip: true, demo: { title: 'Merman', sub: 'Um curta original', brand: 'Sua Marca' } }
  ];

  var mctx = document.createElement('canvas').getContext('2d');
  function width(text, fam, size) { mctx.font = size + 'px "' + fam + '"'; return mctx.measureText(text).width; }
  function fit(text, fam, maxW, maxSize, sx, ls) {
    sx = sx || 1; ls = ls || 0;
    var s = maxSize;
    while (s > 20) {
      var w = (width(text, fam, s) + ls * s * text.length) * sx;
      if (w <= maxW) break;
      s -= 4;
    }
    return s;
  }
  function T(o) { o.type = 'text'; if (!o.color) o.color = '#FFFFFF'; if (o.ls == null) o.ls = 0; if (!o.sx) o.sx = 1; if (!o.align) o.align = 'center'; return o; }
  function up(s) { return String(s || '').toUpperCase(); }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  function layout(id, tx) {
    var title = (tx.title || '').trim() || 'Seu título', sub = (tx.sub || '').trim(), brand = (tx.brand || '').trim() || 'FLUX CINE';
    var L = [], m, y, s;
    switch (id) {
      case 'classico': {
        var Y = '#F2D13A';
        L.push({ type: 'dim', alpha: 0.42, anim: { k: 'fade', d: 0, u: 0.5 } });
        L.push({ type: 'line', x1: 60, y1: 170, x2: 1020, y2: 170, w: 2, color: 'rgba(242,209,58,.7)', anim: { k: 'draw', d: 0.15, u: 0.9 } });
        L.push({ type: 'line', x1: 60, y1: 1750, x2: 1020, y2: 1750, w: 2, color: 'rgba(242,209,58,.7)', anim: { k: 'draw', d: 0.15, u: 0.9 } });
        L.push(T({ text: up(brand), font: 'DMSerifDisplay-400', size: 30, x: 70, y: 135, align: 'left', color: Y, ls: 0.06, anim: { k: 'fade', d: 0.5, u: 0.6 } }));
        L.push(T({ text: YEAR, font: 'DMSerifDisplay-400', size: 30, x: 1010, y: 135, align: 'right', color: Y, ls: 0.06, anim: { k: 'fade', d: 0.5, u: 0.6 } }));
        L.push({ type: 'oval', cx: 540, cy: 124, rx: 120, ry: 34, w: 2, color: Y, anim: { k: 'fade', d: 0.55, u: 0.6 } });
        L.push(T({ text: 'APRESENTA', font: 'DMSerifDisplay-400', size: 26, x: 540, y: 134, color: Y, ls: 0.08, anim: { k: 'fade', d: 0.55, u: 0.6 } }));
        s = fit(up(title), 'DMSerifDisplay-400', 980, 250, 1, 0.01); y = 1010;
        L.push(T({ text: up(brand) + ' APRESENTA', font: 'DMSerifDisplay-400', size: 52, x: 540, y: y - s * 0.78 - 18, color: Y, ls: 0.04, anim: { k: 'rise', d: 0.35, u: 0.7 } }));
        L.push(T({ text: up(title), font: 'DMSerifDisplay-400', size: s, x: 540, y: y, color: Y, ls: 0.01, anim: { k: 'blur', d: 0.1, u: 0.95 } }));
        if (sub) L.push(T({ text: up(sub), font: 'DMSerifDisplay-400', size: fit(up(sub), 'DMSerifDisplay-400', 940, 40, 1, 0.22), x: 540, y: y + 88, color: Y, ls: 0.22, anim: { k: 'track', d: 0.6, u: 0.9 } }));
        L.push(T({ text: 'UM VÍDEO DE ' + up(brand), font: 'DMSerifDisplay-400', size: 24, x: 540, y: 1660, color: Y, ls: 0.06, anim: { k: 'fade', d: 0.9, u: 0.6 } }));
        L.push(T({ text: 'FEITO COM FLUX CINE', font: 'DMSerifDisplay-400', size: 24, x: 540, y: 1696, color: Y, ls: 0.06, anim: { k: 'fade', d: 0.95, u: 0.6 } }));
        break;
      }
      case 'camp': {
        var G = '#D4FF3A';
        L.push({ type: 'dim', alpha: 0.28, anim: { k: 'fade', d: 0, u: 0.5 } });
        L.push(T({ text: up(brand), font: 'ArchivoBlack-400', size: 38, x: 80, y: 260, align: 'left', anim: { k: 'fade', d: 0.5, u: 0.5 } }));
        L.push(T({ text: 'APRESENTA', font: 'ArchivoBlack-400', size: 38, x: 540, y: 260, color: G, anim: { k: 'fade', d: 0.55, u: 0.5 } }));
        L.push(T({ text: 'VÍDEO', font: 'ArchivoBlack-400', size: 38, x: 1000, y: 260, align: 'right', anim: { k: 'fade', d: 0.6, u: 0.5 } }));
        s = fit(up(title), 'ArchivoBlack-400', 1010, 300, 1, -0.03); y = 980;
        L.push(T({ text: up(title), font: 'ArchivoBlack-400', size: s, x: 540, y: y, ls: -0.03, anim: { k: 'blur', d: 0.1, u: 0.85 } }));
        if (sub) L.push(T({ text: cap(sub), font: 'GreatVibes-400', size: fit(cap(sub), 'GreatVibes-400', 860, Math.round(s * 1.05)), x: 600, y: y + s * 0.5, color: G, rot: -7, anim: { k: 'reveal', d: 0.65, u: 0.9 } }));
        L.push(T({ text: YEAR, font: 'ArchivoBlack-400', size: 40, x: 540, y: 1700, anim: { k: 'fade', d: 0.9, u: 0.5 } }));
        break;
      }
      case 'escape': {
        var Ye = '#FFD21F';
        L.push({ type: 'dim', alpha: 0.18, anim: { k: 'fade', d: 0, u: 0.5 } });
        s = fit(up(title), 'Anton-400', 1010, 340, 1, -0.01); y = 1000;
        L.push(T({ text: 'POR', font: 'Inter-700', size: 32, x: 90, y: y - s * 0.86 - 22, align: 'left', color: Ye, anim: { k: 'fade', d: 0.45, u: 0.5 } }));
        L.push(T({ text: up(brand), font: 'Inter-700', size: 32, x: 990, y: y - s * 0.86 - 22, align: 'right', color: Ye, anim: { k: 'fade', d: 0.5, u: 0.5 } }));
        L.push(T({ text: up(title), font: 'Anton-400', size: s, x: 540, y: y, color: Ye, ls: -0.01, anim: { k: 'rise', d: 0.1, u: 0.8 } }));
        if (sub) L.push(T({ text: sub.toLowerCase(), font: 'Yellowtail-400', size: fit(sub.toLowerCase(), 'Yellowtail-400', 900, Math.round(s * 0.82)), x: 560, y: y + s * 0.42, rot: -5, anim: { k: 'reveal', d: 0.6, u: 0.85 } }));
        L.push(T({ text: 'UM VÍDEO DE ' + up(brand), font: 'Inter-700', size: 28, x: 540, y: y + s * 0.78, ls: 0.08, anim: { k: 'fade', d: 0.95, u: 0.5 } }));
        break;
      }
      case 'insano': {
        var O = '#FFB000';
        L.push({ type: 'dim', alpha: 0.22, anim: { k: 'fade', d: 0, u: 0.5 } });
        L.push(T({ text: up(brand), font: 'Inter-700', size: 40, x: 540, y: 470, ls: 0.6, anim: { k: 'track', d: 0.4, u: 0.9 } }));
        s = fit(up(title), 'BodoniModa-900', 1020, 640, 0.46, 0); y = 1230;
        L.push(T({ text: up(title), font: 'BodoniModa-900', size: s, x: 540, y: y, color: O, sx: 0.46, anim: { k: 'stretch', d: 0.1, u: 0.9 } }));
        L.push(T({ text: up(brand) + ' APRESENTA ' + up(title) + (sub ? ' · ' + up(sub) : ''), font: 'Inter-700', size: fit(up(brand) + ' APRESENTA ' + up(title) + (sub ? ' · ' + up(sub) : ''), 'Inter-700', 900, 24), x: 540, y: y + 70, anim: { k: 'fade', d: 0.8, u: 0.6 } }));
        L.push(T({ text: 'UM VÍDEO FLUX CINE · © ' + YEAR, font: 'Inter-400', size: 22, x: 540, y: y + 106, anim: { k: 'fade', d: 0.9, u: 0.6 } }));
        break;
      }
      case 'paladar': {
        var P = '#F5D90A';
        L.push({ type: 'vignette', alpha: 0.95, anim: { k: 'fade', d: 0, u: 0.6 } });
        s = fit(up(title), 'PlayfairDisplay-900', 600, 380, 0.6, 0.02); y = 1080;
        if (sub) L.push(T({ text: up(sub), font: 'Inter-700', size: 30, x: 540, y: y - s * 0.76 - 26, color: P, ls: 0.12, anim: { k: 'fade', d: 0.45, u: 0.6 } }));
        L.push(T({ text: up(title), font: 'PlayfairDisplay-900', size: s, x: 540, y: y, color: P, sx: 0.6, ls: 0.02, anim: { k: 'track', d: 0.1, u: 1.0 } }));
        L.push(T({ text: 'DIREÇÃO', font: 'Inter-700', size: 28, x: 80, y: y - s * 0.32, align: 'left', color: P, anim: { k: 'fade', d: 0.7, u: 0.5 } }));
        L.push(T({ text: up(brand), font: 'Inter-400', size: 26, x: 80, y: y - s * 0.32 + 36, align: 'left', color: P, ls: 0.1, anim: { k: 'fade', d: 0.75, u: 0.5 } }));
        L.push(T({ text: 'CÂMERA', font: 'Inter-700', size: 28, x: 1000, y: y - s * 0.32, align: 'right', color: P, anim: { k: 'fade', d: 0.7, u: 0.5 } }));
        L.push(T({ text: 'FLUX CINE', font: 'Inter-400', size: 26, x: 1000, y: y - s * 0.32 + 36, align: 'right', color: P, ls: 0.1, anim: { k: 'fade', d: 0.75, u: 0.5 } }));
        L.push(T({ text: up(brand) + ' APRESENTA', font: 'Inter-700', size: 28, x: 540, y: y + 96, color: P, ls: 0.06, anim: { k: 'fade', d: 0.9, u: 0.5 } }));
        break;
      }
      case 'retro': {
        var R = '#FFD21F', RED = '#E5341D', sh = { dx: 7, dy: 7, color: RED, sw: 0 };
        L.push({ type: 'dim', alpha: 0.12, anim: { k: 'fade', d: 0, u: 0.5 } });
        s = fit(cap(title), 'Shrikhand-400', 980, 270, 1, 0); y = 1000;
        L.push(T({ text: up(brand), font: 'ArchivoBlack-400', size: 46, x: 540, y: y - s * 1.02 - 56, color: R, shadow: { dx: 3, dy: 3, color: RED, sw: 0 }, anim: { k: 'fade', d: 0.45, u: 0.5 } }));
        L.push(T({ text: 'APRESENTA UM VÍDEO ORIGINAL', font: 'Anton-400', size: 30, x: 540, y: y - s * 1.02 - 10, color: R, ls: 0.04, anim: { k: 'fade', d: 0.55, u: 0.5 } }));
        L.push(T({ text: cap(title), font: 'Shrikhand-400', size: s, x: 540, y: y, color: R, shadow: { dx: 8, dy: 8, color: RED, sw: Math.round(s * 0.05) }, anim: { k: 'pop', d: 0.1, u: 0.8 } }));
        if (sub) L.push(T({ text: up(sub), font: 'Anton-400', size: fit(up(sub), 'Anton-400', 900, 40, 1, 0.03), x: 540, y: y + 90, color: R, ls: 0.03, anim: { k: 'fade', d: 0.8, u: 0.5 } }));
        L.push(T({ text: 'DIREÇÃO ' + up(brand), font: 'Anton-400', size: 32, x: 540, y: y + 150, color: R, ls: 0.03, anim: { k: 'fade', d: 0.9, u: 0.5 } }));
        L.push(T({ text: 'FEITO COM FLUX CINE', font: 'Anton-400', size: 24, x: 540, y: y + 190, color: R, ls: 0.06, anim: { k: 'fade', d: 1.0, u: 0.5 } }));
        break;
      }
    }
    return L;
  }

  /* ---------- desenho (mesma matemática do CineRenderer.java) ---------- */
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function outCubic(a) { var b = 1 - a; return 1 - b * b * b; }
  function inCubic(a) { return a * a * a; }
  function outBack(a) { var c = 1.7; a -= 1; return 1 + a * a * ((c + 1) * a + c); }
  var hasLS = 'letterSpacing' in mctx;

  function textW(ctx, el) { ctx.font = el.size + 'px "' + el.font + '"'; return ctx.measureText(el.text).width; }
  function fillSpaced(ctx, text, x, y, lsPx, mode) {
    if (!lsPx || hasLS) { if (hasLS) ctx.letterSpacing = (lsPx || 0) + 'px'; mode === 's' ? ctx.strokeText(text, x, y) : ctx.fillText(text, x, y); if (hasLS) ctx.letterSpacing = '0px'; return; }
    for (var i = 0; i < text.length; i++) { var ch = text[i]; mode === 's' ? ctx.strokeText(ch, x, y) : ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + lsPx; }
  }

  function draw(ctx, layers, t, tEnd) {
    var out = inCubic(clamp((t - (tEnd - 0.45)) / 0.45));
    for (var i = 0; i < layers.length; i++) {
      var el = layers[i], an = el.anim || { k: 'fade', d: 0, u: 0.5 };
      var p = clamp((t - an.d) / an.u), e = outCubic(p);
      var alpha = e * (1 - out);
      if (alpha <= 0.004) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (el.type === 'dim') { ctx.fillStyle = 'rgba(0,0,0,' + el.alpha + ')'; ctx.fillRect(0, 0, W, H); ctx.restore(); continue; }
      if (el.type === 'vignette') {
        var g = ctx.createRadialGradient(540, 960, 380, 540, 960, 760);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.82, 'rgba(0,0,0,' + el.alpha * 0.85 + ')'); g.addColorStop(1, 'rgba(0,0,0,' + el.alpha + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); continue;
      }
      if (el.type === 'line') {
        var cx = (el.x1 + el.x2) / 2, half = (el.x2 - el.x1) / 2 * (an.k === 'draw' ? e : 1);
        ctx.strokeStyle = el.color; ctx.lineWidth = el.w; ctx.beginPath(); ctx.moveTo(cx - half, el.y1); ctx.lineTo(cx + half, el.y2); ctx.stroke(); ctx.restore(); continue;
      }
      if (el.type === 'oval') {
        ctx.strokeStyle = el.color; ctx.lineWidth = el.w; ctx.beginPath(); ctx.ellipse(el.cx, el.cy, el.rx, el.ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); continue;
      }
      // texto
      var blur = 0, scale = 1, sy = 1, dy = 0, ls = el.ls, reveal = 1;
      if (an.k === 'blur') { blur = 30 * (1 - e); scale = 1.12 - 0.12 * e; ls += 0.25 * (1 - e); }
      else if (an.k === 'rise') { dy = 70 * (1 - e); blur = 10 * (1 - e); }
      else if (an.k === 'reveal') { reveal = e; }
      else if (an.k === 'stretch') { sy = 0.35 + 0.65 * e; blur = 18 * (1 - e); }
      else if (an.k === 'track') { ls += 0.5 * (1 - e); blur = 8 * (1 - e); }
      else if (an.k === 'pop') { scale = 0.55 + 0.45 * outBack(p); }
      blur += 16 * out; dy -= 34 * out;
      ctx.font = el.size + 'px "' + el.font + '"';
      var lsPx = ls * el.size, w = (ctx.measureText(el.text).width + lsPx * el.text.length) * el.sx;
      var x0 = el.align === 'left' ? el.x : el.align === 'right' ? el.x - w : el.x - w / 2;
      ctx.translate(el.x, el.y + dy);
      if (el.rot) ctx.rotate(el.rot * Math.PI / 180);
      ctx.scale(scale * el.sx, scale * sy);
      var lx = (x0 - el.x) / el.sx;
      if (reveal < 1) { ctx.beginPath(); ctx.rect(lx - 40, -el.size * 1.4, (w / el.sx + 80) * reveal, el.size * 2.4); ctx.clip(); }
      if (blur > 0.5) ctx.filter = 'blur(' + blur.toFixed(1) + 'px)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      if (el.shadow) {
        ctx.fillStyle = el.shadow.color; ctx.strokeStyle = el.shadow.color;
        if (el.shadow.sw) { ctx.lineWidth = el.shadow.sw * 2; ctx.lineJoin = 'round'; fillSpaced(ctx, el.text, lx, 0, lsPx, 's'); }
        fillSpaced(ctx, el.text, lx + el.shadow.dx / el.sx, el.shadow.dy, lsPx, 'f');
      }
      ctx.fillStyle = el.color;
      fillSpaced(ctx, el.text, lx, 0, lsPx, 'f');
      ctx.restore();
    }
  }

  var FAMS = ['DMSerifDisplay-400', 'GreatVibes-400', 'Yellowtail-400', 'BodoniModa-900', 'Shrikhand-400', 'PlayfairDisplay-900', 'ArchivoBlack-400', 'Anton-400', 'Inter-400', 'Inter-700', 'BebasNeue-400', 'Unbounded-800', 'SpaceGrotesk-700', 'Caveat-700', 'PlayfairDisplay-600i'];
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(FAMS.map(function (f) { return document.fonts.load('40px "' + f + '"').catch(function () {}); }));
  }

  root.FluxTitles = { MODELS: MODELS, layout: layout, draw: draw, loadFonts: loadFonts, W: W, H: H };
})(window);
