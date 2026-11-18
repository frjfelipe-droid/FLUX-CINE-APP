/* FLUX CINE v3
 * abertura (logo) → 3 perguntas → apresentação (VIP ou grátis) → modelo de título
 * → 1 vídeo (escuta, acha o gancho e põe no início) → legenda (fonte + revisão) → Alta ou 4K → galeria/compartilhar */
(function () {
  var CAP = window.Capacitor;
  var NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
  var REG = (window.capacitorExports && window.capacitorExports.registerPlugin) || (CAP && CAP.registerPlugin);
  var FE = NATIVE && REG ? REG('FluxEditor') : null;
  var APP = NATIVE && REG ? REG('App') : null;
  if (NATIVE && !FE) NATIVE = false;
  var ORANGE = '#FF7A1A';
  var TT = window.FluxTitles, MODELS = TT.MODELS;
  function safe(p) { try { if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  var CAP_FONTS = [
    { id: 'Unbounded-800', label: 'Unbounded' }, { id: 'Anton-400', label: 'Anton', upper: 1 },
    { id: 'BebasNeue-400', label: 'Bebas', upper: 1 }, { id: 'ArchivoBlack-400', label: 'Archivo' },
    { id: 'SpaceGrotesk-700', label: 'Grotesk' }, { id: 'Inter-700', label: 'Inter' },
    { id: 'PlayfairDisplay-600i', label: 'Playfair' }, { id: 'Caveat-700', label: 'Caveat' }
  ];
  var SFX = [{ id: 'impact', name: 'Impacto' }, { id: 'whoosh', name: 'Whoosh' }, { id: 'riser', name: 'Riser' }, { id: 'glitch', name: 'Glitch' }, { id: 'pop', name: 'Pop' }, { id: 'none', name: 'Sem efeito' }];
  var CTAS = ['Chama no WhatsApp', 'Link na bio', 'Agende sua visita', 'Compre agora'];
  var HASHTAGS = ['#empreendedorismo', '#reels', '#dicas', '#marketingdigital', '#pequenosnegocios', '#vendas', '#viral', '#bastidores'];
  var Q1 = [
    { id: 'titulos', t: 'Títulos de cinema', ic: 'T' }, { id: 'legenda', t: 'Legenda que acompanha a fala', ic: 'Aa' },
    { id: 'cortes', t: 'Cortes rápidos e dinâmicos', ic: '✂' }, { id: 'som', t: 'Efeitos sonoros', ic: '♪' }
  ];
  var PITCH = [
    { m: 'classico', title: 'Flux Cine', sub: 'O app das trends virais', brand: 'Flux Cine', k: 'Convenhamos', d: 'O FLUX CINE é o app que edita seu vídeo seguindo as trends virais do momento.' },
    { m: 'camp', title: 'Gancho', sub: 'automático', brand: 'Flux Cine', k: 'Os 3 primeiros segundos', d: 'Ele escuta sua fala, acha a frase mais forte e coloca no começo, sem cortar nenhuma palavra.' },
    { m: 'escape', title: 'Legenda', sub: 'que escuta', brand: 'Flux Cine', k: 'Palavra por palavra', d: 'Transcreve o que você falou, legenda no ritmo da sua voz e deixa você corrigir.' },
    { m: 'insano', title: 'Cinema', sub: 'no seu celular', brand: 'Flux Cine', k: 'Títulos de filme', d: 'Modelos cinematográficos animados com desfoque, que você escolhe em um toque.' },
    { m: 'retro', title: '5 Minutos', sub: 'do celular pro Insta', brand: 'Flux Cine', k: 'Pronto pra postar', d: 'Baixe na galeria ou compartilhe. Em Alta grátis, ou em 4K no VIP.' }
  ];
  var ORDER = { models: 0, video: 1, legenda: 2, render: 3, done: 3 };

  var S = {
    screen: 'intro', q1: null, style: null, pitchI: 0, vip: store('flux_vip') === '1',
    model: 'classico', clip: null, hookIdx: 0, hooks: [], autoCut: true,
    title: '', sub: '', brand: store('flux_brand') || '',
    capFont: 'Unbounded-800', cta: '', sfx: 'impact', quality: 'hd',
    progress: 0, out: null, err: '', caption: '', tags: ['#empreendedorismo', '#reels', '#dicas']
  };

  var ICON = {
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4F4F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    play: function (c, s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + c + '" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>'; },
    check: function (s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; },
    up: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + ORANGE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>',
    ear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + ORANGE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8.5a6 6 0 1 1 12 0c0 3.5-3 4.5-3 7.5a3 3 0 0 1-6 0"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0"/></svg>',
    bolt: '<svg width="18" height="18" viewBox="0 0 24 24" fill="' + ORANGE + '" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    crown: function (s, c) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + (c || '#140700') + '" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>'; },
    insta: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>'
  };

  function find(l, id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return l[0]; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
  function fmt1(sec) { return (Math.round(sec * 10) / 10).toFixed(1).replace('.', ',') + 's'; }
  function media(id) { return '<video src="media/' + id + '.mp4" autoplay muted loop playsinline preload="auto" onerror="this.remove()"></video>'; }

  /* ================= animação dos títulos nos <canvas data-title> ================= */
  var anims = [], rafOn = false, lastFrame = 0;
  function bindCanvases() {
    anims = [];
    var list = document.querySelectorAll('canvas[data-title]');
    for (var i = 0; i < list.length; i++) {
      var c = list[i], r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      c.width = Math.max(10, Math.round(r.width * dpr)); c.height = Math.max(10, Math.round(r.height * dpr));
      var cfg = JSON.parse(c.getAttribute('data-title'));
      anims.push({ c: c, ctx: c.getContext('2d'), layers: TT.layout(cfg.m, cfg), end: cfg.end || 3.6, hold: cfg.hold || 1.1, t0: performance.now() - (cfg.off || 0) * 1000 });
    }
    if (anims.length && !rafOn) { rafOn = true; requestAnimationFrame(tick); }
  }
  function tick(now) {
    if (!anims.length) { rafOn = false; return; }
    if (now - lastFrame > 32) {
      lastFrame = now;
      for (var i = 0; i < anims.length; i++) {
        var a = anims[i];
        if (!a.c.isConnected) continue;
        var cyc = a.end + a.hold, t = ((now - a.t0) / 1000) % cyc;
        a.ctx.setTransform(1, 0, 0, 1, 0, 0); a.ctx.clearRect(0, 0, a.c.width, a.c.height);
        a.ctx.setTransform(a.c.width / TT.W, 0, 0, a.c.height / TT.H, 0, 0);
        TT.draw(a.ctx, a.layers, t, a.end);
      }
    }
    requestAnimationFrame(tick);
  }
  function titleCanvas(cfg) { return '<canvas data-title="' + esc(JSON.stringify(cfg)) + '"></canvas>'; }

  /* ================= escuta, gancho e linha do tempo ================= */
  var HOOK_WORDS = ['segredo', 'erro', 'erros', 'ninguém', 'nunca', 'pare', 'cuidado', 'atenção', 'verdade', 'dinheiro', 'cliente', 'clientes', 'vender', 'venda', 'vendas', 'grátis', 'rápido', 'maior', 'melhor', 'pior', 'descobri', 'imagina', 'olha', 'agora', 'hoje', 'dica', 'dicas', 'jeito', 'truque', 'resultado', 'mudou', 'mudar', 'precisa', 'perder', 'ganhar', 'lucro', 'motivo', 'motivos'];
  var Q_WORDS = ['como', 'por', 'porque', 'qual', 'quais', 'quanto', 'quantos', 'sabia', 'já', 'você'];
  var NUM = ['dois', 'duas', 'três', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'dez'];
  var STOP = ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'que', 'e', 'um', 'uma', 'com', 'para', 'pra', 'no', 'na', 'nos', 'nas', 'em', 'por', 'se', 'mas', 'ou', 'eu', 'meu', 'minha', 'seu', 'sua', 'todos', 'todas'];
  var FILLER = ['né', 'tipo', 'então', 'é', 'ah', 'eh', 'hum', 'bom', 'aí', 'oi', 'gente'];
  function phrases(words) {
    var out = [], cur = null;
    words.forEach(function (w, i) {
      if (!cur || w.s - cur.e > 0.42) { cur = { i0: i, i1: i, s: w.s, e: w.e }; out.push(cur); }
      else { cur.i1 = i; cur.e = w.e; }
    });
    return out;
  }
  function scoreSpan(words, a, b) {
    var ws = words.slice(a, b + 1).map(function (w) { return w.w.toLowerCase(); }), sc = 0, dur = words[b].e - words[a].s;
    if (Q_WORDS.indexOf(ws[0]) >= 0) sc += 3;
    if (FILLER.indexOf(ws[0]) >= 0) sc -= 1.5;
    ws.forEach(function (w) {
      if (HOOK_WORDS.indexOf(w) >= 0) sc += 2;
      if (w === 'você' || w === 'seu' || w === 'sua' || w === 'vocês') sc += 1.5;
      if (/^\d+$/.test(w) || NUM.indexOf(w) >= 0) sc += 1;
    });
    if (dur >= 2.6 && dur <= 4.3) sc += 2.5; else if (dur >= 1.8 && dur <= 5) sc += 1; else sc -= 2;
    return sc;
  }
  function findHooks(clip) {
    var words = clip.words || [], dur = (clip.durationMs || 0) / 1000;
    if (words.length < 3) return [{ s: 0, e: Math.min(dur || 3.5, 3.5), text: '', nospeech: true }];
    var ph = phrases(words), cands = [];
    for (var p = 0; p < ph.length; p++) {
      for (var q = p; q < ph.length && q < p + 3; q++) {
        var a = ph[p].i0, b = ph[q].i1;
        if (words[b].e - words[a].s > 5.2) {
          // frase longa: termina numa micro-pausa perto de 4s, nunca no meio de uma palavra
          var best = -1;
          for (var j = a; j < b; j++) { var d = words[j].e - words[a].s; if (d >= 2.4 && d <= 4.6 && words[j + 1].s - words[j].e > 0.12) best = j; }
          if (best < 0) break;
          b = best;
        }
        // não terminar em palavra solta ("os", "de", "que"…): completa ou recua
        while (b < words.length - 1 && STOP.indexOf(words[b].w.toLowerCase()) >= 0 && words[b + 1].e - words[a].s <= 5.4) b++;
        while (b > a && (STOP.indexOf(words[b].w.toLowerCase()) >= 0 || FILLER.indexOf(words[b].w.toLowerCase()) >= 0)) b--;
        cands.push({ a: a, b: b, sc: scoreSpan(words, a, b) });
      }
    }
    cands.sort(function (x, y) { return y.sc - x.sc; });
    var picked = [];
    cands.forEach(function (c) {
      if (picked.length >= 3) return;
      if (picked.some(function (p) { return !(c.b < p.a || c.a > p.b); })) return;
      picked.push(c);
    });
    return picked.map(function (c) {
      var prevE = c.a > 0 ? words[c.a - 1].e : 0, nextS = c.b < words.length - 1 ? words[c.b + 1].s : (dur || words[c.b].e + 1);
      var s = Math.max(prevE + 0.02, words[c.a].s - 0.15, 0), e = Math.min(nextS - 0.02, words[c.b].e + 0.22);
      return { s: s, e: e, text: words.slice(c.a, c.b + 1).map(function (w) { return w.w; }).join(' ') };
    });
  }
  function hook() { return S.hooks[S.hookIdx] || null; }
  function speechSegs(clip) {
    var dur = (clip.durationMs || 0) / 1000, words = clip.words || [];
    if (!S.autoCut || !words.length || !dur) return [{ s: 0, e: dur }];
    var segs = [];
    words.forEach(function (w) {
      var s = Math.max(0, w.s - 0.12), e = Math.min(dur, w.e + 0.2), last = segs[segs.length - 1];
      if (last && s - last.e < 0.45) last.e = Math.max(last.e, e); else segs.push({ s: s, e: e });
    });
    return segs.filter(function (g) { return g.e - g.s >= 0.25; });
  }
  function timeline() {
    var c = S.clip; if (!c) return { segments: [], captions: [], boundaries: [], total: 0, hookDur: 0 };
    var h = hook(), order = [], moved = h && !h.nospeech && h.s > 0.3;
    var rest = speechSegs(c);
    if (moved) {
      order.push({ s: h.s, e: h.e });
      rest.forEach(function (g) {
        if (g.e <= h.s || g.s >= h.e) order.push(g);
        else { if (g.s < h.s - 0.05) order.push({ s: g.s, e: h.s }); if (g.e > h.e + 0.05) order.push({ s: h.e, e: g.e }); }
      });
    } else order = rest;
    order = order.filter(function (g) { return g.e - g.s >= 0.2; });
    var segments = [], words = [], out = 0, boundaries = [], hookDur = moved ? h.e - h.s : 0;
    order.forEach(function (g, i) {
      if (i === 1 && moved) boundaries.push(out);
      segments.push({ path: c.path, startMs: Math.round(g.s * 1000), endMs: Math.round(g.e * 1000) });
      (c.words || []).forEach(function (w) {
        if (w.s >= g.s - 0.02 && w.e <= g.e + 0.02) words.push({ w: w.w, s: out + (w.s - g.s), e: out + (w.e - g.s), src: w });
      });
      out += g.e - g.s;
    });
    var captions = [], cur = null;
    words.forEach(function (w) {
      var len = cur ? cur.words.reduce(function (a, x) { return a + x.w.length + 1; }, 0) : 0;
      if (!cur || cur.words.length >= 3 || len + w.w.length > 18 || w.s - cur.e > 0.35) { cur = { s: w.s, e: w.e, words: [] }; captions.push(cur); }
      cur.words.push(w); cur.e = w.e;
    });
    for (var i = 0; i < captions.length; i++) { var nx = captions[i + 1]; captions[i].e = nx ? Math.min(nx.s, captions[i].e + 0.4) : captions[i].e + 0.5; }
    return { segments: segments, captions: captions, boundaries: boundaries, total: out, hookDur: hookDur };
  }
  function titleEnd(tl) { return Math.max(2.6, Math.min(4.8, tl.hookDur || 3.4)); }
  function autoTitle() {
    if (S.title.trim()) return S.title.trim();
    var h = hook();
    if (h && h.text) {
      var ws = h.text.split(' '), k = -1;
      for (var i = 0; i < ws.length; i++) if (HOOK_WORDS.indexOf(ws[i].toLowerCase()) >= 0) { k = i; break; }
      var pick = k < 0 ? ws.slice(0, 3) : (k > 0 && (NUM.indexOf(ws[k - 1]) >= 0 || /^\d+$/.test(ws[k - 1])) ? ws.slice(k - 1, k + 1) : ws.slice(k, k + 1));
      var w = pick.join(' ');
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return find(MODELS, S.model).demo.title;
  }
  function titleCfg(extra) {
    var o = { m: S.model, title: autoTitle(), sub: S.sub, brand: S.brand || 'FLUX CINE' };
    for (var k in extra) o[k] = extra[k];
    return o;
  }
  function editCaption(idx, text) {
    var tl = timeline(), cp = tl.captions[idx]; if (!cp) return;
    var srcs = cp.words.map(function (w) { return w.src; }), toks = text.trim().split(/\s+/).filter(Boolean);
    var words = S.clip.words, i0 = words.indexOf(srcs[0]), i1 = words.indexOf(srcs[srcs.length - 1]);
    if (i0 < 0 || i1 < 0 || !toks.length) return;
    var s = srcs[0].s, e = srcs[srcs.length - 1].e, step = (e - s) / toks.length;
    var rep = toks.map(function (t, k) { return { w: t, s: s + k * step, e: s + (k + 1) * step - 0.02 }; });
    words.splice.apply(words, [i0, i1 - i0 + 1].concat(rep));
  }
  function buildCaption() {
    var words = (S.clip && S.clip.words || []).map(function (w) { return w.w; });
    var body = words.slice(0, 28).join(' ') + (words.length > 28 ? '…' : '');
    if (body) body = body.charAt(0).toUpperCase() + body.slice(1);
    var parts = [autoTitle()]; if (body) parts.push(body); if (S.cta) parts.push('👉 ' + S.cta); parts.push(S.tags.join(' '));
    return parts.join('\n\n');
  }

  /* ================= telas ================= */
  function intro() {
    return '<div class="full intro" id="introEl"><div class="flare"></div><div class="sweep"></div><img class="mk" src="mark-a.png" alt=""><img class="wm" src="wordmark.png" alt="FLUX CINE"></div>';
  }
  function dots(n) { var h = ''; for (var i = 0; i < 3; i++) h += '<i class="' + (i <= n ? 'on' : '') + '"></i>'; return '<div class="dots">' + h + '</div>'; }
  function q1() {
    return '<div class="full qz"><div>' + dots(0) + '<h1>O que você mais gosta em um vídeo?</h1><p class="lead">Escolha o que mais prende a sua atenção.</p>' +
      '<div class="opts">' + Q1.map(function (o) { return '<button class="opt ' + (S.q1 === o.id ? 'on' : '') + '" data-a="q1" data-v="' + o.id + '"><span class="ic" style="color:' + ORANGE + ';font-weight:800">' + o.ic + '</span>' + o.t + '</button>'; }).join('') + '</div></div><span></span></div>';
  }
  function q2() {
    return '<div class="full qz"><div>' + dots(1) + '<h1>Você curte estilo cinematográfico ou um corte simples?</h1>' +
      '<div class="duo"><button data-a="q2" data-v="cine" class="' + (S.style === 'cine' ? 'on' : '') + '">' + media(39878) + titleCanvas({ m: 'classico', title: 'Cinema', sub: 'estilo de filme', brand: 'Flux Cine', end: 3.2 }) + '<span class="lbl2">Cinematográfico<small>Títulos de filme, desfoque, impacto</small></span></button>' +
      '<button data-a="q2" data-v="simples" class="' + (S.style === 'simples' ? 'on' : '') + '">' + media(1240) + '<span class="lbl2">Corte simples<small>Direto ao ponto, legenda limpa</small></span></button></div></div><span></span></div>';
  }
  function q3() {
    return '<div class="full qz"><div>' + dots(2) + '<h1>E se eu te falar que dá pra fazer tudo isso…</h1><div class="big5">5 min.</div>' +
      '<p class="lead" style="font-size:17px;color:#F4F4F5">…e ter seu vídeo editado em 5 minutos?</p></div>' +
      '<button class="btn vip" data-a="q3">Me mostra ' + ICON.arrow + '</button></div>';
  }
  function pitch() {
    var p = PITCH[S.pitchI], m = find(MODELS, p.m);
    var bars = PITCH.map(function (_, i) { return '<i><b style="width:' + (i < S.pitchI ? 100 : 0) + '%"' + (i === S.pitchI ? ' class="run"' : '') + '></b></i>'; }).join('');
    return '<div class="full pitch"><div class="stage">' + media(m.media) + titleCanvas({ m: p.m, title: p.title, sub: p.sub, brand: p.brand, end: 4.6, hold: 9 }) + '</div>' +
      '<div class="bars">' + bars + '</div><div class="shade2"></div><button class="tap" data-a="pnext" aria-label="Próximo"></button>' +
      '<div class="desc"><b>' + p.k + '</b>' + p.d + '</div>' +
      '<div class="acts"><button class="btn vip" data-a="vip">' + ICON.crown(18) + ' Quero acesso VIP</button><button class="btn ghost" data-a="free">Continuar no gratuito</button></div></div>';
  }
  function vipScreen() {
    var perks = [
      ['4K', 'Exportar em 4K', 'Qualidade máxima para Reels, TikTok e anúncios.'],
      ['★', 'Todos os modelos de título', 'Libera Insano e Retrô 70, além dos gratuitos.'],
      ['⚡', 'Gancho, legenda e títulos', 'Tudo que o gratuito tem, sem limite de modelo.']
    ];
    return '<div class="full vipbox"><button class="back" data-a="vipback" aria-label="Voltar">' + ICON.back + '</button>' +
      '<div class="crown">' + ICON.crown(30) + '</div><h1>FLUX CINE VIP</h1><p class="sub">Vídeos em 4K e todos os modelos cinematográficos.</p>' +
      perks.map(function (p) { return '<div class="perk"><span class="ic" style="color:' + ORANGE + ';font-weight:800">' + p[0] + '</span><div><b>' + p[1] + '</b><span>' + p[2] + '</span></div></div>'; }).join('') +
      '<div class="plan"><b>Assinatura pela Google Play</b><p>O pagamento entra quando o app for publicado na Play Store. Enquanto isso, ative o modo de teste para experimentar o VIP.</p></div>' +
      (S.vip ? '<button class="btn sec" data-a="vipoff">Desativar VIP de teste</button>' : '<button class="btn vip" style="margin-top:18px" data-a="vipon">' + ICON.crown(18) + ' Ativar VIP de teste</button>') +
      '<button class="btn txt" data-a="vipback">Continuar no gratuito</button></div>';
  }

  function header() {
    var i = ORDER[S.screen], showBack = S.screen === 'video' || S.screen === 'legenda';
    var steps = ['Modelo', 'Vídeo', 'Legenda', 'Pronto'].map(function (l, k) { return '<div class="step ' + (k === i ? 'on' : k < i ? 'past' : '') + '"><i></i><span>' + l + '</span></div>'; }).join('');
    return '<div class="head"><div class="toprow">' +
      (showBack ? '<button class="back" data-a="back" aria-label="Voltar">' + ICON.back + '</button>' : '<div class="logo"><img src="mark.png" alt="" width="34" height="34"><b>FLU<em>X</em></b><i>CINE</i></div>') +
      '<button class="vippill ' + (S.vip ? '' : 'free') + '" data-a="vip">' + (S.vip ? '★ VIP' : 'Grátis · Ser VIP') + '</button></div><div class="steps">' + steps + '</div></div>';
  }

  function models() {
    var cards = MODELS.map(function (m, i) {
      var sel = m.id === S.model;
      return '<button class="card ' + (sel ? 'sel' : '') + '" data-a="model" data-v="' + m.id + '" aria-pressed="' + sel + '">' +
        '<div class="thumb" style="background:#111">' + media(m.media) + titleCanvas({ m: m.id, title: m.demo.title, sub: m.demo.sub, brand: m.demo.brand, end: 3.6, off: i * 0.5 }) +
        (m.vip ? '<span class="viptag">VIP</span>' : '') + (sel ? '<div class="check" style="top:10px">' + ICON.check(14) + '</div>' : '') + '</div>' +
        '<span class="cname">' + m.name + '</span><span class="cmeta">' + m.vibe + '</span></button>';
    }).join('');
    return '<h1>Escolha o título cinematográfico</h1><p class="sub">Ele entra animado nos primeiros segundos, junto com o seu gancho.</p>' +
      '<div class="grid" style="margin-top:18px">' + cards + '</div>' +
      '<div style="text-align:center;margin-top:16px"><button class="linkbtn" data-a="replay">Rever a apresentação</button></div>';
  }

  function hookCard() {
    var c = S.clip; if (!c) return '';
    if (c.status === 'listening') return '<div class="listen"><div class="row">' + ICON.ear + '<span>Ouvindo e procurando o gancho… ' + Math.round((c.p || 0) * 100) + '%</span></div><div class="bar"><i style="width:' + Math.round((c.p || 0) * 100) + '%"></i></div></div>';
    if (c.status === 'error') return '<div class="err">' + esc(c.err) + '</div>';
    var h = hook(), tl = timeline();
    if (!h) return '';
    var alts = S.hooks.length > 1 ? '<div class="alts">' + S.hooks.map(function (x, i) { return '<button class="alt ' + (i === S.hookIdx ? 'on' : '') + '" data-a="hook" data-v="' + i + '">' + (i === 0 ? 'Melhor: ' : 'Opção ' + (i + 1) + ': ') + '“' + esc(x.text) + '”</button>'; }).join('') + '</div>' : '';
    return '<div class="hook"><div style="display:flex;gap:8px;align-items:center;font-size:13px;font-weight:700;color:' + ORANGE + '">' + ICON.bolt + (h.nospeech ? 'Não encontrei fala — vou usar o começo do vídeo' : 'Gancho encontrado') + '</div>' +
      (h.text ? '<q>' + esc(h.text) + '</q><span class="when">Estava em ' + fmt1(h.s) + ' · vai para o início · ' + fmt1(h.e - h.s) + ' · nenhuma palavra cortada</span>' : '') + alts +
      '<button class="toggle ' + (S.autoCut ? 'on' : '') + '" data-a="autocut" aria-pressed="' + S.autoCut + '"><span class="col" style="gap:2px"><span style="font-size:14px;font-weight:600">Cortar silêncios e pausas</span><span class="hint">' + fmt((c.durationMs || 0) / 1000) + ' → ' + fmt(tl.total) + '</span></span><span class="sw"><i></i></span></button></div>';
  }
  function videoScreen() {
    var c = S.clip;
    var slot = '<button class="slot ' + (c ? 'done' : '') + '" data-a="pick">' +
      '<div class="sthumb">' + (c && c.thumb ? '<img src="' + c.thumb + '" alt="">' : (c ? ICON.play('#fff', 22) : ICON.up)) + '</div>' +
      '<div class="col" style="flex:1;min-width:0;gap:4px"><span class="kick">Seu vídeo</span><span class="stitle">' + (c ? esc(c.name) : 'Envie o vídeo do gancho') + '</span>' +
      '<span class="ssub">' + (c ? fmt((c.durationMs || 0) / 1000) + ' · toque para trocar' : 'Grave falando, na vertical') + '</span></div>' + (c ? '<div class="ok">' + ICON.check(15) + '</div>' : '') + '</button>';
    var ready = c && c.status === 'ok';
    var preview = ready ? '<div class="pv">' + (c.thumb ? '<img src="' + c.thumb + '" alt="">' : media(find(MODELS, S.model).media)) + titleCanvas(titleCfg({ end: 3.8 })) + '</div>' +
      '<div class="inputs"><div class="col wide" style="gap:6px"><label class="lbl" for="ti">Título</label><input id="ti" class="field" style="height:48px;padding:0 14px" value="' + esc(S.title) + '" placeholder="' + esc(autoTitle()) + '"></div>' +
      '<div class="col" style="gap:6px"><label class="lbl" for="su">Subtítulo</label><input id="su" class="field" style="height:48px;padding:0 14px" value="' + esc(S.sub) + '" placeholder="opcional"></div>' +
      '<div class="col" style="gap:6px"><label class="lbl" for="br">Sua marca</label><input id="br" class="field" style="height:48px;padding:0 14px" value="' + esc(S.brand) + '" placeholder="Nome da marca"></div></div>' : '';
    return '<span class="pill">Modelo: <b>' + find(MODELS, S.model).name + '</b></span><h1>Mande seu vídeo</h1>' +
      '<p class="sub">O FLUX CINE escuta, acha o gancho na sua fala e coloca nos primeiros 3–4 segundos.</p>' + slot + hookCard() + preview;
  }

  function legenda() {
    var m = find(MODELS, S.model), f = find(CAP_FONTS, S.capFont), tl = timeline();
    var fonts = CAP_FONTS.map(function (x) { var on = x.id === S.capFont; return '<button class="font ' + (on ? 'on' : '') + '" data-a="capfont" data-v="' + x.id + '"><span class="aa" style="font-family:\'' + x.id + '\'">Aa</span><small>' + x.label + '</small></button>'; }).join('');
    var sample = tl.captions[Math.min(1, tl.captions.length - 1)];
    var sw = sample ? sample.words.map(function (w, i) { var t = esc(f.upper ? w.w.toUpperCase() : w.w); return i === 1 ? '<span style="background:' + m.accent + ';color:#0A0A0B;padding:0 6px;border-radius:6px;text-shadow:none">' + t + '</span>' : t; }).join(' ') : 'sua legenda aqui';
    var rows = tl.captions.map(function (cp, i) { return '<div class="caprow"><span>' + fmt1(cp.s) + '</span><input data-cap="' + i + '" value="' + esc(cp.words.map(function (w) { return w.w; }).join(' ')) + '" aria-label="Legenda ' + (i + 1) + '"></div>'; }).join('');
    var sfx = SFX.map(function (x) { return '<button class="sug ' + (S.sfx === x.id ? 'on' : '') + '" data-a="sfx" data-v="' + x.id + '">' + x.name + '</button>'; }).join('');
    var ctas = CTAS.map(function (c) { return '<button class="sug ' + (S.cta === c ? 'on' : '') + '" data-a="cta" data-v="' + c + '">' + c + '</button>'; }).join('');
    return '<h1>Legenda</h1><p class="sub">Escolha a fonte e confira o que foi transcrito. Toque num trecho para corrigir.</p>' +
      '<div class="pv" style="max-height:300px">' + (S.clip && S.clip.thumb ? '<img src="' + S.clip.thumb + '" alt="">' : media(m.media)) +
      '<div class="pcap2" style="font-family:\'' + f.id + '\';font-size:26px">' + sw + '</div></div>' +
      '<section><h2>Fonte da legenda</h2><div class="fonts" style="grid-template-columns:repeat(4,1fr)">' + fonts + '</div></section>' +
      '<section><h2>Revisar legenda (' + tl.captions.length + ' trechos)</h2>' + (rows ? '<div class="caps">' + rows + '</div>' : '<span class="hint">Sem fala detectada.</span>') + '</section>' +
      '<section><h2><label for="ctain">Chamada no final (opcional)</label></h2><input id="ctain" class="field" style="height:48px;padding:0 14px" value="' + esc(S.cta) + '" placeholder="Ex.: Chama no WhatsApp"><div class="chiprow">' + ctas + '</div></section>' +
      '<section><h2>Efeito sonoro</h2><div class="chiprow">' + sfx + '</div></section>' +
      '<section><h2>Qualidade</h2><div class="qual"><button class="' + (S.quality === 'hd' ? 'on' : '') + '" data-a="qual" data-v="hd"><b>Alta</b><span>1080p · grátis</span></button>' +
      '<button class="' + (S.quality === '4k' ? 'on' : '') + '" data-a="qual" data-v="4k"><b>4K' + (S.vip ? '' : '<span class="lock">VIP</span>') + '</b><span>2160p · máxima nitidez</span></button></div></section>';
  }

  function renderScreen() {
    var p = S.progress;
    return '<div class="rpv">' + (S.clip && S.clip.thumb ? '<img src="' + S.clip.thumb + '" alt="" style="opacity:.6">' : '') + titleCanvas(titleCfg({ end: 3.4 })) + '</div>' +
      '<div class="col center" style="gap:6px;margin-top:22px"><h1 style="font-size:22px">' + (p < 100 ? 'Editando… ' + p + '%' : 'Pronto!') + '</h1><p class="sub" style="margin:0">' + (NATIVE ? 'Gancho no início, título, legenda e som. Tudo no seu celular.' : 'Prévia: no app Android a edição é real.') + '</p></div>' +
      '<div class="rbar"><i style="width:' + p + '%"></i></div>' +
      (S.err ? '<div class="err">' + esc(S.err) + '</div><button class="btn sec" data-a="back-leg">Voltar e tentar de novo</button>' : '');
  }

  function done() {
    var m = find(MODELS, S.model);
    var player = S.out && NATIVE ? '<video class="out" src="' + CAP.convertFileSrc(S.out.path) + '" controls autoplay loop playsinline></video>'
      : media(m.media) + titleCanvas(titleCfg({ end: 3.6 }));
    var tags = HASHTAGS.map(function (h) { return '<button class="tag pick ' + (S.tags.indexOf(h) >= 0 ? 'on' : '') + '" data-a="tag" data-v="' + h + '">' + h + '</button>'; }).join('');
    return '<div class="col center" style="gap:6px"><h1 style="font-size:26px">Seu vídeo está pronto<span style="color:' + ORANGE + '">.</span></h1><p class="sub" style="margin:0">' + m.name + ' · ' + (S.quality === '4k' ? '4K' : 'Alta 1080p') + (S.out && S.out.durationMs ? ' · ' + fmt(S.out.durationMs / 1000) : '') + '</p></div>' +
      '<div class="final" style="background:#111">' + player + '</div>' +
      '<button class="btn pri" data-a="save">' + ICON.down + 'Baixar na galeria</button>' +
      '<button class="btn sec" data-a="share">Compartilhar</button>' +
      '<button class="btn sec" data-a="insta">' + ICON.insta + 'Postar no Instagram</button>' +
      '<div class="capbox"><label class="lbl" for="capin">Legenda do post (copiada ao postar)</label><textarea id="capin" class="field" rows="5">' + esc(S.caption) + '</textarea><div class="tags left">' + tags + '</div></div>' +
      '<button class="btn txt" data-a="restart">Criar outro vídeo</button>';
  }

  var app = document.getElementById('app');
  function draw(keepScroll) {
    var full = { intro: intro, q1: q1, q2: q2, q3: q3, pitch: pitch, vip: vipScreen }[S.screen];
    if (full) { app.innerHTML = full(); afterDraw(); return; }
    var body = app.querySelector('.body'), y = body && keepScroll ? body.scrollTop : 0;
    var content = { models: models, video: videoScreen, legenda: legenda, render: renderScreen, done: done }[S.screen]();
    var c = S.clip, listening = c && c.status === 'listening';
    var can = S.screen === 'video' ? !!(c && c.status === 'ok') : true;
    var label = { models: 'Usar este modelo', video: listening ? 'Ouvindo seu vídeo…' : (c ? 'Continuar' : 'Envie seu vídeo'), legenda: 'Gerar vídeo em ' + (S.quality === '4k' ? '4K' : 'Alta') }[S.screen];
    app.innerHTML = header() + '<main class="body">' + content + '</main>' +
      (label ? '<div class="foot"><button class="cta" data-a="next"' + (can ? '' : ' disabled') + '>' + label + ICON.arrow + '</button></div>' : '');
    app.querySelector('.body').scrollTop = y;
    afterDraw();
  }
  function afterDraw() { window.__fluxReady = 1; requestAnimationFrame(bindCanvases); }
  function go(s) { S.screen = s; draw(false); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2800); }

  /* ---------- apresentação: avança sozinha ---------- */
  var pitchTimer, pitchStart;
  function startPitch() {
    clearInterval(pitchTimer); pitchStart = Date.now();
    pitchTimer = setInterval(function () {
      if (S.screen !== 'pitch') { clearInterval(pitchTimer); return; }
      var el = app.querySelector('.bars b.run'), f = Math.min(1, (Date.now() - pitchStart) / 5200);
      if (el) el.style.width = (f * 100) + '%';
      if (f >= 1) { S.pitchI = (S.pitchI + 1) % PITCH.length; pitchStart = Date.now(); draw(false); }
    }, 60);
  }

  /* ---------- vídeo: escolher e ouvir ---------- */
  function setListenProgress(p) {
    var el = app.querySelector('.listen .bar i'), tx = app.querySelector('.listen .row span');
    if (el) el.style.width = Math.round(p * 100) + '%';
    if (tx) tx.textContent = 'Ouvindo e procurando o gancho… ' + Math.round(p * 100) + '%';
  }
  function listen() {
    var c = S.clip; c.status = 'listening'; c.p = 0; S.title = ''; draw(true);
    var finish = function (words) {
      if (S.clip !== c) return;
      c.words = words; c.status = 'ok'; S.hooks = findHooks(c); S.hookIdx = 0; draw(true);
    };
    if (!NATIVE) {
      var p = 0, h = setInterval(function () {
        p += 0.1; c.p = Math.min(1, p); setListenProgress(c.p);
        if (p >= 1) {
          clearInterval(h);
          var demo = 'oi gente tudo bem hoje eu quero falar com vocês sobre uma coisa importante você sabia que três erros fazem você perder clientes todos os dias então presta atenção que eu vou te mostrar como resolver';
          var t = 0.5, ws = demo.split(' ').map(function (w, i) { if (i === 14 || i === 27) t += 0.9; var o = { w: w, s: t, e: t + 0.3 }; t += 0.38; return o; });
          if (!c.durationMs) c.durationMs = Math.round((t + 1) * 1000);
          finish(ws);
        }
      }, 100);
      return;
    }
    FE.transcribe({ path: c.path, id: 'v' }).then(function (r) { finish(r.words || []); })
      .catch(function (e) { c.status = 'error'; c.err = 'Não consegui ouvir o vídeo: ' + ((e && e.message) || ''); draw(true); });
  }
  if (NATIVE) {
    safe(FE.addListener('transcribeProgress', function (d) { var c = S.clip; if (c && c.status === 'listening') { c.p = d.p; setListenProgress(d.p); } }));
    safe(FE.addListener('renderProgress', function (d) {
      if (S.screen !== 'render') return;
      S.progress = Math.max(S.progress, Math.min(99, Math.round(d.p)));
      var h = app.querySelector('.body h1'), b = app.querySelector('.rbar i');
      if (h) h.textContent = 'Editando… ' + S.progress + '%'; if (b) b.style.width = S.progress + '%';
    }));
  }
  var fileIn = document.getElementById('file');
  fileIn.addEventListener('change', function () {
    var f = fileIn.files && fileIn.files[0];
    if (f) {
      var url = URL.createObjectURL(f);
      S.clip = { name: f.name, path: url, durationMs: 0 };
      var v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.src = url;
      v.onloadedmetadata = function () { if (S.clip && isFinite(v.duration)) S.clip.durationMs = Math.round(v.duration * 1000); };
      listen();
    }
    fileIn.value = '';
  });
  function pick() {
    if (!NATIVE) { fileIn.click(); return; }
    FE.pickVideo().then(function (r) { S.clip = { path: r.path, name: r.name, durationMs: r.durationMs, thumb: r.thumb }; listen(); })
      .catch(function (e) { if (e && e.code !== 'CANCELLED') toast((e && e.message) || 'Não consegui abrir o vídeo'); });
  }

  /* ---------- gerar ---------- */
  var simTimer;
  function generate() {
    if (S.quality === '4k' && !S.vip) { S.returnTo = 'legenda'; go('vip'); return; }
    S.progress = 0; S.err = ''; S.out = null; go('render');
    var tl = timeline(), m = find(MODELS, S.model), f = find(CAP_FONTS, S.capFont), tEnd = titleEnd(tl);
    if (!NATIVE) {
      clearInterval(simTimer);
      simTimer = setInterval(function () {
        S.progress = Math.min(100, S.progress + 4);
        var h = app.querySelector('.body h1'), b = app.querySelector('.rbar i'); if (h) h.textContent = 'Editando… ' + S.progress + '%'; if (b) b.style.width = S.progress + '%';
        if (S.progress >= 100) { clearInterval(simTimer); S.caption = buildCaption(); setTimeout(function () { go('done'); }, 300); }
      }, 90);
      return;
    }
    var spec = {
      segments: tl.segments, boundaries: tl.boundaries,
      captions: tl.captions.map(function (c) { return { s: c.s, e: c.e, words: c.words.map(function (w) { return { w: w.w, s: w.s, e: w.e }; }) }; }),
      titleLayout: TT.layout(S.model, titleCfg({})), titleEnd: tEnd,
      fontFile: f.id + '.ttf', upper: !!f.upper, accent: m.accent, hlMode: 'box', letterbox: false,
      cta: S.cta, ending: S.cta ? 'cut' : 'fade', sfx: S.sfx, quality: S.quality
    };
    FE.render(spec).then(function (r) {
      S.out = r; S.progress = 100; S.caption = buildCaption(); go('done');
    }).catch(function (e) { S.err = (e && e.message) || 'Falha ao montar o vídeo'; draw(true); });
  }

  /* ---------- cliques ---------- */
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-a'), v = b.getAttribute('data-v');
    if (a === 'q1') { S.q1 = v; draw(); setTimeout(function () { go('q2'); }, 220); }
    else if (a === 'q2') { S.style = v; S.model = v === 'simples' ? 'escape' : 'classico'; if (v === 'simples') S.sfx = 'none'; draw(); setTimeout(function () { go('q3'); }, 220); }
    else if (a === 'q3') { S.pitchI = 0; go('pitch'); startPitch(); }
    else if (a === 'pnext') { S.pitchI = (S.pitchI + 1) % PITCH.length; pitchStart = Date.now(); draw(); }
    else if (a === 'vip') { S.returnTo = S.screen === 'pitch' ? 'models' : S.screen; store('flux_onboarded', '1'); go('vip'); }
    else if (a === 'free') { store('flux_onboarded', '1'); go('models'); }
    else if (a === 'vipon') { S.vip = true; store('flux_vip', '1'); toast('VIP de teste ativado'); go(S.returnTo || 'models'); }
    else if (a === 'vipoff') { S.vip = false; store('flux_vip', '0'); if (S.quality === '4k') S.quality = 'hd'; draw(); }
    else if (a === 'vipback') { go(S.returnTo || 'models'); }
    else if (a === 'replay') { S.pitchI = 0; go('pitch'); startPitch(); }
    else if (a === 'model') {
      var md = find(MODELS, v);
      if (md.vip && !S.vip) { S.returnTo = 'models'; go('vip'); return; }
      S.model = v; draw(true);
    }
    else if (a === 'back') go(S.screen === 'legenda' ? 'video' : 'models');
    else if (a === 'back-leg') go('legenda');
    else if (a === 'next') { if (S.screen === 'models') go('video'); else if (S.screen === 'video') go('legenda'); else generate(); }
    else if (a === 'pick') pick();
    else if (a === 'hook') { S.hookIdx = +v; draw(true); }
    else if (a === 'autocut') { S.autoCut = !S.autoCut; draw(true); }
    else if (a === 'capfont') { S.capFont = v; draw(true); }
    else if (a === 'cta') { S.cta = v; draw(true); }
    else if (a === 'sfx') { S.sfx = v; draw(true); }
    else if (a === 'qual') { if (v === '4k' && !S.vip) { S.returnTo = 'legenda'; go('vip'); return; } S.quality = v; draw(true); }
    else if (a === 'tag') { var i = S.tags.indexOf(v); if (i >= 0) S.tags.splice(i, 1); else S.tags.push(v); S.caption = S.caption.replace(/(\n\n)?(#[^\s#]+\s?)+$/, '').trim() + '\n\n' + S.tags.join(' '); draw(true); }
    else if (a === 'insta' || a === 'share') {
      if (!NATIVE || !S.out) { toast('No app Android, isso compartilha o vídeo pronto.'); return; }
      (a === 'insta' ? FE.shareInstagram : FE.share).call(FE, { path: S.out.path, caption: S.caption }).then(function (r) {
        if (a === 'insta') toast(r && r.instagram ? 'Legenda copiada! Escolha Reels e cole.' : 'Instagram não encontrado — escolha um app.');
      }).catch(function (err) { toast((err && err.message) || 'Não consegui compartilhar'); });
    }
    else if (a === 'save') {
      if (!NATIVE || !S.out) { toast('No app Android, o vídeo vai para a galeria.'); return; }
      FE.saveToGallery({ path: S.out.path }).then(function () { toast('Salvo em Galeria › FLUX CINE'); }).catch(function (err) { toast((err && err.message) || 'Não consegui salvar'); });
    }
    else if (a === 'restart') { S.clip = null; S.hooks = []; S.title = ''; S.sub = ''; S.out = null; S.progress = 0; go('models'); }
  });
  var redrawT;
  app.addEventListener('input', function (e) {
    var id = e.target.id;
    if (id === 'ti' || id === 'su' || id === 'br') {
      if (id === 'ti') S.title = e.target.value;
      if (id === 'su') S.sub = e.target.value;
      if (id === 'br') { S.brand = e.target.value; store('flux_brand', S.brand); }
      var cv = app.querySelector('.pv canvas[data-title]');
      if (cv) { clearTimeout(redrawT); redrawT = setTimeout(function () { cv.setAttribute('data-title', JSON.stringify(titleCfg({ end: 3.8 }))); bindCanvases(); }, 250); }
    }
    if (id === 'ctain') S.cta = e.target.value;
    if (id === 'capin') S.caption = e.target.value;
  });
  app.addEventListener('change', function (e) {
    var i = e.target.getAttribute && e.target.getAttribute('data-cap');
    if (i != null) { editCaption(+i, e.target.value); draw(true); }
  });

  if (APP) safe(APP.addListener('backButton', function () {
    var back = { video: 'models', legenda: 'video', done: 'models', vip: S.returnTo || 'models', q2: 'q1', q3: 'q2', pitch: 'q3' }[S.screen];
    if (back) go(back); else if (S.screen === 'models' || S.screen === 'q1') APP.exitApp();
  }));

  /* ---------- abertura ---------- */
  draw(false);
  var fontsReady = TT.loadFonts();
  setTimeout(function () {
    fontsReady.then(function () {
      var el = document.getElementById('introEl'); if (el) el.classList.add('out');
      setTimeout(function () { go(store('flux_onboarded') === '1' ? 'models' : 'q1'); }, 420);
    });
  }, 2100);
})();
