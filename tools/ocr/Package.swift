// swift-tools-version:5.9
// A real package rather than a loose file: CodeQL's Swift autobuilder looks for
// an Xcode project or a Swift package, and a bare .swift file made the scan
// fail outright. Making the code buildable is the fix; exempting it from
// scanning would have been the other one, and worse.
import PackageDescription

let package = Package(
    name: "ocr",
    platforms: [.macOS(.v13)],
    targets: [.executableTarget(name: "ocr", path: "Sources/ocr")]
)
