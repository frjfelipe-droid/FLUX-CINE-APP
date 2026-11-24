//@helpers
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); float a = hash(i); float b = hash(i + vec2(1.0, 0.0)); float c2 = hash(i + vec2(0.0, 1.0)); float d2 = hash(i + vec2(1.0, 1.0)); return mix(mix(a, b, f.x), mix(c2, d2, f.x), f.y); }
//@main
  vec2 u = vec2(vScr.x, 1.0 - vScr.y);
  float fr2 = floor(uTime * 24.0);
  float crtMask = 1.0;
  if (uFx > 3.5 && uFx < 4.5) {
    vec2 cc = u - 0.5; float r2 = dot(cc, cc);
    u = 0.5 + cc * (1.0 + 0.16 * uFxAmt * r2);
    crtMask = step(0.0, u.x) * step(u.x, 1.0) * step(0.0, u.y) * step(u.y, 1.0);
  }
  if (uFx > 8.5 && uFx < 9.5) {
    float fb = floor(uTime * 10.0); float row = floor(u.y * 18.0);
    float on = step(0.82, hash(vec2(row, fb))) * step(0.35, hash(vec2(fb, 7.0)));
    u.x += (hash(vec2(row * 3.1, fb)) - 0.5) * 0.12 * uFxAmt * on;
  }
  float w = clamp(1.0 - abs(uTd) / 0.22, 0.0, 1.0); w = w * w * (3.0 - 2.0 * w);
  if (uTrans < 0.5) w = 0.0;
  vec3 src;
  if (w > 0.001 && uTrans < 1.5) {
    vec2 c0 = (u - 0.5) / (1.0 + 0.22 * w) + 0.5; vec2 dir = (c0 - 0.5) * 0.07 * w;
    src = (tap(c0) + tap(c0 - dir) + tap(c0 - 2.0 * dir) + tap(c0 + dir)) * 0.25;
  } else if (w > 0.001 && uTrans < 2.5) {
    float sg = uTd < 0.0 ? 1.0 : -1.0; vec2 c1 = u + vec2(sg * 0.3 * w * w, 0.0); vec3 acc = vec3(0.0);
    for (int i = 0; i < 10; i++) { float f = float(i) / 9.0 - 0.5; acc += tap(c1 + vec2(f * 0.2 * w, 0.0)); }
    src = acc / 10.0;
  } else if (w > 0.001 && uTrans < 3.5) {
    float row2 = floor(u.y * 28.0);
    float jt = (hash(vec2(row2, fr2)) - 0.5) * 0.14 * w * step(0.5, hash(vec2(row2 * 1.7, fr2 + 3.0)));
    vec2 c2 = u + vec2(jt, 0.0); float o = 0.025 * w;
    src = vec3(tap(c2 + vec2(o, 0.0)).r, tap(c2).g, tap(c2 - vec2(o, 0.0)).b);
  } else if (w > 0.001 && uTrans < 4.5) {
    vec2 off = vec2(sin(uTime * 83.0), cos(uTime * 97.0)) * 0.025 * w;
    src = tap((u - 0.5) / (1.0 + 0.07 * w) + 0.5 + off);
  } else src = tap(u);
  float split = 0.0;
  if (uFx > 2.5 && uFx < 3.5) split = 0.0035;
  if (uFx > 3.5 && uFx < 4.5) split = 0.0025;
  if (uFx > 7.5 && uFx < 8.5) split = 0.004;
  if (uFx > 8.5 && uFx < 9.5) split = 0.009;
  if (split > 0.0) { float o2 = split * uFxAmt; src = vec3(tap(u + vec2(o2, 0.0)).r, src.g, tap(u - vec2(o2, 0.0)).b); }
  vec3 c = (src - 0.5) * uContrast + 0.5;
  c = uGain * (c + uLift * (1.0 - c));
  c = pow(clamp(c, 0.0, 1.0), 1.0 / uGamma);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c += uShadow * (1.0 - l) * (1.0 - l) + uHigh * l * l;
  l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uSat);
  c = mix(c, vec3(l), uMono);
  c = c * (1.0 - uFade) + uFade * 0.12;
  c = mix(src, c, uAmount);
  vec2 d = (vScr - 0.5) * vec2(1.0, uAspect);
  float vg = smoothstep(0.42, 1.05, length(d) / max(1.0, uAspect * 0.62));
  c *= 1.0 - uVignette * vg;
  float lm = dot(c, vec3(0.299, 0.587, 0.114));
  if (uFx > 0.5 && uFx < 1.5) {
    float tt = uTime * 0.35;
    float la = exp(-pow((vScr.x - 0.12 - 0.22 * sin(tt)) * 3.0, 2.0) - pow((vScr.y - 0.22) * 2.2, 2.0));
    float lb = exp(-pow((vScr.x - 0.9 - 0.1 * cos(tt * 1.3)) * 2.5, 2.0) - pow((vScr.y - 0.75 - 0.15 * sin(tt * 0.7)) * 2.0, 2.0));
    vec3 lk = clamp(vec3(1.0, 0.45, 0.15) * la * 0.9 + vec3(1.0, 0.75, 0.35) * lb * 0.6, 0.0, 1.0) * uFxAmt;
    c = 1.0 - (1.0 - c) * (1.0 - lk);
  } else if (uFx > 1.5 && uFx < 2.5) {
    float speck = step(0.9986, hash(floor(vScr * vec2(180.0, 320.0)) + fr2 * 7.13));
    float sx = hash(vec2(fr2, 3.1));
    float scr = step(abs(vScr.x - sx), 0.0012) * step(0.6, hash(vec2(fr2, 9.2)));
    c = mix(c, vec3(0.95, 0.93, 0.88), clamp(speck * 0.85 + scr * 0.4, 0.0, 1.0) * uFxAmt);
    c *= 1.0 - 0.07 * uFxAmt * hash(vec2(fr2, 1.0));
  } else if (uFx > 2.5 && uFx < 3.5) {
    c *= 1.0 - 0.13 * uFxAmt * (sin(vScr.y * 1500.0) * 0.5 + 0.5);
    float band = 1.0 - smoothstep(0.0, 0.025, abs(fract(vScr.y * 0.7 - uTime * 0.12) - 0.5));
    c += band * 0.08 * uFxAmt * (hash(vec2(floor(vScr.x * 300.0), fr2)) - 0.3);
    c = mix(c, c * vec3(1.04, 0.97, 1.07), uFxAmt);
  } else if (uFx > 3.5 && uFx < 4.5) {
    float tri = fract(vScr.x * 360.0);
    vec3 mask = vec3(step(tri, 0.333), step(0.333, tri) * step(tri, 0.666), step(0.666, tri));
    c *= mix(vec3(1.0), 0.55 + 0.75 * mask, 0.45 * uFxAmt);
    c *= 1.0 - 0.28 * uFxAmt * (sin(vScr.y * 2200.0) * 0.5 + 0.5);
    c *= 1.0 + 0.25 * uFxAmt;
    vec2 e = abs(u - 0.5) * 2.0; float corner = smoothstep(1.0, 0.92, max(e.x, e.y));
    c *= crtMask * mix(1.0, corner, uFxAmt);
  } else if (uFx > 4.5 && uFx < 5.5) {
    float n1 = vnoise(vec2(vScr.x * 2.5 + uTime * 0.35, vScr.y * 1.8 - uTime * 0.25));
    float edge = max(smoothstep(0.55, 1.0, vScr.x + n1 * 0.35), smoothstep(0.62, 1.0, 1.0 - vScr.y + n1 * 0.3));
    float pulse = 0.6 + 0.4 * sin(uTime * 1.7 + n1 * 3.0);
    vec3 burn = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.85, 0.45), edge) * edge * pulse;
    c = 1.0 - (1.0 - c) * (1.0 - clamp(burn * 1.2 * uFxAmt, 0.0, 1.0));
  } else if (uFx > 5.5 && uFx < 6.5) {
    c = 1.0 - (1.0 - c) * (1.0 - 0.28 * uFxAmt);
    c += vec3(0.95, 0.25, 0.12) * smoothstep(0.55, 1.0, lm) * 0.35 * uFxAmt;
    c = mix(c, c * vec3(1.08, 0.98, 0.86), uFxAmt);
    float lk2 = exp(-pow((vScr.x - 0.95) * 3.0, 2.0)) * (0.7 + 0.3 * sin(uTime * 0.8));
    c += vec3(1.0, 0.3, 0.1) * lk2 * 0.35 * uFxAmt;
  } else if (uFx > 6.5 && uFx < 7.5) {
    vec3 duo = mix(vec3(0.04, 0.16, 0.1), vec3(1.0, 0.78, 0.25), smoothstep(0.05, 0.95, lm));
    c = mix(c, duo, uFxAmt);
  } else if (uFx > 7.5 && uFx < 8.5) {
    vec3 holo = vec3(0.25, 0.75, 1.0) * (lm * 1.35 + 0.05);
    holo *= 0.8 + 0.2 * sin(vScr.y * 900.0 - uTime * 12.0);
    holo *= 0.92 + 0.08 * hash(vec2(fr2, 2.0));
    c = mix(c, holo, uFxAmt);
  } else if (uFx > 8.5 && uFx < 9.5) {
    c = mix(c, floor(c * 6.0) / 6.0, 0.35 * uFxAmt);
    c *= 1.0 - 0.1 * uFxAmt * (sin(vScr.y * 1400.0) * 0.5 + 0.5);
  }
  float n = hash(floor(vScr * vec2(540.0, 960.0)) + fract(uTime * 7.0) * 113.0) - 0.5;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c += n * uGrain * 0.32 * (1.15 - lum);
  if (uTrans > 4.5 && uTrans < 5.5) {
    float xx = vScr.x + vScr.y * 0.4; float pos = 0.7 - uTd * 3.0;
    c += (vec3(1.0, 0.55, 0.22) * 1.3 * exp(-pow((xx - pos) * 2.2, 2.0)) + vec3(1.0, 0.8, 0.5) * 0.25) * w;
  }
  if (uTrans > 5.5) c *= 1.0 - w;
  if (uBars > 0.001 && (vScr.y < uBars || vScr.y > 1.0 - uBars)) c = vec3(0.0);
  RETURN_COLOR
