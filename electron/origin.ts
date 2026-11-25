/**
 * URL guard for the app:// scheme. Electron sets URL.origin to the string "null" for non-special schemes,
 * so comparing origin strings never works. Parse the URL and check protocol + host directly instead.
 */

/** Returns true only when the URL uses the app: protocol with the host "trick-or-read". */
export function isAppUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "app:" && parsed.host === "trick-or-read";
  } catch {
    return false;
  }
}
