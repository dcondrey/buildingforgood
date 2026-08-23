/**
 * Saving and printing, entirely in the browser.
 *
 * Nothing here contacts a server, and nothing here can: a Blob URL and
 * `window.print()` are the whole mechanism. That is the same property the
 * rest of the app has — no login, no backend, no data leaving the machine —
 * and it is why the PDF path drives the existing print stylesheet instead of
 * bundling a PDF library.
 */

export function downloadTextFile(filename: string, mimeType: string, contents: string): boolean {
  try {
    const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Print with `className` on `<body>`, so a stylesheet can decide that this
 * one document is the page and the rest of the app is not.
 */
export function printWithBodyClass(className: string): boolean {
  const body = document.body;
  let done = false;
  const restore = () => {
    if (done) return;
    done = true;
    body.classList.remove(className);
    window.removeEventListener("afterprint", restore);
  };
  try {
    body.classList.add(className);
    window.addEventListener("afterprint", restore);
    window.print();
    window.setTimeout(restore, 2000);
    return true;
  } catch {
    restore();
    return false;
  }
}

/** A filename that is safe on every filesystem and says what the file is. */
export function exportFilename(kind: string, budget: number, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `still-here-sd-${kind}-${budget}h-${stamp}.${extension}`;
}
