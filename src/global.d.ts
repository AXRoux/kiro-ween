/** Exposed by electron/preload.ts in the desktop app; absent in a browser. */
interface Window {
  castle?: {
    desktop: true;
    close(): void;
    minimize(): void;
    /** Tells the ghosts' window the current verdict, so they glow in its colour. */
    setVerdict(verdict: "safe" | "ask" | "beware" | "none"): void;
    /** In the ghosts' window: called when the castle's verdict changes. */
    onVerdict(listener: (verdict: string) => void): void;
  };
}
