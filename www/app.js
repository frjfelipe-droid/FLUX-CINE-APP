/* FLUX CINE v2 — modelo → vídeos (escuta e corte) → estilo → vídeo pronto → Instagram */
(function () {
  var CAP = window.Capacitor;
  var NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
  var REG = (window.capacitorExports && window.capacitorExports.registerPlugin) || (CAP && CAP.registerPlugin);
  var FE = NATIVE && REG ? REG('FluxEditor') : null;
  var APP = NATIVE && REG ? REG('App') : null;
  if (NATIVE && !FE) NATIVE = false;
  var ORANGE = '#FF7A1A';
  function safe(p) { try { if (p && p.catch) p.catch(function () {}); } catch (e) {} }

  var TEMPLATES = [
    { id: 'pulse', name: 'Pulso Viral', cat: 'Reels', vibe: 'cortes rápidos', dur: '0:20', media: 1240, bg: '#0F1A06', accent: '#D4FF3A', font: 'Unbounded', w: 800, size: 15, title: 'O segredo que ninguém conta', pre: '3 erros que te fazem ', hl: 'perder', post: ' clientes', mode: 'box' },
    { id: 'hook', name: 'Gancho Hollywood', cat: 'Reels', vibe: 'abertura de impacto', dur: '0:30', media: 1238, bg: '#1C1305', accent: '#FFB020', font: 'Anton', w: 400, size: 21, upper: 1, title: 'Isso mudou tudo', pre: 'você precisa ', hl: 'ver', post: ' isso', mode: 'box', lb: 1 },
    { id: 'trailer', name: 'Trailer Épico', cat: 'Anúncio', vibe: 'lançamento', dur: '0:30', media: 39878, bg: '#1A0909', accent: '#FF4D4D', font: 'Bebas Neue', w: 400, size: 26, upper: 1, title: 'Em breve.', pre: 'a nova ', hl: 'coleção', post: '', mode: 'color', lb: 1 },
    { id: 'noir', name: 'Neon Noir', cat: 'Anúncio', vibe: 'noturno e elegante', dur: '0:15', media: 1232, bg: '#0A0E1E', accent: '#5AA9FF', font: 'Space Grotesk', w: 700, size: 16, title: 'A noite é sua', pre: 'aberto até ', hl: 'meia-noite', post: '', mode: 'underline' },
    { id: 'golden', name: 'Hora Dourada', cat: 'Institucional', vibe: 'história da marca', dur: '0:60', media: 39765, bg: '#24140A', accent: '#FF9A4D', font: 'Playfair Display', w: 600, size: 18, italic: 1, title: 'Feito com o coração', pre: 'desde ', hl: '2009', post: ' com você', mode: 'color' },
    { id: 'doc', name: 'Modo Documentário', cat: 'Institucional', vibe: 'bastidores reais', dur: '0:45', media: 39875, bg: '#141414', accent: '#F4F4F5', font: 'Inter', w: 700, size: 14, title: 'Por trás de cada peça', pre: 'cada detalhe ', hl: 'importa', post: '', mode: 'underline', lb: 1 }
  ];
  var FILTERS = ['Todos', 'Reels', 'Anúncio', 'Institucional'];
  var TRENDS = [
    { name: 'Gancho de 3 segundos', title: 'Você está cometendo esse erro?', tpl: 'hook', use: 'Prende quem rola o feed' },
    { name: '3 erros que…', title: '3 erros que te fazem perder clientes', tpl: 'pulse', use: 'Lista rápida, alto salvamento' },
    { name: 'POV do cliente', title: 'POV: você descobriu a gente', tpl: 'noir', use: 'Gera identificação' },
    { name: 'Bastidores', title: 'Um dia por trás da nossa marca', tpl: 'doc', use: 'Confiança e proximidade' },
    { name: 'Antes e depois', title: 'Olha a diferença', tpl: 'trailer', use: 'Mostra resultado' },
    { name: 'Nossa história', title: 'Como tudo começou', tpl: 'golden', use: 'Conexão com a marca' }
  ];
  var HASHTAGS = ['#empreendedorismo', '#pequenosnegocios', '#marketingdigital', '#reels', '#dicas', '#vendas', '#negocios', '#bastidores', '#viral', '#empreender'];
  var FONTS = [
    { id: 'Unbounded', label: 'Unbounded', w: 800, file: 'Unbounded-800.ttf' },
    { id: 'Anton', label: 'Anton', w: 400, upper: 1, file: 'Anton-400.ttf' },
    { id: 'Bebas Neue', label: 'Bebas', w: 400, upper: 1, file: 'BebasNeue-400.ttf' },
    { id: 'Playfair Display', label: 'Playfair', w: 600, italic: 1, file: 'PlayfairDisplay-600i.ttf' },
    { id: 'Space Grotesk', label: 'Grotesk', w: 700, file: 'SpaceGrotesk-700.ttf' },
    { id: 'Caveat', label: 'Caveat', w: 700, file: 'Caveat-700.ttf' }
  ];
  var CTAS = ['Chama no WhatsApp', 'Link na bio', 'Agende sua visita', 'Compre agora'];
  var ENDINGS = [
    { id: 'logo', title: 'Tela final + CTA', desc: 'Escurece e mostra sua chamada' },
    { id: 'fade', title: 'Fade cinema', desc: 'Escurece devagar no fim' },
    { id: 'zoom', title: 'Zoom out', desc: 'Afasta e revela a cena' },
    { id: 'cut', title: 'Corte seco', desc: 'Termina no auge, CTA em pílula' }
  ];
  var SFX = [
    { id: 'whoosh', name: 'Whoosh', desc: 'Transição rápida', bars: [6, 10, 16, 20, 14, 9, 6, 4, 3] },
    { id: 'impact', name: 'Impacto Cinema', desc: 'Batida grave de trailer', bars: [20, 22, 18, 12, 9, 7, 5, 4, 3] },
    { id: 'riser', name: 'Riser', desc: 'Tensão que sobe', bars: [3, 4, 6, 8, 10, 13, 16, 19, 22] },
    { id: 'glitch', name: 'Glitch', desc: 'Estalo digital', bars: [14, 4, 18, 6, 20, 3, 12, 5, 16] },
    { id: 'pop', name: 'Pop Viral', desc: 'Clique de destaque', bars: [4, 8, 20, 8, 4, 3, 3, 3, 3] },
    { id: 'none', name: 'Sem efeito', desc: 'Só a sua voz', bars: [3, 3, 3, 3, 3, 3, 3, 3, 3] }
  ];
  var RSTEPS = [[15, 'Cortando silêncios e pausas'], [45, 'Animando o título cinematográfico'], [75, 'Legendando palavra por palavra'], [100, 'Mixando o som e exportando']];
  var ORDER = { gallery: 0, upload: 1, style: 2, render: 3, done: 3 };

  var S = {
    screen: 'gallery', filter: 'Todos', tpl: 'hook',
    clips: { v1: null, v2: null }, // {path,name,durationMs,thumb,url,words,status,p,err}
    autoCut: true, text: '', font: 'Unbounded', cta: '', ending: 'logo', sfx: 'impact',
    playing: null, progress: 0, out: null, err: '', caption: '', tags: ['#empreendedorismo', '#reels', '#dicas'], styleKey: 0
  };

  var ICON = {
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4F4F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    play: function (c, s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + c + '" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>'; },
    pause: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#0A0A0B" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    check: function (s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; },
    up: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + ORANGE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>',
    ear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + ORANGE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8.5a6 6 0 1 1 12 0c0 3.5-3 4.5-3 7.5a3 3 0 0 1-6 0"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0"/></svg>',
    fire: '<svg width="12" height="12" viewBox="0 0 24 24" fill="' + ORANGE + '" aria-hidden="true"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 .2 2 1 3 2 3.5C11 9 11 5 12 2z"/></svg>',
    insta: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>'
  };

  function find(l, id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return l[0]; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
  function fontCss(f, size) {
    return "font-family:'" + (f.font || f.id) + "';font-weight:" + f.w + ';font-size:' + size + 'px;text-transform:' + (f.upper ? 'uppercase' : 'none') + ';font-style:' + (f.italic ? 'italic' : 'normal');
  }
  function hlCss(t) {
    if (t.mode === 'box') return 'background:' + t.accent + ';color:#0A0A0B;padding:0 5px;border-radius:4px;text-shadow:none';
    if (t.mode === 'underline') return 'color:' + t.accent + ';text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:4px';
    return 'color:' + t.accent;
  }
  function mediaTag(t) { return '<video src="media/' + t.media + '.mp4" autoplay muted loop playsinline preload="auto" onerror="this.remove()"></video>'; }

  /* ---------- escuta e corte ---------- */
  function allWords() {
    var a = [];
    ['v1', 'v2'].forEach(function (k) { var c = S.clips[k]; if (c && c.words) a = a.concat(c.words); });
    return a;
  }
  function transcriptText(k) { var c = S.clips[k]; return c && c.words ? c.words.map(function (w) { return w.w; }).join(' ') : ''; }
  function speechSegs(c) {
    var dur = (c.durationMs || 0) / 1000;
    if (!S.autoCut || !c.words || !c.words.length || !dur) return [{ s: 0, e: dur }];
    var segs = [];
    c.words.forEach(function (w) {
      var s = Math.max(0, w.s - 0.12), e = Math.min(dur, w.e + 0.2), last = segs[segs.length - 1];
      if (last && s - last.e < 0.45) last.e = Math.max(last.e, e); else segs.push({ s: s, e: e });
    });
    segs = segs.filter(function (g) { return g.e - g.s >= 0.3; });
    var tot = segs.reduce(function (a, g) { return a + g.e - g.s; }, 0);
    return tot < 1.5 ? [{ s: 0, e: dur }] : segs;
  }
  function timeline() {
    var segments = [], captions = [], boundaries = [], words = [], out = 0;
    ['v1', 'v2'].forEach(function (k, ci) {
      var c = S.clips[k]; if (!c) return;
      if (ci > 0 && out > 0) boundaries.push(out);
      speechSegs(c).forEach(function (g) {
        segments.push({ path: c.path, startMs: Math.round(g.s * 1000), endMs: Math.round(g.e * 1000), clip: ci });
        (c.words || []).forEach(function (w) {
          if (w.s >= g.s - 0.02 && w.e <= g.e + 0.02) words.push({ w: w.w, s: out + (w.s - g.s), e: out + (w.e - g.s) });
        });
        out += g.e - g.s;
      });
    });
    var cur = null;
    words.forEach(function (w) {
      var len = cur ? cur.words.reduce(function (a, x) { return a + x.w.length + 1; }, 0) : 0;
      if (!cur || cur.words.length >= 3 || len + w.w.length > 18 || w.s - cur.e > 0.35) { cur = { s: w.s, e: w.e, words: [] }; captions.push(cur); }
      cur.words.push(w); cur.e = w.e;
    });
    for (var i = 0; i < captions.length; i++) {
      var nx = captions[i + 1];
      captions[i].e = nx ? Math.min(nx.s, captions[i].e + 0.4) : captions[i].e + 0.5;
    }
    return { segments: segments, captions: captions, boundaries: boundaries, total: out };
  }
  function autoTitle() {
    if (S.text.trim()) return S.text.trim();
    var w = allWords().slice(0, 6).map(function (x) { return x.w; }).join(' ');
    return w ? w.charAt(0).toUpperCase() + w.slice(1) : find(TEMPLATES, S.tpl).title;
  }
  function buildCaption() {
    var words = allWords().map(function (w) { return w.w; });
    var body = words.slice(0, 28).join(' ');
    if (words.length > 28) body += '…';
    if (body) body = body.charAt(0).toUpperCase() + body.slice(1);
    var parts = [autoTitle()];
    if (body) parts.push(body);
    if (S.cta) parts.push('👉 ' + S.cta);
    parts.push(S.tags.join(' '));
    return parts.join('\n\n');
  }

  /* ---------- sons de prévia (no aparelho) ---------- */
  var actx;
  function sound(id) {
    if (id === 'none') return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    var c = actx, t = c.currentTime, out = c.createGain(); out.connect(c.destination);
    function noise(d) { var b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), x = b.getChannelData(0); for (var i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; var s = c.createBufferSource(); s.buffer = b; return s; }
    if (id === 'whoosh') { var n = noise(0.9), f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(4000, t + 0.45); f.frequency.exponentialRampToValueAtTime(600, t + 0.85); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(0.9, t + 0.4); out.gain.linearRampToValueAtTime(0, t + 0.88); n.connect(f); f.connect(out); n.start(t); }
    if (id === 'impact') { var o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.2); out.gain.setValueAtTime(1, t); out.gain.exponentialRampToValueAtTime(0.001, t + 1.6); o.connect(out); o.start(t); o.stop(t + 1.6); var n2 = noise(0.3), g2 = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; g2.gain.setValueAtTime(0.7, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3); n2.connect(lp); lp.connect(g2); g2.connect(c.destination); n2.start(t); }
    if (id === 'riser') { var r = c.createOscillator(); r.type = 'sawtooth'; r.frequency.setValueAtTime(110, t); r.frequency.exponentialRampToValueAtTime(880, t + 1.6); var lf = c.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.setValueAtTime(400, t); lf.frequency.exponentialRampToValueAtTime(5000, t + 1.6); out.gain.setValueAtTime(0.001, t); out.gain.exponentialRampToValueAtTime(0.35, t + 1.5); out.gain.linearRampToValueAtTime(0, t + 1.7); r.connect(lf); lf.connect(out); r.start(t); r.stop(t + 1.7); }
    if (id === 'glitch') { for (var i = 0; i < 7; i++) { var q = c.createOscillator(), g = c.createGain(), st = t + i * 0.07; q.type = 'square'; q.frequency.value = 200 + Math.random() * 1800; g.gain.setValueAtTime(0.18, st); g.gain.setValueAtTime(0, st + 0.04); q.connect(g); g.connect(c.destination); q.start(st); q.stop(st + 0.05); } }
    if (id === 'pop') { var p = c.createOscillator(); p.type = 'sine'; p.frequency.setValueAtTime(900, t); p.frequency.exponentialRampToValueAtTime(260, t + 0.12); out.gain.setValueAtTime(0.8, t); out.gain.exponentialRampToValueAtTime(0.001, t + 0.18); p.connect(out); p.start(t); p.stop(t + 0.2); }
  }

  /* ---------- telas ---------- */
  function header() {
    var i = ORDER[S.screen], showBack = S.screen === 'upload' || S.screen === 'style';
    var steps = ['Modelo', 'Vídeos', 'Estilo', 'Pronto'].map(function (l, k) {
      return '<div class="step ' + (k === i ? 'on' : k < i ? 'past' : '') + '"><i></i><span>' + l + '</span></div>';
    }).join('');
    return '<div class="head"><div class="toprow">' +
      (showBack ? '<button class="back" data-a="back" aria-label="Voltar">' + ICON.back + '</button>' : '<div class="logo"><img src="mark.png" alt="" width="34" height="34"><b>FLU<em>X</em></b><i>CINE</i></div>') +
      '<div class="badge"><span class="rec"></span>' + (NATIVE ? 'Edita no seu celular' : 'Pronto em até 5 min') + '</div></div><div class="steps">' + steps + '</div></div>';
  }

  function card(t) {
    var sel = t.id === S.tpl;
    return '<button class="card ' + (sel ? 'sel' : '') + '" data-a="tpl" data-v="' + t.id + '" aria-pressed="' + sel + '">' +
      '<div class="thumb" style="background:' + t.bg + '"><div class="spot" style="background:' + t.accent + '"></div>' + mediaTag(t) + '<div class="shade"></div>' +
      (t.lb ? '<div class="lb t"></div><div class="lb b"></div>' : '') +
      '<div class="dur">' + t.dur + '</div>' +
      '<div class="ctitle" style="' + fontCss(t, t.upper ? 24 : 17) + '">' + esc(t.title) + '<span class="cbar" style="background:' + t.accent + '"></span></div>' +
      '<div class="cap" style="' + fontCss(t, Math.round(t.size * 0.8)) + (t.lb ? ';bottom:30px' : '') + '">' + t.pre + '<span style="' + hlCss(t) + '">' + t.hl + '</span>' + t.post + '</div>' +
      (sel ? '<div class="check">' + ICON.check(14) + '</div>' : '') + '</div>' +
      '<span class="cname">' + t.name + '</span><span class="cmeta">' + t.cat + ' · ' + t.vibe + '</span></button>';
  }
  function gallery() {
    var trends = TRENDS.map(function (tr, i) {
      return '<button class="trend" data-a="trend" data-v="' + i + '"><span class="fire">' + ICON.fire + 'Em alta</span><b>' + tr.name + '</b><span class="u">' + tr.use + '</span></button>';
    }).join('');
    var chips = FILTERS.map(function (f) { return '<button class="chip ' + (S.filter === f ? 'on' : '') + '" data-a="filter" data-v="' + f + '">' + f + '</button>'; }).join('');
    var cards = TEMPLATES.filter(function (t) { return S.filter === 'Todos' || t.cat === S.filter; }).map(card).join('');
    return '<h1>Escolha o estilo do seu próximo vídeo</h1><p class="sub">Títulos cinematográficos, legenda que acompanha a fala e corte automático.</p>' +
      '<div class="sechead"><h2>Formatos em alta</h2><small>Seleção FLUX CINE</small></div><div class="trend-row">' + trends + '</div>' +
      '<div class="chips">' + chips + '</div><div class="grid">' + cards + '</div>';
  }

  function slot(key, kick, title) {
    var c = S.clips[key];
    var sub = !c ? 'Toque para escolher da galeria' : esc(c.name) + (c.durationMs ? ' · ' + fmt(c.durationMs / 1000) : '');
    return '<button class="slot ' + (c ? 'done' : '') + '" data-a="pick" data-v="' + key + '">' +
      '<div class="sthumb">' + (c && c.thumb ? '<img src="' + c.thumb + '" alt="">' : (c ? ICON.play('#fff', 22) : ICON.up)) + '</div>' +
      '<div class="col" style="flex:1;min-width:0;gap:4px"><span class="kick">' + kick + '</span><span class="stitle">' + title + '</span>' +
      '<span class="ssub">' + sub + '</span></div>' + (c ? '<div class="ok">' + ICON.check(15) + '</div>' : '') + '</button>';
  }
  function listenCard() {
    var ks = ['v1', 'v2'].filter(function (k) { return S.clips[k]; });
    if (!ks.length) return '';
    var busy = ks.some(function (k) { return S.clips[k].status === 'listening'; });
    var rows = ks.map(function (k, i) {
      var c = S.clips[k];
      if (c.status === 'listening') return '<div class="row">' + ICON.ear + 'Ouvindo o vídeo ' + (k === 'v1' ? 1 : 2) + '… ' + Math.round((c.p || 0) * 100) + '%</div><div class="bar"><i style="width:' + Math.round((c.p || 0) * 100) + '%"></i></div>';
      if (c.status === 'error') return '<div class="err">Vídeo ' + (k === 'v1' ? 1 : 2) + ': ' + esc(c.err) + '</div>';
      return '';
    }).join('');
    var txt = ks.map(function (k) { var t = transcriptText(k); return t ? '<b>Vídeo ' + (k === 'v1' ? 1 : 2) + '</b>' + esc(t) : ''; }).join('');
    var stat = '';
    if (!busy) {
      var orig = ks.reduce(function (a, k) { return a + (S.clips[k].durationMs || 0) / 1000; }, 0), tl = timeline();
      stat = '<div class="stat"><span>Original <b>' + fmt(orig) + '</b></span><span>Depois do corte <b>' + fmt(tl.total) + '</b></span><span><b>' + tl.captions.length + '</b> legendas</span></div>';
    }
    return '<div class="listen">' + (rows || '<div class="row">' + ICON.ear + 'O que você falou</div>') +
      (txt ? '<div class="transcript">' + txt + '</div>' : (busy ? '' : '<div class="hint">Não encontrei fala nesses vídeos. Vou manter o vídeo inteiro.</div>')) +
      '<button class="toggle ' + (S.autoCut ? 'on' : '') + '" data-a="autocut" aria-pressed="' + S.autoCut + '"><span class="col" style="gap:2px"><span style="font-size:14px;font-weight:600">Cortar silêncios e pausas</span><span class="hint">Deixa o vídeo mais dinâmico</span></span><span class="sw"><i></i></span></button>' + stat + '</div>';
  }
  function upload() {
    return '<span class="pill">Modelo: <b>' + find(TEMPLATES, S.tpl).name + '</b></span><h1>Envie seus 2 vídeos</h1>' +
      '<p class="sub">Grave na vertical. O FLUX CINE escuta o que você fala, corta as pausas e legenda.</p>' +
      slot('v1', 'Vídeo 1', 'Abertura / gancho') + slot('v2', 'Vídeo 2', 'Conteúdo principal') + listenCard() +
      '<div class="col" style="gap:8px;margin-top:18px"><label class="lbl" for="txt">Título cinematográfico do vídeo</label>' +
      '<textarea id="txt" class="field" rows="2" placeholder="Ex.: ' + esc(find(TEMPLATES, S.tpl).title) + '">' + esc(S.text) + '</textarea>' +
      '<span class="hint">Entra com desfoque nos primeiros segundos. Vazio = usamos o começo da sua fala.</span></div>';
  }

  function style() {
    var tpl = find(TEMPLATES, S.tpl), f = find(FONTS, S.font);
    var fonts = FONTS.map(function (x) { var on = x.id === S.font; return '<button class="font ' + (on ? 'on' : '') + '" data-a="font" data-v="' + x.id + '" aria-pressed="' + on + '"><span class="aa" style="' + fontCss(x, 26) + ';text-transform:none">Aa</span><small>' + x.label + '</small></button>'; }).join('');
    var sugs = CTAS.map(function (c) { return '<button class="sug ' + (S.cta === c ? 'on' : '') + '" data-a="cta" data-v="' + c + '">' + c + '</button>'; }).join('');
    var ends = ENDINGS.map(function (e) { var on = e.id === S.ending; return '<button class="end ' + (on ? 'on' : '') + '" data-a="end" data-v="' + e.id + '" aria-pressed="' + on + '"><b>' + e.title + '</b><span>' + e.desc + '</span></button>'; }).join('');
    var sfx = SFX.map(function (x) {
      var on = x.id === S.sfx, pl = S.playing === x.id;
      return '<div class="sfx ' + (on ? 'on' : '') + '"><button class="pbtn ' + (pl ? 'on' : '') + '" data-a="play" data-v="' + x.id + '" aria-label="' + (pl ? 'Pausar ' : 'Ouvir ') + x.name + '">' + (pl ? ICON.pause : ICON.play('#F4F4F5', 14)) + '</button>' +
        '<button class="sbody" data-a="sfx" data-v="' + x.id + '" aria-pressed="' + on + '"><span class="t"><b>' + x.name + '</b><span>' + x.desc + '</span></span>' +
        '<span class="wave ' + (pl ? 'on' : '') + '" aria-hidden="true">' + x.bars.map(function (h) { return '<i style="height:' + h + 'px"></i>'; }).join('') + '</span>' +
        '<span class="radio"><i></i></span></button></div>';
    }).join('');
    var bg = S.clips.v1 && S.clips.v1.thumb ? '<img src="' + S.clips.v1.thumb + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.75">' : mediaTag(tpl);
    return '<h1>Deixe com a sua cara</h1>' +
      '<div class="preview" style="background:' + tpl.bg + ';margin-top:20px">' + bg + '<div class="shade"></div>' + (tpl.lb ? '<div class="lb t" style="height:30px"></div><div class="lb b" style="height:30px"></div>' : '') +
      '<div class="ctitle" data-k="' + S.styleKey + '" style="' + fontCss(f, f.upper ? 36 : 26) + '">' + esc(autoTitle()) + '<span class="cbar" style="background:' + ORANGE + ';width:60px"></span></div></div>' +
      '<section><h2>Fonte do título e da legenda</h2><div class="fonts">' + fonts + '</div></section>' +
      '<section><h2><label for="ctain">Chamada para ação (CTA)</label></h2><input id="ctain" class="field" style="height:50px;padding:0 16px;border-radius:14px" value="' + esc(S.cta) + '" placeholder="Ex.: Chama no WhatsApp"><div class="sugs">' + sugs + '</div></section>' +
      '<section><h2>Final do vídeo</h2><div class="ends">' + ends + '</div></section>' +
      '<section><h2>Efeito sonoro</h2><div class="col" style="gap:8px">' + sfx + '</div></section>';
  }

  function render_() {
    var p = S.progress;
    var steps = RSTEPS.map(function (r, i) {
      var done = p >= r[0], act = !done && (i === 0 || p >= RSTEPS[i - 1][0]);
      return '<div class="rstep ' + (done ? 'done' : act ? 'act' : '') + '"><span class="rdot">' + (done ? ICON.check(12) : '') + '</span>' + r[1] + '</div>';
    }).join('');
    return '<div class="ring" style="background:conic-gradient(' + ORANGE + ' ' + (p * 3.6) + 'deg,#1C1C1F 0deg)"><div><b>' + p + '%</b><span>editando…</span></div></div>' +
      '<div class="col center" style="gap:6px;margin:28px 0 18px"><h1 style="font-size:22px">Seu vídeo está sendo montado</h1><p class="sub" style="margin:0">' + (NATIVE ? 'Tudo no seu celular. Mantenha o app aberto.' : 'Prévia: no app Android a edição é real.') + '</p></div>' + steps +
      (S.err ? '<div class="err">' + esc(S.err) + '</div><button class="btn sec" data-a="back-style">Voltar e tentar de novo</button>' : '');
  }

  function done() {
    var tpl = find(TEMPLATES, S.tpl), f = find(FONTS, S.font);
    var player = S.out && NATIVE
      ? '<video class="out" src="' + CAP.convertFileSrc(S.out.path) + '" controls autoplay loop playsinline></video>'
      : mediaTag(tpl) + '<div class="shade"></div><div class="ctitle" style="' + fontCss(f, f.upper ? 30 : 22) + '">' + esc(autoTitle()) + '<span class="cbar" style="background:' + ORANGE + '"></span></div>';
    var tags = HASHTAGS.map(function (h) { var on = S.tags.indexOf(h) >= 0; return '<button class="tag pick ' + (on ? 'on' : '') + '" data-a="tag" data-v="' + h + '">' + h + '</button>'; }).join('');
    return '<div class="col center" style="gap:6px"><h1 style="font-size:26px">Seu vídeo está pronto<span style="color:' + ORANGE + '">.</span></h1><p class="sub" style="margin:0">' + tpl.name + ' · ' + f.label + ' · ' + find(SFX, S.sfx).name + (S.out && S.out.durationMs ? ' · ' + fmt(S.out.durationMs / 1000) : '') + '</p></div>' +
      '<div class="final" style="background:' + tpl.bg + '">' + player + '</div>' +
      '<div class="capbox"><label class="lbl" for="capin">Legenda do post</label><textarea id="capin" class="field" rows="6">' + esc(S.caption) + '</textarea>' +
      '<h2 style="margin-top:6px">Hashtags</h2><div class="tags left">' + tags + '</div></div>' +
      '<button class="btn insta" data-a="insta">' + ICON.insta + 'Postar no Instagram</button>' +
      '<p class="note">A legenda é copiada. No Instagram, escolha Reels e cole na descrição.</p>' +
      '<button class="btn sec" data-a="save">' + ICON.down + 'Salvar na galeria</button>' +
      '<button class="btn sec" data-a="share">Compartilhar (WhatsApp, TikTok…)</button>' +
      '<button class="btn txt" data-a="restart">Criar outro vídeo</button>';
  }

  var app = document.getElementById('app');
  function draw(keepScroll) {
    var body = app.querySelector('.body'), y = body && keepScroll ? body.scrollTop : 0;
    var content = { gallery: gallery, upload: upload, style: style, render: render_, done: done }[S.screen]();
    var listening = ['v1', 'v2'].some(function (k) { return S.clips[k] && S.clips[k].status === 'listening'; });
    var can = S.screen === 'gallery' ? !!S.tpl : S.screen === 'upload' ? !!(S.clips.v1 && S.clips.v2 && !listening) : true;
    var label = { gallery: 'Usar este modelo', upload: listening ? 'Ouvindo seus vídeos…' : (S.clips.v1 && S.clips.v2 ? 'Continuar' : 'Envie os 2 vídeos'), style: 'Gerar meu vídeo' }[S.screen];
    app.innerHTML = header() + '<main class="body">' + content + '</main>' +
      (label ? '<div class="foot"><button class="cta" data-a="next"' + (can ? '' : ' disabled') + '>' + label + ICON.arrow + '</button></div>' : '');
    app.querySelector('.body').scrollTop = y;
  }
  /* atualizações leves (sem recriar os vídeos em loop) */
  function updateListen() {
    if (S.screen !== 'upload') return;
    var el = app.querySelector('.listen');
    if (!el) { draw(true); return; }
    var tmp = document.createElement('div'); tmp.innerHTML = listenCard();
    if (tmp.firstChild) el.replaceWith(tmp.firstChild);
    var btn = app.querySelector('.cta');
    var listening = ['v1', 'v2'].some(function (k) { return S.clips[k] && S.clips[k].status === 'listening'; });
    if (btn) { btn.disabled = !(S.clips.v1 && S.clips.v2 && !listening); btn.firstChild.nodeValue = listening ? 'Ouvindo seus vídeos…' : (S.clips.v1 && S.clips.v2 ? 'Continuar' : 'Envie os 2 vídeos'); }
  }
  function go(s) { S.screen = s; S.playing = null; draw(false); }
  function toast(msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }

  /* ---------- escolher e ouvir vídeos ---------- */
  var listenQueue = Promise.resolve();
  function listen(key) {
    var c = S.clips[key];
    c.status = 'listening'; c.p = 0; c.words = null;
    updateListen();
    listenQueue = listenQueue.then(function () {
      if (S.clips[key] !== c) return;
      if (!NATIVE) {
        return new Promise(function (res) {
          var p = 0, h = setInterval(function () {
            p += 0.08; c.p = Math.min(1, p); updateListen();
            if (p >= 1) {
              clearInterval(h);
              var demo = key === 'v1' ? 'olha só isso aqui que eu vou te mostrar' : 'são três erros que fazem você perder clientes todos os dias';
              var t = 0.6; c.words = demo.split(' ').map(function (w) { var o = { w: w, s: t, e: t + 0.32 }; t += 0.42; return o; });
              c.durationMs = c.durationMs || Math.round((t + 0.8) * 1000); c.status = 'ok'; updateListen(); res();
            }
          }, 120);
        });
      }
      return FE.transcribe({ path: c.path, id: key }).then(function (r) {
        c.words = r.words || []; c.status = 'ok'; updateListen();
      }).catch(function (e) {
        c.words = []; c.status = 'error'; c.err = (e && e.message) || 'falha ao ouvir'; updateListen();
      });
    });
  }
  if (NATIVE) {
    safe(FE.addListener('transcribeProgress', function (d) { var c = S.clips[d.id]; if (c && c.status === 'listening') { c.p = d.p; updateListen(); } }));
    safe(FE.addListener('renderProgress', function (d) {
      if (S.screen !== 'render') return;
      S.progress = Math.max(S.progress, Math.min(99, Math.round(d.p))); draw(true);
    }));
  }
  var fileIn = document.getElementById('file'), pickingFor = null;
  fileIn.addEventListener('change', function () {
    var f = fileIn.files && fileIn.files[0];
    if (f && pickingFor) {
      var key = pickingFor, url = URL.createObjectURL(f);
      S.clips[key] = { name: f.name, path: url, url: url, durationMs: 0 };
      var v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.src = url;
      v.onloadedmetadata = function () { if (S.clips[key]) S.clips[key].durationMs = Math.round(v.duration * 1000); };
      draw(true); listen(key);
    }
    fileIn.value = '';
  });
  function pick(key) {
    if (!NATIVE) { pickingFor = key; fileIn.click(); return; }
    FE.pickVideo().then(function (r) {
      S.clips[key] = { path: r.path, name: r.name, durationMs: r.durationMs, thumb: r.thumb };
      draw(true); listen(key);
    }).catch(function (e) { if (e && e.code !== 'CANCELLED') toast((e && e.message) || 'Não consegui abrir o vídeo'); });
  }

  /* ---------- gerar ---------- */
  var simTimer;
  function generate() {
    S.progress = 0; S.err = ''; S.out = null; go('render');
    var tpl = find(TEMPLATES, S.tpl), f = find(FONTS, S.font), tl = timeline();
    if (!NATIVE) {
      clearInterval(simTimer);
      simTimer = setInterval(function () {
        S.progress = Math.min(100, S.progress + 3); draw(true);
        if (S.progress >= 100) { clearInterval(simTimer); S.caption = buildCaption(); setTimeout(function () { go('done'); }, 400); }
      }, 110);
      return;
    }
    FE.render({
      segments: tl.segments, captions: tl.captions, boundaries: tl.boundaries,
      title: autoTitle(), fontFile: f.file, upper: !!f.upper,
      accent: tpl.accent === '#F4F4F5' ? ORANGE : tpl.accent, hlMode: tpl.mode, letterbox: !!tpl.lb,
      cta: S.cta, ending: S.ending, sfx: S.sfx
    }).then(function (r) {
      S.out = r; S.progress = 100; S.caption = buildCaption(); draw(true);
      setTimeout(function () { go('done'); }, 350);
    }).catch(function (e) { S.err = (e && e.message) || 'Falha ao montar o vídeo'; draw(true); });
  }

  /* ---------- cliques ---------- */
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-a'), v = b.getAttribute('data-v');
    if (a === 'filter') { S.filter = v; draw(true); }
    else if (a === 'tpl') { S.tpl = v; draw(true); }
    else if (a === 'trend') { var tr = TRENDS[+v]; S.tpl = tr.tpl; S.text = tr.title; go('upload'); }
    else if (a === 'back') go(S.screen === 'style' ? 'upload' : 'gallery');
    else if (a === 'back-style') go('style');
    else if (a === 'next') { if (S.screen === 'gallery') go('upload'); else if (S.screen === 'upload') go('style'); else generate(); }
    else if (a === 'pick') pick(v);
    else if (a === 'autocut') { S.autoCut = !S.autoCut; updateListen(); }
    else if (a === 'font') { S.font = v; S.styleKey++; draw(true); }
    else if (a === 'cta') { S.cta = v; draw(true); }
    else if (a === 'end') { S.ending = v; draw(true); }
    else if (a === 'sfx') { S.sfx = v; draw(true); }
    else if (a === 'play') {
      clearTimeout(S._pt);
      if (S.playing === v) S.playing = null; else { S.playing = v; S.sfx = v; sound(v); S._pt = setTimeout(function () { S.playing = null; draw(true); }, 1700); }
      draw(true);
    }
    else if (a === 'tag') {
      var i = S.tags.indexOf(v); if (i >= 0) S.tags.splice(i, 1); else S.tags.push(v);
      S.caption = S.caption.replace(/(\n\n)?(#[^\s#]+\s?)+$/, '').trim() + '\n\n' + S.tags.join(' ');
      draw(true);
    }
    else if (a === 'insta' || a === 'share') {
      if (!NATIVE || !S.out) { toast('No app Android, isso abre o Instagram com o vídeo pronto.'); return; }
      (a === 'insta' ? FE.shareInstagram : FE.share).call(FE, { path: S.out.path, caption: S.caption }).then(function (r) {
        if (a === 'insta') toast(r && r.instagram ? 'Legenda copiada! Escolha Reels e cole na descrição.' : 'Instagram não encontrado — escolha um app para postar.');
      }).catch(function (err) { toast((err && err.message) || 'Não consegui compartilhar'); });
    }
    else if (a === 'save') {
      if (!NATIVE || !S.out) { toast('No app Android, o vídeo vai para a galeria.'); return; }
      FE.saveToGallery({ path: S.out.path }).then(function () { toast('Salvo em Galeria › FLUX CINE'); })
        .catch(function (err) { toast((err && err.message) || 'Não consegui salvar'); });
    }
    else if (a === 'restart') { S.clips = { v1: null, v2: null }; S.text = ''; S.cta = ''; S.out = null; S.progress = 0; go('gallery'); }
  });
  app.addEventListener('input', function (e) {
    if (e.target.id === 'txt') S.text = e.target.value;
    if (e.target.id === 'ctain') S.cta = e.target.value;
    if (e.target.id === 'capin') S.caption = e.target.value;
  });

  /* botão voltar do Android */
  if (APP) safe(APP.addListener('backButton', function () {
    if (S.screen === 'upload') go('gallery');
    else if (S.screen === 'style') go('upload');
    else if (S.screen === 'done') go('gallery');
    else if (S.screen === 'gallery') APP.exitApp();
  }));

  draw(false);
})();
