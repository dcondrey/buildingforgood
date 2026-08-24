import Foundation
import PDFKit
import Vision

// Render each PDF page and run Apple Vision text recognition over it.
// macOS only, offline, no third-party dependency.
let args = CommandLine.arguments
guard args.count > 1, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write("usage: ocr <file.pdf> [scale]\n".data(using: .utf8)!)
    exit(2)
}
let scale = args.count > 2 ? (Double(args[2]) ?? 3.0) : 3.0

for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let bounds = page.bounds(for: .mediaBox)
    let w = Int(bounds.width * scale), h = Int(bounds.height * scale)
    guard w > 0, h > 0,
          let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8,
                              bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
    else { continue }
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.scaleBy(x: CGFloat(scale), y: CGFloat(scale))
    page.draw(with: .mediaBox, to: ctx)
    guard let img = ctx.makeImage() else { continue }

    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = true
    try? VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
    let lines = (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }
    print("--- page \(i + 1) ---")
    print(lines.joined(separator: "\n"))
}
