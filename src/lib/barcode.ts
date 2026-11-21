import { BarcodeDetector as Ponyfill, prepareZXingModule } from "barcode-detector/ponyfill";
// The ZXing WebAssembly is served from our own build, never from a CDN (tech.md).
import wasmUrl from "../../node_modules/zxing-wasm/dist/reader/zxing_reader.wasm?url";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;
type Detector = { detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]> };

let detector: Promise<Detector> | null = null;

async function create(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
  if (Native) {
    const supported = await Native.getSupportedFormats().catch(() => [] as string[]);
    if (FORMATS.every((f) => supported.includes(f))) return new Native({ formats: [...FORMATS] });
  }
  prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) } });
  return new Ponyfill({ formats: [...FORMATS] });
}

/** The first retail barcode in view (EAN or UPC), or null. Never throws: no barcode is a normal answer. */
export async function readBarcode(source: HTMLVideoElement | HTMLCanvasElement): Promise<string | null> {
  try {
    detector ??= create();
    const found = await (await detector).detect(source);
    const code = found.map((b) => b.rawValue.replace(/\D/g, "")).find((v) => v.length >= 8);
    return code ?? null;
  } catch {
    return null;
  }
}
