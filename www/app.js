/* FLUX CINE v4
 * abertura → perguntas → apresentação → [Cinemático: 1 vídeo | Dinâmico: chips + vídeo falado]
 * → estrutura da fala (gancho-pergunta · mensagem · final impacto, sem repetições)
 * → legenda em linha do tempo (player + estilos) → Alta/4K → projeto salvo no Perfil */
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
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var CAP_FONTS = [
    { id: 'Montserrat-800', label: 'Montserrat' }, { id: 'Poppins-800', label: 'Poppins' }, { id: 'Unbounded-800', label: 'Unbounded' },
    { id: 'Anton-400', label: 'Anton', upper: 1 }, { id: 'BebasNeue-400', label: 'Bebas', upper: 1 }, { id: 'Oswald-700', label: 'Oswald', upper: 1 },
    { id: 'ArchivoBlack-400', label: 'Archivo' }, { id: 'Bangers-400', label: 'Bangers', upper: 1 }, { id: 'SpaceGrotesk-700', label: 'Grotesk' },
    { id: 'Inter-700', label: 'Inter' }, { id: 'PlayfairDisplay-600i', label: 'Playfair' }, { id: 'DMSerifDisplay-400', label: 'Serif' },
    { id: 'Caveat-700', label: 'Caveat' }, { id: 'SpaceMono-700', label: 'Mono' }
  ];
  var SHADOWS = [['outline', 'Contorno'], ['soft', 'Suave'], ['hard', 'Dura'], ['glow', 'Brilho'], ['none', 'Sem']];
  var HLS = [['box', 'Caixa'], ['color', 'Cor'], ['underline', 'Sublinhado'], ['none', 'Nenhum']];
  var ANIMS = [['pop', 'Pop'], ['bounce', 'Pulo'], ['fade', 'Surgir'], ['type', 'Palavra a palavra'], ['none', 'Fixo']];
  /* modelos de legenda prontos: um toque aplica fonte, cor, destaque, sombra e efeito */
  var CAP_PRESETS = [
    { id: 'viral', name: 'Viral', cs: { font: 'Montserrat-800', upper: true, size: 1.05, ls: 0, shadow: 'outline', hl: 'box', anim: 'pop', y: 0.73, color: '#FFFFFF', accent: '#FFD21F' } },
    { id: 'podcast', name: 'Podcast', cs: { font: 'Poppins-800', upper: false, size: 1, ls: 0, shadow: 'soft', hl: 'color', anim: 'pop', y: 0.72, color: '#FFFFFF', accent: '#D4FF3A' } },
    { id: 'impacto', name: 'Impacto', cs: { font: 'Anton-400', upper: true, size: 1.3, ls: 0.01, shadow: 'outline', hl: 'color', anim: 'bounce', y: 0.7, color: '#FFFFFF', accent: '#FF3B30' } },
    { id: 'gibi', name: 'Gibi', cs: { font: 'Bangers-400', upper: true, size: 1.2, ls: 0.03, shadow: 'hard', hl: 'color', anim: 'bounce', y: 0.72, color: '#FFFFFF', accent: '#FFD21F' } },
    { id: 'neon', name: 'Neon', cs: { font: 'Unbounded-800', upper: true, size: 0.85, ls: 0.02, shadow: 'glow', hl: 'color', anim: 'fade', y: 0.74, color: '#FFFFFF', accent: '#FF4FD8' } },
    { id: 'elegante', name: 'Elegante', cs: { font: 'PlayfairDisplay-600i', upper: false, size: 1.05, ls: 0, shadow: 'soft', hl: 'underline', anim: 'fade', y: 0.76, color: '#FFFFFF', accent: '#E9D6A7' } },
    { id: 'cinema', name: 'Cinema', cs: { font: 'BebasNeue-400', upper: true, size: 1.15, ls: 0.08, shadow: 'soft', hl: 'none', anim: 'fade', y: 0.83, color: '#F4EFE6', accent: '#F4EFE6' } },
    { id: 'minimal', name: 'Minimal', cs: { font: 'Inter-700', upper: false, size: 0.9, ls: -0.01, shadow: 'soft', hl: 'color', anim: 'fade', y: 0.75, color: '#FFFFFF', accent: '#FF7A1A' } },
    { id: 'maquina', name: 'Máquina', cs: { font: 'SpaceMono-700', upper: false, size: 0.9, ls: 0, shadow: 'hard', hl: 'color', anim: 'type', y: 0.74, color: '#FFFFFF', accent: '#FF7A1A' } },
    { id: 'caneta', name: 'Caneta', cs: { font: 'Caveat-700', upper: false, size: 1.25, ls: 0, shadow: 'soft', hl: 'color', anim: 'pop', y: 0.73, color: '#FFFFFF', accent: '#FFD21F' } },
    { id: 'etiqueta', name: 'Etiqueta', cs: { font: 'ArchivoBlack-400', upper: true, size: 0.95, ls: 0, shadow: 'none', hl: 'box', anim: 'bounce', y: 0.7, color: '#FFFFFF', accent: '#FF7A1A' } },
    { id: 'serie', name: 'Série', cs: { font: 'DMSerifDisplay-400', upper: false, size: 1.05, ls: 0, shadow: 'outline', hl: 'color', anim: 'pop', y: 0.74, color: '#FFFFFF', accent: '#FFB547' } }
  ];
  var COLORS = ['#FFFFFF', '#FFD21F', '#FF7A1A', '#D4FF3A', '#4FD1FF', '#FF5FA2'];
  var SFX = [{ id: 'impact', name: 'Impacto' }, { id: 'whoosh', name: 'Whoosh' }, { id: 'riser', name: 'Riser' }, { id: 'glitch', name: 'Glitch' }, { id: 'pop', name: 'Pop' }];
  var CTAS = ['Chama no WhatsApp', 'Link na bio', 'Agende sua visita', 'Compre agora'];
  var HASHTAGS = ['#empreendedorismo', '#reels', '#dicas', '#marketingdigital', '#pequenosnegocios', '#vendas', '#viral', '#bastidores'];
  var DYN = [
    { id: 'viral', name: 'Ritmo Viral', desc: 'rápido · lento · normal · pausa', pat: ['fast', 'slow', 'normal', 'freeze'], model: 'impacto-1', media: 1240 },
    { id: 'turbo', name: 'Turbo', desc: 'cortes acelerados', pat: ['fast', 'fast', 'normal'], model: 'glitch-1', media: 1238 },
    { id: 'drama', name: 'Slow Drama', desc: 'câmera lenta + pausa', pat: ['slow', 'slow', 'freeze'], model: 'classico-1', media: 39878 },
    { id: 'stopgo', name: 'Stop & Go', desc: 'acelera e congela', pat: ['fast', 'freeze', 'fast', 'freeze'], model: 'empilhado-1', media: 1232 },
    { id: 'batida', name: 'Batida', desc: 'normal e rápido no ritmo', pat: ['normal', 'fast', 'normal', 'fast'], model: 'neon-1', media: 39875 },
    { id: 'mix', name: 'Cinemático Mix', desc: 'lento · normal · pausa · rápido', pat: ['slow', 'normal', 'freeze', 'fast'], model: 'insano-1', media: 39765 }
  ];
  var PIECE = { fast: { src: 2.4, speed: 2 }, slow: { src: 0.6, speed: 0.5 }, normal: { src: 0.9, speed: 1 }, freeze: { src: 0.07, speed: 0.1 } };
  var Q1 = [{ id: 'titulos', t: 'Títulos de cinema', ic: 'T' }, { id: 'legenda', t: 'Legenda que acompanha a fala', ic: 'Aa' }, { id: 'cortes', t: 'Cortes rápidos e dinâmicos', ic: '✂' }, { id: 'som', t: 'Efeitos sonoros', ic: '♪' }];
  var PITCH = [
    { m: 'classico-1', title: 'Flux Cine', sub: 'O app das trends virais', k: 'Convenhamos', d: 'O FLUX CINE é o app que edita seu vídeo seguindo as trends virais do momento.', media: 39878 },
    { m: 'camp-1', title: 'Gancho', sub: 'sempre uma pergunta', k: 'Os 3 primeiros segundos', d: 'Ele escuta sua fala, acha a pergunta do gancho, corta no ponto certo e tira as repetições.', media: 1240 },
    { m: 'empilhado-1', title: 'Dinâmico', sub: 'rápido · lento · pausa', k: 'Vários vídeos', d: 'Chips virais com velocidade, depois a sua mensagem e o final de impacto, num vídeo só.', media: 1232 },
    { m: 'escape-1', title: 'Legenda', sub: 'na linha do tempo', k: 'Do seu jeito', d: 'Veja a legenda passando com o vídeo e mude texto, fonte, tamanho, sombra e efeito.', media: 39765 },
    { m: 'insano-1', title: MODELS.length + ' Modelos', sub: 'de cinema', k: 'Títulos de filme', d: MODELS.length + ' títulos cinematográficos animados, inspirados em pôsteres de cinema.', media: 39875 },
    { m: 'retro-1', title: '5 Minutos', sub: 'do celular pro Insta', k: 'Seu perfil', d: 'Todos os seus vídeos ficam no Perfil. Baixe em Alta grátis, ou em 4K no VIP.', media: 1238 }
  ];
  var ORDER = { models: 0, dynmodels: 0, mpreview: 0, video: 1, chips: 1, legenda: 2, render: 3, done: 3 };

  var S = {
    screen: 'intro', q1: null, style: null, pitchI: 0, vip: store('flux_vip') === '1',
    mode: 'cine', model: 'classico-1', dyn: 'viral', clip: null, chips: [], autoCut: true,
    title: '', sub: '', brand: store('flux_brand') || '', tf: { ox: 0, oy: 0, s: 1 },
    cs: clone(TT.CAP_DEFAULT), capsOn: true, sfxOn: true, sfx: 'impact', cta: '', quality: 'hd',
    fx: { trans: 'mix', fx: 'none', amt: 0.7 }, selCap: -1, styleTab: 'modelos', capPreset: '', progress: 0, out: null, err: '', caption: '', tags: ['#empreendedorismo', '#reels', '#dicas'],
    projects: [], viewing: null, filter: 'all',
    grade: { id: 'tealorange', amount: 0.8, grain: 0.3, vignette: 0.3, bars: false }, edTab: 'legenda', trimFillers: true, jumpZoom: true, moveMode: false
  };
  try { S.projects = JSON.parse(store('flux_projects') || '[]'); } catch (e) { S.projects = []; }

  var ICON = {
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4F4F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    play: function (c, s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + c + '" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>'; },
    pause: function (c, s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + c + '" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'; },
    check: function (s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; },
    up: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + ORANGE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' + ORANGE + '" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>',
    ear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + ORANGE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8.5a6 6 0 1 1 12 0c0 3.5-3 4.5-3 7.5a3 3 0 0 1-6 0"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0"/></svg>',
    bolt: '<svg width="16" height="16" viewBox="0 0 24 24" fill="' + ORANGE + '" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    crown: function (s, c) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + (c || '#140700') + '" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>'; },
    move: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    insta: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>'
  };

  function find(l, id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return l[0]; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
  function fmt1(sec) { return (Math.round(sec * 10) / 10).toFixed(1).replace('.', ',') + 's'; }
  var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  /* vídeo sem o quadro cinza: fica invisível até começar a tocar */
  function media(id, extra, lazy) { return '<video class="mv" ' + (lazy ? 'data-src' : 'src') + '="media/' + id + '.mp4" poster="' + BLANK + '" ' + (lazy ? '' : 'autoplay ') + 'muted loop playsinline preload="' + (lazy ? 'none' : 'auto') + '" ' + (extra || '') + ' onplaying="this.style.opacity=1" onerror="this.remove()"></video>'; }
  function srcUrl(p) { return NATIVE ? CAP.convertFileSrc(p) : p; }
  function model() { return find(MODELS, S.model); }

  /* ================= títulos animados nos <canvas data-title> ================= */
  var anims = [], rafOn = false, lastFrame = 0, io = null;
  function bindCanvases() {
    anims = [];
    if (io) io.disconnect();
    io = window.IntersectionObserver ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { var v = e.target.querySelector('video'); e.target.__vis = e.isIntersecting; if (v) { if (e.isIntersecting) { var ds = v.getAttribute('data-src'); if (ds) { v.removeAttribute('data-src'); v.preload = 'auto'; v.src = ds; } safe(v.play()); } else v.pause(); } });
    }, { rootMargin: '80px' }) : null;
    var list = document.querySelectorAll('canvas[data-title]');
    for (var i = 0; i < list.length; i++) {
      var c = list[i], r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      c.width = Math.max(10, Math.round(r.width * dpr)); c.height = Math.max(10, Math.round(r.height * dpr));
      var cfg = JSON.parse(c.getAttribute('data-title')), host = c.parentNode;
      host.__vis = true;
      if (io && cfg.lazy) { host.__vis = false; io.observe(host); }
      anims.push({ c: c, host: host, ctx: c.getContext('2d'), layers: TT.layout(cfg.m, cfg), end: cfg.end || 3.6, hold: cfg.hold || 1.1, tf: cfg.tf || null, t0: performance.now() - (cfg.off || 0) * 1000 });
    }
    if (anims.length && !rafOn) { rafOn = true; requestAnimationFrame(tick); }
  }
  function tick(now) {
    if (!anims.length) { rafOn = false; return; }
    if (now - lastFrame > 33) {
      lastFrame = now;
      for (var i = 0; i < anims.length; i++) {
        var a = anims[i];
        if (!a.c.isConnected || a.host.__vis === false) continue;
        var t = ((now - a.t0) / 1000) % (a.end + a.hold);
        if (a.host.classList && a.host.classList.contains('dragging')) t = a.end - 0.6;
        a.ctx.setTransform(1, 0, 0, 1, 0, 0); a.ctx.clearRect(0, 0, a.c.width, a.c.height);
        a.ctx.setTransform(a.c.width / TT.W, 0, 0, a.c.height / TT.H, 0, 0);
        TT.draw(a.ctx, a.layers, t, a.end, a.tf || S.tf);
      }
    }
    requestAnimationFrame(tick);
  }
  function titleCanvas(cfg) { return '<canvas data-title="' + esc(JSON.stringify(cfg)) + '"></canvas>'; }

  /* ================= escuta: estrutura da fala ================= */
  var Q_START = ['você sabia', 'sabia que', 'como', 'por que', 'porque', 'qual', 'quais', 'quanto', 'quantos', 'quantas', 'o que', 'será que', 'já pensou', 'já imaginou', 'você já', 'sabe', 'quer saber', 'você quer', 'você sabe', 'onde', 'quando', 'quem', 'e se', 'é possível', 'tá cansado', 'cansado de'];
  var Q_TAG = ['né', 'certo', 'sabia', 'entendeu', 'concorda', 'viu'];
  var HOOK_WORDS = ['segredo', 'erro', 'erros', 'ninguém', 'nunca', 'pare', 'cuidado', 'atenção', 'verdade', 'dinheiro', 'cliente', 'clientes', 'vender', 'vendas', 'grátis', 'rápido', 'maior', 'melhor', 'pior', 'descobri', 'imagina', 'agora', 'hoje', 'dica', 'dicas', 'jeito', 'truque', 'resultado', 'mudou', 'precisa', 'perder', 'ganhar', 'lucro', 'motivo', 'motivos'];
  var NUM = ['dois', 'duas', 'três', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'dez'];
  var STOP = ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'que', 'e', 'um', 'uma', 'com', 'para', 'pra', 'no', 'na', 'nos', 'nas', 'em', 'por', 'se', 'mas', 'ou', 'eu', 'meu', 'minha', 'seu', 'sua', 'todos', 'todas'];
  var FILLER = ['né', 'tipo', 'então', 'é', 'ah', 'eh', 'hum', 'bom', 'aí', 'oi', 'gente', 'tá'];
  function lw(w) { return w.w.toLowerCase().replace(/[.,!?;:…"“”()]/g, ''); }
  function capWord(t) { return String(t).replace(/[.,;:…]+$/, ''); }
  function isQuestion(words, ph) {
    if (/\?\s*$/.test(words[ph.i1].w)) return true;
    var head = words.slice(ph.i0, Math.min(ph.i1 + 1, ph.i0 + 5)).map(lw).join(' ') + ' ';
    for (var i = 0; i < Q_START.length; i++) {
      var q = Q_START[i] + ' ', at = head.indexOf(q);
      if (at === 0 || (at > 0 && head.charAt(at - 1) === ' ' && head.slice(0, at).split(' ').length <= 3)) return true;
    }
    return Q_TAG.indexOf(lw(words[ph.i1])) >= 0 && ph.i1 > ph.i0 + 2;
  }
  function hookScore(words, ph) {
    var ws = words.slice(ph.i0, ph.i1 + 1).map(lw), sc = isQuestion(words, ph) ? 10 : 0, d = ph.e - ph.s;
    ws.forEach(function (w) { if (HOOK_WORDS.indexOf(w) >= 0) sc += 2; if (w === 'você' || w === 'vocês') sc += 1.5; if (/^\d+$/.test(w) || NUM.indexOf(w) >= 0) sc += 1; if (FILLER.indexOf(w) >= 0) sc -= 0.7; });
    if (d >= 2.2 && d <= 5) sc += 2; else if (d > 7) sc -= 3;
    return sc;
  }
  function wordSet(words, ph) { var o = {}; for (var i = ph.i0; i <= ph.i1; i++) o[lw(words[i])] = 1; return o; }
  function similar(words, a, b) {
    var A = wordSet(words, a), B = wordSet(words, b), inter = 0, uni = 0, k;
    for (k in A) { uni++; if (B[k]) inter++; } for (k in B) if (!A[k]) uni++;
    var j = uni ? inter / uni : 0;
    var pa = words.slice(a.i0, a.i0 + 3).map(lw).join(' '), pb = words.slice(b.i0, b.i0 + 3).map(lw).join(' ');
    return j >= 0.5 || (a.i1 - a.i0 >= 2 && pa === pb);
  }
  function analyze(clip) {
    var words = clip.words || [], dur = (clip.durationMs || 0) / 1000;
    if (words.length < 3) { clip.ana = { phrases: [], hook: -1, final: -1, nospeech: true }; clip.unclear = words.length > 0; return; }
    var ph = [], cur = null;
    words.forEach(function (w, i) {
      if (!cur || w.s - cur.e > 0.45 || (i > 0 && /[.?!…]$/.test(words[i - 1].w) && w.s - cur.e > 0.08)) { cur = { i0: i, i1: i, s: w.s, e: w.e }; ph.push(cur); } else { cur.i1 = i; cur.e = w.e; }
    });
    // frases muito longas: quebra numa micro-pausa, nunca no meio da palavra
    var out = [];
    ph.forEach(function (p) {
      while (p.e - p.s > 7) {
        var best = -1;
        for (var j = p.i0; j < p.i1; j++) {
          var d = words[j].e - words[p.i0].s;
          if (d >= 2.4 && d <= 5.5 && words[j + 1].s - words[j].e > 0.12 && STOP.indexOf(lw(words[j])) < 0) best = j;
        }
        if (best < 0) break;
        out.push({ i0: p.i0, i1: best, s: p.s, e: words[best].e });
        p = { i0: best + 1, i1: p.i1, s: words[best + 1].s, e: p.e };
      }
      out.push(p);
    });
    ph = out;
    ph.forEach(function (p) { p.text = words.slice(p.i0, p.i1 + 1).map(function (w) { return w.w; }).join(' '); p.inc = true; p.retake = false; });
    // repetições: se a pessoa repetiu a frase, fica a última tomada
    for (var a = 0; a < ph.length; a++) for (var b = a + 1; b < Math.min(ph.length, a + 4); b++) {
      if (!ph[a].retake && similar(words, ph[a], ph[b]) && ph[b].s - ph[a].e < 25) { ph[a].retake = true; ph[a].inc = false; }
    }
    // gancho: a primeira pergunta (da primeira parte); senão, a frase mais forte
    var hook = -1, limit = ph[ph.length - 1].e * 0.6;
    for (var i = 0; i < ph.length; i++) if (ph[i].inc && ph[i].s <= limit && isQuestion(words, ph[i])) { hook = i; break; }
    var asked = hook >= 0;
    if (hook < 0) { var bs = -1e9; ph.forEach(function (p, k) { if (p.inc && p.s <= limit) { var sc = hookScore(words, p); if (sc > bs) { bs = sc; hook = k; } } }); }
    // final de impacto: a última frase (com a anterior, se for curtinha)
    var fin = -1;
    for (var f = ph.length - 1; f >= 0; f--) if (ph[f].inc && f !== hook) { fin = f; break; }
    if (fin > 0 && ph[fin].e - ph[fin].s < 1.2) { for (var g = fin - 1; g >= 0; g--) if (ph[g].inc && g !== hook) { fin = g; break; } }
    clip.ana = { phrases: ph, hook: hook, final: fin, asked: asked };
    // áudio difícil de entender?
    var conf = 0, n = 0; words.forEach(function (w) { if (w.c != null) { conf += w.c; n++; } });
    var talk = ph.reduce(function (s, p) { return s + p.e - p.s; }, 0);
    clip.unclear = !!((n && conf / n < 0.6) || (dur > 6 && words.length / Math.max(1, talk) < 1.1));
  }
  function questionsOf(clip) { var a = clip.ana, out = []; if (!a || !a.phrases) return out; a.phrases.forEach(function (p, i) { if (!p.retake && isQuestion(clip.words, p)) out.push(i); }); return out; }
  function phBounds(clip, k, cut) {
    var a = clip.ana, p = a.phrases[k], w = clip.words, dur = (clip.durationMs || 0) / 1000 || (p.e + 1);
    var prev = k > 0 ? a.phrases[k - 1].e : 0, next = k < a.phrases.length - 1 ? a.phrases[k + 1].s : dur;
    if (!cut) return { s: k === 0 ? 0 : (prev + p.s) / 2, e: k === a.phrases.length - 1 ? dur : (p.e + next) / 2 };
    return { s: Math.max(prev + 0.02, w[p.i0].s - 0.12, 0), e: Math.min(next - 0.02, w[p.i1].e + 0.22, dur) };
  }
  /* corte inteligente: tira vícios no começo/fim da frase e gaguejos ("eu eu"), corta em volta deles */
  var TRIM = ['é', 'éé', 'ah', 'ahn', 'hã', 'hum', 'hmm', 'tipo', 'né', 'então', 'bom', 'aí', 'eh', 'uh', 'ã'];
  function keptSegments(clip, k) {
    var a = clip.ana, p = a.phrases[k], w = clip.words, dur = (clip.durationMs || 0) / 1000 || (w[p.i1].e + 1);
    var keep = [], i;
    for (i = p.i0; i <= p.i1; i++) keep.push(true);
    if (S.trimFillers && p.i1 - p.i0 >= 2) {
      var x = 0; while (x < keep.length - 1 && TRIM.indexOf(lw(w[p.i0 + x])) >= 0) keep[x++] = false;
      var y = keep.length - 1; while (y > 0 && TRIM.indexOf(lw(w[p.i0 + y])) >= 0 && !/[?!]$/.test(w[p.i0 + y].w)) keep[y--] = false;
      for (i = 0; i < keep.length - 1; i++) {
        var A0 = lw(w[p.i0 + i]), B0 = lw(w[p.i0 + i + 1]);
        if (A0 && A0 === B0 && w[p.i0 + i + 1].s - w[p.i0 + i].e < 0.8) keep[i] = false;
        if (i < keep.length - 3 && A0 === lw(w[p.i0 + i + 2]) && B0 === lw(w[p.i0 + i + 3]) && A0 && B0) { keep[i] = false; keep[i + 1] = false; }
      }
      if (keep.indexOf(true) < 0) keep = keep.map(function () { return true; });
    }
    var segs = [], g0 = -1;
    for (i = 0; i <= keep.length; i++) {
      if (i < keep.length && keep[i]) { if (g0 < 0) g0 = i; continue; }
      if (g0 >= 0) {
        var a0 = p.i0 + g0, a1 = p.i0 + i - 1;
        var prevE = a0 > 0 ? w[a0 - 1].e : 0, nextS = a1 < w.length - 1 ? w[a1 + 1].s : dur;
        segs.push({ s: Math.max(prevE + 0.02, w[a0].s - 0.12, 0), e: Math.min(nextS - 0.02, w[a1].e + 0.2, dur) });
        g0 = -1;
      }
    }
    return segs;
  }
  /* ordem final: gancho → mensagem → final impacto */
  function talkOrder(clip) {
    var a = clip.ana;
    if (!a || a.nospeech) return [{ s: 0, e: (clip.durationMs || 0) / 1000, part: 'msg' }];
    var segs = [], cut = S.autoCut, mid = [], finals = [];
    a.phrases.forEach(function (p, k) {
      if (!p.inc || k === a.hook) return;
      if (a.final >= 0 && k >= a.final) finals.push(k); else mid.push(k);
    });
    function push(k, part) {
      if (cut) keptSegments(clip, k).forEach(function (b) { segs.push({ s: b.s, e: b.e, part: part }); });
      else { var b = phBounds(clip, k, false); segs.push({ s: b.s, e: b.e, part: part }); }
    }
    if (a.hook >= 0) push(a.hook, 'hook');
    mid.forEach(function (k) { push(k, 'msg'); });
    finals.forEach(function (k) { push(k, 'final'); });
    var merged = [];
    segs.forEach(function (g) { var l = merged[merged.length - 1]; if (l && l.part === g.part && Math.abs(g.s - l.e) < 0.03) l.e = g.e; else merged.push(g); });
    return merged.filter(function (g) { return g.e - g.s >= 0.2; });
  }
  function montage() {
    var preset = find(DYN, S.dyn), pieces = [], k = 0, list = S.chips.filter(function (c) { return c.durationMs; });
    if (!list.length) return pieces;
    var per = list.length < 3 ? 2 : 1;
    list.forEach(function (c) {
      var d = c.durationMs / 1000;
      for (var r = 0; r < per; r++) {
        var kind = preset.pat[k % preset.pat.length], P = PIECE[kind], len = Math.min(P.src, Math.max(0.05, d - 0.1));
        var center = d * (per === 1 ? 0.5 : (r ? 0.68 : 0.32)), s = Math.max(0, Math.min(d - len, center - len / 2));
        pieces.push({ path: c.path, s: s, e: s + len, speed: P.speed, kind: kind, chip: true });
        k++;
      }
    });
    return pieces;
  }
  function timeline() {
    var segs = [], out = 0, words = [], boundaries = [], sections = [], finalStart = 1e9, titleEnd = 3.4, msgN = 0;
    function add(g, path) {
      var d = (g.e - g.s) / (g.speed || 1);
      var z = 1;
      if (S.jumpZoom && g.part === 'msg') { z = (msgN % 2) ? 1.08 : 1; msgN++; }
      segs.push({ path: path, srcS: g.s, srcE: g.e, speed: g.speed || 1, removeAudio: !!g.chip, outS: out, outE: out + d, part: g.part || 'chips', kind: g.kind, zoom: z });
      out += d;
    }
    if (S.mode === 'dyn') {
      montage().forEach(function (p, i) { if (i > 0) boundaries.push(out); add(p, p.path); });
      if (out > 0) { sections.push({ k: 'chips', s: 0, e: out }); titleEnd = Math.max(2.6, Math.min(6, out)); }
    }
    var c = S.clip;
    if (c) {
      if (out > 0) boundaries.push(out);
      talkOrder(c).forEach(function (g, i) {
        var o0 = out;
        if (S.mode !== 'dyn' && segs.length && segs[segs.length - 1].part !== g.part) boundaries.push(out);
        add(g, c.path);
        if (g.part === 'final' && finalStart > 1e8) finalStart = o0;
        var last = sections[sections.length - 1];
        if (last && last.k === g.part) last.e = out; else sections.push({ k: g.part, s: o0, e: out });
        (c.words || []).forEach(function (w) { if (w.s >= g.s - 0.02 && w.e <= g.e + 0.02) words.push({ w: capWord(w.w), s: o0 + (w.s - g.s), e: o0 + (w.e - g.s), src: w }); });
      });
      if (S.mode !== 'dyn') {
        var hs = sections[0] && sections[0].k === 'hook' ? sections[0].e - sections[0].s : 0;
        titleEnd = Math.max(2.6, Math.min(4.8, hs || 3.4));
      }
    }
    var captions = [], cur = null;
    words.forEach(function (w) {
      var len = cur ? cur.words.reduce(function (a, x) { return a + x.w.length + 1; }, 0) : 0;
      if (!cur || cur.words.length >= 3 || len + w.w.length > 18 || w.s - cur.e > 0.35 || (w.s >= finalStart && cur.s < finalStart)) { cur = { s: w.s, e: w.e, words: [] }; captions.push(cur); }
      cur.words.push(w); cur.e = w.e;
    });
    for (var i = 0; i < captions.length; i++) { var nx = captions[i + 1]; captions[i].e = nx ? Math.min(nx.s, captions[i].e + 0.4) : captions[i].e + 0.5; }
    captions = captions.filter(function (cp) { return cp.s >= titleEnd - 0.05 && cp.words.some(function (w) { return w.w; }); });
    return { segs: segs, captions: captions, boundaries: boundaries, sections: sections, total: out, titleEnd: titleEnd, finalStart: finalStart < 1e8 ? finalStart : -1 };
  }
  function autoTitle() {
    if (S.title.trim()) return S.title.trim();
    var c = S.clip, a = c && c.ana;
    if (a && a.hook >= 0 && a.phrases[a.hook]) {
      var p = a.phrases[a.hook], ws = c.words.slice(p.i0, p.i1 + 1).map(function (w) { return w.w; }), k = -1;
      for (var i = 0; i < ws.length; i++) if (HOOK_WORDS.indexOf(ws[i].toLowerCase()) >= 0) { k = i; break; }
      var pick = k < 0 ? ws.slice(0, 3) : (k > 0 && (NUM.indexOf(ws[k - 1].toLowerCase()) >= 0 || /^\d+$/.test(ws[k - 1])) ? ws.slice(k - 1, k + 1) : ws.slice(k, k + 1));
      var w = pick.join(' '); if (a.asked) w += '?';
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return model().demo.title;
  }
  function titleCfg(extra) { var o = { m: S.model, title: autoTitle(), sub: S.sub, brand: S.brand || 'FLUX CINE' }; for (var k in extra) o[k] = extra[k]; return o; }
  function editCaption(cp, text) {
    var srcs = cp.words.map(function (w) { return w.src; }), toks = text.trim().split(/\s+/).filter(Boolean);
    var words = S.clip.words, i0 = words.indexOf(srcs[0]), i1 = words.indexOf(srcs[srcs.length - 1]);
    if (i0 < 0 || i1 < 0) return;
    var s = srcs[0].s, e = srcs[srcs.length - 1].e, step = (e - s) / Math.max(1, toks.length);
    var rep = toks.map(function (t, k) { return { w: t, s: s + k * step, e: s + (k + 1) * step - 0.02, c: 1 }; });
    words.splice.apply(words, [i0, i1 - i0 + 1].concat(rep));
    var diff = rep.length - (i1 - i0 + 1);
    S.clip.ana.phrases.forEach(function (p) { if (p.i0 > i1) p.i0 += diff; if (p.i1 >= i1) p.i1 += diff; if (p.i1 < p.i0) p.i1 = p.i0; });
  }
  function buildCaption() {
    var words = (S.clip && S.clip.words || []).map(function (w) { return w.w; });
    var body = words.slice(0, 28).join(' ') + (words.length > 28 ? '…' : '');
    if (body) body = body.charAt(0).toUpperCase() + body.slice(1);
    var parts = [autoTitle()]; if (body) parts.push(body); if (S.cta) parts.push('👉 ' + S.cta); parts.push(S.tags.join(' '));
    return parts.join('\n\n');
  }
  function impactScale(t, finalStart) {
    if (finalStart < 0 || t < finalStart) return 1;
    var d = t - finalStart;
    if (d < 0.12) return 1 + 0.14 * (d / 0.12);
    var e = Math.min(1, (d - 0.12) / 0.6); return 1.14 - 0.08 * (1 - Math.pow(1 - e, 3));
  }

  /* ================= player do corte: cor de cinema ao vivo (WebGL) + título/legenda ================= */
  var PL = null, PXS = 80;
  function plCreate(wrap, tl) {
    plDestroy();
    PL = { wrap: wrap, tl: tl, vids: {}, t: 0, playing: false, seg: -1, raf: 0, wall: 0, canvas: wrap.querySelector('canvas.ov'), glc: wrap.querySelector('canvas.gl'), gr: null };
    try { PL.gr = new FluxGrade.Renderer(PL.glc); } catch (e) { PL.gr = null; PL.glc.style.display = 'none'; }
    tl.segs.forEach(function (g) {
      if (PL.vids[g.path]) return;
      var v = document.createElement('video');
      v.src = srcUrl(g.path); v.preload = 'auto'; v.playsInline = true; v.setAttribute('playsinline', ''); v.poster = BLANK;
      v.className = 'plv' + (PL.gr ? ' hid' : ''); v.muted = !!g.removeAudio;
      v.addEventListener('seeked', function () { if (PL && !PL.playing) plDraw(); });
      v.addEventListener('loadeddata', function () { if (PL && !PL.playing) plDraw(); });
      wrap.insertBefore(v, PL.glc);
      PL.vids[g.path] = v;
    });
    var cv = PL.canvas, r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(10, Math.round(r.width * dpr)); cv.height = Math.max(10, Math.round(r.height * dpr));
    PL.layers = TT.layout(S.model, titleCfg({}));
    PL.grade = FluxGrade.params(S.grade);
    fixPad(); bindScrub();
    plSeek(0);
  }
  function plDestroy() { if (!PL) return; cancelAnimationFrame(PL.raf); for (var k in PL.vids) { try { PL.vids[k].pause(); PL.vids[k].removeAttribute('src'); PL.vids[k].load(); } catch (e) {} } PL = null; }
  function plSegAt(t) { var s = PL.tl.segs; for (var i = 0; i < s.length; i++) if (t < s[i].outE - 0.001) return i; return s.length - 1; }
  function plActivate(i, t) {
    var g = PL.tl.segs[i]; if (!g) return;
    var v = PL.vids[g.path];
    if (!PL.gr) for (var k in PL.vids) PL.vids[k].style.opacity = PL.vids[k] === v ? 1 : 0;
    PL.seg = i;
    try { v.currentTime = Math.max(0, g.srcS + (t - g.outS) * g.speed); } catch (e) {}
    v.muted = !!g.removeAudio;
    if (PL.playing) {
      if (g.kind === 'freeze') { v.pause(); PL.wall = performance.now() - (t - g.outS) * 1000; }
      else { v.playbackRate = g.speed; safe(v.play()); }
    }
  }
  function plSeek(t, fromScroll) {
    if (!PL || !PL.tl.segs.length) return;
    PL.t = Math.max(0, Math.min(t, PL.tl.total - 0.01));
    for (var k in PL.vids) PL.vids[k].pause();
    plActivate(plSegAt(PL.t), PL.t);
    plDraw(fromScroll);
    if (PL.playing) plLoop();
  }
  function plToggle() {
    if (!PL || !PL.tl.segs.length) return;
    PL.playing = !PL.playing;
    if (PL.playing) { if (PL.t >= PL.tl.total - 0.05) PL.t = 0; plActivate(plSegAt(PL.t), PL.t); plLoop(); }
    else for (var k in PL.vids) PL.vids[k].pause();
    var b = document.getElementById('plbtn'); if (b) b.innerHTML = PL.playing ? ICON.pause('#0A0A0B', 20) : ICON.play('#0A0A0B', 20);
  }
  function plLoop() {
    cancelAnimationFrame(PL.raf);
    var step = function () {
      if (!PL || !PL.playing) return;
      var g = PL.tl.segs[PL.seg], v = PL.vids[g.path];
      if (g.kind === 'freeze') PL.t = g.outS + (performance.now() - PL.wall) / 1000;
      else PL.t = g.outS + Math.max(0, v.currentTime - g.srcS) / g.speed;
      if (PL.t >= g.outE - 0.025) {
        if (PL.seg + 1 >= PL.tl.segs.length) { PL.playing = false; PL.t = PL.tl.total; for (var k in PL.vids) PL.vids[k].pause(); var b = document.getElementById('plbtn'); if (b) b.innerHTML = ICON.play('#0A0A0B', 20); plDraw(); return; }
        plActivate(PL.seg + 1, PL.tl.segs[PL.seg + 1].outS);
      }
      plDraw();
      PL.raf = requestAnimationFrame(step);
    };
    PL.raf = requestAnimationFrame(step);
  }
  function capStyle() { var o = clone(S.cs); o.accent = S.cs.accent || model().accent; o.upper = !!S.cs.upper; return o; }
  function plDraw(fromScroll) {
    if (!PL) return;
    var t = PL.t, tl = PL.tl, cv = PL.canvas, ctx = cv.getContext('2d');
    var g = tl.segs[PL.seg], v = g && PL.vids[g.path], zoom = (g && g.zoom || 1) * impactScale(t, tl.finalStart);
    var cst = FluxGrade.cutState(t, tl.boundaries, S.fx.trans);
    if (v) { if (PL.gr) PL.gr.draw(v, PL.grade, zoom, t, { trans: cst.trans, td: cst.td, fx: FluxGrade.fxCode(S.fx.fx), amt: S.fx.amt }); else v.style.transform = 'scale(' + zoom.toFixed(3) + ')'; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(cv.width / TT.W, 0, 0, cv.height / TT.H, 0, 0);
    if (S.fx.trans === 'flash') for (var b = 0; b < tl.boundaries.length; b++) { var d = t - tl.boundaries[b]; if (d > -0.06 && d < 0.2) { ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (d < 0 ? (d + 0.06) / 0.06 : 1 - d / 0.2)).toFixed(2) + ')'; ctx.fillRect(0, 0, TT.W, TT.H); } }
    if (t < tl.titleEnd + 0.02) TT.draw(ctx, PL.layers, t, tl.titleEnd, S.tf);
    if (S.capsOn) for (var i = 0; i < tl.captions.length; i++) { var cp = tl.captions[i]; if (t >= cp.s && t < cp.e + 0.1) { TT.drawCaption(ctx, cp, t, capStyle(), tl.finalStart >= 0 && cp.s >= tl.finalStart - 0.01); break; } }
    var tm = document.getElementById('pltime'); if (tm) tm.textContent = fmt1(t) + ' / ' + fmt1(tl.total);
    if (!fromScroll) setScroll(t * PXS);
  }
  /* linha do tempo com agulha no centro: arrastar a régua navega pelo vídeo */
  function fixPad() {
    var sc = document.getElementById('tlscroll'), inner = document.getElementById('tlin'), track = document.getElementById('tltrack');
    if (!sc || !inner || !track || !PL) return;
    var pad = Math.round(sc.clientWidth / 2);
    inner.style.width = (Math.ceil(PL.tl.total * PXS) + pad * 2) + 'px';
    track.style.left = pad + 'px';
  }
  function setScroll(x) {
    var sc = document.getElementById('tlscroll'); if (!sc || !PL) return;
    if (Math.abs(sc.scrollLeft - x) > 1) { PL.progScroll = true; sc.scrollLeft = x; }
  }
  function bindScrub() {
    var sc = document.getElementById('tlscroll'); if (!sc || sc.__bound) return;
    sc.__bound = true;
    sc.addEventListener('scroll', function () {
      if (!PL) return;
      if (PL.progScroll) { PL.progScroll = false; return; }
      if (PL.playing) plToggle();
      var t = sc.scrollLeft / PXS, now = performance.now();
      PL.t = Math.max(0, Math.min(t, PL.tl.total - 0.01));
      if (now - (PL.lastSeek || 0) > 70) { PL.lastSeek = now; plSeek(PL.t, true); }
      clearTimeout(PL.scrT); PL.scrT = setTimeout(function () { if (PL) plSeek(sc.scrollLeft / PXS, true); }, 140);
    }, { passive: true });
  }

  /* ================= telas: abertura ================= */
  function intro() { return '<div class="full intro" id="introEl"><div class="flare"></div><div class="sweep"></div><img class="mk" src="mark-a.png" alt=""><img class="wm" src="wordmark.png" alt="FLUX CINE"></div>'; }
  function dots(n) { var h = ''; for (var i = 0; i < 3; i++) h += '<i class="' + (i <= n ? 'on' : '') + '"></i>'; return '<div class="dots">' + h + '</div>'; }
  function q1() { return '<div class="full qz"><div>' + dots(0) + '<h1>O que você mais gosta em um vídeo?</h1><p class="lead">Escolha o que mais prende a sua atenção.</p><div class="opts">' + Q1.map(function (o) { return '<button class="opt ' + (S.q1 === o.id ? 'on' : '') + '" data-a="q1" data-v="' + o.id + '"><span class="ic" style="color:' + ORANGE + ';font-weight:800">' + o.ic + '</span>' + o.t + '</button>'; }).join('') + '</div></div><span></span></div>'; }
  function q2() { return '<div class="full qz"><div>' + dots(1) + '<h1>Você curte estilo cinematográfico ou um corte simples?</h1><div class="duo"><button data-a="q2" data-v="cine" class="' + (S.style === 'cine' ? 'on' : '') + '">' + media(39878) + titleCanvas({ m: 'classico-1', title: 'Cinema', sub: 'estilo de filme', brand: 'Flux Cine', end: 3.2, tf: { ox: 0, oy: 0, s: 1 } }) + '<span class="lbl2">Cinematográfico<small>Títulos de filme, desfoque, impacto</small></span></button><button data-a="q2" data-v="simples" class="' + (S.style === 'simples' ? 'on' : '') + '">' + media(1240) + '<span class="lbl2">Corte simples<small>Direto ao ponto, legenda limpa</small></span></button></div></div><span></span></div>'; }
  function q3() { return '<div class="full qz"><div>' + dots(2) + '<h1>E se eu te falar que dá pra fazer tudo isso…</h1><div class="big5">5 min.</div><p class="lead" style="font-size:17px;color:#F4F4F5">…e ter seu vídeo editado em 5 minutos?</p></div><button class="btn vip" data-a="q3">Me mostra ' + ICON.arrow + '</button></div>'; }
  function pitch() {
    var bars = PITCH.map(function (_, i) { return '<i><b style="width:' + (i < S.pitchI ? 100 : 0) + '%"' + (i === S.pitchI ? ' class="run"' : '') + '></b></i>'; }).join('');
    var stages = PITCH.map(function (p, i) { return '<div class="pstage' + (i === S.pitchI ? ' on' : '') + '" data-i="' + i + '">' + media(p.media) + '</div>'; }).join('');
    var p = PITCH[S.pitchI];
    return '<div class="full pitch"><div class="stage">' + stages + titleCanvas({ m: p.m, title: p.title, sub: p.sub, brand: 'Flux Cine', end: 4.6, hold: 9, tf: { ox: 0, oy: 0, s: 1 } }) + '</div>' +
      '<div class="bars">' + bars + '</div><div class="shade2"></div><button class="tap" data-a="pnext" aria-label="Próximo"></button>' +
      '<div class="desc" id="pdesc"><b>' + p.k + '</b>' + p.d + '</div>' +
      '<div class="acts"><button class="btn vip" data-a="vip">' + ICON.crown(18) + ' Quero acesso VIP</button><button class="btn ghost" data-a="free">Continuar no gratuito</button></div></div>';
  }
  function vipScreen() {
    var perks = [['4K', 'Exportar em 4K', 'Qualidade máxima para Reels, TikTok e anúncios.'], ['★', 'Todos os ' + MODELS.length + ' modelos', 'Libera os modelos VIP de título cinematográfico.'], ['⚡', 'Dinâmico com até 12 chips', 'O gratuito monta com até 6 chips.']];
    return '<div class="full vipbox"><button class="back" data-a="vipback" aria-label="Voltar">' + ICON.back + '</button><div class="crown">' + ICON.crown(30) + '</div><h1>FLUX CINE VIP</h1><p class="sub">Vídeos em 4K e todos os modelos cinematográficos.</p>' +
      perks.map(function (p) { return '<div class="perk"><span class="ic" style="color:' + ORANGE + ';font-weight:800">' + p[0] + '</span><div><b>' + p[1] + '</b><span>' + p[2] + '</span></div></div>'; }).join('') +
      '<div class="plan"><b>Assinatura pela Google Play</b><p>O pagamento entra quando o app for publicado na Play Store. Enquanto isso, ative o modo de teste para experimentar o VIP.</p></div>' +
      (S.vip ? '<button class="btn sec" data-a="vipoff">Desativar VIP de teste</button>' : '<button class="btn vip" style="margin-top:18px" data-a="vipon">' + ICON.crown(18) + ' Ativar VIP de teste</button>') +
      '<button class="btn txt" data-a="vipback">Continuar no gratuito</button></div>';
  }

  /* ================= telas: editor ================= */
  function header() {
    var i = ORDER[S.screen], showBack = ['video', 'chips', 'legenda', 'mpreview', 'project', 'profile'].indexOf(S.screen) >= 0;
    var steps = ['Modelo', 'Vídeo', 'Legenda', 'Pronto'].map(function (l, k) { return '<div class="step ' + (k === i ? 'on' : k < i ? 'past' : '') + '"><i></i><span>' + l + '</span></div>'; }).join('');
    var initial = (S.brand || 'F').trim().charAt(0).toUpperCase() || 'F';
    return '<div class="head"><div class="toprow">' +
      (showBack ? '<button class="back" data-a="back" aria-label="Voltar">' + ICON.back + '</button>' : '<div class="logo"><img src="mark.png" alt="" width="34" height="34"><b>FLU<em>X</em></b><i>CINE</i></div>') +
      '<div style="display:flex;gap:8px;align-items:center"><button class="vippill ' + (S.vip ? '' : 'free') + '" data-a="vip">' + (S.vip ? '★ VIP' : 'Ser VIP') + '</button>' +
      '<button class="avatar" data-a="profile" aria-label="Perfil">' + esc(initial) + (S.projects.length ? '<span class="badge2">' + S.projects.length + '</span>' : '') + '</button></div></div>' +
      (i != null ? '<div class="steps">' + steps + '</div>' : '') + '</div>';
  }
  function modeTabs() { return '<div class="seg"><button class="' + (S.mode === 'cine' ? 'on' : '') + '" data-a="mode" data-v="cine">Cinemático<small>1 vídeo</small></button><button class="' + (S.mode === 'dyn' ? 'on' : '') + '" data-a="mode" data-v="dyn">Dinâmico<small>vários vídeos</small></button></div>'; }
  function mfil(m, f) { return f === 'all' || (f === 'new' ? m.isNew : f === 'free' ? !m.vip : m.cat === f); }
  function models() {
    var fams = TT.CATS.concat([['free', 'Grátis']]);
    var chips = fams.map(function (f) { var n = MODELS.filter(function (m) { return mfil(m, f[0]); }).length; return '<button class="chip ' + (S.filter === f[0] ? 'on' : '') + '" data-a="mfilter" data-v="' + f[0] + '">' + f[1] + ' <small>' + n + '</small></button>'; }).join('');
    var list = MODELS.filter(function (m) { return mfil(m, S.filter); });
    var cards = list.map(function (m, i) {
      var sel = m.id === S.model;
      return '<button class="card ' + (sel ? 'sel' : '') + '" data-a="model" data-v="' + m.id + '" aria-pressed="' + sel + '"><div class="thumb" style="background:#111">' + media(m.media, 'preload="metadata"') + titleCanvas({ m: m.id, title: m.demo.title, sub: m.demo.sub, brand: m.demo.brand, end: 3.6, off: (i % 6) * 0.45, lazy: 1, tf: { ox: 0, oy: 0, s: 1 } }) +
        (m.vip ? '<span class="viptag">VIP</span>' : '') + (m.isNew ? '<span class="newtag">NOVO</span>' : '') + (sel ? '<div class="check" style="top:10px">' + ICON.check(14) + '</div>' : '') + '</div><span class="cname">' + (MODELS.indexOf(m) + 1) + '. ' + m.name + '</span><span class="cmeta">' + m.vibe + '</span></button>';
    }).join('');
    return modeTabs() + '<h1 style="margin-top:16px">' + MODELS.length + ' títulos cinematográficos</h1><p class="sub">Toque para ver a prévia. Depois você pode mover e ajustar o tamanho.</p><div class="chips" style="margin:14px -20px">' + chips + '</div><div class="grid">' + cards + '</div>' +
      '<div style="text-align:center;margin-top:16px"><button class="linkbtn" data-a="replay">Rever a apresentação</button></div>';
  }
  function dynModels() {
    var cards = DYN.map(function (d) {
      var sel = d.id === S.dyn;
      return '<button class="card ' + (sel ? 'sel' : '') + '" data-a="dyn" data-v="' + d.id + '"><div class="thumb" style="background:#111">' + media(d.media, 'data-rhythm="' + d.pat.join(',') + '"') + titleCanvas({ m: d.model, title: d.name, sub: d.desc, brand: 'Flux Cine', end: 3.4, lazy: 1, tf: { ox: 0, oy: 0, s: 1 } }) +
        '<div class="rhythm">' + d.pat.map(function (k) { return '<i class="rk ' + k + '"></i>'; }).join('') + '</div>' + (sel ? '<div class="check" style="top:10px">' + ICON.check(14) + '</div>' : '') + '</div><span class="cname">' + d.name + '</span><span class="cmeta">' + d.desc + '</span></button>';
    }).join('');
    return modeTabs() + '<h1 style="margin-top:16px">Modelos dinâmicos</h1><p class="sub">Chips virais com cortes rápidos, lentos e pausas. Depois a sua mensagem e o final de impacto, num vídeo só.</p>' +
      '<div class="legend"><span><i class="rk fast"></i>rápido</span><span><i class="rk slow"></i>lento</span><span><i class="rk normal"></i>normal</span><span><i class="rk freeze"></i>pausa</span></div><div class="grid" style="margin-top:14px">' + cards + '</div>';
  }
  function mpreview() {
    var m = model(), mv = !!S.moveMode;
    var bg = S.clip && S.clip.thumb ? '<img src="' + S.clip.thumb + '" alt="">' : media(m.media);
    return '<span class="pill">' + (MODELS.indexOf(m) + 1) + ' de ' + MODELS.length + ' · <b>' + m.name + '</b>' + (m.vip ? ' · VIP' : '') + '</span><h1>Prévia do título</h1>' +
      '<p class="sub">' + (mv ? 'Arraste o título com o dedo e ajuste o tamanho. Toque em <b>Pronto</b> quando terminar.' : 'Veja a animação. Se quiser mudar a posição, toque em <b>Mover título</b>.') + '</p>' +
      '<div class="pv big' + (mv ? ' movable' : '') + '" id="dragpv">' + bg + titleCanvas(titleCfg({ end: 4.2, hold: 0.5 })) + (mv ? '<span class="draghint">' + ICON.move + ' arraste o título</span>' : '') + '</div>' +
      (mv ? '<div class="sizer"><span>Tamanho</span><input type="range" id="tsize" min="50" max="160" value="' + Math.round(S.tf.s * 100) + '" aria-label="Tamanho do título"><b id="tsizev">' + Math.round(S.tf.s * 100) + '%</b></div>' +
        '<div class="mvbar"><button class="btn sec" data-a="tfreset">Centralizar</button><button class="btn pri" data-a="movedone">Pronto</button></div>'
        : '<button class="btn sec" data-a="movemode">' + ICON.move + ' Mover título</button>') +
      '<div class="inputs"><div class="col wide" style="gap:6px"><label class="lbl" for="ti">Título</label><input id="ti" class="field" style="height:48px;padding:0 14px" value="' + esc(S.title) + '" placeholder="' + esc(autoTitle()) + '"></div>' +
      '<div class="col" style="gap:6px"><label class="lbl" for="su">Subtítulo</label><input id="su" class="field" style="height:48px;padding:0 14px" value="' + esc(S.sub) + '" placeholder="opcional"></div>' +
      '<div class="col" style="gap:6px"><label class="lbl" for="br">Sua marca</label><input id="br" class="field" style="height:48px;padding:0 14px" value="' + esc(S.brand) + '" placeholder="Nome da marca"></div></div>';
  }
  function unclearCard(c) {
    if (!c || !c.unclear || c.status !== 'ok') return '';
    return '<div class="hook" style="border-color:#5C2E0E"><div class="htag" style="color:#FCA5A5">Não consegui escutar bem esse áudio</div><p class="hint" style="margin:0">Barulho ou fala baixa atrapalham a transcrição. Você decide:</p>' +
      '<div class="yn"><span>Colocar legenda?</span><button class="' + (S.capsOn ? 'on' : '') + '" data-a="capson" data-v="1">Sim</button><button class="' + (!S.capsOn ? 'on' : '') + '" data-a="capson" data-v="0">Não</button></div>' +
      '<div class="yn"><span>Efeitos sonoros?</span><button class="' + (S.sfxOn ? 'on' : '') + '" data-a="sfxon" data-v="1">Sim</button><button class="' + (!S.sfxOn ? 'on' : '') + '" data-a="sfxon" data-v="0">Não</button></div></div>';
  }
  function structureCard(c) {
    if (!c) return '';
    if (c.status === 'listening') return '<div class="listen"><div class="row">' + ICON.ear + '<span>Ouvindo a fala e procurando o gancho… ' + Math.round((c.p || 0) * 100) + '%</span></div><div class="bar"><i style="width:' + Math.round((c.p || 0) * 100) + '%"></i></div></div>';
    if (c.status === 'error') return '<div class="err">' + esc(c.err) + '</div>';
    var a = c.ana; if (!a) return '';
    if (a.nospeech) return '<div class="hook"><div class="htag">' + ICON.bolt + 'Não encontrei fala neste vídeo</div><p class="hint" style="margin:0">Vou usar o vídeo inteiro.</p></div>';
    var tl = timeline(), qs = questionsOf(c), ph = a.phrases;
    var hk = a.hook >= 0 ? ph[a.hook] : null, fin = a.final >= 0 ? ph[a.final] : null;
    var alts = qs.length > 1 ? '<div class="alts">' + qs.map(function (k) { return '<button class="alt ' + (k === a.hook ? 'on' : '') + '" data-a="sethook" data-v="' + k + '">“' + esc(ph[k].text) + '”</button>'; }).join('') + '</div>' : '';
    var rows = ph.map(function (p, k) {
      var tag = k === a.hook ? '<em class="t hook">gancho</em>' : (a.final >= 0 && k >= a.final ? '<em class="t fin">final</em>' : (p.retake ? '<em class="t rep">repetição</em>' : '<em class="t msg">mensagem</em>'));
      var on = p.inc || k === a.hook;
      return '<button class="phr ' + (on ? '' : 'off') + '" data-a="phr" data-v="' + k + '"><span class="ck">' + (on ? ICON.check(12) : '') + '</span><span class="tx">' + esc(p.text) + '</span>' + tag + '</button>';
    }).join('');
    var reps = ph.filter(function (p) { return p.retake && !p.inc; }).length;
    return '<div class="hook"><div class="htag">' + ICON.bolt + (a.asked ? 'Gancho (pergunta) encontrado' : 'Não achei pergunta — usei a frase mais forte') + '</div>' +
      (hk ? '<q>' + esc(hk.text) + (a.asked ? '?' : '') + '</q><span class="when">Corte limpo de ' + fmt1(hk.s) + ' a ' + fmt1(hk.e) + ' · vai para o início · nenhuma palavra cortada</span>' : '') + alts +
      (fin ? '<div class="htag" style="margin-top:6px;color:#FF5A4F">' + ICON.bolt + 'Final de impacto</div><q style="font-size:15px">' + esc(fin.text) + '</q>' : '') +
      '<div class="stat"><span>Original <b>' + fmt((c.durationMs || 0) / 1000) + '</b></span><span>Editado <b>' + fmt(tl.total) + '</b></span>' + (reps ? '<span><b>' + reps + '</b> repetiç' + (reps > 1 ? 'ões removidas' : 'ão removida') + '</span>' : '') + '</div>' +
      '<details class="phrs"><summary>Ver trechos (' + ph.length + ') — toque para tirar ou pôr</summary>' + rows + '</details>' +
      '<button class="toggle ' + (S.autoCut ? 'on' : '') + '" data-a="autocut" aria-pressed="' + S.autoCut + '"><span class="col" style="gap:2px"><span style="font-size:14px;font-weight:600">Cortar silêncios e pausas</span><span class="hint">Deixa o ritmo mais rápido</span></span><span class="sw"><i></i></span></button></div>';
  }
  function slotHtml(c, act, kick, empty, sub) {
    return '<button class="slot ' + (c ? 'done' : '') + '" data-a="' + act + '"><div class="sthumb">' + (c && c.thumb ? '<img src="' + c.thumb + '" alt="">' : (c ? ICON.play('#fff', 22) : ICON.up)) + '</div>' +
      '<div class="col" style="flex:1;min-width:0;gap:4px"><span class="kick">' + kick + '</span><span class="stitle">' + (c ? esc(c.name) : empty) + '</span><span class="ssub">' + (c ? fmt((c.durationMs || 0) / 1000) + ' · toque para trocar' : sub) + '</span></div>' + (c ? '<div class="ok">' + ICON.check(15) + '</div>' : '') + '</button>';
  }
  function titleBlock() {
    var c = S.clip; if (!c || c.status !== 'ok') return '';
    return '<div class="pv">' + (c.thumb ? '<img src="' + c.thumb + '" alt="">' : media(model().media)) + titleCanvas(titleCfg({ end: 3.8 })) + '</div>' +
      '<button class="btn sec" data-a="gompv">' + ICON.move + ' Ajustar título (posição, tamanho, texto)</button>';
  }
  function videoScreen() {
    return '<span class="pill">Modelo: <b>' + model().name + '</b></span><h1>Mande seu vídeo</h1>' +
      '<p class="sub">Fale assim: <b>gancho</b> (uma pergunta) → <b>mensagem</b> → <b>final de impacto</b>. O FLUX CINE escuta, corta no ponto certo e tira as repetições.</p>' +
      slotHtml(S.clip, 'pick', 'Seu vídeo', 'Envie o vídeo falado', 'Grave falando, na vertical') + unclearCard(S.clip) + structureCard(S.clip) + titleBlock();
  }
  function chipsScreen() {
    var d = find(DYN, S.dyn), max = S.vip ? 12 : 6;
    var chips = S.chips.map(function (c, i) { return '<div class="chipv">' + (c.thumb ? '<img src="' + c.thumb + '" alt="">' : '<span class="ph">' + (i + 1) + '</span>') + '<span>' + fmt((c.durationMs || 0) / 1000) + '</span><button data-a="rmchip" data-v="' + i + '" aria-label="Remover chip">×</button></div>'; }).join('');
    return '<span class="pill">Dinâmico: <b>' + d.name + '</b></span><h1>Monte seu vídeo dinâmico</h1>' +
      '<p class="sub"><b>1.</b> Chips: vídeos curtos (produto, bastidores, cenas) com cortes rápidos, lentos e pausas. <b>2.</b> O vídeo em que você fala a mensagem e o final.</p>' +
      '<h2 style="margin-top:18px">Chips (' + S.chips.length + '/' + max + ')</h2><div class="chipgrid">' + chips + (S.chips.length < max ? '<button class="chipadd" data-a="addchip">' + ICON.plus + '<span>Adicionar</span></button>' : '') + '</div>' +
      '<div class="rhythm big">' + d.pat.map(function (k) { return '<i class="rk ' + k + '"></i>'; }).join('') + '</div>' +
      '<h2 style="margin-top:18px">Vídeo falado</h2>' + slotHtml(S.clip, 'pick', 'Mensagem + final', 'Envie o vídeo em que você fala', 'Mensagem e final de impacto') + unclearCard(S.clip) + structureCard(S.clip) + titleBlock();
  }

  function tlHtml(tl) {
    var W = Math.ceil(tl.total * PXS), ticks = '', secs = '', caps = '';
    for (var s = 0; s <= Math.ceil(tl.total); s++) ticks += '<i style="left:' + (s * PXS) + 'px"><span>' + s + 's</span></i>';
    var names = { chips: 'Chips', hook: 'Gancho', msg: 'Mensagem', final: 'Final impacto' };
    tl.sections.forEach(function (x) { secs += '<span class="tsec ' + x.k + '" style="left:' + (x.s * PXS) + 'px;width:' + Math.max(2, (x.e - x.s) * PXS - 2) + 'px">' + names[x.k] + '</span>'; });
    caps += '<span class="tblk title" style="left:0;width:' + Math.max(10, tl.titleEnd * PXS - 2) + 'px">Título</span>';
    tl.captions.forEach(function (cp, i) { caps += '<button class="tblk ' + (i === S.selCap ? 'sel' : '') + (S.capsOn ? '' : ' muted') + '" data-a="selcap" data-v="' + i + '" style="left:' + (cp.s * PXS) + 'px;width:' + Math.max(22, (cp.e - cp.s) * PXS - 3) + 'px">' + esc(cp.words.map(function (w) { return w.w; }).join(' ')) + '</button>'; });
    var segs = tl.segs.map(function (g) { return '<span class="tseg ' + (g.part || '') + '" style="left:' + (g.outS * PXS) + 'px;width:' + Math.max(2, (g.outE - g.outS) * PXS - 1) + 'px"></span>'; }).join('');
    return '<div class="tlwrap"><div class="tl" id="tlscroll"><div class="tlin" id="tlin" style="width:' + (W + 400) + 'px"><div class="tltrack" id="tltrack" style="width:' + W + 'px">' +
      '<div class="ruler">' + ticks + '</div><div class="segrow">' + segs + '</div><div class="secrow">' + secs + '</div><div class="caprow2">' + caps + '</div></div></div></div><div class="playhead"></div></div>';
  }
  function selEditor(tl) {
    var cp = tl.captions[S.selCap];
    if (!cp) return '<p class="hint" style="margin:8px 0 0">Arraste a linha do tempo para navegar. Toque num bloco da legenda para corrigir o texto.</p>';
    return '<div class="seled"><label class="lbl" for="capedit">Legenda em ' + fmt1(cp.s) + '</label><div style="display:flex;gap:8px"><input id="capedit" class="field" style="height:46px;padding:0 12px" value="' + esc(cp.words.map(function (w) { return w.w; }).join(' ')) + '"><button class="iconbtn ok2" data-a="capok" aria-label="Confirmar">' + ICON.check(16) + '</button><button class="iconbtn" data-a="delcap" aria-label="Apagar trecho">' + ICON.trash + '</button></div></div>';
  }
  function stylePanel() {
    var cs = S.cs, tab = S.styleTab, h = '';
    var tabs = [['modelos', 'Modelos'], ['fonte', 'Fonte'], ['tamanho', 'Tamanho'], ['espaco', 'Espaçamento'], ['sombra', 'Sombra'], ['efeito', 'Efeito'], ['destaque', 'Destaque'], ['cor', 'Cor'], ['posicao', 'Posição']];
    var bar = '<div class="tabs">' + tabs.map(function (t) { return '<button class="' + (tab === t[0] ? 'on' : '') + '" data-a="stab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'modelos') h = '<div class="cpresets">' + CAP_PRESETS.map(function (p) { var c = p.cs; return '<button class="cpre ' + (S.capPreset === p.id ? 'on' : '') + '" data-a="cpreset" data-v="' + p.id + '"><span class="cpw" style="font-family:\'' + c.font + '\';color:' + c.color + ';' + (c.shadow === 'glow' ? 'text-shadow:0 0 10px ' + c.accent : c.shadow === 'outline' ? '-webkit-text-stroke:1px #000;paint-order:stroke' : c.shadow === 'hard' ? 'text-shadow:2px 2px 0 #000' : 'text-shadow:0 2px 8px rgba(0,0,0,.6)') + '">' + (c.upper ? 'O ' : 'O ') + '<i style="font-style:normal;' + (c.hl === 'box' ? 'background:' + c.accent + ';color:#0A0A0A;padding:0 4px;border-radius:4px' : c.hl === 'underline' ? 'border-bottom:3px solid ' + c.accent : c.hl === 'color' ? 'color:' + c.accent : '') + '">' + (c.upper ? 'SEGREDO' : 'segredo') + '</i></span><small>' + p.name + '</small></button>'; }).join('') + '</div>';
    else if (tab === 'fonte') h = '<div class="fonts" style="grid-template-columns:repeat(4,1fr)">' + CAP_FONTS.map(function (x) { return '<button class="font ' + (x.id === cs.font ? 'on' : '') + '" data-a="cfont" data-v="' + x.id + '"><span class="aa" style="font-family:\'' + x.id + '\'">Aa</span><small>' + x.label + '</small></button>'; }).join('') + '</div><button class="toggle ' + (cs.upper ? 'on' : '') + '" data-a="cupper"><span style="font-size:14px;font-weight:600">LETRAS MAIÚSCULAS</span><span class="sw"><i></i></span></button>';
    else if (tab === 'tamanho') h = '<div class="sizer"><span>Tamanho</span><input type="range" data-cs="size" min="60" max="160" value="' + Math.round(cs.size * 100) + '"><b>' + Math.round(cs.size * 100) + '%</b></div>';
    else if (tab === 'espaco') h = '<div class="sizer"><span>Entre letras</span><input type="range" data-cs="ls" min="-5" max="30" value="' + Math.round(cs.ls * 100) + '"><b>' + Math.round(cs.ls * 100) + '</b></div>';
    else if (tab === 'sombra') h = '<div class="chiprow">' + SHADOWS.map(function (x) { return '<button class="sug ' + (cs.shadow === x[0] ? 'on' : '') + '" data-a="cset" data-k="shadow" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    else if (tab === 'efeito') h = '<div class="chiprow">' + ANIMS.map(function (x) { return '<button class="sug ' + (cs.anim === x[0] ? 'on' : '') + '" data-a="cset" data-k="anim" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    else if (tab === 'destaque') h = '<div class="chiprow">' + HLS.map(function (x) { return '<button class="sug ' + (cs.hl === x[0] ? 'on' : '') + '" data-a="cset" data-k="hl" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><p class="hint">A palavra falada no momento ganha o destaque.</p>';
    else if (tab === 'cor') h = '<h2 style="margin:4px 0 8px">Texto</h2><div class="swatches">' + COLORS.map(function (c) { return '<button style="background:' + c + '" class="' + (cs.color === c ? 'on' : '') + '" data-a="cset" data-k="color" data-v="' + c + '" aria-label="Cor ' + c + '"></button>'; }).join('') + '</div><h2 style="margin:14px 0 8px">Destaque</h2><div class="swatches">' + [model().accent].concat(COLORS).map(function (c) { return '<button style="background:' + c + '" class="' + ((cs.accent || model().accent) === c ? 'on' : '') + '" data-a="cset" data-k="accent" data-v="' + c + '" aria-label="Destaque ' + c + '"></button>'; }).join('') + '</div>';
    else if (tab === 'posicao') h = '<div class="sizer"><span>Altura</span><input type="range" data-cs="y" min="35" max="88" value="' + Math.round(cs.y * 100) + '"><b>' + Math.round(cs.y * 100) + '%</b></div>';
    return bar + '<div class="tabbody">' + h + '</div>';
  }
  function gradePanel() {
    var g = S.grade;
    var cards = FluxGrade.PRESETS.map(function (p) { return '<button class="gcard ' + (g.id === p.id ? 'on' : '') + '" data-a="grade" data-v="' + p.id + '"><span class="gsw" style="background:linear-gradient(135deg,' + p.sw[0] + ',' + p.sw[1] + ')"></span><b>' + p.name + '</b></button>'; }).join('');
    function sl(k, label) { var v = Math.round((g[k] || 0) * 100); return '<div class="sizer"><span>' + label + '</span><input type="range" data-gr="' + k + '" min="0" max="100" value="' + v + '"><b>' + v + '%</b></div>'; }
    return '<p class="hint" style="margin:0 0 10px">Coloração de cinema e granulação de filme. A prévia mostra exatamente como vai ficar.</p><div class="grades">' + cards + '</div>' +
      sl('amount', 'Intensidade') + sl('grain', 'Granulação') + sl('vignette', 'Vinheta') +
      '<button class="toggle ' + (g.bars ? 'on' : '') + '" data-a="gbars" style="margin-top:10px"><span class="col" style="gap:2px"><span style="font-size:14px;font-weight:600">Faixas de cinema</span><span class="hint">Barras pretas em cima e embaixo</span></span><span class="sw"><i></i></span></button>';
  }
  function fxPanel() {
    var f = S.fx, TI = { none: '│', flash: '✦', zoom: '⊕', whip: '≫', glitch: '▚', shake: '≈', leak: '☀', dip: '◐', mix: '✱' };
    var tr = FluxGrade.TRANS.map(function (x) { return '<button class="fxcard ' + (f.trans === x[0] ? 'on' : '') + '" data-a="ftrans" data-v="' + x[0] + '"><span class="fxi">' + TI[x[0]] + '</span><b>' + x[1] + '</b></button>'; }).join('');
    var fx = FluxGrade.FX.map(function (x) { return '<button class="sug ' + (f.fx === x[0] ? 'on' : '') + '" data-a="ffx" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('');
    var v = Math.round(f.amt * 100);
    return '<h2 style="margin:4px 0 10px">Transição nos cortes</h2><div class="fxgrid">' + tr + '</div><p class="hint">Aparece em cada corte. Arraste a linha do tempo até um corte para ver.</p>' +
      '<h2 style="margin:18px 0 10px">Efeito de filme</h2><div class="chiprow">' + fx + '</div>' +
      '<div class="sizer" style="margin-top:10px"><span>Intensidade</span><input type="range" data-fx="amt" min="0" max="100" value="' + v + '"><b>' + v + '%</b></div>';
  }
  function cutsPanel() {
    function tg(a, on, t, d) { return '<button class="toggle ' + (on ? 'on' : '') + '" data-a="' + a + '"><span class="col" style="gap:2px"><span style="font-size:14px;font-weight:600">' + t + '</span><span class="hint">' + d + '</span></span><span class="sw"><i></i></span></button>'; }
    var tl = timeline(), c = S.clip;
    return tg('autocut', S.autoCut, 'Cortar silêncios e pausas', 'Junta as frases sem os buracos') +
      tg('trim', S.trimFillers, 'Tirar vícios e gaguejos', '“é”, “né”, “tipo” e palavras repetidas') +
      tg('jumpzoom', S.jumpZoom, 'Zoom nos cortes', 'Aproxima um pouco a cada corte, estilo viral') +
      '<div class="stat" style="margin-top:12px"><span>Original <b>' + fmt(c ? (c.durationMs || 0) / 1000 : 0) + '</b></span><span>Editado <b>' + fmt(tl.total) + '</b></span><span><b>' + tl.segs.length + '</b> cortes</span></div>' +
      '<button class="btn sec" data-a="back">Ver gancho, mensagem e trechos</button>';
  }
  function soundPanel() {
    return '<h2 style="margin:4px 0 10px">Efeitos sonoros</h2><div class="chiprow" id="sfxrow"><button class="sug ' + (!S.sfxOn ? 'on' : '') + '" data-a="sfxon" data-v="0">Sem efeitos</button>' + SFX.map(function (x) { return '<button class="sug ' + (S.sfxOn && S.sfx === x.id ? 'on' : '') + '" data-a="sfx" data-v="' + x.id + '">' + x.name + '</button>'; }).join('') + '</div><p class="hint">Entram no título, em cada corte e no final de impacto.</p>' +
      '<h2 style="margin:18px 0 10px"><label for="ctain">Chamada no final (opcional)</label></h2><input id="ctain" class="field" style="height:48px;padding:0 14px" value="' + esc(S.cta) + '" placeholder="Ex.: Chama no WhatsApp"><div class="chiprow" style="margin-top:8px">' + CTAS.map(function (c) { return '<button class="sug ' + (S.cta === c ? 'on' : '') + '" data-a="cta" data-v="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
      '<h2 style="margin:18px 0 10px">Qualidade</h2><div class="qual"><button class="' + (S.quality === 'hd' ? 'on' : '') + '" data-a="qual" data-v="hd"><b>Alta</b><span>1080p · grátis</span></button><button class="' + (S.quality === '4k' ? 'on' : '') + '" data-a="qual" data-v="4k"><b>4K' + (S.vip ? '' : '<span class="lock">VIP</span>') + '</b><span>2160p · máxima nitidez</span></button></div>';
  }
  function edPanel() {
    if (S.edTab === 'color') return gradePanel();
    if (S.edTab === 'cortes') return cutsPanel();
    if (S.edTab === 'efeitos') return fxPanel();
    if (S.edTab === 'som') return soundPanel();
    var tl = timeline();
    var pc = !NATIVE ? '' : S.precise ? '<div class="pcard on">' + ICON.check(14) + '<span>Legenda no modo ultra preciso</span></div>' :
      '<button class="pcard" data-a="precise"><span class="col" style="gap:2px;text-align:left"><b>Legenda errando palavras?</b><span class="hint" id="dlp">' + (S.dl >= 0 ? 'Baixando… ' + S.dl + '%' : 'Ative o modo ultra preciso (baixa 190 MB uma vez, depois funciona sem internet)') + '</span></span><span class="pill">Ativar</span></button>';
    return pc + '<div id="selbox">' + selEditor(tl) + '</div><button class="toggle ' + (S.capsOn ? 'on' : '') + '" data-a="capstog" style="margin-top:12px"><span style="font-size:14px;font-weight:600">Mostrar legenda</span><span class="sw"><i></i></span></button>' +
      '<h2 style="margin:16px 0 10px">Estilo da legenda</h2><div id="stylebox">' + stylePanel() + '</div>';
  }
  function legenda() {
    var tl = timeline();
    var tabs = [['legenda', 'Legenda'], ['color', 'Cor'], ['efeitos', 'Efeitos'], ['cortes', 'Cortes'], ['som', 'Som']];
    return '<div class="edtop"><div class="plwrap" id="plwrap"><canvas class="gl"></canvas><canvas class="ov"></canvas></div>' +
      '<div class="plbar"><button class="plbtn" id="plbtn" data-a="pltoggle" aria-label="Tocar">' + ICON.play('#0A0A0B', 20) + '</button><span id="pltime">0,0s / ' + fmt1(tl.total) + '</span></div>' +
      '<div id="tlbox">' + tlHtml(tl) + '</div></div>' +
      '<div class="edtabs">' + tabs.map(function (t) { return '<button class="' + (S.edTab === t[0] ? 'on' : '') + '" data-a="edtab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div id="edpanel">' + edPanel() + '</div>';
  }
  function refreshTimeline() {
    var tl = timeline();
    var box = document.getElementById('tlbox');
    if (box) { box.innerHTML = tlHtml(tl); }
    var sb = document.getElementById('selbox'); if (sb) sb.innerHTML = selEditor(tl);
    if (PL) {
      var reload = tl.segs.some(function (g) { return !PL.vids[g.path]; });
      if (reload) { plCreate(document.getElementById('plwrap'), tl); return; }
      PL.tl = tl; PL.layers = TT.layout(S.model, titleCfg({})); fixPad(); bindScrub(); plSeek(Math.min(PL.t, tl.total - 0.01));
    }
  }
  function refreshPanel() { var p = document.getElementById('edpanel'); if (p) p.innerHTML = edPanel(); }
  function refreshStyle() { var b = document.getElementById('stylebox'); if (b) b.innerHTML = stylePanel(); if (PL) plDraw(true); }
  function refreshSfx() { var row = document.getElementById('sfxrow'); if (!row) { draw(true); return; } for (var i = 0; i < row.children.length; i++) { var c = row.children[i], on = c.getAttribute('data-a') === 'sfxon' ? !S.sfxOn : (S.sfxOn && c.getAttribute('data-v') === S.sfx); c.classList.toggle('on', on); } }

  function renderScreen() {
    var p = S.progress;
    return '<div class="rpv">' + (S.clip && S.clip.thumb ? '<img src="' + S.clip.thumb + '" alt="" style="opacity:.6">' : '') + titleCanvas(titleCfg({ end: 3.4 })) + '</div>' +
      '<div class="col center" style="gap:6px;margin-top:22px"><h1 style="font-size:22px">' + (p < 100 ? 'Editando… ' + p + '%' : 'Pronto!') + '</h1><p class="sub" style="margin:0">' + (NATIVE ? 'Gancho, título, legenda e som. Tudo no seu celular.' : 'Prévia: no app Android a edição é real.') + '</p></div>' +
      '<div class="rbar"><i style="width:' + p + '%"></i></div>' + (S.err ? '<div class="err">' + esc(S.err) + '</div><button class="btn sec" data-a="back-leg">Voltar e tentar de novo</button>' : '');
  }
  function shareButtons() { return '<button class="btn pri" data-a="save">' + ICON.down + 'Baixar na galeria</button><button class="btn sec" data-a="share">Compartilhar</button><button class="btn sec" data-a="insta">' + ICON.insta + 'Postar no Instagram</button>'; }
  function playerFor(pj) {
    if (pj && pj.path && NATIVE) return '<video class="out" src="' + CAP.convertFileSrc(pj.path) + '" poster="' + BLANK + '" controls autoplay loop playsinline></video>';
    return (pj && pj.thumb ? '<img src="' + pj.thumb + '" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover">' : media(model().media)) + titleCanvas(titleCfg({ end: 3.6 }));
  }
  function done() {
    var pj = S.viewing, tags = HASHTAGS.map(function (h) { return '<button class="tag pick ' + (S.tags.indexOf(h) >= 0 ? 'on' : '') + '" data-a="tag" data-v="' + h + '">' + h + '</button>'; }).join('');
    return '<div class="col center" style="gap:6px"><h1 style="font-size:26px">Seu vídeo está pronto<span style="color:' + ORANGE + '">.</span></h1><p class="sub" style="margin:0">Salvo no seu Perfil · ' + (S.quality === '4k' ? '4K' : 'Alta 1080p') + (pj && pj.durationMs ? ' · ' + fmt(pj.durationMs / 1000) : '') + '</p></div>' +
      '<div class="final" style="background:#111">' + playerFor(pj) + '</div>' + shareButtons() +
      '<div class="capbox"><label class="lbl" for="capin">Legenda do post (copiada ao postar)</label><textarea id="capin" class="field" rows="5">' + esc(S.caption) + '</textarea><div class="tags left">' + tags + '</div></div>' +
      '<button class="btn sec" data-a="profile">Ver todos no Perfil</button><button class="btn txt" data-a="restart">Criar outro vídeo</button>';
  }
  function profile() {
    var cards = S.projects.map(function (p, i) {
      return '<button class="pcard" data-a="openpj" data-v="' + i + '"><div class="pth">' + (p.thumb ? '<img src="' + p.thumb + '" alt="">' : '') + '<span>' + fmt((p.durationMs || 0) / 1000) + '</span>' + (p.quality === '4k' ? '<em>4K</em>' : '') + '</div><b>' + esc(p.title || 'Vídeo') + '</b><small>' + esc(p.modelName || '') + ' · ' + new Date(p.date).toLocaleDateString('pt-BR') + '</small></button>';
    }).join('');
    return '<div class="prof"><div class="pava">' + esc((S.brand || 'F').charAt(0).toUpperCase()) + '</div><div style="flex:1;min-width:0"><label class="lbl" for="br2">Sua marca</label><input id="br2" class="field" style="height:44px;padding:0 12px;margin-top:4px" value="' + esc(S.brand) + '" placeholder="Nome da sua marca"></div></div>' +
      '<div class="pstats"><div><b>' + S.projects.length + '</b><span>vídeos</span></div><div><b>' + (S.vip ? 'VIP' : 'Grátis') + '</b><span>plano</span></div><div><b>' + fmt(S.projects.reduce(function (a, p) { return a + (p.durationMs || 0); }, 0) / 1000) + '</b><span>editados</span></div></div>' +
      '<h1 style="font-size:22px;margin-top:20px">Seus projetos</h1>' + (cards ? '<div class="pgrid">' + cards + '</div>' : '<div class="empty"><p>Nenhum vídeo ainda.</p><button class="btn pri" data-a="restart">Criar meu primeiro vídeo</button></div>');
  }
  function projectView() {
    var p = S.viewing; if (!p) return '';
    return '<h1 style="font-size:22px">' + esc(p.title || 'Vídeo') + '</h1><p class="sub">' + esc(p.modelName || '') + ' · ' + (p.mode === 'dyn' ? 'Dinâmico' : 'Cinemático') + ' · ' + new Date(p.date).toLocaleString('pt-BR') + '</p>' +
      '<div class="final" style="background:#111">' + playerFor(p) + '</div>' + shareButtons() +
      '<button class="btn sec" data-a="reedit">Reeditar este projeto</button><button class="btn txt" data-a="delpj" style="color:#FCA5A5">Apagar projeto</button>';
  }

  /* ================= desenho geral ================= */
  var app = document.getElementById('app');
  function draw(keepScroll) {
    if (S.screen !== 'legenda') plDestroy();
    var full = { intro: intro, q1: q1, q2: q2, q3: q3, pitch: pitch, vip: vipScreen }[S.screen];
    if (full) { app.innerHTML = full(); afterDraw(); return; }
    var body = app.querySelector('.body'), y = body && keepScroll ? body.scrollTop : 0;
    var content = { models: models, dynmodels: dynModels, mpreview: mpreview, video: videoScreen, chips: chipsScreen, legenda: legenda, render: renderScreen, done: done, profile: profile, project: projectView }[S.screen]();
    var c = S.clip, listening = c && c.status === 'listening';
    var can = (S.screen === 'video' ? !!(c && c.status === 'ok') : S.screen === 'chips' ? !!(c && c.status === 'ok' && S.chips.length) : true);
    var label = { models: 'Ver prévia do modelo', dynmodels: 'Usar este modelo dinâmico', mpreview: S.vip || !model().vip ? 'Usar este título' : 'Liberar com VIP', video: listening ? 'Ouvindo…' : (c ? 'Editar legenda' : 'Envie seu vídeo'), chips: listening ? 'Ouvindo…' : (!S.chips.length ? 'Adicione chips' : (c ? 'Editar legenda' : 'Envie o vídeo falado')), legenda: 'Gerar vídeo em ' + (S.quality === '4k' ? '4K' : 'Alta') }[S.screen];
    app.innerHTML = header() + '<main class="body' + (S.screen === 'legenda' ? ' edbody' : '') + '">' + content + '</main>' + (label ? '<div class="foot"><button class="cta" data-a="next"' + (can ? '' : ' disabled') + '>' + label + ICON.arrow + '</button></div>' : '');
    app.querySelector('.body').scrollTop = y;
    afterDraw();
    if (S.screen === 'legenda') { var w = document.getElementById('plwrap'); if (w) setTimeout(function () { if (S.screen === 'legenda') plCreate(w, timeline()); }, 30); }
    if (S.screen === 'mpreview') bindDrag();
    if (S.screen === 'dynmodels') startRhythm();
  }
  function afterDraw() { window.__fluxReady = 1; requestAnimationFrame(bindCanvases); }
  function go(s) { S.screen = s; draw(false); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2800); }

  /* ritmo de prévia nos modelos dinâmicos: muda a velocidade do vídeo como o modelo faz */
  var rhythmT;
  function startRhythm() {
    clearInterval(rhythmT); var step = 0;
    rhythmT = setInterval(function () {
      if (S.screen !== 'dynmodels') { clearInterval(rhythmT); return; }
      var vs = app.querySelectorAll('video[data-rhythm]');
      for (var i = 0; i < vs.length; i++) {
        var pat = vs[i].getAttribute('data-rhythm').split(','), k = pat[step % pat.length];
        if (k === 'freeze') vs[i].pause(); else { vs[i].playbackRate = PIECE[k].speed; safe(vs[i].play()); }
        var bars = vs[i].parentNode.querySelectorAll('.rhythm i'); for (var j = 0; j < bars.length; j++) bars[j].classList.toggle('now', j === step % pat.length);
      }
      step++;
    }, 900);
  }

  /* arrastar o título na prévia */
  function bindDrag() {
    var el = document.getElementById('dragpv'); if (!el) return;
    var st = null;
    el.addEventListener('pointerdown', function (e) { if (!S.moveMode) return; st = { x: e.clientX, y: e.clientY, ox: S.tf.ox, oy: S.tf.oy, k: TT.W / el.clientWidth }; try { el.setPointerCapture(e.pointerId); } catch (er) {} el.classList.add('dragging'); });
    el.addEventListener('pointermove', function (e) { if (!st) return; S.tf.ox = Math.max(-500, Math.min(500, st.ox + (e.clientX - st.x) * st.k)); S.tf.oy = Math.max(-900, Math.min(900, st.oy + (e.clientY - st.y) * st.k)); });
    var end = function () { st = null; el.classList.remove('dragging'); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  /* apresentação: todos os vídeos já ficam carregados (sem quadro cinza entre eles) */
  var pitchTimer, pitchStart;
  function showPitch(i) {
    S.pitchI = i; pitchStart = Date.now();
    var st = app.querySelectorAll('.pstage');
    for (var k = 0; k < st.length; k++) { var on = +st[k].getAttribute('data-i') === i, v = st[k].querySelector('video'); st[k].classList.toggle('on', on); if (v) { if (on) { try { v.currentTime = 0; } catch (e) {} safe(v.play()); } } }
    var p = PITCH[i], cv = app.querySelector('.stage canvas[data-title]');
    if (cv) { cv.setAttribute('data-title', JSON.stringify({ m: p.m, title: p.title, sub: p.sub, brand: 'Flux Cine', end: 4.6, hold: 9, tf: { ox: 0, oy: 0, s: 1 } })); bindCanvases(); }
    var d = document.getElementById('pdesc'); if (d) { d.innerHTML = '<b>' + p.k + '</b>' + p.d; d.style.animation = 'none'; void d.offsetWidth; d.style.animation = ''; }
    var bs = app.querySelectorAll('.bars b'); for (var j = 0; j < bs.length; j++) { bs[j].style.width = j < i ? '100%' : '0%'; bs[j].classList.toggle('run', j === i); }
  }
  function startPitch() {
    clearInterval(pitchTimer); pitchStart = Date.now();
    pitchTimer = setInterval(function () {
      if (S.screen !== 'pitch') { clearInterval(pitchTimer); return; }
      var el = app.querySelector('.bars b.run'), f = Math.min(1, (Date.now() - pitchStart) / 5200);
      if (el) el.style.width = (f * 100) + '%';
      if (f >= 1) showPitch((S.pitchI + 1) % PITCH.length);
    }, 60);
  }

  /* ================= escolher e ouvir vídeos ================= */
  function setListenProgress(p) { var el = app.querySelector('.listen .bar i'), tx = app.querySelector('.listen .row span'); if (el) el.style.width = Math.round(p * 100) + '%'; if (tx) tx.textContent = 'Ouvindo a fala e procurando o gancho… ' + Math.round(p * 100) + '%'; }
  function listen() {
    var c = S.clip; c.status = 'listening'; c.p = 0; S.title = ''; draw(true);
    var finish = function (words) {
      if (S.clip !== c) return;
      c.words = words; c.status = 'ok'; analyze(c);
      draw(true);
    };
    if (!NATIVE) {
      var p = 0, h = setInterval(function () {
        p += 0.12; c.p = Math.min(1, p); setListenProgress(c.p);
        if (p >= 1) {
          clearInterval(h);
          var demo = [['oi gente tudo bem', 0.5], ['você sabia que três erros fazem', 2.6], ['você sabia que três erros fazem você perder clientes todos os dias', 5.2], ['hoje eu vou te mostrar quais são esses erros e como resolver cada um deles', 9.6], ['o primeiro é não responder rápido no whatsapp', 14.6], ['então presta atenção e começa hoje mesmo', 18.4]];
          var ws = []; demo.forEach(function (d) { var t = d[1]; d[0].split(' ').forEach(function (w) { ws.push({ w: w, s: t, e: t + 0.28, c: 0.9 }); t += 0.36; }); });
          if (!c.durationMs) c.durationMs = 22000;
          finish(ws);
        }
      }, 100);
      return;
    }
    FE.transcribe({ path: c.path, id: 'v' }).then(function (r) { finish(r.words || []); })
      .catch(function (e) { c.status = 'error'; c.err = 'Não consegui ouvir o vídeo: ' + ((e && e.message) || ''); draw(true); });
  }
  if (NATIVE) {
    S.precise = false; S.dl = -1;
    setTimeout(function () { safe(FE.warmup()); }, 1500);
    safe(FE.modelInfo().then(function (r) { S.precise = !!(r && r.precise); }));
    safe(FE.addListener('modelProgress', function (d) { S.dl = Math.round((d.p || 0) * 100); var e = document.getElementById('dlp'); if (e) e.textContent = 'Baixando… ' + S.dl + '%'; }));
    safe(FE.addListener('transcribeProgress', function (d) { var c = S.clip; if (c && c.status === 'listening') { c.p = d.p; setListenProgress(d.p); } }));
    safe(FE.addListener('renderProgress', function (d) {
      if (S.screen !== 'render') return;
      S.progress = Math.max(S.progress, Math.min(99, Math.round(d.p)));
      var h = app.querySelector('.body h1'), b = app.querySelector('.rbar i'); if (h) h.textContent = 'Editando… ' + S.progress + '%'; if (b) b.style.width = S.progress + '%';
    }));
  }
  var fileIn = document.getElementById('file'), pickFor = 'clip';
  fileIn.addEventListener('change', function () {
    var f = fileIn.files && fileIn.files[0]; if (!f) return;
    var url = URL.createObjectURL(f), item = { name: f.name, path: url, durationMs: 0 };
    var v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.src = url;
    v.onloadedmetadata = function () { if (isFinite(v.duration)) item.durationMs = Math.round(v.duration * 1000); };
    if (pickFor === 'chip') { item.durationMs = 4000; S.chips.push(item); draw(true); } else { S.clip = item; listen(); }
    fileIn.value = '';
  });
  function pick(kind) {
    pickFor = kind;
    if (!NATIVE) { fileIn.click(); return; }
    FE.pickVideo().then(function (r) {
      var item = { path: r.path, name: r.name, durationMs: r.durationMs, thumb: r.thumb };
      if (kind === 'chip') { S.chips.push(item); draw(true); } else { S.clip = item; listen(); }
    }).catch(function (e) { if (e && e.code !== 'CANCELLED') toast((e && e.message) || 'Não consegui abrir o vídeo'); });
  }

  /* ================= gerar e salvar no perfil ================= */
  function snapshot() { return clone({ fx: S.fx, grade: S.grade, trimFillers: S.trimFillers, jumpZoom: S.jumpZoom, mode: S.mode, model: S.model, dyn: S.dyn, title: S.title, sub: S.sub, tf: S.tf, cs: S.cs, capsOn: S.capsOn, sfxOn: S.sfxOn, sfx: S.sfx, cta: S.cta, quality: S.quality, autoCut: S.autoCut, clip: S.clip, chips: S.chips }); }
  function saveProjects() { try { store('flux_projects', JSON.stringify(S.projects.slice(0, 60))); } catch (e) { S.projects = S.projects.slice(0, 20); store('flux_projects', JSON.stringify(S.projects)); } }
  function addProject(out) {
    var pj = { id: Date.now(), date: Date.now(), path: out.path, thumb: out.thumb || (S.clip && S.clip.thumb) || '', durationMs: out.durationMs || Math.round(timeline().total * 1000), title: autoTitle(), modelName: S.mode === 'dyn' ? find(DYN, S.dyn).name + ' + ' + model().name : model().name, mode: S.mode, quality: S.quality, snap: snapshot() };
    S.projects.unshift(pj); saveProjects(); S.viewing = pj;
  }
  var simTimer;
  function generate() {
    if (S.quality === '4k' && !S.vip) { S.returnTo = 'legenda'; go('vip'); return; }
    var tl = timeline();
    S.progress = 0; S.err = ''; go('render');
    if (!NATIVE) {
      clearInterval(simTimer);
      simTimer = setInterval(function () {
        S.progress = Math.min(100, S.progress + 4);
        var h = app.querySelector('.body h1'), b = app.querySelector('.rbar i'); if (h) h.textContent = 'Editando… ' + S.progress + '%'; if (b) b.style.width = S.progress + '%';
        if (S.progress >= 100) { clearInterval(simTimer); S.caption = buildCaption(); addProject({ path: '', durationMs: Math.round(tl.total * 1000) }); setTimeout(function () { go('done'); }, 300); }
      }, 90);
      return;
    }
    var cs = capStyle();
    var spec = {
      segments: tl.segs.map(function (g) { var s0 = Math.round(g.srcS * 1000); return { path: g.path, startMs: s0, endMs: Math.max(s0 + 40, Math.round(g.srcE * 1000)), speed: g.speed, removeAudio: g.removeAudio, zoom: g.zoom || 1 }; }),
      grade: (function () { var o = FluxGrade.params(S.grade), fc = FluxGrade.fxCode(S.fx.fx), tr = S.fx.trans; if (FluxGrade.isOff(o) && !fc && (tr === 'none' || tr === 'flash')) return null; o.fx = fc; o.fxAmt = S.fx.amt; return o; })(),
      transition: S.fx.trans,
      transCodes: tl.boundaries.map(function (b, i) { return FluxGrade.transCode(S.fx.trans, i); }),
      boundaries: tl.boundaries, finalStart: tl.finalStart, titleEnd: tl.titleEnd,
      captions: S.capsOn ? tl.captions.map(function (c) { return { s: c.s, e: c.e, words: c.words.map(function (w) { return { w: w.w, s: w.s, e: w.e }; }) }; }) : [],
      titleLayout: TT.layout(S.model, titleCfg({})), titleTf: S.tf,
      captionStyle: { fontFile: cs.font + '.ttf', upper: !!cs.upper, size: cs.size, ls: cs.ls, shadow: cs.shadow, hl: cs.hl, anim: cs.anim, y: cs.y, color: cs.color, accent: cs.accent },
      fontFile: cs.font + '.ttf', upper: !!cs.upper, accent: cs.accent, hlMode: cs.hl,
      cta: S.cta, ending: S.cta ? 'cut' : 'fade', sfx: S.sfxOn ? S.sfx : 'none', quality: S.quality
    };
    FE.render(spec).then(function (r) { S.progress = 100; S.caption = buildCaption(); addProject(r); go('done'); })
      .catch(function (e) { S.err = (e && e.message) || 'Falha ao montar o vídeo'; draw(true); });
  }
  function reedit(p) {
    var s = clone(p.snap || {});
    ['fx', 'grade', 'trimFillers', 'jumpZoom', 'mode', 'model', 'dyn', 'title', 'sub', 'tf', 'cs', 'capsOn', 'sfxOn', 'sfx', 'cta', 'quality', 'autoCut', 'clip', 'chips'].forEach(function (k) { if (s[k] !== undefined) S[k] = s[k]; });
    if (S.clip && !S.clip.ana) analyze(S.clip);
    S.selCap = -1; go('legenda');
  }

  /* ================= cliques ================= */
  function back() {
    var map = { video: 'mpreview', chips: 'dynmodels', legenda: S.mode === 'dyn' ? 'chips' : 'video', mpreview: S.mode === 'dyn' ? 'chips' : 'models', profile: S.prevScreen || 'models', project: 'profile', done: 'models', vip: S.returnTo || 'models', q2: 'q1', q3: 'q2', pitch: 'q3', dynmodels: 'models' };
    var b = map[S.screen]; if (b) go(b); return !!b;
  }
  function markChips(btn) { var row = btn.parentNode; for (var i = 0; i < row.children.length; i++) row.children[i].classList.toggle('on', row.children[i] === btn); }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-a'), v = b.getAttribute('data-v');
    if (a === 'q1') { S.q1 = v; draw(); setTimeout(function () { go('q2'); }, 220); }
    else if (a === 'q2') { S.style = v; S.model = v === 'simples' ? 'minimal-1' : 'paraiso-1'; if (v === 'simples') { S.sfxOn = false; S.cs.anim = 'fade'; S.grade = { id: 'none', amount: 0, grain: 0, vignette: 0, bars: false }; S.fx = { trans: 'none', fx: 'none', amt: 0.7 }; } draw(); setTimeout(function () { go('q3'); }, 220); }
    else if (a === 'q3') { S.pitchI = 0; go('pitch'); startPitch(); }
    else if (a === 'pnext') showPitch((S.pitchI + 1) % PITCH.length);
    else if (a === 'vip') { S.returnTo = S.screen === 'pitch' ? 'models' : S.screen; store('flux_onboarded', '1'); plDestroy(); go('vip'); }
    else if (a === 'free') { store('flux_onboarded', '1'); go('models'); }
    else if (a === 'vipon') { S.vip = true; store('flux_vip', '1'); toast('VIP de teste ativado'); go(S.returnTo || 'models'); }
    else if (a === 'vipoff') { S.vip = false; store('flux_vip', '0'); if (S.quality === '4k') S.quality = 'hd'; draw(); }
    else if (a === 'vipback') go(S.returnTo || 'models');
    else if (a === 'replay') { S.pitchI = 0; go('pitch'); startPitch(); }
    else if (a === 'profile') { if (S.screen !== 'profile' && S.screen !== 'project') S.prevScreen = S.screen; go('profile'); }
    else if (a === 'openpj') { S.viewing = S.projects[+v]; go('project'); }
    else if (a === 'delpj') { var i = S.projects.indexOf(S.viewing); if (i >= 0) { var pth = S.viewing.path; S.projects.splice(i, 1); saveProjects(); if (NATIVE && pth) safe(FE.deleteFile({ path: pth })); } toast('Projeto apagado'); go('profile'); }
    else if (a === 'reedit') reedit(S.viewing);
    else if (a === 'mode') { S.mode = v; if (v === 'dyn') { S.model = find(DYN, S.dyn).model; go('dynmodels'); } else go('models'); }
    else if (a === 'mfilter') { S.filter = v; draw(true); }
    else if (a === 'model') { S.model = v; S.tf = { ox: 0, oy: 0, s: 1 }; S.moveMode = false; go('mpreview'); }
    else if (a === 'dyn') { S.dyn = v; S.model = find(DYN, v).model; draw(true); }
    else if (a === 'tfreset') { S.tf = { ox: 0, oy: 0, s: 1 }; var r = document.getElementById('tsize'); if (r) r.value = 100; var rv = document.getElementById('tsizev'); if (rv) rv.textContent = '100%'; }
    else if (a === 'gompv') { S.moveMode = false; go('mpreview'); }
    else if (a === 'movemode') { S.moveMode = true; draw(true); }
    else if (a === 'movedone') { S.moveMode = false; draw(true); toast('Posição do título salva'); }
    else if (a === 'back') back();
    else if (a === 'back-leg') go('legenda');
    else if (a === 'next') {
      if (S.screen === 'models') go('mpreview');
      else if (S.screen === 'dynmodels') go('chips');
      else if (S.screen === 'mpreview') { S.moveMode = false; if (model().vip && !S.vip) { S.returnTo = 'mpreview'; go('vip'); return; } go(S.mode === 'dyn' ? 'chips' : 'video'); }
      else if (S.screen === 'video' || S.screen === 'chips') { S.selCap = -1; go('legenda'); }
      else if (S.screen === 'legenda') { plDestroy(); generate(); }
    }
    else if (a === 'pick') pick('clip');
    else if (a === 'addchip') pick('chip');
    else if (a === 'rmchip') { S.chips.splice(+v, 1); draw(true); }
    else if (a === 'sethook') { S.clip.ana.hook = +v; S.clip.ana.asked = true; S.title = ''; draw(true); }
    else if (a === 'phr') { var k = +v; if (k !== S.clip.ana.hook) { S.clip.ana.phrases[k].inc = !S.clip.ana.phrases[k].inc; draw(true); var dd = app.querySelector('details.phrs'); if (dd) dd.open = true; } }
    else if (a === 'autocut') { S.autoCut = !S.autoCut; if (S.screen === 'legenda') { b.classList.toggle('on', S.autoCut); refreshTimeline(); refreshPanel(); } else draw(true); }
    else if (a === 'capson') { S.capsOn = v === '1'; draw(true); }
    else if (a === 'sfxon') { S.sfxOn = v === '1'; refreshSfx(); }
    else if (a === 'sfx') { S.sfx = v; S.sfxOn = true; refreshSfx(); }
    else if (a === 'cta') { S.cta = v; var ci = document.getElementById('ctain'); if (ci) ci.value = v; markChips(b); }
    else if (a === 'qual') { if (v === '4k' && !S.vip) { S.returnTo = 'legenda'; plDestroy(); go('vip'); return; } S.quality = v; markChips(b); var cta = app.querySelector('.cta'); if (cta) cta.firstChild.nodeValue = 'Gerar vídeo em ' + (v === '4k' ? '4K' : 'Alta'); }
    else if (a === 'pltoggle') plToggle();
    else if (a === 'precise') {
      if (S.dl >= 0) return;
      S.dl = 0; refreshPanel();
      FE.downloadModel().then(function () { S.dl = -1; S.precise = true; toast('Modo preciso ativo. Ouvindo de novo…'); if (S.clip) { S.clip.status = 'listening'; S.clip.p = 0; } go('video'); listen(); })
        .catch(function (e) { S.dl = -1; refreshPanel(); toast((e && e.message) || 'Sem internet para baixar agora'); });
    }
    else if (a === 'ftrans') { S.fx.trans = v; refreshPanel(); if (PL) { var tb3 = PL.tl.boundaries; if (tb3.length) plSeek(Math.max(0, tb3[0] - 0.1)); } }
    else if (a === 'ffx') { S.fx.fx = v; refreshPanel(); if (PL) plDraw(true); }
    else if (a === 'cpreset') { var pr = find(CAP_PRESETS, v); if (pr) { S.capPreset = v; for (var ck in pr.cs) S.cs[ck] = pr.cs[ck]; refreshStyle(); } }
    else if (a === 'edtab') { S.edTab = v; var tb = b.parentNode.children; for (var q = 0; q < tb.length; q++) tb[q].classList.toggle('on', tb[q] === b); refreshPanel(); }
    else if (a === 'grade') { S.grade.id = v; if (v !== 'none' && !S.grade.amount) S.grade.amount = 0.8; refreshPanel(); if (PL) { PL.grade = FluxGrade.params(S.grade); plDraw(true); } }
    else if (a === 'gbars') { S.grade.bars = !S.grade.bars; b.classList.toggle('on', S.grade.bars); if (PL) { PL.grade = FluxGrade.params(S.grade); plDraw(true); } }
    else if (a === 'trim') { S.trimFillers = !S.trimFillers; b.classList.toggle('on', S.trimFillers); refreshTimeline(); refreshPanel(); }
    else if (a === 'jumpzoom') { S.jumpZoom = !S.jumpZoom; b.classList.toggle('on', S.jumpZoom); refreshTimeline(); }
    else if (a === 'capok') { var ce = document.getElementById('capedit'), cpk = timeline().captions[S.selCap]; if (ce && cpk) { editCaption(cpk, ce.value); refreshTimeline(); toast('Legenda corrigida'); } }
    else if (a === 'capstog') { S.capsOn = !S.capsOn; b.classList.toggle('on', S.capsOn); refreshTimeline(); }
    else if (a === 'back' && S.screen === 'legenda') { back(); }
    else if (a === 'selcap') { S.selCap = +v; var cp = timeline().captions[S.selCap]; var bs = app.querySelectorAll('.tblk.sel'); for (var q2 = 0; q2 < bs.length; q2++) bs[q2].classList.remove('sel'); b.classList.add('sel'); var sb = document.getElementById('selbox'); if (sb) sb.innerHTML = selEditor(timeline()); if (S.edTab !== 'legenda') { S.edTab = 'legenda'; var tb2 = app.querySelectorAll('[data-a=edtab]'); for (var q3 = 0; q3 < tb2.length; q3++) tb2[q3].classList.toggle('on', tb2[q3].getAttribute('data-v') === 'legenda'); refreshPanel(); } if (cp && PL) { if (PL.playing) plToggle(); plSeek(cp.s + 0.02); } }
    else if (a === 'delcap') { var cp2 = timeline().captions[S.selCap]; if (cp2) { editCaption(cp2, ''); S.selCap = -1; refreshTimeline(); } }
    else if (a === 'stab') { S.styleTab = v; refreshStyle(); }
    else if (a === 'cfont') { S.cs.font = v; S.cs.upper = !!find(CAP_FONTS, v).upper; refreshStyle(); }
    else if (a === 'cupper') { S.cs.upper = !S.cs.upper; refreshStyle(); }
    else if (a === 'cset') { S.cs[b.getAttribute('data-k')] = v; refreshStyle(); }
    else if (a === 'tag') { var ti = S.tags.indexOf(v); if (ti >= 0) S.tags.splice(ti, 1); else S.tags.push(v); S.caption = S.caption.replace(/(\n\n)?(#[^\s#]+\s?)+$/, '').trim() + '\n\n' + S.tags.join(' '); draw(true); }
    else if (a === 'insta' || a === 'share') {
      var pj = S.viewing;
      if (!NATIVE || !pj || !pj.path) { toast('No app Android, isso compartilha o vídeo pronto.'); return; }
      (a === 'insta' ? FE.shareInstagram : FE.share).call(FE, { path: pj.path, caption: S.caption || pj.title }).then(function (r) { if (a === 'insta') toast(r && r.instagram ? 'Legenda copiada! Escolha Reels e cole.' : 'Instagram não encontrado — escolha um app.'); }).catch(function (err) { toast((err && err.message) || 'Não consegui compartilhar'); });
    }
    else if (a === 'save') {
      var pj2 = S.viewing;
      if (!NATIVE || !pj2 || !pj2.path) { toast('No app Android, o vídeo vai para a galeria.'); return; }
      FE.saveToGallery({ path: pj2.path }).then(function () { toast('Salvo em Galeria › FLUX CINE'); }).catch(function (err) { toast((err && err.message) || 'Não consegui salvar'); });
    }
    else if (a === 'restart') { S.clip = null; S.chips = []; S.title = ''; S.sub = ''; S.tf = { ox: 0, oy: 0, s: 1 }; S.viewing = null; S.progress = 0; go(S.mode === 'dyn' ? 'dynmodels' : 'models'); }
  });
  var redrawT;
  app.addEventListener('input', function (e) {
    var id = e.target.id, ds = e.target.getAttribute && e.target.getAttribute('data-cs');
    if (id === 'ti' || id === 'su' || id === 'br' || id === 'br2') {
      if (id === 'ti') S.title = e.target.value;
      if (id === 'su') S.sub = e.target.value;
      if (id === 'br' || id === 'br2') { S.brand = e.target.value; store('flux_brand', S.brand); }
      clearTimeout(redrawT); redrawT = setTimeout(function () { var cv = app.querySelectorAll('canvas[data-title]'); for (var i = 0; i < cv.length; i++) { var cfg = JSON.parse(cv[i].getAttribute('data-title')); if (cfg.m === S.model && !cfg.lazy) { cfg.title = autoTitle(); cfg.sub = S.sub; cfg.brand = S.brand || 'FLUX CINE'; cv[i].setAttribute('data-title', JSON.stringify(cfg)); } } bindCanvases(); }, 220);
    }
    if (id === 'tsize') { S.tf.s = (+e.target.value) / 100; var rv = document.getElementById('tsizev'); if (rv) rv.textContent = e.target.value + '%'; }
    if (ds) { S.cs[ds] = (+e.target.value) / 100; var lb = e.target.nextElementSibling; if (lb) lb.textContent = e.target.value + (ds === 'ls' ? '' : '%'); if (PL) plDraw(); }
    if (e.target.getAttribute && e.target.getAttribute('data-fx')) { S.fx.amt = (+e.target.value) / 100; var fl = e.target.nextElementSibling; if (fl) fl.textContent = e.target.value + '%'; if (PL) plDraw(true); }
    var gk = e.target.getAttribute && e.target.getAttribute('data-gr');
    if (gk) { S.grade[gk] = (+e.target.value) / 100; var gl2 = e.target.nextElementSibling; if (gl2) gl2.textContent = e.target.value + '%'; if (PL) { PL.grade = FluxGrade.params(S.grade); plDraw(true); } }
    if (id === 'ctain') S.cta = e.target.value;
    if (id === 'capin') S.caption = e.target.value;
  });
  app.addEventListener('change', function (e) {
    if (e.target.id === 'capedit') { var cp = timeline().captions[S.selCap]; if (cp) { editCaption(cp, e.target.value); refreshTimeline(); } }
  });
  window.addEventListener('resize', function () { if (PL) { fixPad(); plDraw(); } });

  if (APP) safe(APP.addListener('backButton', function () { if (!back() && (S.screen === 'models' || S.screen === 'q1')) APP.exitApp(); }));

  /* ================= abertura ================= */
  draw(false);
  var fontsReady = TT.loadFonts();
  setTimeout(function () {
    fontsReady.then(function () {
      var el = document.getElementById('introEl'); if (el) el.classList.add('out');
      setTimeout(function () { go(store('flux_onboarded') === '1' ? 'models' : 'q1'); }, 420);
    });
  }, 2100);
  window.__flux = S;
})();
