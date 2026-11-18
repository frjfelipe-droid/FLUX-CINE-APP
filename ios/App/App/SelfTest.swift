import AVFoundation
import UIKit

/// Teste automático (só roda com o argumento -fluxSelfTest, no simulador do GitHub):
/// monta um vídeo com título, legenda, Color Cine, chips com velocidade e salva quadros + relatório.
enum SelfTest {
    static func runIfRequested() {
        guard ProcessInfo.processInfo.arguments.contains("-fluxSelfTest") else { return }
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("selftest", isDirectory: true)
        try? FileManager.default.removeItem(at: docs)
        try? FileManager.default.createDirectory(at: docs, withIntermediateDirectories: true)
        var report: [String: Any] = ["started": Date().description]
        func finish() {
            if let d = try? JSONSerialization.data(withJSONObject: report, options: .prettyPrinted) { try? d.write(to: docs.appendingPathComponent("report.json")) }
            FileManager.default.createFile(atPath: docs.appendingPathComponent("done").path, contents: Data())
        }
        guard let specURL = Bundle.main.url(forResource: "spec", withExtension: "json", subdirectory: "public/selftest"),
              let video = Bundle.main.url(forResource: "test", withExtension: "mp4", subdirectory: "public/selftest"),
              let raw = try? String(contentsOf: specURL, encoding: .utf8) else {
            report["error"] = "arquivos do teste não encontrados"; finish(); return
        }
        let specs = (try? JSONSerialization.jsonObject(with: Data(raw.replacingOccurrences(of: "__TEST__", with: video.path).utf8))) as? [String: [String: Any]] ?? [:]
        let keys = specs.keys.sorted()
        func next(_ i: Int) {
            if i >= keys.count { finish(); return }
            let key = keys[i]
            var spec = specs[key]!
            let times = (spec.removeValue(forKey: "frames") as? [Double]) ?? [0.5, 1.5, 3]
            let out = docs.appendingPathComponent("out_\(key).mp4")
            let t0 = Date()
            let ex = CineExporter()
            ex.export(spec, to: out, progress: { _ in }, done: { r in
                var rep: [String: Any] = ["ms": Int(Date().timeIntervalSince(t0) * 1000)]
                switch r {
                case .success(let total):
                    let asset = AVURLAsset(url: out)
                    rep["ok"] = true
                    rep["expected"] = total
                    rep["duration"] = CMTimeGetSeconds(asset.duration)
                    if let v = asset.tracks(withMediaType: .video).first { rep["size"] = "\(Int(v.naturalSize.width))x\(Int(v.naturalSize.height))" }
                    rep["audioTracks"] = asset.tracks(withMediaType: .audio).count
                    let g = AVAssetImageGenerator(asset: asset)
                    g.requestedTimeToleranceBefore = .zero; g.requestedTimeToleranceAfter = .zero
                    g.maximumSize = CGSize(width: 540, height: 960)
                    for (n, t) in times.enumerated() {
                        if let cg = try? g.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil),
                           let d = UIImage(cgImage: cg).jpegData(compressionQuality: 0.8) {
                            try? d.write(to: docs.appendingPathComponent(String(format: "ios_%@_%d_%.2fs.jpg", key, n, t)))
                        }
                    }
                case .failure(let e):
                    rep["ok"] = false
                    rep["error"] = (e as NSError).description
                }
                report[key] = rep
                next(i + 1)
            })
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { next(0) }
    }
}
