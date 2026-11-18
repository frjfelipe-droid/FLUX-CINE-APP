/* FLUX CINE — telas do app (fluxo: modelo → vídeos → estilo → pronto) */
(function () {
  var TEMPLATES = [
    { id: 'pulse', name: 'Pulso Viral', cat: 'Reels', vibe: 'cortes rápidos', dur: '0:20', bg: '#0F1A06', accent: '#D4FF3A', font: 'Unbounded', w: 800, size: 15, pre: '3 erros que te fazem ', hl: 'perder', post: ' clientes', mode: 'box' },
    { id: 'hook', name: 'Gancho Hollywood', cat: 'Reels', vibe: 'abertura de impacto', dur: '0:30', bg: '#1C1305', accent: '#FFB020', font: 'Anton', w: 400, size: 21, upper: 1, pre: 'Isso mudou ', hl: 'tudo', post: '', mode: 'box', lb: 1 },
    { id: 'trailer', name: 'Trailer Épico', cat: 'Anúncio', vibe: 'lançamento', dur: '0:30', bg: '#1A0909', accent: '#FF4D4D', font: 'Bebas Neue', w: 400, size: 26, upper: 1, pre: 'Em breve', hl: '.', post: '', mode: 'color', lb: 1 },
    { id: 'noir', name: 'Neon Noir', cat: 'Anúncio', vibe: 'noturno e elegante', dur: '0:15', bg: '#0A0E1E', accent: '#5AA9FF', font: 'Space Grotesk', w: 700, size: 16, pre: 'A noite é ', hl: 'sua', post: '', mode: 'underline' },
    { id: 'golden', name: 'Hora Dourada', cat: 'Institucional', vibe: 'história da marca', dur: '0:60', bg: '#24140A', accent: '#FF9A4D', font: 'Playfair Display', w: 600, size: 18, italic: 1, pre: 'Feito à mão ', hl: 'desde 2009', post: '', mode: 'color' },
    { id: 'doc', name: 'Modo Documentário', cat: 'Institucional', vibe: 'bastidores reais', dur: '0:45', bg: '#141414', accent: '#F4F4F5', font: 'Inter', w: 600, size: 14, pre: 'Por trás de cada ', hl: 'peça', post: '', mode: 'underline', lb: 1 }
  ];
  var FILTERS = ['Todos', 'Reels', 'Anúncio', 'Institucional'];
  var FONTS = [
    { id: 'Unbounded', label: 'Unbounded', w: 800 }, { id: 'Anton', label: 'Anton', w: 400, upper: 1 },
    { id: 'Bebas Neue', label: 'Bebas', w: 400, upper: 1 }, { id: 'Playfair Display', label: 'Playfair', w: 600, italic: 1 },
    { id: 'Space Grotesk', label: 'Grotesk', w: 700 }, { id: 'Caveat', label: 'Caveat', w: 700 }
  ];
  var CTAS = ['Chama no WhatsApp', 'Link na bio', 'Agende sua visita', 'Compre agora'];
  var ENDINGS = [
    { id: 'logo', title: 'Logo + CTA', desc: 'Sua marca com o botão de ação' },
    { id: 'fade', title: 'Fade cinema', desc: 'Escurece com sua assinatura' },
    { id: 'zoom', title: 'Zoom out', desc: 'Afasta e revela o produto' },
    { id: 'cut', title: 'Corte seco', desc: 'Termina no auge do impacto' }
  ];
  var SFX = [
    { id: 'whoosh', name: 'Whoosh', desc: 'Transição rápida', bars: [6, 10, 16, 20, 14, 9, 6, 4, 3] },
    { id: 'impact', name: 'Impacto Cinema', desc: 'Batida grave de trailer', bars: [20, 22, 18, 12, 9, 7, 5, 4, 3] },
    { id: 'riser', name: 'Riser', desc: 'Tensão que sobe', bars: [3, 4, 6, 8, 10, 13, 16, 19, 22] },
    { id: 'glitch', name: 'Glitch', desc: 'Estalo digital', bars: [14, 4, 18, 6, 20, 3, 12, 5, 16] },
    { id: 'pop', name: 'Pop Viral', desc: 'Clique de destaque', bars: [4, 8, 20, 8, 4, 3, 3, 3, 3] },
    { id: 'none', name: 'Sem efeito', desc: 'Só a sua voz', bars: [3, 3, 3, 3, 3, 3, 3, 3, 3] }
  ];
  var RSTEPS = [[25, 'Unindo seus 2 vídeos'], [55, 'Gerando legenda animada'], [80, 'Mixando o efeito sonoro'], [100, 'Aplicando abertura e final']];
  var ORDER = { gallery: 0, upload: 1, style: 2, render: 3, done: 3 };

  var S = { screen: 'gallery', filter: 'Todos', tpl: 'hook', v1: null, v2: null, text: '', font: 'Unbounded', cta: '', ending: 'logo', sfx: 'impact', playing: null, progress: 0 };

  var ICON = {
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4F4F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    play: function (c, s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + c + '" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>'; },
    pause: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#0A0A0B" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    check: function (s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; },
    up: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF7A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>'
  };

  function find(l, id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return l[0]; }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fontCss(f, size) {
    return "font-family:'" + (f.font || f.id) + "';font-weight:" + f.w + ';font-size:' + size + 'px;text-transform:' + (f.upper ? 'uppercase' : 'none') + ';font-style:' + (f.italic ? 'italic' : 'normal') + ';letter-spacing:' + (f.upper ? '.02em' : '-.01em');
  }
  function hlCss(t) {
    if (t.mode === 'box') return 'background:' + t.accent + ';color:#0A0A0B;padding:0 5px;border-radius:4px;text-shadow:none';
    if (t.mode === 'underline') return 'color:' + t.accent + ';text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:4px';
    return 'color:' + t.accent;
  }

  /* ---------- sons (sintetizados no aparelho) ---------- */
  var actx;
  function sound(id) {
    if (id === 'none') return;
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
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
      '<div class="badge"><span class="rec"></span>Pronto em até 5 min</div></div><div class="steps">' + steps + '</div></div>';
  }

  function gallery() {
    var chips = FILTERS.map(function (f) { return '<button class="chip ' + (S.filter === f ? 'on' : '') + '" data-a="filter" data-v="' + f + '">' + f + '</button>'; }).join('');
    var cards = TEMPLATES.filter(function (t) { return S.filter === 'Todos' || t.cat === S.filter; }).map(function (t) {
      var sel = t.id === S.tpl;
      return '<button class="card ' + (sel ? 'sel' : '') + '" data-a="tpl" data-v="' + t.id + '" aria-pressed="' + sel + '">' +
        '<div class="thumb" style="background:' + t.bg + '"><div class="spot" style="background:' + t.accent + '"></div>' +
        (t.lb ? '<div class="lb t"></div><div class="lb b"></div>' : '') +
        '<div class="dur">' + t.dur + '</div><div class="play">' + ICON.play('#fff', 14) + '</div>' +
        '<div class="cap" style="' + fontCss(t, t.size) + (t.lb ? ';bottom:34px' : '') + '">' + t.pre + '<span style="' + hlCss(t) + '">' + t.hl + '</span>' + t.post + '</div>' +
        (sel ? '<div class="check">' + ICON.check(14) + '</div>' : '') + '</div>' +
        '<span class="cname">' + t.name + '</span><span class="cmeta">' + t.cat + ' · ' + t.vibe + '</span></button>';
    }).join('');
    return '<h1>Escolha o estilo do seu próximo vídeo</h1><p class="sub">Modelos cinematográficos com legenda animada. Toque para escolher.</p>' +
      '<div class="chips">' + chips + '</div><div class="grid">' + cards + '</div>';
  }

  function slot(key, kick, title) {
    var v = S[key], tpl = find(TEMPLATES, S.tpl);
    return '<button class="slot ' + (v ? 'done' : '') + '" data-a="pick" data-v="' + key + '">' +
      '<div class="sthumb" style="' + (v ? 'background:' + tpl.bg : '') + '">' + (v ? '<video src="' + v.url + '#t=0.5" muted playsinline preload="metadata"></video>' : ICON.up) + '</div>' +
      '<div class="col" style="flex:1;min-width:0;gap:4px"><span class="kick">' + kick + '</span><span class="stitle">' + title + '</span>' +
      '<span class="ssub">' + (v ? esc(v.name) : 'Toque para enviar da galeria') + '</span></div>' +
      (v ? '<div class="ok">' + ICON.check(15) + '</div>' : '') + '</button>';
  }
  function upload() {
    return '<span class="pill">Modelo: <b>' + find(TEMPLATES, S.tpl).name + '</b></span><h1>Envie seus 2 vídeos</h1>' +
      '<p class="sub">Grave no celular, na vertical. A gente corta, junta e coloca legenda.</p>' +
      slot('v1', 'Vídeo 1', 'Abertura / gancho') + slot('v2', 'Vídeo 2', 'Conteúdo principal') +
      '<div class="col" style="gap:8px;margin-top:18px"><label class="lbl" for="txt">O que deve aparecer escrito no vídeo?</label>' +
      '<textarea id="txt" class="field" rows="3" placeholder="Ex.: 3 erros que te fazem perder clientes">' + esc(S.text) + '</textarea>' +
      '<span class="hint">Frase curta funciona melhor. A legenda da sua fala é gerada sozinha.</span></div>';
  }

  function capText() { return esc(S.text || 'Seu texto aparece aqui'); }
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
    return '<h1>Deixe com a sua cara</h1>' +
      '<div class="preview" style="background:' + tpl.bg + ';margin-top:24px"><div class="spot" style="background:' + tpl.accent + '"></div><span class="pcap" id="pcap" style="' + fontCss(f, f.upper ? 30 : 22) + '">' + capText() + '</span></div>' +
      '<section><h2>Fonte da legenda</h2><div class="fonts">' + fonts + '</div></section>' +
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
    return '<div class="ring" style="background:conic-gradient(#FF7A1A ' + (p * 3.6) + 'deg,#1C1C1F 0deg)"><div><b>' + p + '%</b><span>editando…</span></div></div>' +
      '<div class="col center" style="gap:6px;margin:28px 0 18px"><h1 style="font-size:22px">Seu vídeo está sendo montado</h1><p class="sub" style="margin:0">Pode fechar o app. Avisamos quando ficar pronto.</p></div>' + steps;
  }

  function done() {
    var tpl = find(TEMPLATES, S.tpl), f = find(FONTS, S.font);
    return '<div class="col center" style="gap:6px"><h1 style="font-size:26px">Seu vídeo está pronto<span style="color:#FF7A1A">.</span></h1><p class="sub" style="margin:0">' + tpl.name + ' · vertical 9:16 · com legenda</p></div>' +
      '<div class="final" style="background:' + tpl.bg + '">' + (S.v1 ? '<video src="' + S.v1.url + '#t=0.5" muted playsinline preload="metadata" style="opacity:.55"></video>' : '<div class="spot" style="background:' + tpl.accent + ';width:300px;height:300px;opacity:.2"></div>') +
      (tpl.lb ? '<div class="lb t"></div><div class="lb b"></div>' : '') +
      '<div class="play">' + ICON.play('#fff', 22) + '</div><div class="fcap" style="' + fontCss(f, f.upper ? 28 : 20) + '">' + capText() + '</div>' +
      '<div class="fcta">' + esc(S.cta || 'Chama no WhatsApp') + '</div></div>' +
      '<div class="tags"><span class="tag">Fonte: ' + f.label + '</span><span class="tag">Som: ' + find(SFX, S.sfx).name + '</span><span class="tag">Final: ' + find(ENDINGS, S.ending).title + '</span></div>' +
      '<button class="btn pri" data-a="toast" data-v="O download começa quando o servidor de edição estiver ligado.">' + ICON.down + 'Baixar vídeo</button>' +
      '<button class="btn sec" data-a="toast" data-v="O envio pelo WhatsApp entra quando o servidor de edição estiver ligado.">Enviar no WhatsApp</button>' +
      '<button class="btn txt" data-a="restart">Criar outro vídeo</button>';
  }

  var app = document.getElementById('app');
  function draw(keepScroll) {
    var body = app.querySelector('.body'), y = body && keepScroll ? body.scrollTop : 0;
    var content = { gallery: gallery, upload: upload, style: style, render: render_, done: done }[S.screen]();
    var can = S.screen === 'gallery' ? !!S.tpl : S.screen === 'upload' ? !!(S.v1 && S.v2) : true;
    var label = { gallery: 'Usar este modelo', upload: S.v1 && S.v2 ? 'Continuar' : 'Envie os 2 vídeos', style: 'Gerar meu vídeo' }[S.screen];
    app.innerHTML = header() + '<main class="body">' + content + '</main>' +
      (label ? '<div class="foot"><button class="cta" data-a="next"' + (can ? '' : ' disabled') + '>' + label + ICON.arrow + '</button></div>' : '');
    app.querySelector('.body').scrollTop = y;
  }
  function go(s) { S.screen = s; S.playing = null; draw(false); }

  var timer, playT;
  function generate() {
    S.progress = 0; go('render');
    clearInterval(timer);
    timer = setInterval(function () {
      S.progress = Math.min(100, S.progress + 3); draw(true);
      if (S.progress >= 100) { clearInterval(timer); setTimeout(function () { go('done'); }, 450); }
    }, 110);
  }
  function toast(msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  var fileIn = document.getElementById('file'), pickingFor = null;
  fileIn.addEventListener('change', function () {
    var f = fileIn.files && fileIn.files[0];
    if (f && pickingFor) { if (S[pickingFor]) URL.revokeObjectURL(S[pickingFor].url); S[pickingFor] = { name: f.name, url: URL.createObjectURL(f), file: f }; draw(true); }
    fileIn.value = '';
  });

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-a'), v = b.getAttribute('data-v');
    if (a === 'filter') { S.filter = v; draw(true); }
    else if (a === 'tpl') { S.tpl = v; draw(true); }
    else if (a === 'back') go(S.screen === 'style' ? 'upload' : 'gallery');
    else if (a === 'next') { if (S.screen === 'gallery') go('upload'); else if (S.screen === 'upload') go('style'); else generate(); }
    else if (a === 'pick') { pickingFor = v; fileIn.click(); }
    else if (a === 'font') { S.font = v; draw(true); }
    else if (a === 'cta') { S.cta = v; draw(true); }
    else if (a === 'end') { S.ending = v; draw(true); }
    else if (a === 'sfx') { S.sfx = v; draw(true); }
    else if (a === 'play') {
      clearTimeout(playT);
      if (S.playing === v) { S.playing = null; } else { S.playing = v; S.sfx = v; sound(v); playT = setTimeout(function () { S.playing = null; draw(true); }, 1700); }
      draw(true);
    }
    else if (a === 'toast') toast(v);
    else if (a === 'restart') { S.v1 = S.v2 = null; S.text = ''; S.cta = ''; S.progress = 0; go('gallery'); }
  });
  app.addEventListener('input', function (e) {
    if (e.target.id === 'txt') S.text = e.target.value;
    if (e.target.id === 'ctain') S.cta = e.target.value;
  });

  /* botão voltar do Android */
  document.addEventListener('backbutton', function () { if (S.screen === 'upload' || S.screen === 'style') go(S.screen === 'style' ? 'upload' : 'gallery'); });
  try { var Cap = window.Capacitor; if (Cap && Cap.Plugins && Cap.Plugins.App) Cap.Plugins.App.addListener('backButton', function () { if (S.screen === 'upload' || S.screen === 'style') go(S.screen === 'style' ? 'upload' : 'gallery'); else if (S.screen === 'done') go('gallery'); else Cap.Plugins.App.exitApp(); }); } catch (err) {}

  draw(false);
})();
