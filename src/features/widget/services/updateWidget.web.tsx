/**
 * The web has no home-screen widget. Metro picks this file over the native
 * one on the web, which keeps the widget library — and the dynamic import
 * that would otherwise pull it into the shared web bundle — out entirely.
 */
export async function refreshWidget(): Promise<void> {
  return undefined;
}
