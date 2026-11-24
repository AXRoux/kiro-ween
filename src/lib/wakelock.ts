/**
 * Keeps a phone's screen awake while the camera is on. A blind user cannot see the screen dim, and a sleeping screen
 * stops the camera mid-haul. Re-taken when the page comes back into view (the browser drops it when hidden).
 */
type Sentinel = { release(): Promise<void> };

export function keepAwake(): () => void {
  const nav = navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<Sentinel> } };
  if (!nav.wakeLock) return () => undefined;
  let lock: Sentinel | null = null;
  let stopped = false;
  const take = () => {
    if (stopped || document.visibilityState !== "visible") return;
    nav.wakeLock!.request("screen").then((l) => (stopped ? void l.release() : (lock = l)), () => undefined);
  };
  const onVisible = () => document.visibilityState === "visible" && take();
  document.addEventListener("visibilitychange", onVisible);
  take();
  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    void lock?.release().catch(() => undefined);
  };
}
