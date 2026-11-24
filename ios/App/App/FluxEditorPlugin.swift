import Foundation
import Capacitor
import AVFoundation
import Photos
import PhotosUI
import Speech
import UniformTypeIdentifiers
import UIKit

/// Mesmo contrato do plugin Android (www/app.js não muda): escolher vídeo, ouvir a fala, montar e entregar.
@objc(FluxEditorPlugin)
public class FluxEditorPlugin: CAPPlugin, CAPBridgedPlugin, PHPickerViewControllerDelegate {
    public let identifier = "FluxEditorPlugin"
    public let jsName = "FluxEditor"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pickVideo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "transcribe", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "modelInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "warmup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "downloadModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "render", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelRender", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "copyText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveToGallery", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareInstagram", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise)
    ]

    private var pickCall: CAPPluginCall?
    private var exporter: CineExporter?
    private let io = DispatchQueue(label: "flux.io", qos: .userInitiated)

    private var docs: URL { FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0] }
    private func dir(_ name: String) -> URL {
        let d = docs.appendingPathComponent(name, isDirectory: true)
        try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        return d
    }

    // MARK: escolher vídeo

    @objc func pickVideo(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var cfg = PHPickerConfiguration()
            cfg.filter = .videos
            cfg.selectionLimit = 1
            cfg.preferredAssetRepresentationMode = .current
            let p = PHPickerViewController(configuration: cfg)
            p.delegate = self
            self.pickCall = call
            self.bridge?.viewController?.present(p, animated: true)
        }
    }

    public func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true)
        guard let call = pickCall else { return }
        pickCall = nil
        guard let item = results.first?.itemProvider else { call.reject("Nenhum vídeo escolhido", "CANCELLED"); return }
        let type = item.registeredTypeIdentifiers.first { UTType($0)?.conforms(to: .movie) ?? false } ?? UTType.movie.identifier
        item.loadFileRepresentation(forTypeIdentifier: type) { url, err in
            guard let url = url else { call.reject("Não consegui abrir o vídeo: \(err?.localizedDescription ?? "")"); return }
            let ext = url.pathExtension.isEmpty ? "mov" : url.pathExtension
            let out = self.dir("clips").appendingPathComponent("clip_\(Int(Date().timeIntervalSince1970 * 1000)).\(ext)")
            do { try FileManager.default.copyItem(at: url, to: out) } catch { call.reject("Não consegui copiar o vídeo: \(error.localizedDescription)"); return }
            let asset = AVURLAsset(url: out)
            call.resolve([
                "path": out.path,
                "name": item.suggestedName ?? out.lastPathComponent,
                "durationMs": Int(CMTimeGetSeconds(asset.duration) * 1000),
                "thumb": Self.thumb(out, at: 0.5, width: 240)
            ])
        }
    }

    static func thumb(_ url: URL, at sec: Double, width: CGFloat) -> String {
        let g = AVAssetImageGenerator(asset: AVURLAsset(url: url))
        g.appliesPreferredTrackTransform = true
        g.maximumSize = CGSize(width: width * 2, height: width * 2)
        guard let cg = try? g.copyCGImage(at: CMTime(seconds: sec, preferredTimescale: 600), actualTime: nil) else { return "" }
        let img = UIImage(cgImage: cg)
        let w = cg.width > cg.height ? width * 1.78 : width
        let h = CGFloat(cg.height) * w / CGFloat(max(1, cg.width))
        let r = UIGraphicsImageRenderer(size: CGSize(width: w, height: h))
        let small = r.image { _ in img.draw(in: CGRect(x: 0, y: 0, width: w, height: h)) }
        guard let d = small.jpegData(compressionQuality: 0.7) else { return "" }
        return "data:image/jpeg;base64," + d.base64EncodedString()
    }

    // MARK: ouvir a fala (reconhecimento da Apple, no aparelho, com pontuação)

    @objc func modelInfo(_ call: CAPPluginCall) {
        call.resolve(["precise": true, "engine": "apple"])
    }

    @objc func warmup(_ call: CAPPluginCall) { call.resolve() }

    @objc func downloadModel(_ call: CAPPluginCall) { call.resolve() }

    @objc func transcribe(_ call: CAPPluginCall) {
        guard let path = call.getString("path") else { call.reject("vídeo não informado"); return }
        let id = call.getString("id") ?? ""
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else { call.reject("Permita o reconhecimento de fala nos Ajustes para gerar a legenda."); return }
            self.notifyListeners("transcribeProgress", data: ["id": id, "p": 0.1])
            self.extractAudio(URL(fileURLWithPath: path)) { audio in
                guard let audio = audio else { call.resolve(["words": []]); return }
                self.recognize(audio, id: id, call: call)
            }
        }
    }

    private func extractAudio(_ url: URL, done: @escaping (URL?) -> Void) {
        let asset = AVURLAsset(url: url)
        guard !asset.tracks(withMediaType: .audio).isEmpty,
              let ex = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetAppleM4A) else { done(nil); return }
        let out = FileManager.default.temporaryDirectory.appendingPathComponent("fala_\(UUID().uuidString).m4a")
        ex.outputURL = out
        ex.outputFileType = .m4a
        ex.exportAsynchronously { done(ex.status == .completed ? out : nil) }
    }

    private func recognize(_ audio: URL, id: String, call: CAPPluginCall) {
        guard let rec = SFSpeechRecognizer(locale: Locale(identifier: "pt-BR")), rec.isAvailable else {
            call.reject("Reconhecimento de fala em português indisponível neste iPhone."); return
        }
        let req = SFSpeechURLRecognitionRequest(url: audio)
        req.shouldReportPartialResults = false
        req.taskHint = .dictation
        if rec.supportsOnDeviceRecognition { req.requiresOnDeviceRecognition = true }
        if #available(iOS 16, *) { req.addsPunctuation = true }
        let dur = CMTimeGetSeconds(AVURLAsset(url: audio).duration)
        var ticker: Timer?
        var p = 0.1
        DispatchQueue.main.async {
            ticker = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
                p = min(0.95, p + 0.5 / max(4, dur * 0.6))
                self.notifyListeners("transcribeProgress", data: ["id": id, "p": p])
            }
        }
        var finished = false
        rec.recognitionTask(with: req) { result, error in
            if finished { return }
            if let r = result, r.isFinal {
                finished = true
                DispatchQueue.main.async { ticker?.invalidate() }
                call.resolve(["words": Self.words(r.bestTranscription)])
                try? FileManager.default.removeItem(at: audio)
            } else if let e = error {
                finished = true
                DispatchQueue.main.async { ticker?.invalidate() }
                let ns = e as NSError
                if ns.code == 1110 || ns.code == 203 { call.resolve(["words": []]) } // nenhuma fala detectada
                else { call.reject("Não consegui ouvir o vídeo: \(e.localizedDescription)") }
            }
        }
    }

    /// Palavras com tempo; a pontuação do texto formatado ("?" do gancho) volta para cada palavra.
    static func words(_ t: SFTranscription) -> [[String: Any]] {
        let full = t.formattedString as NSString
        var out: [[String: Any]] = []
        let punct = CharacterSet(charactersIn: ".,!?;:…")
        for s in t.segments {
            var w = s.substring
            var end = s.substringRange.location + s.substringRange.length
            while end < full.length, let u = Unicode.Scalar(full.character(at: end)), punct.contains(u) {
                if !w.hasSuffix(String(u)) { w += String(u) }
                end += 1
            }
            w = w.trimmingCharacters(in: .whitespaces)
            if w.isEmpty { continue }
            out.append(["w": w, "s": s.timestamp, "e": s.timestamp + max(0.12, s.duration), "c": Double(s.confidence > 0 ? s.confidence : 0.6)])
        }
        return out
    }

    // MARK: montar o vídeo

    @objc func render(_ call: CAPPluginCall) {
        let spec = call.options as? [String: Any] ?? [:]
        let out = dir("projects").appendingPathComponent("FLUX-CINE-\(Int(Date().timeIntervalSince1970 * 1000)).mp4")
        let ex = CineExporter()
        exporter = ex
        io.async {
            ex.export(spec, to: out, progress: { p in
                self.notifyListeners("renderProgress", data: ["p": p])
            }, done: { r in
                switch r {
                case .success(let total):
                    call.resolve(["path": out.path, "durationMs": Int(total * 1000), "thumb": Self.thumb(out, at: min(1.5, total / 2), width: 240)])
                case .failure(let e):
                    call.reject("Falha ao montar o vídeo: \(e.localizedDescription)")
                }
            })
        }
    }

    @objc func cancelRender(_ call: CAPPluginCall) { exporter?.cancel(); call.resolve() }

    @objc func deleteFile(_ call: CAPPluginCall) {
        if let p = call.getString("path"), p.hasPrefix(docs.path) { try? FileManager.default.removeItem(atPath: p) }
        call.resolve()
    }

    // MARK: entregar

    @objc func copyText(_ call: CAPPluginCall) {
        let t = call.getString("text") ?? ""
        DispatchQueue.main.async { UIPasteboard.general.string = t; call.resolve() }
    }

    @objc func saveToGallery(_ call: CAPPluginCall) {
        guard let p = call.getString("path") else { call.reject("vídeo não informado"); return }
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { st in
            guard st == .authorized || st == .limited else { call.reject("Permita salvar na galeria nos Ajustes."); return }
            PHPhotoLibrary.shared().performChanges({
                PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: URL(fileURLWithPath: p))
            }) { ok, err in
                if ok { call.resolve() } else { call.reject("Não consegui salvar: \(err?.localizedDescription ?? "")") }
            }
        }
    }

    @objc func shareInstagram(_ call: CAPPluginCall) { share(call, instagram: true) }
    @objc func share(_ call: CAPPluginCall) { share(call, instagram: false) }

    private func share(_ call: CAPPluginCall, instagram: Bool) {
        guard let p = call.getString("path") else { call.reject("vídeo não informado"); return }
        let caption = call.getString("caption") ?? ""
        DispatchQueue.main.async {
            if !caption.isEmpty { UIPasteboard.general.string = caption }
            let url = URL(fileURLWithPath: p)
            let hasInsta = UIApplication.shared.canOpenURL(URL(string: "instagram://app")!)
            if instagram && hasInsta {
                // salva na galeria e abre o Instagram já com o vídeo
                PHPhotoLibrary.shared().performChanges({
                    PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)
                }) { ok, _ in
                    DispatchQueue.main.async {
                        if ok, let u = URL(string: "instagram://library?AssetPath=\(p.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
                            UIApplication.shared.open(u)
                        }
                        call.resolve(["instagram": true])
                    }
                }
                return
            }
            let vc = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            if let pop = vc.popoverPresentationController, let v = self.bridge?.viewController?.view {
                pop.sourceView = v
                pop.sourceRect = CGRect(x: v.bounds.midX, y: v.bounds.maxY - 80, width: 1, height: 1)
            }
            self.bridge?.viewController?.present(vc, animated: true)
            call.resolve(["instagram": false])
        }
    }
}
