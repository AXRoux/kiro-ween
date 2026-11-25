/**
 * Trick or Read as a desktop app: a frameless window that is the painted Halloween night itself, with the app standing
 * in its gate like a phone, ghosts and all. The window is transparent only outside the painting's rounded corners.
 * The page and the API are both served from the app:// scheme in-process (no local port, no browser), so the
 * camera works in a secure context and the keys stay in this main process.
 */
import { app, BrowserWindow, ipcMain, Menu, protocol, screen, session, shell, systemPreferences } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createApp, CSP } from "../server/app";
import { DEFAULT_MODELS, type Provider } from "../server/identify";

// The folder holding package.json, dist/ and dist-electron/. Not __dirname: Bun's bundler bakes in the source
// folder's absolute path (electron/), so the preload was never found and the page never knew it was the desktop app.
const ROOT = app.getAppPath();
const DIST = join(ROOT, "dist");
// The window is exactly the painted scene (SCENE in src/components/Scene.tsx).
const WIDTH = 1120;
const HEIGHT = 920;

/** Keys from .env next to the app (development) or in the user's app data folder (installed). Never in the bundle. */
function loadEnv() {
  for (const file of [join(ROOT, ".env"), join(app.getPath("userData"), ".env")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && m[2] && !process.env[m[1]!]) process.env[m[1]!] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
]);
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.setName("Trick or Read");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".map": "application/json",
};

function serve() {
  const provider = (process.env.VISION_PROVIDER as Provider | undefined) ?? (process.env.FAL_KEY ? "fal" : "anthropic");
  const api = createApp({
    provider,
    apiKey: provider === "fal" ? process.env.FAL_KEY : process.env.ANTHROPIC_API_KEY,
    model: process.env.CANDY_MODEL || DEFAULT_MODELS[provider],
    speechKey: process.env.ELEVENLABS_API_KEY,
    serverOrigin: "app://trick-or-read",
  });
  protocol.handle("app", async (req) => {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) return api(req, "desktop");
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(DIST, rel === "/" ? "index.html" : rel);
    if (!file.startsWith(DIST) || !existsSync(file)) file = join(DIST, "index.html");
    const isHtml = file.endsWith("index.html");
    return new Response(new Uint8Array(await readFile(file)), {
      headers: {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        ...(isHtml ? { "content-security-policy": CSP } : {}),
      },
    });
  });
}

/**
 * Zoom for low vision. The page is laid out for the 1120 x 920 scene, so zooming scales the whole window with it: the
 * scene grows on the desktop instead of being cropped. Never larger than the screen; remembered between runs.
 */
const ZOOMS = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8, 2];
const zoomFile = () => join(app.getPath("userData"), "zoom.json");
function savedZoom(): number {
  try {
    return Number(JSON.parse(readFileSync(zoomFile(), "utf8")).zoom) || 1;
  } catch {
    return 1;
  }
}
/** The largest zoom whose window still fits on the screen the window is on. */
function maxZoom(win?: BrowserWindow): number {
  const area = (win ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay()).workArea;
  return Math.min((area.width - 16) / WIDTH, (area.height - 16) / HEIGHT);
}
function applyZoom(win: BrowserWindow, wanted: number) {
  const zoom = Math.max(ZOOMS[0]!, Math.min(wanted, maxZoom(win)));
  win.webContents.setZoomFactor(zoom);
  win.setContentSize(Math.round(WIDTH * zoom), Math.round(HEIGHT * zoom));
  writeFileSync(zoomFile(), JSON.stringify({ zoom }));
}
function stepZoom(win: BrowserWindow, dir: 1 | -1) {
  const now = win.webContents.getZoomFactor();
  const next = dir > 0 ? ZOOMS.find((z) => z > now + 0.01) : [...ZOOMS].reverse().find((z) => z < now - 0.01);
  if (next) applyZoom(win, next);
}

function menu(win: BrowserWindow) {
  const isMac = process.platform === "darwin";
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(isMac ? [{ role: "appMenu" as const }] : []),
      { role: "editMenu" },
      {
        label: "View",
        submenu: [
          { label: "Actual Size", accelerator: "CmdOrCtrl+0", click: () => applyZoom(win, 1) },
          { label: "Make Bigger", accelerator: "CmdOrCtrl+Plus", click: () => stepZoom(win, 1) },
          { label: "Make Bigger", accelerator: "CmdOrCtrl+=", click: () => stepZoom(win, 1), visible: false },
          { label: "Make Smaller", accelerator: "CmdOrCtrl+-", click: () => stepZoom(win, -1) },
          ...(app.isPackaged ? [] : [{ type: "separator" as const }, { role: "reload" as const }, { role: "toggleDevTools" as const }]),
        ],
      },
      { role: "windowMenu" },
      {
        role: "help",
        submenu: [{ label: "Open Food Facts", click: () => void shell.openExternal("https://world.openfoodfacts.org") }],
      },
    ]),
  );
}

/** TOR_CAPTURE=/path.png renders the window off-screen and muted, saves it, and quits (for checking the costume). */
const CAPTURE = process.env.TOR_CAPTURE;

async function createWindow() {
  // Permission for the camera: macOS asks once, by app name.
  if (process.platform === "darwin" && !CAPTURE) await systemPreferences.askForMediaAccess("camera").catch(() => false);
  // Only grant camera/mic to the app's own origin, not any rogue window that might open.
  session.defaultSession.setPermissionRequestHandler((wc, permission, done) => {
    try { done(permission === "media" && new URL(wc.getURL()).origin === "app://trick-or-read"); }
    catch { done(false); }
  });
  session.defaultSession.setPermissionCheckHandler((wc, permission) => {
    try { return permission === "media" && wc != null && new URL(wc.getURL()).origin === "app://trick-or-read"; }
    catch { return false; }
  });

  const zoom = Math.max(ZOOMS[0]!, Math.min(savedZoom(), maxZoom()));
  const win = new BrowserWindow({
    width: Math.round(WIDTH * zoom),
    height: Math.round(HEIGHT * zoom),
    useContentSize: true,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: "#00000000",
    title: "Trick or Read",
    show: false,
    webPreferences: { zoomFactor: zoom, preload: join(ROOT, "dist-electron", "preload.cjs"), contextIsolation: true, sandbox: true, backgroundThrottling: false, offscreen: Boolean(CAPTURE) },
  });
  if (CAPTURE) {
    win.webContents.setAudioMuted(true);
    win.webContents.once("did-finish-load", () =>
      setTimeout(async () => {
        writeFileSync(CAPTURE, (await win.webContents.capturePage()).toPNG());
        app.quit();
      }, 4000),
    );
  }
  menu(win);
  // Chromium can restore its own per-site zoom on load; put ours back.
  win.webContents.on("did-finish-load", () => win.webContents.setZoomFactor(Math.max(ZOOMS[0]!, Math.min(savedZoom(), maxZoom(win)))));
  win.once("ready-to-show", () => !CAPTURE && win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  ipcMain.on("castle:close", () => win.close());
  ipcMain.on("castle:minimize", () => win.minimize());
  await win.loadURL("app://trick-or-read/");
}

app.whenReady().then(() => {
  loadEnv();
  serve();
  void createWindow();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && void createWindow());
  // Block any <webview> tag, regardless of which window creates it.
  app.on("web-contents-created", (_e, wc) => {
    wc.on("will-attach-webview", (event) => event.preventDefault());
  });
});
app.on("window-all-closed", () => app.quit());
