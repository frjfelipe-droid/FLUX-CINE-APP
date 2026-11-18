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
    'uniform sampler2D uTex;',
    'varying vec2 vUv; varying vec2 vScr;',
    'uniform vec3 uLift, uGamma, uGain, uShadow, uHigh;',
    'uniform float uSat, uContrast, uFade, uMono, uAmount, uGrain, uVignette, uBars, uTime, uAspect;',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'void main(){',
    '  vec3 src = texture2D(uTex, vUv).rgb;',
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
    '  float n = hash(floor(vScr * vec2(540.0, 960.0)) + fract(uTime * 7.0) * 113.0) - 0.5;',
    '  float lum = dot(c, vec3(0.299, 0.587, 0.114));',
    '  c += n * uGrain * 0.32 * (1.15 - lum);',
    '  if (vScr.y < uBars || vScr.y > 1.0 - uBars) c = vec3(0.0);',
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
    var U = {}; ['uTex', 'uScale', 'uOff', 'uLift', 'uGamma', 'uGain', 'uShadow', 'uHigh', 'uSat', 'uContrast', 'uFade', 'uMono', 'uAmount', 'uGrain', 'uVignette', 'uBars', 'uTime', 'uAspect'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    this.gl = gl; this.U = U; this.canvas = canvas;
  }
  Renderer.prototype.draw = function (src, o, zoom, t) {
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
    gl.uniform1f(U.uTime, t || 0); gl.uniform1f(U.uAspect, h / w);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  };

  root.FluxGrade = { PRESETS: PRESETS, find: find, params: params, isOff: isOff, Renderer: Renderer, FS: FS };
})(window);
