/* FLUX CINE — modelos de título cinematográfico e desenho da legenda.
 * layout(id, textos) → camadas em coordenadas 1080x1920.
 * draw(ctx, camadas, t, fim, tf) desenha o título no tempo t; tf = {ox, oy, s} move/escala o título.
 * drawCaption(ctx, trecho, t, estilo, enfase) desenha a legenda.
 * O Android (TitleLayer.java / CineRenderer.java) desenha exatamente as mesmas camadas e estilos. */
(function (root) {
  var W = 1080, H = 1920;
  var YEAR = String(new Date().getFullYear());
  var VIDS = [39878, 1240, 39765, 1232, 39875, 1238];
  var D = new Date(), DATE = ('0' + D.getDate()).slice(-2) + '.' + ('0' + (D.getMonth() + 1)).slice(-2) + '.' + D.getFullYear();

  /* 15 famílias × 2 cores = 30 modelos */
  var DEFS = [
    ['paraiso', 'Paraíso Vertical', 'título deitado + assinatura', { c: '#F3E28C' }, 'Paraíso Pêssego', { c: '#FFD9C2' }],
    ['verao', 'Arte do Verão', 'serifa condensada + script', { c: '#E8432D', a: '#E8432D' }, 'Verão Branco', { c: '#FFFFFF', a: '#FFD21F' }],
    ['domingo', 'Domingo', 'bloco + letra gigante', { c: '#FF6A13', a: '#FFFFFF' }, 'Domingo Lima', { c: '#C6FF3D', a: '#FFFFFF' }],
    ['alem', 'Além', 'pôster gigante', { c: '#F7C21B' }, 'Além Branco', { c: '#FFFFFF' }],
    ['vlog', 'Vlog de Viagem', 'título em arco', { c: '#F5C842', a: '#3A2A00' }, 'Vlog Creme', { c: '#F3E6C9', a: '#2A1A0A' }],
    ['chamada', 'Última Chamada', 'filme romântico', { c: '#F2DEB8' }, 'Chamada Branca', { c: '#FFFFFF' }],
    ['marcador', 'Marcador', 'escrito à mão', { c: '#F28C28' }, 'Marcador Amarelo', { c: '#FFE14D' }],
    ['tudo', 'Tudo Passa', 'serifa elegante', { c: '#FFFFFF' }, 'Tudo Passa Creme', { c: '#FFF3D6' }],
    ['classico', 'Clássico Dourado', 'serifa de cinema', { c: '#F2D13A' }, 'Clássico Prata', { c: '#E7E7EA' }],
    ['camp', 'Neon Camp', 'bloco + assinatura', { c: '#FFFFFF', a: '#D4FF3A' }, 'Camp Rosa', { c: '#FFFFFF', a: '#FF5FA2' }],
    ['escape', 'Escape', 'viagem e lifestyle', { c: '#FFD21F', a: '#FFFFFF' }, 'Escape Oceano', { c: '#4FD1FF', a: '#FFFFFF' }],
    ['insano', 'Insano', 'videoclipe alto', { c: '#FFB000' }, 'Insano Vermelho', { c: '#FF3B30' }],
    ['paladar', 'Paladar', 'editorial de lente', { c: '#F5D90A' }, 'Paladar Menta', { c: '#7CF5C4' }],
    ['retro', 'Retrô 70', 'documentário anos 70', { c: '#FFD21F', a: '#E5341D' }, 'Retrô Disco', { c: '#FF8AD8', a: '#5B2BFF' }],
    ['neon', 'Neon Noite', 'contorno que pisca', { c: '#FF4FD8', a: '#FFFFFF' }, 'Neon Ciano', { c: '#3DF2FF', a: '#FFFFFF' }],
    ['minimal', 'Minimal', 'limpo e elegante', { c: '#FFFFFF', a: '#FF7A1A' }, 'Minimal Creme', { c: '#F3E9D2', a: '#C9A86A' }],
    ['caixa', 'Etiqueta', 'texto em faixa', { c: '#FFFFFF', a: '#111111' }, 'Etiqueta Lima', { c: '#D4FF3A', a: '#0A0A0A' }],
    ['glitch', 'Glitch', 'digital e tremido', { c: '#FFFFFF', a: '#00E5FF', b: '#FF2D55' }, 'Glitch Magenta', { c: '#FFFFFF', a: '#FF2DD1', b: '#2DFF8A' }],
    ['maquina', 'Máquina', 'digitando na tela', { c: '#FFFFFF', a: '#FF7A1A' }, 'Máquina Âmbar', { c: '#FFC24A', a: '#FFFFFF' }],
    ['empilhado', 'Empilhado', 'palavras em blocos', { c: '#FFFFFF', a: '#FF7A1A' }, 'Empilhado Fogo', { c: '#FFD21F', a: '#FF3B30' }],
    ['revista', 'Revista', 'capa editorial', { c: '#FFFFFF', a: '#FF7A1A' }, 'Revista Noir', { c: '#FFFFFF', a: '#9A9A9A' }],
    ['assinatura', 'Assinatura', 'caligrafia de autor', { c: '#FFFFFF', a: '#FFD21F' }, 'Assinatura Rosé', { c: '#FFC6D9', a: '#FFFFFF' }],
    ['impacto', 'Impacto', 'gigante e direto', { c: '#FFFFFF', a: '#FF3B30' }, 'Impacto Azul', { c: '#FFFFFF', a: '#2D7BFF' }],
    ['capitulo', 'Capítulo', 'abertura de série', { c: '#F4EFE6', a: '#C9A86A' }, 'Capítulo Âmbar', { c: '#FFD9A0', a: '#FFFFFF' }],
    ['eco', 'Eco', 'título que ecoa', { c: '#FFFFFF', a: '#FF7A1A' }, 'Eco Lima', { c: '#D4FF3A', a: '#FFFFFF' }],
    ['manchete', 'Manchete', 'jornal de época', { c: '#F4EFE6', a: '#E5341D' }, 'Manchete Noir', { c: '#FFFFFF', a: '#FFD21F' }],
    ['gravando', 'Gravando', 'câmera VHS ao vivo', { c: '#FFFFFF', a: '#FF3B30' }, 'Gravando Laranja', { c: '#FFB547', a: '#FF3B30' }],
    ['cartaz', 'Cartaz', 'pôster esportivo', { c: '#FFFFFF', a: '#FF5A1F' }, 'Cartaz Turquesa', { c: '#FFFFFF', a: '#16C7B7' }],
    ['luxo', 'Luxo', 'marca de alto padrão', { c: '#E9D6A7', a: '#E9D6A7' }, 'Luxo Pérola', { c: '#F5F2EC', a: '#BFB7A8' }],
    ['letreiro', 'Letreiro Neon', 'neon escrito à mão', { c: '#FF7AD9', a: '#FFFFFF' }, 'Letreiro Azul', { c: '#6FD8FF', a: '#FFFFFF' }],
    ['entrevista', 'Entrevista', 'nome na tela, estilo documentário', { c: '#FFFFFF', a: '#FF7A1A' }, 'Entrevista Lima', { c: '#FFFFFF', a: '#C6FF3D' }],
    ['creditos', 'Créditos', 'abertura com ficha técnica', { c: '#FFFFFF', a: '#E5341D' }, 'Créditos Dourado', { c: '#F2D13A', a: '#FFFFFF' }],
    ['festival', 'Festival', 'neon premiado', { c: '#FF8A1F', a: '#FFFFFF' }, 'Festival Rosa', { c: '#FF3DDB', a: '#FFFFFF' }],
    ['duplo', 'Título Duplo', 'bloco + caligrafia por cima', { c: '#FFB21F', a: '#FFFFFF' }, 'Duplo Branco', { c: '#FFFFFF', a: '#FFB21F' }],
    ['espaco', 'Espaçado', 'serifa fina bem aberta', { c: '#FFFFFF', a: '#FFFFFF' }, 'Espaçado Areia', { c: '#EADBC0', a: '#EADBC0' }],
    ['condensado', 'Condensado', 'duas cores, elenco embaixo', { c: '#FFFFFF', a: '#3D8BFF' }, 'Condensado Verde', { c: '#FFFFFF', a: '#7DFF4F' }],
    ['sonho', 'Sonho Dourado', 'letra 3D amarela', { c: '#FFC21F', a: '#7A3A00' }, 'Sonho Laranja', { c: '#FF8A1F', a: '#5A1A00' }],
    ['documentario', 'Documentário', 'caligrafia + selo vermelho', { c: '#FFFFFF', a: '#E5141D' }, 'Documentário Creme', { c: '#F3E6C9', a: '#FF7A1A' }]
  ];
  var CATS = { paraiso: 'cinema', chamada: 'cinema', tudo: 'cinema', classico: 'cinema', capitulo: 'cinema', luxo: 'cinema', alem: 'cinema', paladar: 'cinema',
    impacto: 'viral', empilhado: 'viral', insano: 'viral', caixa: 'viral', cartaz: 'viral', eco: 'viral', domingo: 'viral',
    verao: 'lifestyle', vlog: 'lifestyle', escape: 'lifestyle', camp: 'lifestyle', assinatura: 'lifestyle', marcador: 'lifestyle', letreiro: 'lifestyle',
    retro: 'retro', maquina: 'retro', gravando: 'retro', manchete: 'retro', revista: 'retro',
    glitch: 'tech', neon: 'tech', minimal: 'tech', entrevista: 'tech',
    creditos: 'cinema', festival: 'cinema', espaco: 'cinema', documentario: 'cinema', duplo: 'viral', condensado: 'viral', sonho: 'retro' };
  var DEMO = {
    paraiso: ['Even the sun sets', 'paradise'], verao: ['The art summertime', 'of'], domingo: ['Sunday', 'Service'], alem: ['Beyond', 'um experimento visual sobre horizontes'],
    vlog: ['Canada Vlog', 'world tour · episódio 3'], chamada: ['The Last Call', 'uma experiência cinematográfica'], marcador: ['Nothing ever does', 'um filme'], tudo: ['everything goes.', 'certamente, um dia vai passar'],
    classico: ['Cinematic', 'Simples, mas marcante'], camp: ['Midyear', 'Camp'], escape: ['One Day', 'escape'], insano: ['Insane', 'Novo lançamento'],
    paladar: ['Taste', 'Uma experiência'], retro: ['Merman', 'Um curta original'], neon: ['Noite', 'aberto até tarde'], minimal: ['Essencial', 'menos é mais'],
    caixa: ['Promoção', 'só esta semana'], glitch: ['Reset', 'nova fase'], maquina: ['Você sabia?', 'o segredo é simples'], empilhado: ['Pare de errar', 'veja isso'],
    revista: ['Estilo', 'a edição de hoje'], assinatura: ['Com amor', 'feito à mão'], impacto: ['Atenção', 'leia isso'],
    capitulo: ['O começo', 'capítulo um'], eco: ['Agora', 'não depois'], manchete: ['Tudo mudou', 'edição extra'], gravando: ['Bastidores', 'gravado hoje'],
    cartaz: ['Sem limites', 'temporada nova'], luxo: ['Maison', 'coleção privada'], letreiro: ['Good vibes', 'aberto agora'], entrevista: ['Ana Souza', 'fundadora · Sua Marca'],
    creditos: ['Confinamento', 'da glória'], festival: ['Chutando estrelas', 'um curta premiado'], duplo: ['Cinematic', 'film titles'], espaco: ['Search', 'um filme sobre procurar'],
    condensado: ['Meu futuro agora', 'um filme sobre começar'], sonho: ['Sons do vazio', 'o mar fala'], documentario: ['Sem pecado', 'documentário']
  };
  var MODELS = [];
  DEFS.forEach(function (d, i) {
    var dm = DEMO[d[0]];
    MODELS.push({ id: d[0] + '-1', fam: d[0], cat: CATS[d[0]] || 'cinema', isNew: i >= 23, name: d[1], vibe: d[2], P: d[3], accent: d[3].a && d[0] !== 'caixa' ? d[3].a : d[3].c, media: VIDS[i % 6], demo: { title: dm[0], sub: dm[1], brand: 'Sua Marca' } });
    MODELS.push({ id: d[0] + '-2', fam: d[0], cat: CATS[d[0]] || 'cinema', isNew: i >= 23, name: d[4], vibe: d[2], P: d[5], accent: d[5].a && d[0] !== 'caixa' ? d[5].a : d[5].c, media: VIDS[(i + 3) % 6], vip: i >= 3, demo: { title: dm[0], sub: dm[1], brand: 'Sua Marca' } });
  });

  var mctx = document.createElement('canvas').getContext('2d');
  function width(text, fam, size) { mctx.font = size + 'px "' + fam + '"'; return mctx.measureText(text).width; }
  function fit(text, fam, maxW, maxSize, sx, ls) {
    sx = sx || 1; ls = ls || 0;
    var s = maxSize;
    while (s > 20) { if ((width(text, fam, s) + ls * s * text.length) * sx <= maxW) break; s -= 4; }
    return s;
  }
  function T(o) { o.type = 'text'; if (!o.color) o.color = '#FFFFFF'; if (o.ls == null) o.ls = 0; if (!o.sx) o.sx = 1; if (!o.align) o.align = 'center'; return o; }
  function up(s) { return String(s || '').toUpperCase(); }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function A(k, d, u) { return { k: k, d: d, u: u }; }
  /* linha de créditos de cinema: rótulo pequeno em cima, nome embaixo */
  function credits(L, y, color, items, d0) {
    var n = items.length, step = 940 / n;
    items.forEach(function (it, k) {
      var x = 70 + step * k + step / 2;
      L.push(T({ text: it[0], font: 'Inter-400', size: 17, x: x, y: y, color: color, ls: 0.12, anim: A('fade', d0 + k * 0.05, 0.5) }));
      L.push(T({ text: it[1], font: 'Oswald-700', size: fit(it[1], 'Oswald-700', step - 16, 26, 1, 0.04), x: x, y: y + 30, color: color, ls: 0.04, anim: A('fade', d0 + 0.05 + k * 0.05, 0.5) }));
    });
  }

  function layout(id, tx) {
    var m = null;
    for (var i = 0; i < MODELS.length; i++) if (MODELS[i].id === id || MODELS[i].fam === id) { m = MODELS[i]; break; }
    if (!m) m = MODELS[0];
    var P = m.P, C = P.c, AC = P.a || P.c;
    var title = (tx.title || '').trim() || 'Seu título', sub = (tx.sub || '').trim(), brand = (tx.brand || '').trim() || 'FLUX CINE';
    var L = [], s, y;
    switch (m.fam) {
      case 'paraiso': {
        L.push({ type: 'dim', alpha: 0.25, anim: A('fade', 0, 0.5) });
        var scr = cap(title), sz = fit(scr, 'GreatVibes-400', 1500, 300);
        L.push(T({ text: scr, font: 'GreatVibes-400', size: sz, x: 640, y: 960, color: C, rot: 90, anim: A('reveal', 0.1, 1.1) }));
        var bw = (sub || brand).toLowerCase(), bs = fit(bw, 'Poppins-800', 1400, 230, 1, -0.03);
        L.push(T({ text: bw, font: 'Poppins-800', size: bs, x: 640 - sz * 0.62, y: 960, color: C, ls: -0.03, rot: 90, anim: A('blur', 0.5, 0.8) }));
        [['UM VÍDEO', 200], ['DE', 960], [up(brand), 1720]].forEach(function (q, k) { L.push(T({ text: q[0], font: 'Inter-400', size: 26, x: 150, y: q[1], color: C, rot: 90, anim: A('fade', 0.7 + k * 0.08, 0.5) })); });
        [['FLUX', 200], ['CINE', 960], [YEAR, 1720]].forEach(function (q, k) { L.push(T({ text: q[0], font: 'Inter-400', size: 26, x: 930, y: q[1], color: C, rot: 90, anim: A('fade', 0.7 + k * 0.08, 0.5) })); });
        L.push({ type: 'line', x1: 520, y1: 120, x2: 560, y2: 120, w: 2, color: C, anim: A('draw', 0.9, 0.5) });
        L.push({ type: 'line', x1: 520, y1: 1800, x2: 560, y2: 1800, w: 2, color: C, anim: A('draw', 0.9, 0.5) });
        break;
      }
      case 'verao': {
        L.push({ type: 'dim', alpha: 0.12, anim: A('fade', 0, 0.5) });
        var tw = up(title).split(/\s+/).filter(Boolean), half = Math.ceil(tw.length / 2), l1 = tw.slice(0, half).join(' '), l2 = tw.slice(half).join(' ') || l1;
        if (tw.length < 2) { l1 = up(title); l2 = ''; }
        var s1 = Math.min(fit(l1, 'PlayfairDisplay-900', 900, 240, 0.62, 0), l2 ? fit(l2, 'PlayfairDisplay-900', 900, 240, 0.62, 0) : 999);
        y = l2 ? 900 : 980;
        L.push(T({ text: brand, font: 'CormorantGaramond-600i', size: 44, x: 540, y: y - s1 * 0.95, color: C, anim: A('fade', 0.5, 0.6) }));
        L.push(T({ text: l1, font: 'PlayfairDisplay-900', size: s1, x: 540, y: y, color: C, sx: 0.62, anim: A('rise', 0.1, 0.8) }));
        if (l2) L.push(T({ text: l2, font: 'PlayfairDisplay-900', size: s1, x: 540, y: y + s1 * 0.86, color: C, sx: 0.62, anim: A('rise', 0.25, 0.8) }));
        if (sub) L.push(T({ text: sub.toLowerCase(), font: 'GreatVibes-400', size: fit(sub.toLowerCase(), 'GreatVibes-400', 700, Math.round(s1 * 0.8)), x: 560, y: y + s1 * 0.42, color: AC, rot: -8, shadow: { dx: 0, dy: 0, color: '#F6EFE6', sw: 7 }, anim: A('reveal', 0.6, 0.8) }));
        L.push(T({ text: 'por ' + brand.toLowerCase(), font: 'CormorantGaramond-600i', size: 40, x: 540, y: y + (l2 ? s1 * 0.86 : 0) + 110, color: C, anim: A('fade', 0.8, 0.6) }));
        break;
      }
      case 'domingo': {
        L.push({ type: 'dim', alpha: 0.2, anim: A('fade', 0, 0.5) });
        var dw = up(title).split(/\s+/).filter(Boolean), w1 = dw[0] || 'TÍTULO', w2 = dw.slice(1).join(' ');
        if (!w2 && w1.length > 3) { w2 = w1.slice(Math.ceil(w1.length / 2)); w1 = w1.slice(0, Math.ceil(w1.length / 2)); }
        var bsz = fit(w1.slice(1), 'ArchivoBlack-400', 640, 300, 1, -0.03), big = bsz * 1.32;
        var bigW = width(w1.charAt(0), 'DMSerifDisplay-400', big), restW = width(w1.slice(1), 'ArchivoBlack-400', bsz) * 0.97;
        var x0 = 540 - (bigW + restW) / 2; y = 900;
        L.push(T({ text: w1.charAt(0), font: 'DMSerifDisplay-400', size: big, x: x0, y: y + bsz * 0.04, align: 'left', color: C, anim: A('zoom', 0.05, 0.6) }));
        L.push(T({ text: w1.slice(1), font: 'ArchivoBlack-400', size: bsz, x: x0 + bigW, y: y, align: 'left', color: C, ls: -0.03, anim: A('slideR', 0.15, 0.6) }));
        if (w2) L.push(T({ text: w2, font: 'ArchivoBlack-400', size: fit(w2, 'ArchivoBlack-400', 760, bsz, 1, -0.03), x: x0, y: y + bsz * 0.98, align: 'left', color: C, ls: -0.03, anim: A('slideL', 0.25, 0.6) }));
        if (sub) L.push(T({ text: cap(sub), font: 'GreatVibes-400', size: fit(cap(sub), 'GreatVibes-400', 760, Math.round(bsz * 0.9)), x: 560, y: y + bsz * 0.45, color: AC, rot: -6, anim: A('reveal', 0.6, 0.9) }));
        L.push(T({ text: up(brand), font: 'Inter-700', size: 24, x: 1000, y: y - bsz * 0.45, align: 'right', color: '#FFFFFF', anim: A('fade', 0.8, 0.5) }));
        L.push(T({ text: '• • • • •', font: 'Inter-700', size: 26, x: 1000, y: y + bsz * 0.62, align: 'right', color: '#FFFFFF', ls: 0.1, anim: A('fade', 0.9, 0.5) }));
        break;
      }
      case 'alem': {
        L.push({ type: 'dim', alpha: 0.1, anim: A('fade', 0, 0.5) });
        s = fit(up(title), 'Anton-400', 1020, 560, 1, -0.02); y = 760 + s * 0.4;
        L.push(T({ text: '© SÉRIE ' + up(brand), font: 'Inter-700', size: 20, x: 50, y: y - s * 0.86 - 30, align: 'left', color: C, anim: A('fade', 0.5, 0.5) }));
        if (sub) L.push(T({ text: '“' + up(sub) + '”', font: 'Inter-400', size: fit('“' + up(sub) + '”', 'Inter-400', 520, 20), x: 540, y: y - s * 0.86 - 30, color: C, anim: A('fade', 0.6, 0.5) }));
        L.push(T({ text: DATE, font: 'Inter-400', size: 30, x: 1030, y: y - s * 0.86 - 30, align: 'right', color: C, anim: A('fade', 0.7, 0.5) }));
        L.push(T({ text: up(title), font: 'Anton-400', size: s, x: 540, y: y, color: C, ls: -0.02, anim: A('stretch', 0.1, 0.8) }));
        L.push({ type: 'oval', cx: 900, cy: 1700, rx: 110, ry: 62, w: 3, color: C, anim: A('fade', 1.0, 0.5) });
        L.push(T({ text: 'UM ESTUDO', font: 'Inter-700', size: 20, x: 900, y: 1694, color: C, anim: A('fade', 1.0, 0.5) }));
        L.push(T({ text: 'ORIGINAL', font: 'Inter-700', size: 20, x: 900, y: 1722, color: C, anim: A('fade', 1.05, 0.5) }));
        break;
      }
      case 'vlog': {
        L.push({ type: 'dim', alpha: 0.3, anim: A('fade', 0, 0.5) });
        s = fit(up(title), 'DMSerifDisplay-400', 900, 170, 1, 0); y = 900;
        L.push(T({ text: up(title), font: 'DMSerifDisplay-400', size: s, x: 540, y: y, color: C, arc: 1500, shadow: { dx: 0, dy: 9, color: AC, sw: 0 }, anim: A('pop', 0.1, 0.8) }));
        if (sub) {
          var sp = up(sub).split('·'), a1 = (sp[0] || '').trim(), a2 = (sp[1] || '').trim();
          L.push(T({ text: a1, font: 'DMSerifDisplay-400', size: fit(a1, 'DMSerifDisplay-400', 600, 64), x: 600, y: y + 120, color: C, shadow: { dx: 0, dy: 5, color: AC, sw: 0 }, anim: A('rise', 0.5, 0.6) }));
          if (a2) L.push(T({ text: a2, font: 'DMSerifDisplay-400', size: fit(a2, 'DMSerifDisplay-400', 600, 64), x: 600, y: y + 190, color: C, shadow: { dx: 0, dy: 5, color: AC, sw: 0 }, anim: A('rise', 0.6, 0.6) }));
        }
        L.push(T({ text: 'DIRIGIDO POR ' + up(brand), font: 'CormorantGaramond-600i', size: 30, x: 60, y: 140, align: 'left', color: C, anim: A('fade', 0.8, 0.5) }));
        L.push(T({ text: 'COM FLUX CINE', font: 'CormorantGaramond-600i', size: 30, x: 1020, y: 140, align: 'right', color: C, anim: A('fade', 0.85, 0.5) }));
        L.push(T({ text: 'SÉRIE ' + YEAR, font: 'CormorantGaramond-600i', size: 30, x: 60, y: 1800, align: 'left', color: C, anim: A('fade', 0.9, 0.5) }));
        L.push(T({ text: 'POR ' + up(brand), font: 'CormorantGaramond-600i', size: 30, x: 1020, y: 1800, align: 'right', color: C, anim: A('fade', 0.95, 0.5) }));
        break;
      }
      case 'chamada': {
        L.push({ type: 'dim', alpha: 0.35, anim: A('fade', 0, 0.5) });
        s = fit(cap(title), 'CormorantGaramond-500', 1000, 230, 0.86, -0.01); y = 1180;
        L.push(T({ text: 'UM CURTA', font: 'Inter-700', size: 20, x: 60, y: 160, align: 'left', color: C, anim: A('fade', 0.6, 0.5) }));
        L.push(T({ text: 'EM PARCERIA COM FLUX CINE', font: 'Inter-700', size: 20, x: 540, y: 160, color: C, anim: A('fade', 0.65, 0.5) }));
        L.push(T({ text: '@' + brand.toLowerCase().replace(/\s+/g, ''), font: 'Inter-700', size: 20, x: 1020, y: 160, align: 'right', color: C, anim: A('fade', 0.7, 0.5) }));
        L.push(T({ text: cap(title), font: 'CormorantGaramond-500', size: s, x: 540, y: y, color: C, sx: 0.86, ls: -0.01, anim: A('blur', 0.1, 1.0) }));
        var line2 = up(sub || 'uma experiência cinematográfica') + ' POR ' + up(brand);
        L.push(T({ text: line2, font: 'Oswald-700', size: fit(line2, 'Oswald-700', 960, 46, 1, 0.02), x: 540, y: y + 72, color: C, ls: 0.02, anim: A('track', 0.5, 0.7) }));
        L.push(T({ text: 'AVISO: EMOÇÃO À FRENTE', font: 'Inter-700', size: 18, x: 540, y: y + 120, color: C, anim: A('fade', 0.9, 0.5) }));
        L.push(T({ text: 'AMOR, PERDA E SAUDADE SE MISTURAM DE UM JEITO QUE VAI MEXER COM VOCÊ.', font: 'Inter-400', size: 16, x: 540, y: y + 148, color: C, anim: A('fade', 1.0, 0.5) }));
        break;
      }
      case 'marcador': {
        L.push({ type: 'dim', alpha: 0.3, anim: A('fade', 0, 0.5) });
        var mw = title.split(/\s+/).filter(Boolean), m1 = (mw[0] || '').toUpperCase(), m2 = mw.slice(1).join(' ');
        var ms = Math.min(fit(m1, 'PermanentMarker-400', 960, 270), m2 ? fit(m2, 'PermanentMarker-400', 980, 270) : 999); y = 840;
        L.push(T({ text: 'UM FILME DE ' + up(brand), font: 'Inter-700', size: 22, x: 540, y: y - ms * 1.0, color: '#FFFFFF', ls: 0.12, anim: A('fade', 0.5, 0.5) }));
        L.push(T({ text: m1, font: 'PermanentMarker-400', size: ms, x: 540, y: y, color: C, anim: A('reveal', 0.1, 0.8) }));
        if (m2) L.push(T({ text: m2, font: 'PermanentMarker-400', size: ms, x: 560, y: y + ms * 0.95, color: C, anim: A('reveal', 0.5, 0.8) }));
        var yb = y + (m2 ? ms * 0.95 : 0) + 150;
        [[up(brand).split(' ')[0] || 'SUA', 300], ['FLUX', 540], [YEAR, 780]].forEach(function (q, k) { L.push(T({ text: q[0], font: 'Inter-700', size: 26, x: q[1], y: yb, color: '#FFFFFF', anim: A('fade', 0.9 + k * 0.08, 0.5) })); });
        [[(up(brand).split(' ')[1] || 'MARCA'), 300], ['CINE', 540], ['ORIGINAL', 780]].forEach(function (q, k) { L.push(T({ text: q[0], font: 'Inter-700', size: 26, x: q[1], y: yb + 32, color: '#FFFFFF', anim: A('fade', 0.9 + k * 0.08, 0.5) })); });
        L.push({ type: 'box', x: 90, y: yb + 90, w: 56, h: 56, color: '#FFFFFF', r: 4, anim: A('fade', 1.1, 0.5) });
        L.push(T({ text: 'R', font: 'ArchivoBlack-400', size: 40, x: 118, y: yb + 134, color: '#111111', anim: A('fade', 1.1, 0.5) }));
        L.push(T({ text: 'RESTRITO · ' + up(sub || 'cenas de muita emoção'), font: 'Inter-700', size: 18, x: 164, y: yb + 124, align: 'left', color: '#FFFFFF', anim: A('fade', 1.15, 0.5) }));
        break;
      }
      case 'tudo': {
        L.push({ type: 'dim', alpha: 0.18, anim: A('fade', 0, 0.5) });
        var tt = title.toLowerCase(), cut = Math.max(1, Math.round(tt.length * 0.62));
        var sp2 = tt.lastIndexOf(' ', cut); if (sp2 > 2) cut = sp2 + 1;
        var p1 = tt.slice(0, cut).replace(/\s+$/, ''), p2 = tt.slice(cut);
        var ts = 220, gk = /\s$/.test(tt.slice(0, cut)) ? 0.16 : 0;
        while (ts > 40 && width(p1, 'CormorantGaramond-500', ts) + width(p2, 'CormorantGaramond-600i', ts) + gk * ts > 1000) ts -= 6;
        var w1x = width(p1, 'CormorantGaramond-500', ts) + gk * ts, w2x = width(p2, 'CormorantGaramond-600i', ts), xs = 540 - (w1x + w2x) / 2; y = 1010;
        L.push(T({ text: p1, font: 'CormorantGaramond-500', size: ts, x: xs, y: y, align: 'left', color: C, anim: A('blur', 0.1, 0.9) }));
        L.push(T({ text: p2, font: 'CormorantGaramond-600i', size: ts, x: xs + w1x, y: y, align: 'left', color: C, anim: A('blur', 0.35, 0.9) }));
        if (sub) {
          var sw = up(sub).split(','), t1 = (sw[0] || '').trim(), t2 = sw.slice(1).join(',').trim();
          L.push(T({ text: t1, font: 'Inter-400', size: 22, x: 540, y: y - ts * 0.95, color: C, anim: A('fade', 0.6, 0.6) }));
          if (t2) L.push(T({ text: t2, font: 'Inter-400', size: 22, x: 540, y: y - ts * 0.95 + 30, color: C, anim: A('fade', 0.65, 0.6) }));
        }
        L.push(T({ text: 'FAIXA 01', font: 'Inter-400', size: 24, x: 140, y: 1660, align: 'left', color: C, anim: A('fade', 0.9, 0.6) }));
        L.push(T({ text: up(brand), font: 'Inter-400', size: 24, x: 940, y: 1660, align: 'right', color: C, anim: A('fade', 0.95, 0.6) }));
        break;
      }
      case 'classico': {
        var lc = C === '#F2D13A' ? 'rgba(242,209,58,.7)' : 'rgba(231,231,234,.7)';
        L.push({ type: 'dim', alpha: 0.42, anim: A('fade', 0, 0.5) });
        L.push({ type: 'line', x1: 60, y1: 170, x2: 1020, y2: 170, w: 2, color: lc, anim: A('draw', 0.15, 0.9) });
        L.push({ type: 'line', x1: 60, y1: 1750, x2: 1020, y2: 1750, w: 2, color: lc, anim: A('draw', 0.15, 0.9) });
        L.push(T({ text: up(brand), font: 'DMSerifDisplay-400', size: 30, x: 70, y: 135, align: 'left', color: C, ls: 0.06, anim: A('fade', 0.5, 0.6) }));
        L.push(T({ text: YEAR, font: 'DMSerifDisplay-400', size: 30, x: 1010, y: 135, align: 'right', color: C, ls: 0.06, anim: A('fade', 0.5, 0.6) }));
        L.push({ type: 'oval', cx: 540, cy: 124, rx: 120, ry: 34, w: 2, color: C, anim: A('fade', 0.55, 0.6) });
        L.push(T({ text: 'APRESENTA', font: 'DMSerifDisplay-400', size: 26, x: 540, y: 134, color: C, ls: 0.08, anim: A('fade', 0.55, 0.6) }));
        s = fit(up(title), 'DMSerifDisplay-400', 980, 250, 1, 0.01); y = 1010;
        L.push(T({ text: up(brand) + ' APRESENTA', font: 'DMSerifDisplay-400', size: 52, x: 540, y: y - s * 0.78 - 18, color: C, ls: 0.04, anim: A('rise', 0.35, 0.7) }));
        L.push(T({ text: up(title), font: 'DMSerifDisplay-400', size: s, x: 540, y: y, color: C, ls: 0.01, anim: A('blur', 0.1, 0.95) }));
        if (sub) L.push(T({ text: up(sub), font: 'DMSerifDisplay-400', size: fit(up(sub), 'DMSerifDisplay-400', 940, 40, 1, 0.22), x: 540, y: y + 88, color: C, ls: 0.22, anim: A('track', 0.6, 0.9) }));
        L.push(T({ text: 'UM VÍDEO DE ' + up(brand), font: 'DMSerifDisplay-400', size: 24, x: 540, y: 1680, color: C, ls: 0.06, anim: A('fade', 0.9, 0.6) }));
        break;
      }
      case 'camp':
        L.push({ type: 'dim', alpha: 0.28, anim: A('fade', 0, 0.5) });
        L.push(T({ text: up(brand), font: 'ArchivoBlack-400', size: 38, x: 80, y: 260, align: 'left', color: C, anim: A('fade', 0.5, 0.5) }));
        L.push(T({ text: 'APRESENTA', font: 'ArchivoBlack-400', size: 38, x: 540, y: 260, color: AC, anim: A('fade', 0.55, 0.5) }));
        L.push(T({ text: 'VÍDEO', font: 'ArchivoBlack-400', size: 38, x: 1000, y: 260, align: 'right', color: C, anim: A('fade', 0.6, 0.5) }));
        s = fit(up(title), 'ArchivoBlack-400', 1010, 300, 1, -0.03); y = 980;
        L.push(T({ text: up(title), font: 'ArchivoBlack-400', size: s, x: 540, y: y, color: C, ls: -0.03, anim: A('blur', 0.1, 0.85) }));
        if (sub) L.push(T({ text: cap(sub), font: 'GreatVibes-400', size: fit(cap(sub), 'GreatVibes-400', 860, Math.round(s * 1.05)), x: 600, y: y + s * 0.5, color: AC, rot: -7, anim: A('reveal', 0.65, 0.9) }));
        L.push(T({ text: YEAR, font: 'ArchivoBlack-400', size: 40, x: 540, y: 1700, color: C, anim: A('fade', 0.9, 0.5) }));
        break;
      case 'escape':
        L.push({ type: 'dim', alpha: 0.18, anim: A('fade', 0, 0.5) });
        s = fit(up(title), 'Anton-400', 1010, 340, 1, -0.01); y = 1000;
        L.push(T({ text: 'POR', font: 'Inter-700', size: 32, x: 90, y: y - s * 0.86 - 22, align: 'left', color: C, anim: A('fade', 0.45, 0.5) }));
        L.push(T({ text: up(brand), font: 'Inter-700', size: 32, x: 990, y: y - s * 0.86 - 22, align: 'right', color: C, anim: A('fade', 0.5, 0.5) }));
        L.push(T({ text: up(title), font: 'Anton-400', size: s, x: 540, y: y, color: C, ls: -0.01, anim: A('rise', 0.1, 0.8) }));
        if (sub) L.push(T({ text: sub.toLowerCase(), font: 'Yellowtail-400', size: fit(sub.toLowerCase(), 'Yellowtail-400', 900, Math.round(s * 0.82)), x: 560, y: y + s * 0.42, color: AC, rot: -5, anim: A('reveal', 0.6, 0.85) }));
        L.push(T({ text: 'UM VÍDEO DE ' + up(brand), font: 'Inter-700', size: 28, x: 540, y: y + s * 0.78, ls: 0.08, anim: A('fade', 0.95, 0.5) }));
        break;
      case 'insano': {
        L.push({ type: 'dim', alpha: 0.22, anim: A('fade', 0, 0.5) });
        L.push(T({ text: up(brand), font: 'Inter-700', size: 40, x: 540, y: 470, ls: 0.6, anim: A('track', 0.4, 0.9) }));
        s = fit(up(title), 'BodoniModa-900', 1020, 640, 0.46, 0); y = 1230;
        L.push(T({ text: up(title), font: 'BodoniModa-900', size: s, x: 540, y: y, color: C, sx: 0.46, anim: A('stretch', 0.1, 0.9) }));
        var cr = up(brand) + ' APRESENTA ' + up(title) + (sub ? ' · ' + up(sub) : '');
        L.push(T({ text: cr, font: 'Inter-700', size: fit(cr, 'Inter-700', 900, 24), x: 540, y: y + 70, anim: A('fade', 0.8, 0.6) }));
        L.push(T({ text: 'UM VÍDEO FLUX CINE · © ' + YEAR, font: 'Inter-400', size: 22, x: 540, y: y + 106, anim: A('fade', 0.9, 0.6) }));
        break;
      }
      case 'paladar':
        L.push({ type: 'vignette', alpha: 0.95, anim: A('fade', 0, 0.6) });
        s = fit(up(title), 'PlayfairDisplay-900', 600, 380, 0.6, 0.02); y = 1080;
        if (sub) L.push(T({ text: up(sub), font: 'Inter-700', size: 30, x: 540, y: y - s * 0.76 - 26, color: C, ls: 0.12, anim: A('fade', 0.45, 0.6) }));
        L.push(T({ text: up(title), font: 'PlayfairDisplay-900', size: s, x: 540, y: y, color: C, sx: 0.6, ls: 0.02, anim: A('track', 0.1, 1.0) }));
        L.push(T({ text: 'DIREÇÃO', font: 'Inter-700', size: 28, x: 80, y: y - s * 0.32, align: 'left', color: C, anim: A('fade', 0.7, 0.5) }));
        L.push(T({ text: up(brand), font: 'Inter-400', size: 26, x: 80, y: y - s * 0.32 + 36, align: 'left', color: C, ls: 0.1, anim: A('fade', 0.75, 0.5) }));
        L.push(T({ text: 'CÂMERA', font: 'Inter-700', size: 28, x: 1000, y: y - s * 0.32, align: 'right', color: C, anim: A('fade', 0.7, 0.5) }));
        L.push(T({ text: 'FLUX CINE', font: 'Inter-400', size: 26, x: 1000, y: y - s * 0.32 + 36, align: 'right', color: C, ls: 0.1, anim: A('fade', 0.75, 0.5) }));
        L.push(T({ text: up(brand) + ' APRESENTA', font: 'Inter-700', size: 28, x: 540, y: y + 96, color: C, ls: 0.06, anim: A('fade', 0.9, 0.5) }));
        break;
      case 'retro':
        L.push({ type: 'dim', alpha: 0.12, anim: A('fade', 0, 0.5) });
        s = fit(cap(title), 'Shrikhand-400', 980, 270, 1, 0); y = 1000;
        L.push(T({ text: up(brand), font: 'ArchivoBlack-400', size: 46, x: 540, y: y - s * 1.02 - 56, color: C, shadow: { dx: 3, dy: 3, color: AC, sw: 0 }, anim: A('fade', 0.45, 0.5) }));
        L.push(T({ text: 'APRESENTA UM VÍDEO ORIGINAL', font: 'Anton-400', size: 30, x: 540, y: y - s * 1.02 - 10, color: C, ls: 0.04, anim: A('fade', 0.55, 0.5) }));
        L.push(T({ text: cap(title), font: 'Shrikhand-400', size: s, x: 540, y: y, color: C, shadow: { dx: 8, dy: 8, color: AC, sw: Math.round(s * 0.05) }, anim: A('pop', 0.1, 0.8) }));
        if (sub) L.push(T({ text: up(sub), font: 'Anton-400', size: fit(up(sub), 'Anton-400', 900, 40, 1, 0.03), x: 540, y: y + 90, color: C, ls: 0.03, anim: A('fade', 0.8, 0.5) }));
        L.push(T({ text: 'DIREÇÃO ' + up(brand), font: 'Anton-400', size: 32, x: 540, y: y + 150, color: C, ls: 0.03, anim: A('fade', 0.9, 0.5) }));
        break;
      case 'neon':
        L.push({ type: 'dim', alpha: 0.5, anim: A('fade', 0, 0.4) });
        s = fit(up(title), 'Unbounded-800', 960, 190, 1, 0.02); y = 1000;
        L.push(T({ text: up(title), font: 'Unbounded-800', size: s, x: 540, y: y, color: C, ls: 0.02, outline: Math.max(4, s * 0.035), glow: C, anim: A('flicker', 0.1, 1.0) }));
        if (sub) L.push(T({ text: up(sub), font: 'Inter-700', size: fit(up(sub), 'Inter-700', 900, 34, 1, 0.3), x: 540, y: y + 80, color: AC, ls: 0.3, anim: A('fade', 0.8, 0.6) }));
        L.push(T({ text: up(brand), font: 'Inter-700', size: 28, x: 540, y: y - s - 40, color: C, ls: 0.5, glow: C, anim: A('flicker', 0.5, 0.8) }));
        break;
      case 'minimal':
        L.push({ type: 'dim', alpha: 0.32, anim: A('fade', 0, 0.5) });
        s = fit(title, 'Inter-700', 860, 130, 1, -0.02); y = 1000;
        L.push(T({ text: up(brand), font: 'Inter-700', size: 24, x: 540, y: y - s - 30, color: AC, ls: 0.45, anim: A('track', 0.3, 0.8) }));
        L.push(T({ text: title, font: 'Inter-700', size: s, x: 540, y: y, color: C, ls: -0.02, anim: A('rise', 0.1, 0.8) }));
        L.push({ type: 'line', x1: 440, y1: y + 46, x2: 640, y2: y + 46, w: 3, color: AC, anim: A('draw', 0.5, 0.7) });
        if (sub) L.push(T({ text: sub, font: 'Inter-400', size: fit(sub, 'Inter-400', 860, 40), x: 540, y: y + 110, color: C, anim: A('fade', 0.7, 0.6) }));
        break;
      case 'caixa': {
        s = fit(up(title), 'ArchivoBlack-400', 900, 150, 1, -0.01); y = 1000;
        var tw = width(up(title), 'ArchivoBlack-400', s) * (1 - 0.01);
        L.push({ type: 'box', x: 540 - tw / 2 - 40, y: y - s * 0.9, w: tw + 80, h: s * 1.18, color: C, r: 10, anim: A('wipe', 0.05, 0.5) });
        L.push(T({ text: up(title), font: 'ArchivoBlack-400', size: s, x: 540, y: y, color: AC, ls: -0.01, anim: A('fade', 0.35, 0.35) }));
        if (sub) {
          var ss = fit(up(sub), 'Inter-700', 760, 44, 1, 0.06), sw2 = width(up(sub), 'Inter-700', ss) + ss * 0.06 * sub.length;
          L.push({ type: 'box', x: 540 - sw2 / 2 - 26, y: y + s * 0.38, w: sw2 + 52, h: ss * 1.5, color: AC, r: 8, anim: A('wipe', 0.45, 0.45) });
          L.push(T({ text: up(sub), font: 'Inter-700', size: ss, x: 540, y: y + s * 0.38 + ss * 1.08, color: C, ls: 0.06, anim: A('fade', 0.7, 0.35) }));
        }
        L.push(T({ text: up(brand), font: 'Inter-700', size: 26, x: 540, y: y - s * 0.9 - 30, color: '#FFFFFF', ls: 0.3, anim: A('fade', 0.6, 0.5) }));
        break;
      }
      case 'glitch':
        L.push({ type: 'dim', alpha: 0.35, anim: A('fade', 0, 0.3) });
        s = fit(up(title), 'ArchivoBlack-400', 980, 230, 1, -0.02); y = 1000;
        L.push(T({ text: up(title), font: 'ArchivoBlack-400', size: s, x: 540, y: y, color: C, ls: -0.02, rgb: [P.a, P.b, 10], anim: A('glitch', 0.05, 0.9) }));
        if (sub) L.push(T({ text: '> ' + up(sub), font: 'SpaceMono-700', size: fit('> ' + up(sub), 'SpaceMono-700', 900, 36), x: 540, y: y + 80, color: P.a, anim: A('type', 0.7, 0.8) }));
        L.push(T({ text: '[ ' + up(brand) + ' ]', font: 'SpaceMono-700', size: 26, x: 540, y: y - s - 30, color: C, anim: A('glitch', 0.4, 0.6) }));
        break;
      case 'maquina':
        L.push({ type: 'dim', alpha: 0.5, anim: A('fade', 0, 0.3) });
        s = fit(title, 'SpaceMono-700', 960, 110); y = 960;
        L.push(T({ text: title, font: 'SpaceMono-700', size: s, x: 540, y: y, color: C, anim: A('type', 0.15, 1.1), cursor: AC }));
        if (sub) L.push(T({ text: sub, font: 'SpaceMono-700', size: fit(sub, 'SpaceMono-700', 900, 40), x: 540, y: y + 90, color: AC, anim: A('type', 1.3, 0.9) }));
        L.push(T({ text: '// ' + brand.toLowerCase(), font: 'SpaceMono-700', size: 26, x: 540, y: y - s - 30, color: AC, anim: A('fade', 0.1, 0.4) }));
        break;
      case 'empilhado': {
        L.push({ type: 'dim', alpha: 0.3, anim: A('fade', 0, 0.4) });
        var ws = up(title).split(/\s+/).filter(Boolean).slice(0, 4), n = ws.length, lh = Math.min(260, 900 / Math.max(1, n));
        var top = 960 - (n * lh) / 2 + lh * 0.85;
        ws.forEach(function (w, k) {
          var sz = fit(w, 'Anton-400', 960, lh * 1.05, 1, -0.01);
          L.push(T({ text: w, font: 'Anton-400', size: sz, x: 540, y: top + k * lh, color: k % 2 ? AC : C, ls: -0.01, anim: A(k % 2 ? 'slideR' : 'slideL', 0.08 + k * 0.14, 0.55) }));
        });
        if (sub) L.push(T({ text: up(sub), font: 'Inter-700', size: fit(up(sub), 'Inter-700', 860, 34, 1, 0.12), x: 540, y: top + n * lh - lh * 0.4, color: C, ls: 0.12, anim: A('fade', 0.4 + n * 0.14, 0.5) }));
        break;
      }
      case 'revista': {
        L.push({ type: 'dim', alpha: 0.3, anim: A('fade', 0, 0.5) });
        var big = up(title).charAt(0);
        L.push(T({ text: big, font: 'BodoniModa-900', size: 900, x: 540, y: 1250, color: AC, alpha: 0.55, anim: A('zoom', 0, 1.2) }));
        s = fit(cap(title), 'DMSerifDisplay-400', 960, 190, 1, -0.01); y = 1060;
        L.push(T({ text: cap(title), font: 'DMSerifDisplay-400', size: s, x: 540, y: y, color: C, ls: -0.01, anim: A('blur', 0.3, 0.8) }));
        if (sub) L.push(T({ text: up(sub), font: 'Inter-700', size: fit(up(sub), 'Inter-700', 860, 32, 1, 0.2), x: 540, y: y + 76, color: C, ls: 0.2, anim: A('track', 0.6, 0.7) }));
        L.push(T({ text: up(brand), font: 'DMSerifDisplay-400', size: 64, x: 540, y: 330, color: C, ls: 0.12, anim: A('fade', 0.2, 0.6) }));
        L.push(T({ text: 'EDIÇÃO ' + YEAR, font: 'Inter-700', size: 24, x: 540, y: 380, color: AC, ls: 0.3, anim: A('fade', 0.4, 0.6) }));
        break;
      }
      case 'assinatura':
        L.push({ type: 'dim', alpha: 0.3, anim: A('fade', 0, 0.5) });
        s = fit(cap(title), 'GreatVibes-400', 980, 280); y = 1010;
        L.push(T({ text: cap(title), font: 'GreatVibes-400', size: s, x: 540, y: y, color: C, anim: A('reveal', 0.1, 1.2) }));
        L.push({ type: 'line', x1: 300, y1: y + 50, x2: 780, y2: y + 50, w: 3, color: AC, anim: A('draw', 1.0, 0.6) });
        if (sub) L.push(T({ text: up(sub), font: 'Inter-700', size: fit(up(sub), 'Inter-700', 860, 30, 1, 0.3), x: 540, y: y + 110, color: AC, ls: 0.3, anim: A('fade', 1.1, 0.6) }));
        L.push(T({ text: up(brand), font: 'Inter-400', size: 26, x: 540, y: y - s * 0.9, color: C, ls: 0.4, anim: A('fade', 0.3, 0.6) }));
        break;
      case 'impacto':
        L.push({ type: 'dim', alpha: 0.3, anim: A('fade', 0, 0.3) });
        s = fit(up(title), 'ArchivoBlack-400', 1020, 300, 1, -0.04); y = 1010;
        L.push(T({ text: up(title), font: 'ArchivoBlack-400', size: s, x: 540, y: y, color: C, ls: -0.04, anim: A('zoom', 0.05, 0.6) }));
        L.push({ type: 'box', x: 90, y: y + 34, w: 900, h: 16, color: AC, r: 4, anim: A('wipe', 0.45, 0.4) });
        if (sub) L.push(T({ text: up(sub), font: 'ArchivoBlack-400', size: fit(up(sub), 'ArchivoBlack-400', 880, 54), x: 540, y: y + 120, color: C, anim: A('rise', 0.55, 0.5) }));
        break;
      case 'creditos': {
        L.push({ type: 'dim', alpha: 0.35, anim: A('fade', 0, 0.4) });
        var BR = up(brand);
        credits(L, 230, '#FFFFFF', [['CÂMERA', BR], ['DIREÇÃO', BR], ['UM FILME DE', 'FLUX CINE'], ['MÚSICA', BR]], 0.6);
        s = fit(up(title), 'Anton-400', 840, 280, 1, 0); y = 1000;
        L.push(T({ text: up(title), font: 'Anton-400', size: s, x: 540, y: y, color: C, anim: A('blur', 0.05, 0.9) }));
        var sw3 = width(up(title), 'Anton-400', s);
        L.push(T({ text: '*', font: 'Anton-400', size: s * 0.5, x: 540 - sw3 / 2 - 50, y: y - s * 0.12, color: C, anim: A('pop', 0.5, 0.5) }));
        L.push(T({ text: '*', font: 'Anton-400', size: s * 0.5, x: 540 + sw3 / 2 + 50, y: y - s * 0.12, color: C, anim: A('pop', 0.55, 0.5) }));
        if (sub) L.push(T({ text: up(sub), font: 'ArchivoBlack-400', size: fit(up(sub), 'ArchivoBlack-400', 700, 64), x: 540, y: y + 84, color: AC, anim: A('rise', 0.45, 0.6) }));
        L.push(T({ text: 'ELENCO: ' + BR + ', FLUX CINE, VOCÊ E QUEM ASSISTE ATÉ O FIM', font: 'Oswald-700', size: 22, x: 540, y: 1660, color: AC === '#FFFFFF' ? C : AC, ls: 0.04, anim: A('fade', 0.9, 0.5) }));
        break;
      }
      case 'festival': {
        L.push({ type: 'dim', alpha: 0.5, anim: A('fade', 0, 0.4) });
        [[240, 'VENCEDOR', 'MELHOR CURTA'], [540, 'VENCEDOR', 'FESTIVAL ' + YEAR], [840, 'VENCEDOR', 'MELHOR DIREÇÃO']].forEach(function (q, k) {
          L.push(T({ text: '(', font: 'CormorantGaramond-500', size: 130, x: q[0] - 95, y: 300, color: AC, anim: A('fade', 0.4 + k * 0.1, 0.5) }));
          L.push(T({ text: ')', font: 'CormorantGaramond-500', size: 130, x: q[0] + 95, y: 300, color: AC, anim: A('fade', 0.4 + k * 0.1, 0.5) }));
          L.push(T({ text: q[1], font: 'Inter-700', size: 16, x: q[0], y: 250, color: AC, ls: 0.15, anim: A('fade', 0.45 + k * 0.1, 0.5) }));
          L.push(T({ text: q[2], font: 'Inter-700', size: fit(q[2], 'Inter-700', 150, 18, 1, 0.06), x: q[0], y: 276, color: AC, ls: 0.06, anim: A('fade', 0.5 + k * 0.1, 0.5) }));
          L.push(T({ text: '• • • • •', font: 'Inter-700', size: 12, x: q[0], y: 300, color: AC, anim: A('fade', 0.55 + k * 0.1, 0.5) }));
        });
        s = fit(cap(title), 'Yellowtail-400', 1000, 230); y = 1000;
        L.push(T({ text: cap(title), font: 'Yellowtail-400', size: s, x: 540, y: y, color: C, glow: C, rot: -3, anim: A('flicker', 0.1, 1.1) }));
        if (sub) L.push(T({ text: '( ' + up(sub) + ' )', font: 'Inter-700', size: fit('( ' + up(sub) + ' )', 'Inter-700', 760, 30, 1, 0.12), x: 540, y: y + 110, color: AC, ls: 0.12, anim: A('fade', 0.8, 0.5) }));
        credits(L, 1700, AC, [['CÂMERA', up(brand)], ['DIREÇÃO', up(brand)], ['FILME DE', 'FLUX CINE'], ['MÚSICA', up(brand)]], 1.0);
        break;
      }
      case 'duplo': {
        L.push({ type: 'dim', alpha: 0.38, anim: A('fade', 0, 0.4) });
        [['PRÊMIO SÃO PAULO', 230], ['PRÊMIO RIO', 540], ['PRÊMIO LISBOA', 850]].forEach(function (q, k) { L.push(T({ text: q[0], font: 'Inter-400', size: 20, x: q[1], y: 640, color: '#FFFFFF', ls: 0.15, anim: A('fade', 0.7 + k * 0.06, 0.5) })); });
        s = fit(up(title), 'ArchivoBlack-400', 940, 230, 1, -0.03); y = 1000;
        L.push(T({ text: up(title), font: 'ArchivoBlack-400', size: s, x: 540, y: y, color: C, ls: -0.03, anim: A('stretch', 0.05, 0.7) }));
        var scr2 = cap(sub || brand);
        L.push(T({ text: scr2, font: 'GreatVibes-400', size: fit(scr2, 'GreatVibes-400', 800, Math.round(s * 0.95)), x: 560, y: y + s * 0.18, color: AC, shadow: { dx: 0, dy: 4, color: 'rgba(0,0,0,.45)', sw: 0 }, anim: A('reveal', 0.45, 1.0) }));
        L.push({ type: 'line', x1: 80, y1: y + s * 0.8 + 40, x2: 1000, y2: y + s * 0.8 + 40, w: 1.5, color: '#FFFFFF', anim: A('draw', 0.8, 0.7) });
        L.push(T({ text: 'UM VÍDEO DE ' + up(brand) + ' · EDITADO NO FLUX CINE · ' + YEAR, font: 'Inter-400', size: 18, x: 540, y: y + s * 0.8 + 80, color: '#FFFFFF', ls: 0.12, anim: A('fade', 1.0, 0.5) }));
        break;
      }
      case 'espaco': {
        L.push({ type: 'dim', alpha: 0.28, anim: A('fade', 0, 0.6) });
        credits(L, 200, C, [['DIRIGIDO POR', up(brand)], ['PRODUZIDO POR', 'FLUX CINE'], ['ESCRITO POR', up(brand)]], 0.8);
        s = fit(up(title), 'CormorantGaramond-500', 1000, 240, 1, 0.22); y = 1010;
        L.push(T({ text: up(title), font: 'CormorantGaramond-500', size: s, x: 540, y: y, color: C, ls: 0.22, anim: A('track', 0.1, 1.5) }));
        if (sub) L.push(T({ text: up(sub), font: 'Inter-400', size: fit(up(sub), 'Inter-400', 800, 22, 1, 0.5), x: 540, y: y + 70, color: C, ls: 0.5, anim: A('fade', 1.0, 0.8) }));
        L.push(T({ text: 'ESTREIA ' + DATE, font: 'Inter-700', size: 18, x: 540, y: 1740, color: C, ls: 0.4, anim: A('fade', 1.2, 0.6) }));
        break;
      }
      case 'condensado': {
        L.push({ type: 'dim', alpha: 0.3, anim: A('fade', 0, 0.4) });
        var cw3 = up(title).split(/\s+/).filter(Boolean), last = cw3.length > 1 ? cw3.pop() : '', first = cw3.join(' ');
        var full = first + (last ? ' ' + last : ''), s5 = fit(full, 'BebasNeue-400', 1000, 260, 0.9, 0); y = 1000;
        var fw = width(first + ' ', 'BebasNeue-400', s5) * 0.9, lw2 = width(last, 'BebasNeue-400', s5) * 0.9, x5 = 540 - (fw + lw2) / 2;
        L.push(T({ text: first, font: 'BebasNeue-400', size: s5, x: x5, y: y, align: 'left', color: C, sx: 0.9, anim: A('slideL', 0.05, 0.6) }));
        if (last) L.push(T({ text: last, font: 'BebasNeue-400', size: s5, x: x5 + fw, y: y, align: 'left', color: AC, sx: 0.9, anim: A('slideR', 0.2, 0.6) }));
        if (sub) L.push(T({ text: up(sub), font: 'Oswald-700', size: fit(up(sub), 'Oswald-700', 760, 36, 1, 0.08), x: 540, y: y + 66, color: C, ls: 0.08, anim: A('fade', 0.6, 0.5) }));
        L.push(T({ text: 'ELENCO: ' + up(brand) + ', FLUX CINE E VOCÊ', font: 'Oswald-700', size: 24, x: 540, y: 1600, color: AC, ls: 0.05, anim: A('fade', 0.9, 0.5) }));
        L.push(T({ text: 'UM FILME ORIGINAL · ' + YEAR, font: 'Oswald-700', size: 24, x: 540, y: 1636, color: AC, ls: 0.05, anim: A('fade', 0.95, 0.5) }));
        break;
      }
      case 'sonho': {
        L.push({ type: 'dim', alpha: 0.22, anim: A('fade', 0, 0.4) });
        var sw4 = cap(title).split(/\s+/).filter(Boolean), sh1 = sw4.slice(0, Math.ceil(sw4.length / 2)).join(' '), sh2 = sw4.slice(Math.ceil(sw4.length / 2)).join(' ');
        var s6 = Math.min(fit(sh1, 'PlayfairDisplay-900', 960, 220), sh2 ? fit(sh2, 'PlayfairDisplay-900', 960, 260) : 999); y = sh2 ? 900 : 1000;
        L.push(T({ text: sh1, font: 'PlayfairDisplay-900', size: s6, x: 540, y: y, color: C, shadow: { dx: 0, dy: Math.round(s6 * 0.06), color: AC, sw: Math.round(s6 * 0.025) }, anim: A('pop', 0.05, 0.6) }));
        if (sh2) L.push(T({ text: sh2, font: 'PlayfairDisplay-900', size: s6 * 1.15, x: 540, y: y + s6 * 1.05, color: C, shadow: { dx: 0, dy: Math.round(s6 * 0.07), color: AC, sw: Math.round(s6 * 0.028) }, anim: A('pop', 0.2, 0.6) }));
        if (sub) L.push(T({ text: up(sub), font: 'Inter-700', size: fit(up(sub), 'Inter-700', 700, 26, 1, 0.3), x: 540, y: y - s6 * 0.95, color: '#FFFFFF', ls: 0.3, anim: A('fade', 0.6, 0.5) }));
        credits(L, 1660, '#FFFFFF', [['CÂMERA', up(brand)], ['DIREÇÃO', up(brand)], ['FILME DE', 'FLUX CINE']], 0.9);
        break;
      }
      case 'documentario': {
        L.push({ type: 'dim', alpha: 0.45, anim: A('fade', 0, 0.4) });
        s = fit(cap(title), 'GreatVibes-400', 1000, 270); y = 980;
        L.push(T({ text: cap(title), font: 'GreatVibes-400', size: s, x: 540, y: y, color: C, rot: -4, shadow: { dx: 0, dy: 6, color: 'rgba(0,0,0,.5)', sw: 0 }, anim: A('reveal', 0.05, 1.1) }));
        var tag = up(sub || 'documentário');
        L.push(T({ text: tag, font: 'ArchivoBlack-400', size: fit(tag, 'ArchivoBlack-400', 700, 70, 1, 0.02), x: 540, y: y + 110, color: AC, ls: 0.02, anim: A('zoom', 0.7, 0.5) }));
        credits(L, 1680, AC, [['CÂMERA', up(brand)], ['DIREÇÃO', up(brand)], ['FILME DE', 'FLUX CINE'], ['MÚSICA', up(brand)]], 1.0);
        break;
      }
      case 'capitulo': {
        L.push({ type: 'dim', alpha: 0.42, anim: A('fade', 0, 0.6) });
        y = 1000; s = fit(cap(title), 'PlayfairDisplay-600i', 960, 200, 1, -0.01);
        L.push(T({ text: 'CAPÍTULO 01', font: 'Inter-700', size: 26, x: 540, y: y - s - 70, color: AC, ls: 0.6, anim: A('track', 0.2, 1.0) }));
        L.push({ type: 'line', x1: 500, y1: y - s - 30, x2: 580, y2: y - s - 30, w: 2, color: AC, anim: A('draw', 0.5, 0.6) });
        L.push(T({ text: cap(title), font: 'PlayfairDisplay-600i', size: s, x: 540, y: y, color: C, ls: -0.01, anim: A('blur', 0.15, 1.1) }));
        if (sub) L.push(T({ text: up(sub), font: 'Inter-400', size: fit(up(sub), 'Inter-400', 800, 28, 1, 0.4), x: 540, y: y + 90, color: C, ls: 0.4, anim: A('fade', 0.9, 0.7) }));
        L.push(T({ text: up(brand) + '  ·  ' + YEAR, font: 'Inter-400', size: 22, x: 540, y: 1760, color: C, ls: 0.3, anim: A('fade', 1.0, 0.6) }));
        break;
      }
      case 'eco': {
        L.push({ type: 'dim', alpha: 0.3, anim: A('fade', 0, 0.3) });
        s = fit(up(title), 'Anton-400', 1000, 300, 1, -0.01); y = 1000;
        [-3, -2, -1, 1, 2, 3].forEach(function (k) {
          L.push(T({ text: up(title), font: 'Anton-400', size: s, x: 540, y: y + k * s * 0.82, color: C, ls: -0.01, alpha: 0.55 - Math.abs(k) * 0.15, anim: A('rise', 0.05 + Math.abs(k) * 0.07, 0.5) }));
        });
        L.push(T({ text: up(title), font: 'Anton-400', size: s, x: 540, y: y, color: AC, ls: -0.01, anim: A('zoom', 0, 0.55) }));
        if (sub) L.push(T({ text: up(sub), font: 'Inter-700', size: fit(up(sub), 'Inter-700', 800, 34, 1, 0.3), x: 540, y: y + s * 3.1, color: C, ls: 0.3, anim: A('fade', 0.6, 0.5) }));
        break;
      }
      case 'manchete': {
        L.push({ type: 'dim', alpha: 0.45, anim: A('fade', 0, 0.4) });
        y = 980;
        L.push({ type: 'line', x1: 70, y1: 560, x2: 1010, y2: 560, w: 5, color: C, anim: A('draw', 0.05, 0.6) });
        L.push({ type: 'line', x1: 70, y1: 574, x2: 1010, y2: 574, w: 2, color: C, anim: A('draw', 0.1, 0.6) });
        L.push(T({ text: 'O DIÁRIO ' + up(brand), font: 'BodoniModa-900', size: fit('O DIÁRIO ' + up(brand), 'BodoniModa-900', 940, 74), x: 540, y: 530, color: C, anim: A('fade', 0.15, 0.5) }));
        L.push(T({ text: up(sub || 'edição extra'), font: 'Inter-700', size: 24, x: 70, y: 620, align: 'left', color: AC, ls: 0.25, anim: A('fade', 0.3, 0.5) }));
        L.push(T({ text: DATE, font: 'Inter-700', size: 24, x: 1010, y: 620, align: 'right', color: C, ls: 0.15, anim: A('fade', 0.3, 0.5) }));
        var hw = up(title).split(/\s+/).filter(Boolean), hh = Math.ceil(hw.length / 2), h1 = hw.slice(0, hh).join(' '), h2 = hw.slice(hh).join(' ');
        var hs = Math.min(fit(h1, 'PlayfairDisplay-900', 940, 260, 0.78), h2 ? fit(h2, 'PlayfairDisplay-900', 940, 260, 0.78) : 999);
        L.push(T({ text: h1, font: 'PlayfairDisplay-900', size: hs, x: 540, y: 640 + hs, color: C, sx: 0.78, anim: A('stretch', 0.35, 0.7) }));
        if (h2) L.push(T({ text: h2, font: 'PlayfairDisplay-900', size: hs, x: 540, y: 640 + hs * 1.95, color: C, sx: 0.78, anim: A('stretch', 0.5, 0.7) }));
        var yl = 640 + hs * (h2 ? 1.95 : 1) + 50;
        L.push({ type: 'line', x1: 70, y1: yl, x2: 1010, y2: yl, w: 2, color: C, anim: A('draw', 0.7, 0.6) });
        L.push(T({ text: 'PÁGINA 1  ·  PREÇO: SUA ATENÇÃO', font: 'Inter-400', size: 20, x: 540, y: yl + 40, color: C, ls: 0.2, anim: A('fade', 0.9, 0.5) }));
        break;
      }
      case 'gravando': {
        L.push({ type: 'dim', alpha: 0.12, anim: A('fade', 0, 0.3) });
        [[60, 120, 160, 120], [60, 120, 60, 220], [1020, 120, 920, 120], [1020, 120, 1020, 220], [60, 1800, 160, 1800], [60, 1700, 60, 1800], [1020, 1800, 920, 1800], [1020, 1700, 1020, 1800]].forEach(function (q, k) {
          L.push({ type: 'line', x1: q[0], y1: q[1], x2: q[2], y2: q[3], w: 5, color: C, anim: A('fade', 0.05 + k * 0.02, 0.3) });
        });
        L.push({ type: 'box', x: 100, y: 170, w: 34, h: 34, r: 17, color: AC, anim: A('flicker', 0.1, 2.5) });
        L.push(T({ text: 'REC', font: 'SpaceMono-700', size: 40, x: 150, y: 202, align: 'left', color: C, anim: A('fade', 0.1, 0.3) }));
        L.push(T({ text: '00:00:03:12', font: 'SpaceMono-700', size: 34, x: 980, y: 202, align: 'right', color: C, anim: A('fade', 0.15, 0.3) }));
        s = fit(up(title), 'SpaceMono-700', 920, 120); y = 980;
        L.push(T({ text: up(title), font: 'SpaceMono-700', size: s, x: 540, y: y, color: C, shadow: { dx: 4, dy: 4, color: 'rgba(0,0,0,.6)', sw: 0 }, anim: A('type', 0.3, 0.9) }));
        if (sub) L.push(T({ text: '> ' + up(sub), font: 'SpaceMono-700', size: fit('> ' + up(sub), 'SpaceMono-700', 860, 36), x: 540, y: y + 80, color: C, anim: A('fade', 1.1, 0.4) }));
        L.push(T({ text: DATE.replace(/\./g, ' ') , font: 'SpaceMono-700', size: 44, x: 980, y: 1760, align: 'right', color: '#FFA53A', shadow: { dx: 0, dy: 0, color: 'rgba(255,120,0,.5)', sw: 3 }, anim: A('fade', 0.2, 0.4) }));
        L.push(T({ text: 'SP  ' + up(brand), font: 'SpaceMono-700', size: 30, x: 100, y: 1760, align: 'left', color: C, anim: A('fade', 0.25, 0.4) }));
        break;
      }
      case 'cartaz': {
        L.push({ type: 'dim', alpha: 0.28, anim: A('fade', 0, 0.3) });
        var cw2 = up(title).split(/\s+/).filter(Boolean), c1 = cw2.slice(0, Math.max(1, cw2.length - 1)).join(' '), c2 = cw2.length > 1 ? cw2[cw2.length - 1] : '';
        var cs1 = fit(c1, 'Unbounded-800', 960, 170, 1, -0.02); y = 940;
        L.push(T({ text: c1, font: 'Unbounded-800', size: cs1, x: 540, y: y, color: C, ls: -0.02, anim: A('slideL', 0.05, 0.5) }));
        if (c2) {
          var cs2 = fit(c2, 'Unbounded-800', 860, 200, 1, -0.02), c2w = width(c2, 'Unbounded-800', cs2) * 0.98;
          L.push({ type: 'box', x: 540 - c2w / 2 - 34, y: y + 40, w: c2w + 68, h: cs2 * 1.12, color: AC, r: 6, anim: A('wipe', 0.3, 0.4) });
          L.push(T({ text: c2, font: 'Unbounded-800', size: cs2, x: 540, y: y + 40 + cs2 * 0.92, color: '#FFFFFF', ls: -0.02, anim: A('pop', 0.45, 0.5) }));
        }
        if (sub) L.push(T({ text: up(sub), font: 'Oswald-700', size: fit(up(sub), 'Oswald-700', 800, 46, 1, 0.2), x: 540, y: y - cs1 - 30, color: AC, ls: 0.2, anim: A('fade', 0.5, 0.5) }));
        L.push(T({ text: '#' + up(brand).replace(/\s+/g, ''), font: 'Oswald-700', size: 36, x: 540, y: 1700, color: C, ls: 0.15, anim: A('fade', 0.8, 0.5) }));
        break;
      }
      case 'luxo': {
        L.push({ type: 'vignette', alpha: 0.9, anim: A('fade', 0, 0.8) });
        L.push({ type: 'dim', alpha: 0.25, anim: A('fade', 0, 0.8) });
        y = 1000; s = fit(up(title), 'BodoniModa-900', 900, 130, 1, 0.35);
        L.push({ type: 'oval', cx: 540, cy: y - s - 150, rx: 62, ry: 62, w: 2, color: C, anim: A('fade', 0.2, 0.9) });
        L.push(T({ text: up(brand).charAt(0), font: 'BodoniModa-900', size: 70, x: 540, y: y - s - 126, color: C, anim: A('blur', 0.25, 0.9) }));
        L.push(T({ text: up(title), font: 'BodoniModa-900', size: s, x: 540, y: y, color: C, ls: 0.35, anim: A('track', 0.2, 1.4) }));
        L.push({ type: 'line', x1: 380, y1: y + 50, x2: 700, y2: y + 50, w: 1.5, color: AC, anim: A('draw', 0.9, 0.9) });
        if (sub) L.push(T({ text: up(sub), font: 'CormorantGaramond-600i', size: fit(sub, 'CormorantGaramond-600i', 800, 44), x: 540, y: y + 112, color: C, ls: 0.1, anim: A('fade', 1.1, 0.8) }));
        L.push(T({ text: 'EST. ' + YEAR, font: 'Inter-400', size: 20, x: 540, y: 1780, color: C, ls: 0.6, anim: A('fade', 1.2, 0.8) }));
        break;
      }
      case 'letreiro': {
        L.push({ type: 'dim', alpha: 0.5, anim: A('fade', 0, 0.4) });
        s = fit(cap(title), 'Yellowtail-400', 960, 250); y = 1000;
        L.push(T({ text: cap(title), font: 'Yellowtail-400', size: s, x: 540, y: y, color: '#FFFFFF', glow: C, shadow: { dx: 0, dy: 0, color: C, sw: Math.max(3, s * 0.03) }, rot: -4, anim: A('flicker', 0.1, 1.2) }));
        if (sub) L.push(T({ text: up(sub), font: 'Unbounded-800', size: fit(up(sub), 'Unbounded-800', 760, 40, 1, 0.25), x: 540, y: y + 120, color: AC, ls: 0.25, glow: C, anim: A('flicker', 0.7, 0.8) }));
        L.push(T({ text: up(brand), font: 'Inter-700', size: 24, x: 540, y: y - s * 0.95, color: C, ls: 0.5, anim: A('fade', 0.9, 0.6) }));
        break;
      }
      case 'entrevista': {
        var nm = title, role = sub || brand;
        s = fit(nm, 'Montserrat-800', 760, 74); var rs = fit(up(role), 'Inter-700', 700, 30, 1, 0.12);
        var nw = Math.max(width(nm, 'Montserrat-800', s), width(up(role), 'Inter-700', rs) * 1.12) + 70; y = 1480;
        L.push({ type: 'box', x: 70, y: y - s * 1.05, w: 12, h: s * 1.05 + rs * 2.2, color: AC, r: 2, anim: A('fade', 0, 0.25) });
        L.push({ type: 'box', x: 82, y: y - s * 1.05, w: nw, h: s * 1.3, color: 'rgba(10,10,12,0.82)', r: 0, anim: A('wipe', 0.05, 0.45) });
        L.push(T({ text: nm, font: 'Montserrat-800', size: s, x: 112, y: y, align: 'left', color: C, anim: A('slideL', 0.25, 0.45) }));
        L.push({ type: 'box', x: 82, y: y + s * 0.25, w: nw * 0.8, h: rs * 1.9, color: AC, r: 0, anim: A('wipe', 0.35, 0.45) });
        L.push(T({ text: up(role), font: 'Inter-700', size: rs, x: 112, y: y + s * 0.25 + rs * 1.32, align: 'left', color: '#0A0A0A', ls: 0.12, anim: A('fade', 0.6, 0.3) }));
        break;
      }
    }
    return L;
  }

  /* ---------- desenho do título ---------- */
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function outCubic(a) { var b = 1 - a; return 1 - b * b * b; }
  function inCubic(a) { return a * a * a; }
  function outBack(a) { var c = 1.7; a -= 1; return 1 + a * a * ((c + 1) * a + c); }
  function flick(t) { var k = Math.floor(t * 22); return ((k * 73 + 11) % 7) > 2 ? 1 : 0.25; }
  var hasLS = 'letterSpacing' in mctx;

  function fillSpaced(ctx, text, x, y, lsPx, mode) {
    if (!lsPx || hasLS) { if (hasLS) ctx.letterSpacing = (lsPx || 0) + 'px'; mode === 's' ? ctx.strokeText(text, x, y) : ctx.fillText(text, x, y); if (hasLS) ctx.letterSpacing = '0px'; return; }
    for (var i = 0; i < text.length; i++) { var ch = text[i]; mode === 's' ? ctx.strokeText(ch, x, y) : ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + lsPx; }
  }
  /* texto em arco (centro do círculo abaixo da linha): cada letra gira junto */
  function arcText(ctx, text, r, lsPx, ox, oy) {
    var tot = 0, i;
    for (i = 0; i < text.length; i++) tot += ctx.measureText(text[i]).width + lsPx;
    var x = -tot / 2;
    for (i = 0; i < text.length; i++) {
      var cw = ctx.measureText(text[i]).width + lsPx, a = (x + cw / 2) / r;
      ctx.save(); ctx.translate(ox + r * Math.sin(a), oy + r - r * Math.cos(a)); ctx.rotate(a); ctx.fillText(text[i], -cw / 2 + lsPx / 2, 0); ctx.restore();
      x += cw;
    }
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }

  function draw(ctx, layers, t, tEnd, tf) {
    tf = tf || { ox: 0, oy: 0, s: 1 };
    var out = inCubic(clamp((t - (tEnd - 0.45)) / 0.45));
    for (var i = 0; i < layers.length; i++) {
      var el = layers[i], an = el.anim || A('fade', 0, 0.5);
      var p = clamp((t - an.d) / an.u), e = outCubic(p);
      var alpha = e * (1 - out) * (el.alpha != null && el.type === 'text' ? el.alpha : 1);
      if (an.k === 'flicker' && p < 1) alpha *= flick(t);
      if (an.k === 'glitch') alpha = (p > 0 ? 1 : 0) * (1 - out) * (p < 1 ? flick(t + 0.3) : 1);
      if (alpha <= 0.004) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (el.type === 'dim') { ctx.fillStyle = 'rgba(0,0,0,' + el.alpha + ')'; ctx.fillRect(0, 0, W, H); ctx.restore(); continue; }
      if (el.type === 'vignette') {
        var g = ctx.createRadialGradient(540, 960, 380, 540, 960, 760);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.82, 'rgba(0,0,0,' + el.alpha * 0.85 + ')'); g.addColorStop(1, 'rgba(0,0,0,' + el.alpha + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); continue;
      }
      ctx.translate(540 + tf.ox, 960 + tf.oy); ctx.scale(tf.s, tf.s); ctx.translate(-540, -960);
      if (el.type === 'line') {
        var cx = (el.x1 + el.x2) / 2, half = (el.x2 - el.x1) / 2 * (an.k === 'draw' ? e : 1);
        ctx.strokeStyle = el.color; ctx.lineWidth = el.w; ctx.beginPath(); ctx.moveTo(cx - half, el.y1); ctx.lineTo(cx + half, el.y2); ctx.stroke(); ctx.restore(); continue;
      }
      if (el.type === 'oval') { ctx.strokeStyle = el.color; ctx.lineWidth = el.w; ctx.beginPath(); ctx.ellipse(el.cx, el.cy, el.rx, el.ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); continue; }
      if (el.type === 'box') {
        var bw = el.w * (an.k === 'wipe' ? e : 1);
        ctx.fillStyle = el.color; rrect(ctx, el.x, el.y, Math.max(1, bw), el.h, Math.min(el.r || 0, bw / 2)); ctx.fill(); ctx.restore(); continue;
      }
      // texto
      var blur = 0, scale = 1, sy = 1, dx = 0, dy = 0, ls = el.ls, reveal = 1, text = el.text;
      if (an.k === 'blur') { blur = 30 * (1 - e); scale = 1.12 - 0.12 * e; ls += 0.25 * (1 - e); }
      else if (an.k === 'rise') { dy = 70 * (1 - e); blur = 10 * (1 - e); }
      else if (an.k === 'reveal') { reveal = e; }
      else if (an.k === 'stretch') { sy = 0.35 + 0.65 * e; blur = 18 * (1 - e); }
      else if (an.k === 'track') { ls += 0.5 * (1 - e); blur = 8 * (1 - e); }
      else if (an.k === 'pop') { scale = 0.55 + 0.45 * outBack(p); }
      else if (an.k === 'zoom') { scale = 1.9 - 0.9 * e; blur = 20 * (1 - e); }
      else if (an.k === 'slideL') { dx = -260 * (1 - e); blur = 12 * (1 - e); }
      else if (an.k === 'slideR') { dx = 260 * (1 - e); blur = 12 * (1 - e); }
      else if (an.k === 'type') { text = el.text.slice(0, Math.round(el.text.length * p)); }
      else if (an.k === 'glitch' && p < 1) { dx = (flick(t * 1.7) - 0.6) * 30; }
      blur += 16 * out; dy -= 34 * out;
      ctx.font = el.size + 'px "' + el.font + '"';
      var lsPx = ls * el.size, fullW = (ctx.measureText(el.text).width + lsPx * el.text.length) * el.sx;
      var x0 = el.align === 'left' ? el.x : el.align === 'right' ? el.x - fullW : el.x - fullW / 2;
      ctx.translate(el.x + dx, el.y + dy);
      if (el.rot) ctx.rotate(el.rot * Math.PI / 180);
      ctx.scale(scale * el.sx, scale * sy);
      var lx = (x0 - el.x) / el.sx;
      if (reveal < 1) { ctx.beginPath(); ctx.rect(lx - 40, -el.size * 1.4, (fullW / el.sx + 80) * reveal, el.size * 2.4); ctx.clip(); }
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      var baseFilter = blur > 0.5 ? 'blur(' + blur.toFixed(1) + 'px)' : 'none';
      if (el.glow) { ctx.filter = 'blur(' + (18 + blur).toFixed(1) + 'px)'; ctx.fillStyle = el.glow; ctx.strokeStyle = el.glow; ctx.lineWidth = (el.outline || 4) * 2; el.outline ? fillSpaced(ctx, text, lx, 0, lsPx, 's') : fillSpaced(ctx, text, lx, 0, lsPx, 'f'); }
      ctx.filter = baseFilter;
      if (el.rgb) {
        var off = el.rgb[2] * (an.k === 'glitch' && p < 1 ? 2.2 : 1);
        ctx.globalAlpha = alpha * 0.85; ctx.fillStyle = el.rgb[0]; fillSpaced(ctx, text, lx - off, 0, lsPx, 'f');
        ctx.fillStyle = el.rgb[1]; fillSpaced(ctx, text, lx + off, 0, lsPx, 'f'); ctx.globalAlpha = alpha;
      }
      if (el.shadow && !el.arc) {
        ctx.fillStyle = el.shadow.color; ctx.strokeStyle = el.shadow.color;
        if (el.shadow.sw) { ctx.lineWidth = el.shadow.sw * 2; ctx.lineJoin = 'round'; fillSpaced(ctx, text, lx, 0, lsPx, 's'); }
        fillSpaced(ctx, text, lx + el.shadow.dx / el.sx, el.shadow.dy, lsPx, 'f');
      }
      if (el.arc) {
        if (el.shadow) { ctx.fillStyle = el.shadow.color; arcText(ctx, text, el.arc, lsPx, el.shadow.dx / el.sx, el.shadow.dy); }
        ctx.fillStyle = el.color; arcText(ctx, text, el.arc, lsPx, 0, 0);
      }
      else if (el.outline) { ctx.strokeStyle = el.color; ctx.lineWidth = el.outline; ctx.lineJoin = 'round'; fillSpaced(ctx, text, lx, 0, lsPx, 's'); }
      else { ctx.fillStyle = el.color; fillSpaced(ctx, text, lx, 0, lsPx, 'f'); }
      if (el.cursor && an.k === 'type' && (p < 1 || Math.floor(t * 2.5) % 2 === 0)) {
        ctx.filter = 'none'; ctx.font = el.size + 'px "' + el.font + '"';
        var cw = ctx.measureText(text).width + lsPx * text.length;
        ctx.fillStyle = el.cursor; ctx.fillRect(lx + cw + 8, -el.size * 0.78, el.size * 0.5, el.size * 0.9);
      }
      ctx.restore();
    }
  }

  /* ---------- legenda ---------- */
  var CAP_DEFAULT = { font: 'Montserrat-800', upper: false, size: 1, ls: 0, shadow: 'outline', hl: 'box', anim: 'pop', y: 0.73, color: '#FFFFFF', accent: '#FF7A1A' };
  function capWrap(ctx, words, maxW, space) {
    var lines = [], lw = 0, from = 0;
    for (var i = 0; i < words.length; i++) {
      var w = ctx.measureText(words[i]).width;
      if (i > from && lw + space + w > maxW) { lines.push([from, i]); from = i; lw = w; } else lw += (i > from ? space : 0) + w;
    }
    lines.push([from, words.length]);
    return lines;
  }
  function drawCaption(ctx, k, t, cs, emph) {
    cs = cs || CAP_DEFAULT;
    var p = clamp((t - k.s) / 0.16), a = outCubic(p), sc = 1, alpha = a;
    if (cs.anim === 'pop') sc = 0.86 + 0.14 * a;
    else if (cs.anim === 'bounce') sc = 0.6 + 0.4 * outBack(p);
    else if (cs.anim === 'none' || cs.anim === 'type') alpha = 1;
    var size = 76 * cs.size * (emph ? 1.22 : 1);
    ctx.save();
    ctx.font = size + 'px "' + cs.font + '"';
    if (hasLS) ctx.letterSpacing = (cs.ls * size) + 'px';
    var words = k.words.map(function (w) { return cs.upper ? w.w.toUpperCase() : w.w; });
    var space = ctx.measureText(' ').width * 1.1 + cs.ls * size, lines = capWrap(ctx, words, 940, space);
    var lh = size * 1.28, baseY = H * cs.y - lh * (lines.length - 1) / 2;
    ctx.translate(540, baseY); ctx.scale(sc, sc); ctx.translate(-540, -baseY);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    for (var li = 0; li < lines.length; li++) {
      var L = lines[li], tot = 0;
      for (var i = L[0]; i < L[1]; i++) tot += ctx.measureText(words[i]).width + (i > L[0] ? space : 0);
      var x = 540 - tot / 2, y = baseY + li * lh;
      for (var j = L[0]; j < L[1]; j++) {
        var ww = ctx.measureText(words[j]).width, wd = k.words[j];
        var vis = cs.anim !== 'type' || t >= wd.s - 0.05;
        if (vis) {
          var on = t >= wd.s && t < wd.e + 0.08, color = cs.color, boxed = on && cs.hl === 'box';
          ctx.globalAlpha = alpha;
          if (boxed) { ctx.fillStyle = cs.accent; rrect(ctx, x - 14, y - size * 0.86, ww + 28, size * 1.1, 16); ctx.fill(); color = '#0A0A0A'; }
          else if (on && cs.hl === 'color') color = cs.accent;
          if (!boxed) {
            if (cs.shadow === 'outline') { ctx.strokeStyle = '#000'; ctx.lineWidth = size * 0.16; ctx.strokeText(words[j], x, y); }
            else if (cs.shadow === 'hard') { ctx.fillStyle = '#000'; ctx.fillText(words[j], x + size * 0.07, y + size * 0.07); }
            else if (cs.shadow === 'soft') { ctx.filter = 'blur(' + (size * 0.14).toFixed(1) + 'px)'; ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillText(words[j], x, y + size * 0.06); ctx.filter = 'none'; }
            else if (cs.shadow === 'glow') { ctx.filter = 'blur(' + (size * 0.18).toFixed(1) + 'px)'; ctx.fillStyle = cs.accent; ctx.fillText(words[j], x, y); ctx.filter = 'none'; }
          }
          ctx.fillStyle = color; ctx.fillText(words[j], x, y);
          if (on && cs.hl === 'underline') { ctx.fillStyle = cs.accent; rrect(ctx, x, y + 14, ww, 10, 5); ctx.fill(); }
        }
        x += ww + space;
      }
    }
    if (hasLS) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  var FAMS = ['CormorantGaramond-500', 'CormorantGaramond-600i', 'PermanentMarker-400', 'DMSerifDisplay-400', 'GreatVibes-400', 'Yellowtail-400', 'BodoniModa-900', 'Shrikhand-400', 'PlayfairDisplay-900', 'ArchivoBlack-400', 'Anton-400', 'Inter-400', 'Inter-700', 'BebasNeue-400', 'Unbounded-800', 'SpaceGrotesk-700', 'Caveat-700', 'PlayfairDisplay-600i', 'SpaceMono-700', 'Montserrat-800', 'Poppins-800', 'Oswald-700', 'Bangers-400'];
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(FAMS.map(function (f) { return document.fonts.load('40px "' + f + '"').catch(function () {}); }));
  }

  root.FluxTitles = { MODELS: MODELS, CATS: [['all', 'Todos'], ['new', 'Novos'], ['cinema', 'Cinema'], ['viral', 'Viral'], ['lifestyle', 'Lifestyle'], ['retro', 'Retrô'], ['tech', 'Moderno']], layout: layout, draw: draw, drawCaption: drawCaption, CAP_DEFAULT: CAP_DEFAULT, loadFonts: loadFonts, W: W, H: H };
})(window);
