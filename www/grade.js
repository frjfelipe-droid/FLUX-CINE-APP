/* FLUX CINE — Color Cine: coloração de cinema + granulação.
 * O mesmo cálculo roda na prévia (WebGL, aqui), no Android (CineGrade.java) e no iOS (CineGrade.swift). */
(function (root) {
  function P(o) {
    var d = { lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], shadow: [0, 0, 0], high: [0, 0, 0], sat: 1, contrast: 1, fade: 0, mono: 0 };
    for (var k in o) d[k] = o[k];
    return d;
  }
  var PRESETS = [
    { id: 'none', name: 'Original', sw: ['#9CA3AF', '#4B5563'], p: P({}) },
    { id: 'tealorange', name: 'Blockbuster', sw: ['#0E7C86', '#F29A4A'], p: P({ lift: [0, 0.02, 0.04], gain: [1.05, 1, 0.95], shadow: [-0.05, 0.02, 0.07], high: [0.09, 0.03, -0.06], sat: 1.12, contrast: 1.14, fade: 0.02 }) },
    { id: 'portra', name: 'Kodak 400', sw: ['#E9C9A0', '#7A5A3A'], p: P({ lift: [0.03, 0.02, 0], gain: [1.06, 1.02, 0.94], shadow: [0.02, 0, -0.02], high: [0.05, 0.03, 0], sat: 0.92, contrast: 1.02, fade: 0.07 }) },
    { id: 'fuji', name: 'Fuji Verde', sw: ['#5E8F72', '#D8E3C8'], p: P({ lift: [0, 0.03, 0.02], gain: [0.98, 1.03, 1], shadow: [-0.02, 0.04, 0.03], high: [0.02, 0.03, -0.03], sat: 0.95, contrast: 1.06, fade: 0.06 }) },
    { id: 'golden', name: 'Hora Dourada', sw: ['#F2B35B', '#8A4B1E'], p: P({ gain: [1.08, 1, 0.86], shadow: [0.02, 0, -0.02], high: [0.08, 0.04, -0.06], sat: 1.06, contrast: 1.06 }) },
    { id: 'vintage', name: 'Anos 70', sw: ['#C9A25E', '#6B4A3A'], p: P({ lift: [0.06, 0.04, 0], gain: [1.02, 0.98, 0.85], shadow: [0.04, 0.02, -0.04], high: [0.06, 0.04, -0.06], sat: 0.8, contrast: 0.95, fade: 0.13 }) },
    { id: 'bleach', name: 'Bleach Bypass', sw: ['#A3A9A6', '#2E3431'], p: P({ high: [0.02, 0.02, 0.02], sat: 0.45, contrast: 1.32 }) },
    { id: 'moon', name: 'Luar', sw: ['#5C7CB8', '#1B2440'], p: P({ gain: [0.9, 0.98, 1.1], shadow: [-0.03, 0, 0.07], high: [-0.02, 0.01, 0.05], sat: 0.85, contrast: 1.1, fade: 0.04 }) },
    { id: 'neon', name: 'Neon Noite', sw: ['#C24BFF', '#1FC8E8'], p: P({ gain: [1, 0.92, 1.12], shadow: [0.05, -0.02, 0.09], high: [0.07, -0.02, 0.06], sat: 1.22, contrast: 1.16 }) },
    { id: 'noir', name: 'Noir P&B', sw: ['#E5E5E5', '#111111'], p: P({ mono: 1, sat: 0, contrast: 1.36, fade: 0.03 }) }
  ];
  function find(id) { for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i]; return PRESETS[0]; }

  /* parâmetros completos que vão para o shader (prévia e vídeo final) */
  function params(g) {
    var p = find(g.id).p, o = {};
    for (var k in p) o[k] = p[k];
    o.amount = g.id === 'none' ? 0 : (g.amount == null ? 1 : g.amount);
    o.grain = g.grain || 0; o.vignette = g.vignette || 0; o.bars = g.bars ? 0.118 : 0;
    return o;
  }
  function isOff(o) { return o.amount <= 0.001 && o.grain <= 0.001 && o.vignette <= 0.001 && !o.bars; }

  var FS = [
    'precision mediump float;',
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#endif',
    'uniform sampler2D uTex; uniform vec2 uScale; uniform vec2 uOff;',
    'varying vec2 vUv; varying vec2 vScr;',
    'uniform vec3 uLift, uGamma, uGain, uShadow, uHigh;',
    'uniform float uSat, uContrast, uFade, uMono, uAmount, uGrain, uVignette, uBars, uTime, uAspect;',
    'uniform float uTrans, uTd, uFx, uFxAmt;',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); float a = hash(i); float b = hash(i + vec2(1.0, 0.0)); float c2 = hash(i + vec2(0.0, 1.0)); float d2 = hash(i + vec2(1.0, 1.0)); return mix(mix(a, b, f.x), mix(c2, d2, f.x), f.y); }',
    'vec3 tap(vec2 u){ return texture2D(uTex, (u - 0.5) * uScale + 0.5 + uOff).rgb; }',
    'void main(){',
    '',
    '  vec2 u = vec2(vScr.x, 1.0 - vScr.y);',
    '  float fr2 = floor(uTime * 24.0);',
    '  float crtMask = 1.0;',
    '  if (uFx > 3.5 && uFx < 4.5) {',
    '    vec2 cc = u - 0.5; float r2 = dot(cc, cc);',
    '    u = 0.5 + cc * (1.0 + 0.16 * uFxAmt * r2);',
    '    crtMask = step(0.0, u.x) * step(u.x, 1.0) * step(0.0, u.y) * step(u.y, 1.0);',
    '  }',
    '  if (uFx > 8.5 && uFx < 9.5) {',
    '    float fb = floor(uTime * 10.0); float row = floor(u.y * 18.0);',
    '    float on = step(0.82, hash(vec2(row, fb))) * step(0.35, hash(vec2(fb, 7.0)));',
    '    u.x += (hash(vec2(row * 3.1, fb)) - 0.5) * 0.12 * uFxAmt * on;',
    '  }',
    '  float w = clamp(1.0 - abs(uTd) / 0.22, 0.0, 1.0); w = w * w * (3.0 - 2.0 * w);',
    '  if (uTrans < 0.5) w = 0.0;',
    '  vec3 src;',
    '  if (w > 0.001 && uTrans < 1.5) {',
    '    vec2 c0 = (u - 0.5) / (1.0 + 0.22 * w) + 0.5; vec2 dir = (c0 - 0.5) * 0.07 * w;',
    '    src = (tap(c0) + tap(c0 - dir) + tap(c0 - 2.0 * dir) + tap(c0 + dir)) * 0.25;',
    '  } else if (w > 0.001 && uTrans < 2.5) {',
    '    float sg = uTd < 0.0 ? 1.0 : -1.0; vec2 c1 = u + vec2(sg * 0.3 * w * w, 0.0); vec3 acc = vec3(0.0);',
    '    for (int i = 0; i < 10; i++) { float f = float(i) / 9.0 - 0.5; acc += tap(c1 + vec2(f * 0.2 * w, 0.0)); }',
    '    src = acc / 10.0;',
    '  } else if (w > 0.001 && uTrans < 3.5) {',
    '    float row2 = floor(u.y * 28.0);',
    '    float jt = (hash(vec2(row2, fr2)) - 0.5) * 0.14 * w * step(0.5, hash(vec2(row2 * 1.7, fr2 + 3.0)));',
    '    vec2 c2 = u + vec2(jt, 0.0); float o = 0.025 * w;',
    '    src = vec3(tap(c2 + vec2(o, 0.0)).r, tap(c2).g, tap(c2 - vec2(o, 0.0)).b);',
    '  } else if (w > 0.001 && uTrans < 4.5) {',
    '    vec2 off = vec2(sin(uTime * 83.0), cos(uTime * 97.0)) * 0.025 * w;',
    '    src = tap((u - 0.5) / (1.0 + 0.07 * w) + 0.5 + off);',
    '  } else src = tap(u);',
    '  float split = 0.0;',
    '  if (uFx > 2.5 && uFx < 3.5) split = 0.0035;',
    '  if (uFx > 3.5 && uFx < 4.5) split = 0.0025;',
    '  if (uFx > 7.5 && uFx < 8.5) split = 0.004;',
    '  if (uFx > 8.5 && uFx < 9.5) split = 0.009;',
    '  if (split > 0.0) { float o2 = split * uFxAmt; src = vec3(tap(u + vec2(o2, 0.0)).r, src.g, tap(u - vec2(o2, 0.0)).b); }',
    '  vec3 c = (src - 0.5) * uContrast + 0.5;',
    '  c = uGain * (c + uLift * (1.0 - c));',
    '  c = pow(clamp(c, 0.0, 1.0), 1.0 / uGamma);',
    '  float l = dot(c, vec3(0.299, 0.587, 0.114));',
    '  c += uShadow * (1.0 - l) * (1.0 - l) + uHigh * l * l;',
    '  l = dot(c, vec3(0.299, 0.587, 0.114));',
    '  c = mix(vec3(l), c, uSat);',
    '  c = mix(c, vec3(l), uMono);',
    '  c = c * (1.0 - uFade) + uFade * 0.12;',
    '  c = mix(src, c, uAmount);',
    '  vec2 d = (vScr - 0.5) * vec2(1.0, uAspect);',
    '  float vg = smoothstep(0.42, 1.05, length(d) / max(1.0, uAspect * 0.62));',
    '  c *= 1.0 - uVignette * vg;',
    '  float lm = dot(c, vec3(0.299, 0.587, 0.114));',
    '  if (uFx > 0.5 && uFx < 1.5) {',
    '    float tt = uTime * 0.35;',
    '    float la = exp(-pow((vScr.x - 0.12 - 0.22 * sin(tt)) * 3.0, 2.0) - pow((vScr.y - 0.22) * 2.2, 2.0));',
    '    float lb = exp(-pow((vScr.x - 0.9 - 0.1 * cos(tt * 1.3)) * 2.5, 2.0) - pow((vScr.y - 0.75 - 0.15 * sin(tt * 0.7)) * 2.0, 2.0));',
    '    vec3 lk = clamp(vec3(1.0, 0.45, 0.15) * la * 0.9 + vec3(1.0, 0.75, 0.35) * lb * 0.6, 0.0, 1.0) * uFxAmt;',
    '    c = 1.0 - (1.0 - c) * (1.0 - lk);',
    '  } else if (uFx > 1.5 && uFx < 2.5) {',
    '    float speck = step(0.9986, hash(floor(vScr * vec2(180.0, 320.0)) + fr2 * 7.13));',
    '    float sx = hash(vec2(fr2, 3.1));',
    '    float scr = step(abs(vScr.x - sx), 0.0012) * step(0.6, hash(vec2(fr2, 9.2)));',
    '    c = mix(c, vec3(0.95, 0.93, 0.88), clamp(speck * 0.85 + scr * 0.4, 0.0, 1.0) * uFxAmt);',
    '    c *= 1.0 - 0.07 * uFxAmt * hash(vec2(fr2, 1.0));',
    '  } else if (uFx > 2.5 && uFx < 3.5) {',
    '    c *= 1.0 - 0.13 * uFxAmt * (sin(vScr.y * 1500.0) * 0.5 + 0.5);',
    '    float band = 1.0 - smoothstep(0.0, 0.025, abs(fract(vScr.y * 0.7 - uTime * 0.12) - 0.5));',
    '    c += band * 0.08 * uFxAmt * (hash(vec2(floor(vScr.x * 300.0), fr2)) - 0.3);',
    '    c = mix(c, c * vec3(1.04, 0.97, 1.07), uFxAmt);',
    '  } else if (uFx > 3.5 && uFx < 4.5) {',
    '    float tri = fract(vScr.x * 360.0);',
    '    vec3 mask = vec3(step(tri, 0.333), step(0.333, tri) * step(tri, 0.666), step(0.666, tri));',
    '    c *= mix(vec3(1.0), 0.55 + 0.75 * mask, 0.45 * uFxAmt);',
    '    c *= 1.0 - 0.28 * uFxAmt * (sin(vScr.y * 2200.0) * 0.5 + 0.5);',
    '    c *= 1.0 + 0.25 * uFxAmt;',
    '    vec2 e = abs(u - 0.5) * 2.0; float corner = smoothstep(1.0, 0.92, max(e.x, e.y));',
    '    c *= crtMask * mix(1.0, corner, uFxAmt);',
    '  } else if (uFx > 4.5 && uFx < 5.5) {',
    '    float n1 = vnoise(vec2(vScr.x * 2.5 + uTime * 0.35, vScr.y * 1.8 - uTime * 0.25));',
    '    float edge = max(smoothstep(0.55, 1.0, vScr.x + n1 * 0.35), smoothstep(0.62, 1.0, 1.0 - vScr.y + n1 * 0.3));',
    '    float pulse = 0.6 + 0.4 * sin(uTime * 1.7 + n1 * 3.0);',
    '    vec3 burn = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.85, 0.45), edge) * edge * pulse;',
    '    c = 1.0 - (1.0 - c) * (1.0 - clamp(burn * 1.2 * uFxAmt, 0.0, 1.0));',
    '  } else if (uFx > 5.5 && uFx < 6.5) {',
    '    c = 1.0 - (1.0 - c) * (1.0 - 0.28 * uFxAmt);',
    '    c += vec3(0.95, 0.25, 0.12) * smoothstep(0.55, 1.0, lm) * 0.35 * uFxAmt;',
    '    c = mix(c, c * vec3(1.08, 0.98, 0.86), uFxAmt);',
    '    float lk2 = exp(-pow((vScr.x - 0.95) * 3.0, 2.0)) * (0.7 + 0.3 * sin(uTime * 0.8));',
    '    c += vec3(1.0, 0.3, 0.1) * lk2 * 0.35 * uFxAmt;',
    '  } else if (uFx > 6.5 && uFx < 7.5) {',
    '    vec3 duo = mix(vec3(0.04, 0.16, 0.1), vec3(1.0, 0.78, 0.25), smoothstep(0.05, 0.95, lm));',
    '    c = mix(c, duo, uFxAmt);',
    '  } else if (uFx > 7.5 && uFx < 8.5) {',
    '    vec3 holo = vec3(0.25, 0.75, 1.0) * (lm * 1.35 + 0.05);',
    '    holo *= 0.8 + 0.2 * sin(vScr.y * 900.0 - uTime * 12.0);',
    '    holo *= 0.92 + 0.08 * hash(vec2(fr2, 2.0));',
    '    c = mix(c, holo, uFxAmt);',
    '  } else if (uFx > 8.5 && uFx < 9.5) {',
    '    c = mix(c, floor(c * 6.0) / 6.0, 0.35 * uFxAmt);',
    '    c *= 1.0 - 0.1 * uFxAmt * (sin(vScr.y * 1400.0) * 0.5 + 0.5);',
    '  }',
    '  float n = hash(floor(vScr * vec2(540.0, 960.0)) + fract(uTime * 7.0) * 113.0) - 0.5;',
    '  float lum = dot(c, vec3(0.299, 0.587, 0.114));',
    '  c += n * uGrain * 0.32 * (1.15 - lum);',
    '  if (uTrans > 4.5 && uTrans < 5.5) {',
    '    float xx = vScr.x + vScr.y * 0.4; float pos = 0.7 - uTd * 3.0;',
    '    c += (vec3(1.0, 0.55, 0.22) * 1.3 * exp(-pow((xx - pos) * 2.2, 2.0)) + vec3(1.0, 0.8, 0.5) * 0.25) * w;',
    '  }',
    '  if (uTrans > 5.5) c *= 1.0 - w;',
    '  if (uBars > 0.001 && (vScr.y < uBars || vScr.y > 1.0 - uBars)) c = vec3(0.0);',
    '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');
  var VS = 'attribute vec2 aPos; uniform vec2 uScale; uniform vec2 uOff; varying vec2 vUv; varying vec2 vScr;' +
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); vec2 uv = aPos * 0.5 + 0.5; vScr = vec2(uv.x, 1.0 - uv.y); vUv = (uv - 0.5) * uScale + 0.5 + uOff; }';

  function Renderer(canvas) {
    var gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false }) || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('sem WebGL');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var U = {}; ['uTex', 'uScale', 'uOff', 'uTrans', 'uTd', 'uFx', 'uFxAmt', 'uLift', 'uGamma', 'uGain', 'uShadow', 'uHigh', 'uSat', 'uContrast', 'uFade', 'uMono', 'uAmount', 'uGrain', 'uVignette', 'uBars', 'uTime', 'uAspect'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    this.gl = gl; this.U = U; this.canvas = canvas;
  }
  Renderer.prototype.draw = function (src, o, zoom, t, fx) {
    var gl = this.gl, U = this.U, cv = this.canvas;
    var vw = src.videoWidth || src.naturalWidth || src.width, vh = src.videoHeight || src.naturalHeight || src.height;
    if (!vw || !vh || (src.readyState !== undefined && src.readyState < 2)) return false;
    var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); } catch (e) { return false; }
    var va = vw / vh, ca = w / h, sx = 1, sy = 1;
    if (va > ca) sx = ca / va; else sy = va / ca;
    zoom = zoom || 1;
    gl.uniform1i(U.uTex, 0);
    gl.uniform2f(U.uScale, sx / zoom, sy / zoom); gl.uniform2f(U.uOff, 0, 0);
    gl.uniform3fv(U.uLift, o.lift); gl.uniform3fv(U.uGamma, o.gamma); gl.uniform3fv(U.uGain, o.gain); gl.uniform3fv(U.uShadow, o.shadow); gl.uniform3fv(U.uHigh, o.high);
    gl.uniform1f(U.uSat, o.sat); gl.uniform1f(U.uContrast, o.contrast); gl.uniform1f(U.uFade, o.fade); gl.uniform1f(U.uMono, o.mono);
    gl.uniform1f(U.uAmount, o.amount); gl.uniform1f(U.uGrain, o.grain); gl.uniform1f(U.uVignette, o.vignette); gl.uniform1f(U.uBars, o.bars);
    fx = fx || {};
    gl.uniform1f(U.uTrans, fx.trans || 0); gl.uniform1f(U.uTd, fx.td == null ? 9 : fx.td); gl.uniform1f(U.uFx, fx.fx || 0); gl.uniform1f(U.uFxAmt, fx.amt == null ? 0.7 : fx.amt);
    gl.uniform1f(U.uTime, t || 0); gl.uniform1f(U.uAspect, h / w);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  };

  /* transições nos cortes e efeitos de filme (mesmos números no Android e no iPhone) */
  var TRANS = [['none', 'Corte seco', 0], ['flash', 'Flash', 0], ['zoom', 'Zoom soco', 1], ['whip', 'Chicote', 2], ['glitch', 'Glitch', 3], ['shake', 'Tremor', 4], ['leak', 'Luz vazada', 5], ['dip', 'Piscar preto', 6], ['mix', 'Misturado', -1]];
  var MIX = [1, 2, 3, 5, 4, 6];
  var FX = [['none', 'Nenhum', 0], ['leak', 'Luz de filme', 1], ['dust', 'Poeira e riscos', 2], ['vhs', 'VHS', 3], ['crt', 'TV de tubo', 4], ['burn', 'Filme queimado', 5],
    ['over', 'Superexposto', 6], ['duo', 'Duotone', 7], ['holo', 'Holograma', 8], ['glitch', 'Glitch retrô', 9]];
  function transCode(id, idx) { for (var i = 0; i < TRANS.length; i++) if (TRANS[i][0] === id) return TRANS[i][2] < 0 ? MIX[(idx || 0) % MIX.length] : TRANS[i][2]; return 0; }
  function fxCode(id) { for (var i = 0; i < FX.length; i++) if (FX[i][0] === id) return FX[i][2]; return 0; }
  /* distância (s) até o corte mais próximo e o código da transição dele */
  function cutState(t, bounds, trans) {
    var best = 9, bi = -1;
    for (var i = 0; i < (bounds || []).length; i++) { var d = t - bounds[i]; if (Math.abs(d) < Math.abs(best)) { best = d; bi = i; } }
    return { td: best, trans: bi < 0 ? 0 : transCode(trans, bi) };
  }
  root.FluxGrade = { TRANS: TRANS, FX: FX, transCode: transCode, fxCode: fxCode, cutState: cutState, PRESETS: PRESETS, find: find, params: params, isOff: isOff, Renderer: Renderer, FS: FS };
})(window);
