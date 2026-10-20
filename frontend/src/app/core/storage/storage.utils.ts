/**
 * Local storage of the page, `null` when the browser blocks even reaching it (some private modes).
 */
export function storageOf(document: Document): Storage | null {
  try {
    return document.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}
