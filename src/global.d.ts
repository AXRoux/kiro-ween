/** Exposed by electron/preload.ts in the desktop app; absent in a browser. */
interface Window {
  castle?: {
    desktop: true;
    close(): void;
    minimize(): void;
  };
}
