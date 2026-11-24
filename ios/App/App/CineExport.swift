import AVFoundation
import CoreImage
import UIKit

// FLUX CINE — montagem do vídeo no iPhone: corta, junta (com velocidade nos chips), zoom nos cortes,
// Color Cine (mesmo cálculo de www/grade.js), título/legenda e efeitos sonoros.

// MARK: - Color Cine

enum CineGrade {
    static let kernel: CIKernel? = {
        let src = """
float fhash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); float a = fhash(i); float b = fhash(i + vec2(1.0, 0.0)); float c2 = fhash(i + vec2(0.0, 1.0)); float d2 = fhash(i + vec2(1.0, 1.0)); return mix(mix(a, b, f.x), mix(c2, d2, f.x), f.y); }
vec3 tap(sampler s, vec2 size, vec2 u){ return sample(s, samplerTransform(s, u * size)).rgb; }
kernel vec4 fluxGrade(sampler img, vec3 lift, vec3 gam, vec3 gain, vec3 shd, vec3 hig, vec4 p1, vec4 p2, vec4 p3, vec2 size, float time) {

  vec2 dc = destCoord(); vec2 vScr = vec2(dc.x / size.x, 1.0 - dc.y / size.y); vec2 u = dc / size; float uAspect = size.y / size.x;
  float fr2 = floor(time * 24.0);
  float crtMask = 1.0;
  if (p3.z > 3.5 && p3.z < 4.5) {
    vec2 cc = u - 0.5; float r2 = dot(cc, cc);
    u = 0.5 + cc * (1.0 + 0.16 * p3.w * r2);
    crtMask = step(0.0, u.x) * step(u.x, 1.0) * step(0.0, u.y) * step(u.y, 1.0);
  }
  if (p3.z > 8.5 && p3.z < 9.5) {
    float fb = floor(time * 10.0); float row = floor(u.y * 18.0);
    float on = step(0.82, fhash(vec2(row, fb))) * step(0.35, fhash(vec2(fb, 7.0)));
    u.x += (fhash(vec2(row * 3.1, fb)) - 0.5) * 0.12 * p3.w * on;
  }
  float w = clamp(1.0 - abs(p3.y) / 0.22, 0.0, 1.0); w = w * w * (3.0 - 2.0 * w);
  if (p3.x < 0.5) w = 0.0;
  vec3 src;
  if (w > 0.001 && p3.x < 1.5) {
    vec2 c0 = (u - 0.5) / (1.0 + 0.22 * w) + 0.5; vec2 dir = (c0 - 0.5) * 0.07 * w;
    src = (tap(img, size, c0) + tap(img, size, c0 - dir) + tap(img, size, c0 - 2.0 * dir) + tap(img, size, c0 + dir)) * 0.25;
  } else if (w > 0.001 && p3.x < 2.5) {
    float sg = p3.y < 0.0 ? 1.0 : -1.0; vec2 c1 = u + vec2(sg * 0.3 * w * w, 0.0); vec3 acc = vec3(0.0);
    for (int i = 0; i < 10; i++) { float f = float(i) / 9.0 - 0.5; acc += tap(img, size, c1 + vec2(f * 0.2 * w, 0.0)); }
    src = acc / 10.0;
  } else if (w > 0.001 && p3.x < 3.5) {
    float row2 = floor(u.y * 28.0);
    float jt = (fhash(vec2(row2, fr2)) - 0.5) * 0.14 * w * step(0.5, fhash(vec2(row2 * 1.7, fr2 + 3.0)));
    vec2 c2 = u + vec2(jt, 0.0); float o = 0.025 * w;
    src = vec3(tap(img, size, c2 + vec2(o, 0.0)).r, tap(img, size, c2).g, tap(img, size, c2 - vec2(o, 0.0)).b);
  } else if (w > 0.001 && p3.x < 4.5) {
    vec2 off = vec2(sin(time * 83.0), cos(time * 97.0)) * 0.025 * w;
    src = tap(img, size, (u - 0.5) / (1.0 + 0.07 * w) + 0.5 + off);
  } else src = tap(img, size, u);
  float split = 0.0;
  if (p3.z > 2.5 && p3.z < 3.5) split = 0.0035;
  if (p3.z > 3.5 && p3.z < 4.5) split = 0.0025;
  if (p3.z > 7.5 && p3.z < 8.5) split = 0.004;
  if (p3.z > 8.5 && p3.z < 9.5) split = 0.009;
  if (split > 0.0) { float o2 = split * p3.w; src = vec3(tap(img, size, u + vec2(o2, 0.0)).r, src.g, tap(img, size, u - vec2(o2, 0.0)).b); }
  vec3 c = (src - 0.5) * p1.y + 0.5;
  c = gain * (c + lift * (1.0 - c));
  c = pow(clamp(c, 0.0, 1.0), 1.0 / gam);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c += shd * (1.0 - l) * (1.0 - l) + hig * l * l;
  l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, p1.x);
  c = mix(c, vec3(l), p1.w);
  c = c * (1.0 - p1.z) + p1.z * 0.12;
  c = mix(src, c, p2.x);
  vec2 d = (vScr - 0.5) * vec2(1.0, uAspect);
  float vg = smoothstep(0.42, 1.05, length(d) / max(1.0, uAspect * 0.62));
  c *= 1.0 - p2.z * vg;
  float lm = dot(c, vec3(0.299, 0.587, 0.114));
  if (p3.z > 0.5 && p3.z < 1.5) {
    float tt = time * 0.35;
    float la = exp(-pow((vScr.x - 0.12 - 0.22 * sin(tt)) * 3.0, 2.0) - pow((vScr.y - 0.22) * 2.2, 2.0));
    float lb = exp(-pow((vScr.x - 0.9 - 0.1 * cos(tt * 1.3)) * 2.5, 2.0) - pow((vScr.y - 0.75 - 0.15 * sin(tt * 0.7)) * 2.0, 2.0));
    vec3 lk = clamp(vec3(1.0, 0.45, 0.15) * la * 0.9 + vec3(1.0, 0.75, 0.35) * lb * 0.6, 0.0, 1.0) * p3.w;
    c = 1.0 - (1.0 - c) * (1.0 - lk);
  } else if (p3.z > 1.5 && p3.z < 2.5) {
    float speck = step(0.9986, fhash(floor(vScr * vec2(180.0, 320.0)) + fr2 * 7.13));
    float sx = fhash(vec2(fr2, 3.1));
    float scr = step(abs(vScr.x - sx), 0.0012) * step(0.6, fhash(vec2(fr2, 9.2)));
    c = mix(c, vec3(0.95, 0.93, 0.88), clamp(speck * 0.85 + scr * 0.4, 0.0, 1.0) * p3.w);
    c *= 1.0 - 0.07 * p3.w * fhash(vec2(fr2, 1.0));
  } else if (p3.z > 2.5 && p3.z < 3.5) {
    c *= 1.0 - 0.13 * p3.w * (sin(vScr.y * 1500.0) * 0.5 + 0.5);
    float band = 1.0 - smoothstep(0.0, 0.025, abs(fract(vScr.y * 0.7 - time * 0.12) - 0.5));
    c += band * 0.08 * p3.w * (fhash(vec2(floor(vScr.x * 300.0), fr2)) - 0.3);
    c = mix(c, c * vec3(1.04, 0.97, 1.07), p3.w);
  } else if (p3.z > 3.5 && p3.z < 4.5) {
    float tri = fract(vScr.x * 360.0);
    vec3 mask = vec3(step(tri, 0.333), step(0.333, tri) * step(tri, 0.666), step(0.666, tri));
    c *= mix(vec3(1.0), 0.55 + 0.75 * mask, 0.45 * p3.w);
    c *= 1.0 - 0.28 * p3.w * (sin(vScr.y * 2200.0) * 0.5 + 0.5);
    c *= 1.0 + 0.25 * p3.w;
    vec2 e = abs(u - 0.5) * 2.0; float corner = smoothstep(1.0, 0.92, max(e.x, e.y));
    c *= crtMask * mix(1.0, corner, p3.w);
  } else if (p3.z > 4.5 && p3.z < 5.5) {
    float n1 = vnoise(vec2(vScr.x * 2.5 + time * 0.35, vScr.y * 1.8 - time * 0.25));
    float edge = max(smoothstep(0.55, 1.0, vScr.x + n1 * 0.35), smoothstep(0.62, 1.0, 1.0 - vScr.y + n1 * 0.3));
    float pulse = 0.6 + 0.4 * sin(time * 1.7 + n1 * 3.0);
    vec3 burn = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.85, 0.45), edge) * edge * pulse;
    c = 1.0 - (1.0 - c) * (1.0 - clamp(burn * 1.2 * p3.w, 0.0, 1.0));
  } else if (p3.z > 5.5 && p3.z < 6.5) {
    c = 1.0 - (1.0 - c) * (1.0 - 0.28 * p3.w);
    c += vec3(0.95, 0.25, 0.12) * smoothstep(0.55, 1.0, lm) * 0.35 * p3.w;
    c = mix(c, c * vec3(1.08, 0.98, 0.86), p3.w);
    float lk2 = exp(-pow((vScr.x - 0.95) * 3.0, 2.0)) * (0.7 + 0.3 * sin(time * 0.8));
    c += vec3(1.0, 0.3, 0.1) * lk2 * 0.35 * p3.w;
  } else if (p3.z > 6.5 && p3.z < 7.5) {
    vec3 duo = mix(vec3(0.04, 0.16, 0.1), vec3(1.0, 0.78, 0.25), smoothstep(0.05, 0.95, lm));
    c = mix(c, duo, p3.w);
  } else if (p3.z > 7.5 && p3.z < 8.5) {
    vec3 holo = vec3(0.25, 0.75, 1.0) * (lm * 1.35 + 0.05);
    holo *= 0.8 + 0.2 * sin(vScr.y * 900.0 - time * 12.0);
    holo *= 0.92 + 0.08 * fhash(vec2(fr2, 2.0));
    c = mix(c, holo, p3.w);
  } else if (p3.z > 8.5 && p3.z < 9.5) {
    c = mix(c, floor(c * 6.0) / 6.0, 0.35 * p3.w);
    c *= 1.0 - 0.1 * p3.w * (sin(vScr.y * 1400.0) * 0.5 + 0.5);
  }
  float n = fhash(floor(vScr * vec2(540.0, 960.0)) + fract(time * 7.0) * 113.0) - 0.5;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c += n * p2.y * 0.32 * (1.15 - lum);
  if (p3.x > 4.5 && p3.x < 5.5) {
    float xx = vScr.x + vScr.y * 0.4; float pos = 0.7 - p3.y * 3.0;
    c += (vec3(1.0, 0.55, 0.22) * 1.3 * exp(-pow((xx - pos) * 2.2, 2.0)) + vec3(1.0, 0.8, 0.5) * 0.25) * w;
  }
  if (p3.x > 5.5) c *= 1.0 - w;
  if (p2.w > 0.001 && (vScr.y < p2.w || vScr.y > 1.0 - p2.w)) c = vec3(0.0);
  return vec4(clamp(c, 0.0, 1.0), 1.0);
}
"""
        return CIKernel(source: src)
    }()

    static func vec3(_ g: [String: Any], _ k: String, _ d: CGFloat) -> CIVector {
        let a = (g[k] as? [Any])?.compactMap { ($0 as? NSNumber).map { CGFloat($0.doubleValue) } } ?? []
        return CIVector(x: a.count > 0 ? a[0] : d, y: a.count > 1 ? a[1] : d, z: a.count > 2 ? a[2] : d)
    }

    static func apply(_ img: CIImage, _ g: [String: Any], size: CGSize, time: Double, trans: Int, td: Double) -> CIImage {
        guard let k = kernel else { return img }
        let ext = img.extent
        func f(_ key: String, _ d: Double) -> CGFloat { CGFloat((g[key] as? NSNumber)?.doubleValue ?? d) }
        let args: [Any] = [img.clampedToExtent(), vec3(g, "lift", 0), vec3(g, "gamma", 1), vec3(g, "gain", 1), vec3(g, "shadow", 0), vec3(g, "high", 0),
                           CIVector(x: f("sat", 1), y: f("contrast", 1), z: f("fade", 0), w: f("mono", 0)),
                           CIVector(x: f("amount", 0), y: f("grain", 0), z: f("vignette", 0), w: f("bars", 0)),
                           CIVector(x: CGFloat(trans), y: CGFloat(td), z: f("fx", 0), w: f("fxAmt", 0.7)),
                           CIVector(x: size.width, y: size.height), NSNumber(value: time.truncatingRemainder(dividingBy: 1000))]
        return k.apply(extent: ext, roiCallback: { _, _ in ext }, arguments: args)?.cropped(to: ext) ?? img
    }
}

// MARK: - compositor próprio (controle total de cada quadro)

final class CineInstruction: NSObject, AVVideoCompositionInstructionProtocol {
    let timeRange: CMTimeRange
    let enablePostProcessing = false
    let containsTweening = true
    let requiredSourceTrackIDs: [NSValue]?
    let passthroughTrackID: CMPersistentTrackID = kCMPersistentTrackID_Invalid
    let trackID: CMPersistentTrackID
    let transform: CGAffineTransform
    let zoom: CGFloat

    init(range: CMTimeRange, trackID: CMPersistentTrackID, transform: CGAffineTransform, zoom: CGFloat) {
        self.timeRange = range
        self.trackID = trackID
        self.transform = transform
        self.zoom = zoom
        self.requiredSourceTrackIDs = [NSNumber(value: trackID)]
    }
}

final class CineJob {
    let spec: CineSpec
    let renderer: CineRenderer
    init(_ s: CineSpec) { spec = s; renderer = CineRenderer(s) }
}

final class CineCompositor: NSObject, AVVideoCompositing {
    static var job: CineJob?
    private let queue = DispatchQueue(label: "flux.compositor")
    private var renderContext: AVVideoCompositionRenderContext?
    private let ci = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull(), .cacheIntermediates: false])

    var sourcePixelBufferAttributes: [String: any Sendable]? { [kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)] }
    var requiredPixelBufferAttributesForRenderContext: [String: any Sendable] { [kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA)] }

    func renderContextChanged(_ newRenderContext: AVVideoCompositionRenderContext) {
        queue.sync { renderContext = newRenderContext }
    }

    func cancelAllPendingVideoCompositionRequests() {}

    static func orientation(_ t: CGAffineTransform) -> CGImagePropertyOrientation {
        if t.a == 0 && t.b == 1 && t.c == -1 && t.d == 0 { return .right }
        if t.a == 0 && t.b == -1 && t.c == 1 && t.d == 0 { return .left }
        if t.a == -1 && t.b == 0 && t.c == 0 && t.d == -1 { return .down }
        return .up
    }

    func startRequest(_ req: AVAsynchronousVideoCompositionRequest) {
        queue.async { [weak self] in
            guard let self = self else { return }
            autoreleasepool {
                guard let inst = req.videoCompositionInstruction as? CineInstruction,
                      let ctx = self.renderContext,
                      let out = ctx.newPixelBuffer(),
                      let job = CineCompositor.job else {
                    req.finish(with: NSError(domain: "FluxCine", code: 1, userInfo: [NSLocalizedDescriptionKey: "quadro indisponível"]))
                    return
                }
                let W = CGFloat(job.spec.outW), H = CGFloat(job.spec.outH)
                let t = CMTimeGetSeconds(req.compositionTime)
                var img = CIImage(color: .black).cropped(to: CGRect(x: 0, y: 0, width: W, height: H))
                if let src = req.sourceFrame(byTrackID: inst.trackID) {
                    var v = CIImage(cvPixelBuffer: src).oriented(CineCompositor.orientation(inst.transform))
                    v = v.transformed(by: CGAffineTransform(translationX: -v.extent.minX, y: -v.extent.minY))
                    let z = inst.zoom * CGFloat(CineRenderer.impactScale(t, job.spec.finalStart))
                    let sc = max(W / v.extent.width, H / v.extent.height) * z
                    v = v.transformed(by: CGAffineTransform(scaleX: sc, y: sc))
                    v = v.transformed(by: CGAffineTransform(translationX: (W - v.extent.width) / 2, y: (H - v.extent.height) / 2))
                    img = v.cropped(to: CGRect(x: 0, y: 0, width: W, height: H)).composited(over: img)
                }
                if let g = job.spec.grade {
                    var best = 9.0, bi = -1
                    for (i, b) in job.spec.boundaries.enumerated() where abs(t - b) < abs(best) { best = t - b; bi = i }
                    let code = bi >= 0 && bi < job.spec.transCodes.count ? job.spec.transCodes[bi] : 0
                    img = CineGrade.apply(img, g, size: CGSize(width: W, height: H), time: t, trans: code, td: best)
                }
                if let ov = job.renderer.frame(t) { img = CIImage(cgImage: ov).composited(over: img) }
                self.ci.render(img, to: out, bounds: CGRect(x: 0, y: 0, width: W, height: H), colorSpace: nil)
                req.finish(withComposedVideoFrame: out)
            }
        }
    }
}

// MARK: - efeitos sonoros sintetizados

enum SfxSynth {
    static func type(_ id: String) -> Int { ["whoosh": 0, "impact": 1, "riser": 2, "glitch": 3, "pop": 4][id] ?? -1 }

    static func make(_ type: Int, _ rate: Int) -> [Float] {
        var seed: UInt64 = 7 + UInt64(type)
        func rnd() -> Double { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return Double(seed >> 11) / Double(1 << 53) }
        let R = Double(rate)
        switch type {
        case 0:
            let n = Int(0.9 * R); var o = [Float](repeating: 0, count: n)
            var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0
            for i in 0..<n {
                let t = Double(i) / R
                let f = t < 0.45 ? 300 * pow(4000 / 300.0, t / 0.45) : 4000 * pow(600 / 4000.0, (t - 0.45) / 0.4)
                let w0 = 2 * Double.pi * min(f, R * 0.45) / R, al = sin(w0) / 2.4
                let a0 = 1 + al, b0 = al / a0, b2 = -al / a0, a1 = -2 * cos(w0) / a0, a2 = (1 - al) / a0
                let x = rnd() * 2 - 1
                let y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2
                x2 = x1; x1 = x; y2 = y1; y1 = y
                let env = t < 0.4 ? t / 0.4 : max(0, 1 - (t - 0.4) / 0.48)
                o[i] = Float(y * env * 1.1)
            }
            return o
        case 1:
            let n = Int(1.6 * R); var o = [Float](repeating: 0, count: n)
            var ph = 0.0, lp = 0.0
            for i in 0..<n {
                let t = Double(i) / R
                let f = 120 * pow(32 / 120.0, min(1, t / 1.2))
                ph += 2 * Double.pi * f / R
                let body = sin(ph) * exp(-t * 3.2)
                lp += (rnd() * 2 - 1 - lp) * 0.12
                o[i] = Float((body * 0.85 + lp * exp(-t * 16) * 1.6) * 0.8)
            }
            return o
        case 2:
            let n = Int(1.7 * R); var o = [Float](repeating: 0, count: n)
            var ph = 0.0, lp = 0.0
            for i in 0..<n {
                let t = Double(i) / R
                ph += 110 * pow(8, min(1, t / 1.6)) / R
                let saw = 2 * (ph - floor(ph + 0.5))
                let cut = 400 * pow(12.5, min(1, t / 1.6))
                lp += (saw - lp) * min(1, 2 * Double.pi * cut / R)
                let env = t < 1.5 ? 0.02 + 0.33 * pow(t / 1.5, 2) : 0.35 * max(0, 1 - (t - 1.5) / 0.2)
                o[i] = Float(lp * env)
            }
            return o
        case 3:
            let n = Int(0.55 * R); var o = [Float](repeating: 0, count: n)
            for b in 0..<7 {
                let st = Int(Double(b) * 0.07 * R), len = Int(0.04 * R)
                let f = 200 + rnd() * 1800; var ph = 0.0
                for i in 0..<len where st + i < n { ph += f / R; o[st + i] = Float((ph.truncatingRemainder(dividingBy: 1) < 0.5 ? 1 : -1) * 0.18) }
            }
            return o
        case 4:
            let n = Int(0.2 * R); var o = [Float](repeating: 0, count: n)
            var ph = 0.0
            for i in 0..<n {
                let t = Double(i) / R
                ph += 2 * Double.pi * 900 * pow(260 / 900.0, min(1, t / 0.12)) / R
                o[i] = Float(sin(ph) * 0.7 * exp(-t * 26))
            }
            return o
        default: return []
        }
    }

    static func writeTrack(_ url: URL, _ events: [(Double, Int)], total: Double) throws {
        let rate = 48000
        let n = Int(max(Double(rate) * 0.2, (total - 0.05) * Double(rate)))
        var mix = [Float](repeating: 0, count: n)
        for (at, ty) in events {
            let snd = make(ty, rate), st = Int(at * Double(rate))
            for i in 0..<snd.count { let k = st + i; if k >= 0 && k < n { mix[k] += snd[i] * 0.9 } }
        }
        var d = Data()
        func u32(_ v: UInt32) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 4)) }
        func u16(_ v: UInt16) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 2)) }
        d.append("RIFF".data(using: .ascii)!); u32(UInt32(36 + n * 4)); d.append("WAVE".data(using: .ascii)!)
        d.append("fmt ".data(using: .ascii)!); u32(16); u16(1); u16(2); u32(UInt32(rate)); u32(UInt32(rate * 4)); u16(4); u16(16)
        d.append("data".data(using: .ascii)!); u32(UInt32(n * 4))
        var pcm = [Int16](repeating: 0, count: n * 2)
        for i in 0..<n { let v = Int16(max(-32768, min(32767, mix[i] * 32767))); pcm[i * 2] = v; pcm[i * 2 + 1] = v }
        pcm.withUnsafeBufferPointer { d.append(Data(buffer: $0)) }
        try d.write(to: url)
    }
}

// MARK: - exportação

final class CineExporter {
    private var session: AVAssetExportSession?
    private var timer: Timer?
    private(set) var cancelled = false

    func cancel() { cancelled = true; session?.cancelExport() }

    func export(_ o: [String: Any], to out: URL, progress: @escaping (Int) -> Void, done: @escaping (Result<Double, Error>) -> Void) {
        let spec = CineSpec(o)
        let comp = AVMutableComposition()
        guard let vTrack = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let aTrack = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
            done(.failure(NSError(domain: "FluxCine", code: 2, userInfo: [NSLocalizedDescriptionKey: "não consegui criar a montagem"]))); return
        }
        var instructions: [CineInstruction] = []
        var cursor = CMTime.zero
        let scale: CMTimeScale = 600
        do {
            for g in spec.segs {
                let asset = AVURLAsset(url: URL(fileURLWithPath: g.path), options: [AVURLAssetPreferPreciseDurationAndTimingKey: true])
                guard let sv = asset.tracks(withMediaType: .video).first else { continue }
                let start = CMTime(value: CMTimeValue(g.startMs) * 600 / 1000, timescale: scale)
                var dur = CMTime(value: CMTimeValue(g.endMs - g.startMs) * 600 / 1000, timescale: scale)
                let avail = CMTimeSubtract(sv.timeRange.end, start)
                if CMTimeCompare(avail, dur) < 0 { dur = avail }
                if CMTimeCompare(dur, CMTime(value: 12, timescale: scale)) < 0 { continue }
                let range = CMTimeRange(start: start, duration: dur)
                try vTrack.insertTimeRange(range, of: sv, at: cursor)
                if !g.removeAudio, let sa = asset.tracks(withMediaType: .audio).first {
                    try? aTrack.insertTimeRange(range, of: sa, at: cursor)
                }
                var outDur = dur
                if abs(g.speed - 1) > 0.001 {
                    outDur = CMTimeMultiplyByFloat64(dur, multiplier: 1 / g.speed)
                    comp.scaleTimeRange(CMTimeRange(start: cursor, duration: dur), toDuration: outDur)
                }
                instructions.append(CineInstruction(range: CMTimeRange(start: cursor, duration: outDur), trackID: vTrack.trackID, transform: sv.preferredTransform, zoom: CGFloat(g.zoom)))
                cursor = CMTimeAdd(cursor, outDur)
            }
        } catch {
            done(.failure(error)); return
        }
        if instructions.isEmpty { done(.failure(NSError(domain: "FluxCine", code: 3, userInfo: [NSLocalizedDescriptionKey: "nenhum trecho de vídeo válido"]))); return }
        spec.total = CMTimeGetSeconds(cursor)

        // efeitos sonoros: título, cada corte, final de impacto e CTA
        let main = SfxSynth.type(spec.sfx)
        if main >= 0 {
            var ev: [(Double, Int)] = [(0.12, main)]
            for b in spec.boundaries { ev.append((max(0, b - 0.32), 0)) }
            if spec.finalStart > 0.3 { ev.append((spec.finalStart, 1)) }
            if !spec.cta.isEmpty { ev.append((spec.ctaStart, 4)) }
            let wav = FileManager.default.temporaryDirectory.appendingPathComponent("sfx-track.wav")
            if (try? SfxSynth.writeTrack(wav, ev, total: spec.total)) != nil {
                let wa = AVURLAsset(url: wav)
                if let st = wa.tracks(withMediaType: .audio).first, let t2 = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
                    try? t2.insertTimeRange(CMTimeRange(start: .zero, duration: min(st.timeRange.duration, cursor)), of: st, at: .zero)
                }
            }
        }

        let vc = AVMutableVideoComposition()
        vc.customVideoCompositorClass = CineCompositor.self
        vc.frameDuration = CMTime(value: 1, timescale: 30)
        vc.renderSize = CGSize(width: spec.outW, height: spec.outH)
        vc.instructions = instructions
        CineCompositor.job = CineJob(spec)

        try? FileManager.default.removeItem(at: out)
        let preset = spec.outW > 1080 ? AVAssetExportPreset3840x2160 : AVAssetExportPresetHighestQuality
        guard let s = AVAssetExportSession(asset: comp, presetName: preset) ?? AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetHighestQuality) else {
            done(.failure(NSError(domain: "FluxCine", code: 4, userInfo: [NSLocalizedDescriptionKey: "exportação indisponível"]))); return
        }
        s.videoComposition = vc
        s.outputURL = out
        s.outputFileType = .mp4
        s.shouldOptimizeForNetworkUse = true
        session = s
        DispatchQueue.main.async {
            self.timer = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { [weak self] _ in
                guard let ss = self?.session else { return }
                progress(Int(ss.progress * 100))
            }
        }
        let total = spec.total
        s.exportAsynchronously { [weak self] in
            DispatchQueue.main.async {
                self?.timer?.invalidate()
                CineCompositor.job = nil
                switch s.status {
                case .completed: done(.success(total))
                case .cancelled: done(.failure(NSError(domain: "FluxCine", code: 5, userInfo: [NSLocalizedDescriptionKey: "cancelado"])))
                default: done(.failure(s.error ?? NSError(domain: "FluxCine", code: 6, userInfo: [NSLocalizedDescriptionKey: "falha ao exportar"])))
                }
            }
        }
    }
}
