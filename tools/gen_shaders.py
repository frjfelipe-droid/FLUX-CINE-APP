"""Gera o shader do Color Cine para a prévia (www/grade.js), Android (CineGrade.java) e iPhone (CineExport.swift)
a partir de tools/grade.glsl — os três ficam sempre iguais. Uso: python3 tools/gen_shaders.py"""
import re, os
R = os.path.dirname(os.path.abspath(__file__)) + '/..'
src = open(R + '/tools/grade.glsl').read()
helpers = src.split('//@helpers')[1].split('//@main')[0].strip()
main = src.split('//@main')[1].rstrip() + '\n'
UNI = """uniform vec3 uLift, uGamma, uGain, uShadow, uHigh;
uniform float uSat, uContrast, uFade, uMono, uAmount, uGrain, uVignette, uBars, uTime, uAspect;
uniform float uTrans, uTd, uFx, uFxAmt;"""
def glsl(mapuv, header):
    return header + UNI + '\n' + helpers + '\nvec3 tap(vec2 u){ return texture2D(uTex, ' + mapuv + ').rgb; }\nvoid main(){\n' + main.replace('RETURN_COLOR', 'gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);') + '}\n'
# --- prévia
js_src = glsl('(u - 0.5) * uScale + 0.5 + uOff', 'precision mediump float;\n#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#endif\nuniform sampler2D uTex; uniform vec2 uScale; uniform vec2 uOff;\nvarying vec2 vUv; varying vec2 vScr;\n')
js = '  var FS = [\n' + ',\n'.join("    '" + l.replace('\\', '\\\\').replace("'", "\\'") + "'" for l in js_src.rstrip('\n').split('\n')) + "\n  ].join('\\n');"
p = R + '/www/grade.js'; s = open(p).read()
i = s.index('  var FS = ['); j = s.index("  ].join('\\n');", i) + len("  ].join('\\n');")
open(p, 'w').write(s[:i] + js + s[j:])
# --- Android
an_src = glsl('u', 'precision mediump float;\n#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#endif\nuniform sampler2D uTex;\nvarying vec2 vUv; varying vec2 vScr;\n')
jv = '    static final String FS =\n' + ' +\n'.join('            "' + l.replace('\\', '\\\\').replace('"', '\\"') + '\\n"' for l in an_src.rstrip('\n').split('\n')) + ';\n'
p = R + '/android/app/src/main/java/com/fluxcine/app/CineGrade.java'; s = open(p).read()
i = s.index('    static final String FS =\n'); j = s.index('    @Override\n    public GlShaderProgram', i)
open(p, 'w').write(s[:i] + jv + '\n' + s[j:])
# --- iPhone (Core Image Kernel Language)
rep = {'uLift': 'lift', 'uGamma': 'gam', 'uGain': 'gain', 'uShadow': 'shd', 'uHigh': 'hig', 'uSat': 'p1.x', 'uContrast': 'p1.y', 'uFade': 'p1.z', 'uMono': 'p1.w',
       'uAmount': 'p2.x', 'uGrain': 'p2.y', 'uVignette': 'p2.z', 'uBars': 'p2.w', 'uTrans': 'p3.x', 'uTd': 'p3.y', 'uFxAmt': 'p3.w', 'uFx': 'p3.z', 'uTime': 'time'}
m = main.replace('  vec2 u = vec2(vScr.x, 1.0 - vScr.y);', '  vec2 dc = destCoord(); vec2 vScr = vec2(dc.x / size.x, 1.0 - dc.y / size.y); vec2 u = dc / size; float uAspect = size.y / size.x;')
m = m.replace('RETURN_COLOR', 'return vec4(clamp(c, 0.0, 1.0), 1.0);').replace('tap(', 'tap(img, size, ')
for k in sorted(rep, key=len, reverse=True): m = re.sub(r'\b' + k + r'\b', rep[k], m)
h = helpers.replace('hash(', 'fhash(')
m = m.replace('hash(', 'fhash(')
ci = h + '\nvec3 tap(sampler s, vec2 size, vec2 u){ return sample(s, samplerTransform(s, u * size)).rgb; }\nkernel vec4 fluxGrade(sampler img, vec3 lift, vec3 gam, vec3 gain, vec3 shd, vec3 hig, vec4 p1, vec4 p2, vec4 p3, vec2 size, float time) {\n' + m + '}\n'
p = R + '/ios/App/App/CineExport.swift'; s = open(p).read()
a = s.index('        let src = """\n') + len('        let src = """\n'); b = s.index('"""\n        return CIKernel', a)
open(p, 'w').write(s[:a] + ci + s[b:])
print('shaders ok')
