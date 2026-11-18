import UIKit
import CoreText

// FLUX CINE — camada gráfica do vídeo final no iPhone: título cinematográfico, legenda, flash, CTA, fade.
// Espelha www/titles.js (draw / drawCaption) e o port Android (TitleLayer.java / CineRenderer.java).

enum Fonts {
    private static var cache: [String: CGFont] = [:]
    private static let lock = NSLock()

    static func cg(_ stem: String) -> CGFont? {
        lock.lock(); defer { lock.unlock() }
        if let f = cache[stem] { return f }
        let name = stem.replacingOccurrences(of: ".ttf", with: "")
        let url = Bundle.main.url(forResource: name, withExtension: "ttf", subdirectory: "public/ttf")
            ?? Bundle.main.url(forResource: name, withExtension: "ttf")
        guard let u = url, let p = CGDataProvider(url: u as CFURL), let f = CGFont(p) else { return nil }
        cache[stem] = f
        return f
    }

    static func ct(_ stem: String, _ size: CGFloat) -> CTFont {
        if let g = cg(stem) { return CTFontCreateWithGraphicsFont(g, size, nil, nil) }
        return CTFontCreateWithName("HelveticaNeue-Bold" as CFString, size, nil)
    }
}

func parseColor(_ s: String?) -> UIColor {
    guard var t = s?.trimmingCharacters(in: .whitespaces), !t.isEmpty else { return .white }
    if t.hasPrefix("rgb") {
        if let a = t.firstIndex(of: "("), let b = t.firstIndex(of: ")") {
            let p = t[t.index(after: a)..<b].split(separator: ",").map { Double($0.trimmingCharacters(in: .whitespaces)) ?? 0 }
            if p.count >= 3 { return UIColor(red: p[0] / 255, green: p[1] / 255, blue: p[2] / 255, alpha: p.count > 3 ? p[3] : 1) }
        }
        return .white
    }
    if t.hasPrefix("#") { t.removeFirst() }
    if t.count == 3 { t = t.map { "\($0)\($0)" }.joined() }
    var v: UInt64 = 0
    Scanner(string: t).scanHexInt64(&v)
    if t.count == 8 { return UIColor(red: CGFloat((v >> 24) & 255) / 255, green: CGFloat((v >> 16) & 255) / 255, blue: CGFloat((v >> 8) & 255) / 255, alpha: CGFloat(v & 255) / 255) }
    return UIColor(red: CGFloat((v >> 16) & 255) / 255, green: CGFloat((v >> 8) & 255) / 255, blue: CGFloat(v & 255) / 255, alpha: 1)
}

private func clamp(_ v: Double) -> Double { v < 0 ? 0 : (v > 1 ? 1 : v) }
private func outCubic(_ a: Double) -> Double { let b = 1 - a; return 1 - b * b * b }
private func inCubic(_ a: Double) -> Double { a * a * a }
private func outBack(_ a0: Double) -> Double { let c = 1.7; let a = a0 - 1; return 1 + a * a * ((c + 1) * a + c) }
private func flick(_ t: Double) -> Double { let k = Int64(floor(t * 22)); return ((k * 73 + 11) % 7) > 2 ? 1 : 0.25 }
private func withAlpha(_ c: UIColor, _ a: Double) -> CGColor {
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, al: CGFloat = 0
    c.getRed(&r, green: &g, blue: &b, alpha: &al)
    return UIColor(red: r, green: g, blue: b, alpha: al * CGFloat(clamp(a))).cgColor
}

// MARK: - texto (CoreText) com desfoque pelo truque da sombra

enum TextPaint {
    /// Sinal da sombra no espaço do aparelho, medido uma vez (os contextos de bitmap variam).
    static let sign: (CGFloat, CGFloat) = {
        let W = 64
        for sx in [CGFloat(1), -1] {
            for sy in [CGFloat(1), -1] {
                guard let ctx = CGContext(data: nil, width: W, height: W, bitsPerComponent: 8, bytesPerRow: W * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { continue }
                ctx.translateBy(x: 0, y: CGFloat(W)); ctx.scaleBy(x: 1, y: -1)
                let d = ctx.convertToDeviceSpace(CGSize(width: 1000, height: 1000))
                ctx.setShadow(offset: CGSize(width: sx * d.width, height: sy * d.height), blur: 0, color: UIColor.white.cgColor)
                ctx.setFillColor(UIColor.white.cgColor)
                ctx.fill(CGRect(x: 28 - 1000, y: 28 - 1000, width: 8, height: 8))
                if let data = ctx.data {
                    let px = data.assumingMemoryBound(to: UInt8.self)
                    var lit = false
                    for y in 26..<38 { for x in 26..<38 where px[(y * W + x) * 4 + 3] > 100 { lit = true } }
                    if lit { return (sx, sy) }
                }
            }
        }
        return (1, -1)
    }()

    static func line(_ s: String, _ font: CTFont, kern: CGFloat, color: CGColor, stroke: CGFloat = 0) -> CTLine {
        var attrs: [NSAttributedString.Key: Any] = [.font: font, .kern: kern]
        if stroke > 0 {
            attrs[.strokeColor] = UIColor(cgColor: color)
            attrs[.strokeWidth] = stroke / CTFontGetSize(font) * 100
        } else {
            attrs[.foregroundColor] = UIColor(cgColor: color)
        }
        return CTLineCreateWithAttributedString(NSAttributedString(string: s, attributes: attrs))
    }

    static func width(_ s: String, _ font: CTFont, kern: CGFloat) -> CGFloat {
        if s.isEmpty { return 0 }
        let l = CTLineCreateWithAttributedString(NSAttributedString(string: s, attributes: [.font: font, .kern: kern]))
        return CGFloat(CTLineGetTypographicBounds(l, nil, nil, nil))
    }

    /// Desenha a linha com a linha de base em (x, y). blur > 0 desenha só o "borrão" (sombra deslocada).
    static func draw(_ ctx: CGContext, _ line: CTLine, x: CGFloat, y: CGFloat, blur: CGFloat = 0, blurColor: CGColor? = nil) {
        ctx.saveGState()
        ctx.textMatrix = CGAffineTransform(scaleX: 1, y: -1)
        if blur > 0.5 {
            let off: CGFloat = 20000
            let d = ctx.convertToDeviceSpace(CGSize(width: off, height: 0))
            let dev = ctx.convertToDeviceSpace(CGSize(width: 1, height: 1))
            let k = max(abs(dev.width), abs(dev.height))
            ctx.setShadow(offset: CGSize(width: sign.0 * d.width, height: sign.1 * d.height), blur: blur * 2 * k, color: blurColor ?? UIColor.white.cgColor)
            ctx.textPosition = CGPoint(x: x - off, y: y)
        } else {
            ctx.textPosition = CGPoint(x: x, y: y)
        }
        CTLineDraw(line, ctx)
        ctx.restoreGState()
    }
}

// MARK: - camada do título

final class TitleLayer {
    var type = "text", text = "", align = "center", animK = "fade", fontStem = "Inter-700"
    var size: CGFloat = 40, x: CGFloat = 540, y: CGFloat = 960, ls: CGFloat = 0, sx: CGFloat = 1, rot: CGFloat = 0, alpha: CGFloat = 0.4
    var x1: CGFloat = 0, y1: CGFloat = 0, x2: CGFloat = 0, y2: CGFloat = 0, w: CGFloat = 2, h: CGFloat = 10, r: CGFloat = 0
    var cx: CGFloat = 540, cy: CGFloat = 960, rx: CGFloat = 100, ry: CGFloat = 40, outline: CGFloat = 0, arc: CGFloat = 0
    var color = UIColor.white
    var hasShadow = false, hasTextAlpha = false, glow: UIColor?, rgb: (UIColor, UIColor, CGFloat)?, cursor: UIColor?
    var shDx: CGFloat = 0, shDy: CGFloat = 0, shSw: CGFloat = 0, shColor = UIColor.black, textAlpha: CGFloat = 1
    var animD = 0.0, animU = 0.5

    static func parse(_ arr: [[String: Any]]?) -> [TitleLayer] {
        guard let arr = arr else { return [] }
        return arr.map { o in
            let l = TitleLayer()
            func f(_ k: String, _ d: CGFloat) -> CGFloat { (o[k] as? NSNumber).map { CGFloat($0.doubleValue) } ?? d }
            l.type = o["type"] as? String ?? "text"
            l.text = o["text"] as? String ?? ""
            l.fontStem = o["font"] as? String ?? "Inter-700"
            l.size = f("size", 40); l.x = f("x", 540); l.y = f("y", 960)
            l.align = o["align"] as? String ?? "center"
            l.color = parseColor(o["color"] as? String ?? "#FFFFFF")
            l.ls = f("ls", 0); l.sx = f("sx", 1); l.rot = f("rot", 0); l.alpha = f("alpha", 0.4)
            if l.type == "text", o["alpha"] != nil { l.hasTextAlpha = true; l.textAlpha = f("alpha", 1) }
            l.x1 = f("x1", 0); l.y1 = f("y1", 0); l.x2 = f("x2", 0); l.y2 = f("y2", 0)
            l.w = f("w", 2); l.h = f("h", 10); l.r = f("r", 0)
            l.cx = f("cx", 540); l.cy = f("cy", 960); l.rx = f("rx", 100); l.ry = f("ry", 40)
            l.outline = f("outline", 0); l.arc = f("arc", 0)
            if let g = o["glow"] as? String { l.glow = parseColor(g) }
            if let c = o["cursor"] as? String { l.cursor = parseColor(c) }
            if let a = o["rgb"] as? [Any], a.count >= 3 { l.rgb = (parseColor(a[0] as? String), parseColor(a[1] as? String), CGFloat((a[2] as? NSNumber)?.doubleValue ?? 10)) }
            if let sh = o["shadow"] as? [String: Any] {
                l.hasShadow = true
                l.shDx = CGFloat((sh["dx"] as? NSNumber)?.doubleValue ?? 0); l.shDy = CGFloat((sh["dy"] as? NSNumber)?.doubleValue ?? 0)
                l.shSw = CGFloat((sh["sw"] as? NSNumber)?.doubleValue ?? 0); l.shColor = parseColor(sh["color"] as? String ?? "#000000")
            }
            if let an = o["anim"] as? [String: Any] {
                l.animK = an["k"] as? String ?? "fade"
                l.animD = (an["d"] as? NSNumber)?.doubleValue ?? 0
                l.animU = max(0.01, (an["u"] as? NSNumber)?.doubleValue ?? 0.5)
            }
            return l
        }
    }

    static func drawAll(_ c: CGContext, _ layers: [TitleLayer], t: Double, tEnd: Double, ox: CGFloat, oy: CGFloat, s: CGFloat) {
        let out = inCubic(clamp((t - (tEnd - 0.45)) / 0.45))
        for el in layers { el.draw(c, t: t, out: out, ox: ox, oy: oy, s: s) }
    }

    private func arcText(_ c: CGContext, _ str: String, font: CTFont, lsPx: CGFloat, ox: CGFloat, oy: CGFloat, color: CGColor, blur: CGFloat) {
        let chars = str.map { String($0) }
        var tot: CGFloat = 0
        for ch in chars { tot += TextPaint.width(ch, font, kern: 0) + lsPx }
        var px = -tot / 2
        for ch in chars {
            let cw = TextPaint.width(ch, font, kern: 0) + lsPx
            let ang = (px + cw / 2) / arc
            c.saveGState()
            c.translateBy(x: ox + arc * sin(ang), y: oy + arc - arc * cos(ang))
            c.rotate(by: ang)
            let ln = TextPaint.line(ch, font, kern: 0, color: color)
            TextPaint.draw(c, ln, x: -cw / 2 + lsPx / 2, y: 0, blur: blur, blurColor: color)
            c.restoreGState()
            px += cw
        }
    }

    private func draw(_ c: CGContext, t: Double, out: Double, ox: CGFloat, oy: CGFloat, s: CGFloat) {
        let p = clamp((t - animD) / animU), e = outCubic(p)
        var a = e * (1 - out) * Double(hasTextAlpha ? textAlpha : 1)
        if animK == "flicker" && p < 1 { a *= flick(t) }
        if animK == "glitch" { a = (p > 0 ? 1 : 0) * (1 - out) * (p < 1 ? flick(t + 0.3) : 1) }
        if a <= 0.004 { return }
        if type == "dim" {
            c.setFillColor(UIColor(white: 0, alpha: alpha * CGFloat(a)).cgColor)
            c.fill(CGRect(x: 0, y: 0, width: 1080, height: 1920)); return
        }
        if type == "vignette" {
            let cols = [UIColor(white: 0, alpha: 0).cgColor, UIColor(white: 0, alpha: 0).cgColor, UIColor(white: 0, alpha: alpha * 0.85 * CGFloat(a)).cgColor, UIColor(white: 0, alpha: alpha * CGFloat(a)).cgColor] as CFArray
            if let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: cols, locations: [0, 0.5, 0.91, 1]) {
                c.saveGState(); c.clip(to: CGRect(x: 0, y: 0, width: 1080, height: 1920))
                c.drawRadialGradient(g, startCenter: CGPoint(x: 540, y: 960), startRadius: 0, endCenter: CGPoint(x: 540, y: 960), endRadius: 760, options: [.drawsAfterEndLocation])
                c.restoreGState()
            }
            return
        }
        c.saveGState()
        defer { c.restoreGState() }
        c.translateBy(x: 540 + ox, y: 960 + oy); c.scaleBy(x: s, y: s); c.translateBy(x: -540, y: -960)
        switch type {
        case "line":
            let mx = (x1 + x2) / 2, half = (x2 - x1) / 2 * CGFloat(animK == "draw" ? e : 1)
            c.setStrokeColor(withAlpha(color, a)); c.setLineWidth(w)
            c.move(to: CGPoint(x: mx - half, y: y1)); c.addLine(to: CGPoint(x: mx + half, y: y2)); c.strokePath()
            return
        case "oval":
            c.setStrokeColor(withAlpha(color, a)); c.setLineWidth(w)
            c.strokeEllipse(in: CGRect(x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2))
            return
        case "box":
            let bw = max(1, w * CGFloat(animK == "wipe" ? e : 1)), rr = min(r, bw / 2)
            c.setFillColor(withAlpha(color, a))
            c.addPath(CGPath(roundedRect: CGRect(x: x, y: y, width: bw, height: h), cornerWidth: rr, cornerHeight: rr, transform: nil)); c.fillPath()
            return
        default: break
        }
        var blur = 0.0, scale = 1.0, sy = 1.0, dx = 0.0, dy = 0.0, lsx = Double(ls), reveal = 1.0
        var txt = text
        switch animK {
        case "blur": blur = 30 * (1 - e); scale = 1.12 - 0.12 * e; lsx += 0.25 * (1 - e)
        case "rise": dy = 70 * (1 - e); blur = 10 * (1 - e)
        case "reveal": reveal = e
        case "stretch": sy = 0.35 + 0.65 * e; blur = 18 * (1 - e)
        case "track": lsx += 0.5 * (1 - e); blur = 8 * (1 - e)
        case "pop": scale = 0.55 + 0.45 * outBack(p)
        case "zoom": scale = 1.9 - 0.9 * e; blur = 20 * (1 - e)
        case "slideL": dx = -260 * (1 - e); blur = 12 * (1 - e)
        case "slideR": dx = 260 * (1 - e); blur = 12 * (1 - e)
        case "type": txt = String(text.prefix(Int((Double(text.count) * p).rounded())))
        case "glitch": if p < 1 { dx = (flick(t * 1.7) - 0.6) * 30 }
        default: break
        }
        blur += 16 * out
        dy -= 34 * out
        let font = Fonts.ct(fontStem, size)
        let kern = CGFloat(lsx) * size
        let fullW = TextPaint.width(text, font, kern: kern) * sx
        let x0 = align == "left" ? x : (align == "right" ? x - fullW : x - fullW / 2)
        let lx = (x0 - x) / sx
        let bl = CGFloat(blur)

        c.translateBy(x: x + CGFloat(dx), y: y + CGFloat(dy))
        if rot != 0 { c.rotate(by: rot * .pi / 180) }
        c.scaleBy(x: CGFloat(scale) * sx, y: CGFloat(scale * sy))
        if reveal < 1 { c.clip(to: CGRect(x: lx - 40, y: -size * 1.4, width: (fullW / sx + 80) * CGFloat(reveal), height: size * 2.4)) }

        if arc > 0 {
            if hasShadow { arcText(c, txt, font: font, lsPx: kern, ox: shDx / sx, oy: shDy, color: withAlpha(shColor, a), blur: bl) }
            arcText(c, txt, font: font, lsPx: kern, ox: 0, oy: 0, color: withAlpha(color, a), blur: bl)
            return
        }
        if let g = glow {
            let gc = withAlpha(g, a)
            TextPaint.draw(c, TextPaint.line(txt, font, kern: kern, color: gc, stroke: outline > 0 ? outline * 2 : 0), x: lx, y: 0, blur: 18 + bl, blurColor: gc)
        }
        if let (ca, cb, off0) = rgb {
            let off = off0 * (animK == "glitch" && p < 1 ? 2.2 : 1)
            let c1 = withAlpha(ca, a * 0.85), c2 = withAlpha(cb, a * 0.85)
            TextPaint.draw(c, TextPaint.line(txt, font, kern: kern, color: c1), x: lx - off, y: 0, blur: bl, blurColor: c1)
            TextPaint.draw(c, TextPaint.line(txt, font, kern: kern, color: c2), x: lx + off, y: 0, blur: bl, blurColor: c2)
        }
        if hasShadow {
            let sc = withAlpha(shColor, a)
            if shSw > 0 {
                c.saveGState(); c.setLineJoin(.round)
                TextPaint.draw(c, TextPaint.line(txt, font, kern: kern, color: sc, stroke: shSw * 2), x: lx, y: 0, blur: bl, blurColor: sc)
                c.restoreGState()
            }
            TextPaint.draw(c, TextPaint.line(txt, font, kern: kern, color: sc), x: lx + shDx / sx, y: shDy, blur: bl, blurColor: sc)
        }
        let mc = withAlpha(color, a)
        c.setLineJoin(.round)
        TextPaint.draw(c, TextPaint.line(txt, font, kern: kern, color: mc, stroke: outline), x: lx, y: 0, blur: bl, blurColor: mc)
        if let cur = cursor, animK == "type", p < 1 || Int(floor(t * 2.5)) % 2 == 0 {
            let cw = TextPaint.width(txt, font, kern: kern)
            c.setFillColor(withAlpha(cur, a))
            c.fill(CGRect(x: lx + cw + 8, y: -size * 0.78, width: size * 0.5, height: size * 0.9))
        }
    }
}

// MARK: - especificação do vídeo

final class CineSpec {
    static let W: CGFloat = 1080, H: CGFloat = 1920

    struct Chunk { var s: Double; var e: Double; var words: [String]; var ws: [Double]; var we: [Double] }
    struct Seg { var path: String; var startMs: Int; var endMs: Int; var speed: Double; var removeAudio: Bool; var zoom: Double }

    var cta = "", ending = "fade"
    var total = 0.0, titleEnd = 0.0, finalStart = -1.0
    var boundaries: [Double] = []
    var chunks: [Chunk] = []
    var layers: [TitleLayer] = []
    var segs: [Seg] = []
    var tfX: CGFloat = 0, tfY: CGFloat = 0, tfS: CGFloat = 1
    var outW = 1080, outH = 1920
    var capFont = "Montserrat-800", capUpper = false, capSize: CGFloat = 1, capLs: CGFloat = 0, capY: CGFloat = 0.73
    var capShadow = "outline", capHl = "box", capAnim = "pop"
    var capColor = UIColor.white, capAccent = parseColor("#FF7A1A")
    var grade: [String: Any]?
    var sfx = "none"

    var ctaStart: Double { max(0.6, total - 3.2) }

    init(_ o: [String: Any]) {
        func d(_ v: Any?, _ def: Double) -> Double { (v as? NSNumber)?.doubleValue ?? def }
        cta = o["cta"] as? String ?? ""
        ending = o["ending"] as? String ?? "fade"
        sfx = o["sfx"] as? String ?? "none"
        if let cs = o["captionStyle"] as? [String: Any] {
            capFont = (cs["fontFile"] as? String ?? "Montserrat-800.ttf").replacingOccurrences(of: ".ttf", with: "")
            capUpper = cs["upper"] as? Bool ?? false
            capSize = CGFloat(d(cs["size"], 1)); capLs = CGFloat(d(cs["ls"], 0)); capY = CGFloat(d(cs["y"], 0.73))
            capShadow = cs["shadow"] as? String ?? "outline"; capHl = cs["hl"] as? String ?? "box"; capAnim = cs["anim"] as? String ?? "pop"
            capColor = parseColor(cs["color"] as? String ?? "#FFFFFF"); capAccent = parseColor(cs["accent"] as? String ?? "#FF7A1A")
        }
        layers = TitleLayer.parse(o["titleLayout"] as? [[String: Any]])
        titleEnd = d(o["titleEnd"], layers.isEmpty ? 0 : 3.4)
        finalStart = d(o["finalStart"], -1)
        if let tf = o["titleTf"] as? [String: Any] { tfX = CGFloat(d(tf["ox"], 0)); tfY = CGFloat(d(tf["oy"], 0)); tfS = CGFloat(d(tf["s"], 1)) }
        if (o["quality"] as? String) == "4k" { outW = 2160; outH = 3840 }
        grade = o["grade"] as? [String: Any]
        for g in (o["segments"] as? [[String: Any]] ?? []) {
            let st = Int(d(g["startMs"], 0)), en = max(st + 40, Int(d(g["endMs"], 0)))
            var sp = d(g["speed"], 1); if sp <= 0 { sp = 1 }
            segs.append(Seg(path: g["path"] as? String ?? "", startMs: st, endMs: en, speed: sp, removeAudio: g["removeAudio"] as? Bool ?? false, zoom: d(g["zoom"], 1)))
            total += Double(en - st) / 1000 / sp
        }
        boundaries = (o["boundaries"] as? [Any] ?? []).compactMap { ($0 as? NSNumber)?.doubleValue }
        for c in (o["captions"] as? [[String: Any]] ?? []) {
            let w = c["words"] as? [[String: Any]] ?? []
            if w.isEmpty { continue }
            chunks.append(Chunk(s: d(c["s"], 0), e: d(c["e"], 0), words: w.map { $0["w"] as? String ?? "" }, ws: w.map { d($0["s"], 0) }, we: w.map { d($0["e"], 0) }))
        }
    }
}

// MARK: - quadro gráfico (com cache quando nada muda)

final class CineRenderer {
    private let s: CineSpec
    private var last: CGImage?
    private var lastKey: String?
    private let lock = NSLock()

    init(_ spec: CineSpec) { s = spec }

    static func impactScale(_ t: Double, _ fs: Double) -> Double {
        if fs < 0 || t < fs { return 1 }
        let d = t - fs
        if d < 0.12 { return 1 + 0.14 * (d / 0.12) }
        let e = min(1, (d - 0.12) / 0.6)
        return 1.14 - 0.08 * (1 - pow(1 - e, 3))
    }

    private func chunkAt(_ t: Double) -> Int {
        if !s.layers.isEmpty && t < s.titleEnd - 0.05 { return -1 }
        for (i, c) in s.chunks.enumerated() where t >= c.s && t < c.e + 0.1 { return i }
        return -1
    }

    func frame(_ t: Double) -> CGImage? {
        lock.lock(); defer { lock.unlock() }
        var anim = t < s.titleEnd + 0.05
        let ci = chunkAt(t)
        var wi = -1, vis = 0
        if ci >= 0 {
            let c = s.chunks[ci]
            if t - c.s < 0.4 { anim = true }
            for j in 0..<c.words.count {
                if t >= c.ws[j] && t < c.we[j] + 0.08 { wi = j }
                if t >= c.ws[j] - 0.05 { vis = j + 1 }
            }
        }
        let cs = s.ctaStart
        if t >= cs && t < cs + 0.7 { anim = true }
        if s.ending == "fade" && t > s.total - 1.0 { anim = true }
        for b in s.boundaries where t > b - 0.08 && t < b + 0.22 { anim = true }
        let key = "\(ci)/\(wi)/\(vis)/\(t >= cs ? 1 : 0)"
        if !anim, key == lastKey, let l = last { return l }

        guard let ctx = CGContext(data: nil, width: s.outW, height: s.outH, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) else { return nil }
        ctx.translateBy(x: 0, y: CGFloat(s.outH)); ctx.scaleBy(x: 1, y: -1)
        ctx.scaleBy(x: CGFloat(s.outW) / CineSpec.W, y: CGFloat(s.outH) / CineSpec.H)
        draw(ctx, t, ci)
        let img = ctx.makeImage()
        last = img
        lastKey = anim ? nil : key
        return img
    }

    private func draw(_ c: CGContext, _ t: Double, _ ci: Int) {
        let W = CineSpec.W, H = CineSpec.H
        for b in s.boundaries {
            let d = t - b
            if d > -0.06 && d < 0.2 {
                let a = d < 0 ? (d + 0.06) / 0.06 : 1 - d / 0.2
                c.setFillColor(UIColor(white: 1, alpha: CGFloat(0.55 * clamp(a))).cgColor)
                c.fill(CGRect(x: 0, y: 0, width: W, height: H))
            }
        }
        if !s.layers.isEmpty && t < s.titleEnd + 0.02 { TitleLayer.drawAll(c, s.layers, t: t, tEnd: s.titleEnd, ox: s.tfX, oy: s.tfY, s: s.tfS) }
        if ci >= 0 { let k = s.chunks[ci]; drawCaption(c, t, k, s.finalStart >= 0 && k.s >= s.finalStart - 0.01) }
        if t >= s.ctaStart && !s.cta.isEmpty { drawCta(c, t - s.ctaStart) }
        if s.ending == "fade" {
            let a = clamp((t - (s.total - 0.9)) / 0.9)
            if a > 0 { c.setFillColor(UIColor(white: 0, alpha: CGFloat(a)).cgColor); c.fill(CGRect(x: 0, y: 0, width: W, height: H)) }
        }
    }

    private func drawCaption(_ c: CGContext, _ t: Double, _ k: CineSpec.Chunk, _ emph: Bool) {
        let W = CineSpec.W, H = CineSpec.H
        let p = clamp((t - k.s) / 0.16), a = outCubic(p)
        var sc = 1.0, al = a
        if s.capAnim == "pop" { sc = 0.86 + 0.14 * a } else if s.capAnim == "bounce" { sc = 0.6 + 0.4 * outBack(p) } else if s.capAnim == "none" || s.capAnim == "type" { al = 1 }
        let size = 76 * s.capSize * (emph ? 1.22 : 1)
        let font = Fonts.ct(s.capFont, size), kern = s.capLs * size
        let words = k.words.map { s.capUpper ? $0.uppercased() : $0 }
        let ww = words.map { TextPaint.width($0, font, kern: kern) }
        let space = TextPaint.width(" ", font, kern: 0) * 1.1 + kern
        var lines: [(Int, Int)] = []
        var lw: CGFloat = 0, from = 0
        for i in 0..<words.count {
            if i > from && lw + space + ww[i] > 940 { lines.append((from, i)); from = i; lw = ww[i] } else { lw += (i > from ? space : 0) + ww[i] }
        }
        lines.append((from, words.count))
        let lh = size * 1.28
        let baseY = H * s.capY - lh * CGFloat(lines.count - 1) / 2
        c.saveGState()
        c.translateBy(x: W / 2, y: baseY); c.scaleBy(x: CGFloat(sc), y: CGFloat(sc)); c.translateBy(x: -W / 2, y: -baseY)
        for (li, L) in lines.enumerated() {
            var tot: CGFloat = 0
            for i in L.0..<L.1 { tot += ww[i] + (i > L.0 ? space : 0) }
            var x = W / 2 - tot / 2
            let y = baseY + CGFloat(li) * lh
            for j in L.0..<L.1 {
                let visible = s.capAnim != "type" || t >= k.ws[j] - 0.05
                if visible {
                    let on = t >= k.ws[j] && t < k.we[j] + 0.08, boxed = on && s.capHl == "box"
                    var col = s.capColor
                    if boxed {
                        c.setFillColor(withAlpha(s.capAccent, al))
                        c.addPath(CGPath(roundedRect: CGRect(x: x - 14, y: y - size * 0.86, width: ww[j] + 28, height: size * 1.1), cornerWidth: 16, cornerHeight: 16, transform: nil)); c.fillPath()
                        col = UIColor(red: 10 / 255, green: 10 / 255, blue: 10 / 255, alpha: 1)
                    } else if on && s.capHl == "color" { col = s.capAccent }
                    if !boxed {
                        switch s.capShadow {
                        case "outline":
                            c.saveGState(); c.setLineJoin(.round)
                            TextPaint.draw(c, TextPaint.line(words[j], font, kern: kern, color: withAlpha(.black, al), stroke: size * 0.16), x: x, y: y)
                            c.restoreGState()
                        case "hard":
                            TextPaint.draw(c, TextPaint.line(words[j], font, kern: kern, color: withAlpha(.black, al)), x: x + size * 0.07, y: y + size * 0.07)
                        case "soft":
                            let sc2 = withAlpha(UIColor(white: 0, alpha: 0.85), al)
                            TextPaint.draw(c, TextPaint.line(words[j], font, kern: kern, color: sc2), x: x, y: y + size * 0.06, blur: size * 0.14, blurColor: sc2)
                        case "glow":
                            let gc = withAlpha(s.capAccent, al)
                            TextPaint.draw(c, TextPaint.line(words[j], font, kern: kern, color: gc), x: x, y: y, blur: size * 0.18, blurColor: gc)
                        default: break
                        }
                    }
                    TextPaint.draw(c, TextPaint.line(words[j], font, kern: kern, color: withAlpha(col, al)), x: x, y: y)
                    if on && s.capHl == "underline" {
                        c.setFillColor(withAlpha(s.capAccent, al))
                        c.addPath(CGPath(roundedRect: CGRect(x: x, y: y + 14, width: ww[j], height: 10), cornerWidth: 5, cornerHeight: 5, transform: nil)); c.fillPath()
                    }
                }
                x += ww[j] + space
            }
        }
        c.restoreGState()
    }

    private func drawCta(_ c: CGContext, _ d: Double) {
        let W = CineSpec.W
        let a = outCubic(clamp(d / 0.55))
        let font = Fonts.ct("Inter-700", 52)
        let tw = TextPaint.width(s.cta, font, kern: 0)
        let y = 1640 + CGFloat(50 * (1 - a))
        c.setFillColor(withAlpha(s.capAccent, a))
        c.addPath(CGPath(roundedRect: CGRect(x: W / 2 - tw / 2 - 52, y: y - 62, width: tw + 104, height: 96), cornerWidth: 48, cornerHeight: 48, transform: nil)); c.fillPath()
        TextPaint.draw(c, TextPaint.line(s.cta, font, kern: 0, color: withAlpha(UIColor(white: 0.04, alpha: 1), a)), x: W / 2 - tw / 2, y: y)
    }
}
