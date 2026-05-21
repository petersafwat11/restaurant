'use client';

/**
 * Trigger a browser "save as" prompt for an in-memory Blob.
 *
 * Implementation detail: we mint an object URL, create a hidden anchor with
 * `download=<filename>`, click it, then revoke the URL. This is the standard
 * pattern for downloading authenticated content that arrived via a fetch
 * (since `window.open` would fire a fresh credential-less request).
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
