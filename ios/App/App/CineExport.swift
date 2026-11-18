import AVFoundation
import CoreImage
import UIKit

// FLUX CINE — montagem do vídeo no iPhone: corta, junta (com velocidade nos chips), zoom nos cortes,
// Color Cine (mesmo cálculo de www/grade.js), título/legenda e efeitos sonoros.

// MARK: - Color Cine

enum CineGrade {
    static let kernel: CIColorKernel? = {
        let src = """
        kernel vec4 fluxGrade(__sample s, vec3 lift, vec3 gam, vec3 gain, vec3 shd, vec3 hig, vec4 p1, vec4 p2, vec2 size, float time) {
            vec3 src = s.rgb;
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
            vec2 dc = destCoord();
            vec2 scr = vec2(dc.x / size.x, 1.0 - dc.y / size.y);
            float asp = size.y / size.x;
            vec2 d = (scr - 0.5) * vec2(1.0, asp);
            float vg = smoothstep(0.42, 1.05, length(d) / max(1.0, asp * 0.62));
            c *= 1.0 - p2.z * vg;
            vec2 q = floor(scr * vec2(540.0, 960.0)) + fract(time * 7.0) * 113.0;
            q = fract(q * vec2(123.34, 456.21));
            q += dot(q, q + 45.32);
            float n = fract(q.x * q.y) - 0.5;
            float lum = dot(c, vec3(0.299, 0.587, 0.114));
            c += n * p2.y * 0.32 * (1.15 - lum);
            float bar = step(scr.y, p2.w) + step(1.0 - p2.w, scr.y);
            c = mix(c, vec3(0.0), clamp(bar, 0.0, 1.0) * step(0.001, p2.w));
            return vec4(clamp(c, 0.0, 1.0), 1.0);
        }
        """
        return CIColorKernel(source: src)
    }()

    static func vec3(_ g: [String: Any], _ k: String, _ d: CGFloat) -> CIVector {
        let a = (g[k] as? [Any])?.compactMap { ($0 as? NSNumber).map { CGFloat($0.doubleValue) } } ?? []
        return CIVector(x: a.count > 0 ? a[0] : d, y: a.count > 1 ? a[1] : d, z: a.count > 2 ? a[2] : d)
    }

    static func apply(_ img: CIImage, _ g: [String: Any], size: CGSize, time: Double) -> CIImage {
        guard let k = kernel else { return img }
        func f(_ key: String, _ d: Double) -> CGFloat { CGFloat((g[key] as? NSNumber)?.doubleValue ?? d) }
        let args: [Any] = [img, vec3(g, "lift", 0), vec3(g, "gamma", 1), vec3(g, "gain", 1), vec3(g, "shadow", 0), vec3(g, "high", 0),
                           CIVector(x: f("sat", 1), y: f("contrast", 1), z: f("fade", 0), w: f("mono", 0)),
                           CIVector(x: f("amount", 0), y: f("grain", 0), z: f("vignette", 0), w: f("bars", 0)),
                           CIVector(x: size.width, y: size.height), NSNumber(value: time.truncatingRemainder(dividingBy: 1000))]
        return k.apply(extent: img.extent, arguments: args) ?? img
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
                if let g = job.spec.grade { img = CineGrade.apply(img, g, size: CGSize(width: W, height: H), time: t) }
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
