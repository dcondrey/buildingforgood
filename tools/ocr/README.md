# ocr.swift — read a scanned PDF with nothing installed

`pipeline/src/stillhere_pipeline/pdftext.py` reads a *typed* PDF using only the
standard library. This is the other case: a scan, where the words are pixels and
there is no text layer to read.

The existing digitization path (`stillhere_pipeline.eyepop_audit`) needs
`pdftoppm` from poppler and `pyobjc` for Vision. Neither is present on a clean
machine, and installing them to read one document is a poor trade. macOS already
ships PDFKit and Vision, and `swiftc` is part of the Command Line Tools, so this
renders each page and recognizes text with **no dependency at all**.

    cd tools/ocr && swift build -c release
    ./.build/release/ocr some-scan.pdf [scale]   # scale defaults to 3.0

It is a Swift package rather than a loose `.swift` file for a specific reason:
CodeQL's Swift autobuilder looks for an Xcode project or a package, and a bare
file made the whole code-scanning run fail. Making the code buildable was the
fix; exempting Swift from scanning was the alternative, and worse.

It found what it was written for. `Revised Signed Copy FY22 Scope and Budget HRC
(carryforward).pdf` — a pinned PRA document — has no text layer, so it had never
been read. Nine pages and ~13,800 characters came out, and they answered the
question in `docs/project/DATA_OPPORTUNITIES.md` section 4.

**Scope.** macOS only, and deliberately not wired into `verify.sh`: it is a
reading tool for one-off investigation, not part of any published number. If OCR
output ever becomes an input to something shipped, it belongs in the audited
`eyepop_audit` path with its agreement checks, not here.
