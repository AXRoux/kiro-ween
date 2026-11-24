/**
 * Trick or Read as a desktop app: a frameless, transparent window shaped like the castle itself: a phone-sized app in a
 * stone case, turrets, battlements and all. A second transparent window, attached to it, holds the ghosts that fly
 * around the outside; it never takes the mouse, so every click either lands on the castle or passes to the desktop.
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
// The castle window is exactly the case (CASE in src/components/Castle.tsx). The ghost window is the case plus the
// haunted air around it (HALO), centred on the castle.
const WIDTH = 460;
const HEIGHT = 880;
const HALO = { x: 110, top: 32, bottom: 8 };
const GHOST_W = WIDTH + 2 * HALO.x;
const GHOST_H = HEIGHT + HALO.top + HALO.bottom;

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
 * Zoom for low vision. The page is laid out for a 460 x 880 castle, so zooming scales the whole window with it (and
 * the ghosts' window around it): the castle grows on the desktop instead of being cropped. Never larger than the
 * screen; remembered between runs.
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
  if (ghosts && !ghosts.isDestroyed()) ghosts.webContents.setZoomFactor(zoom);
  placeGhosts(win);
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

/**
 * The ghosts' window. Ghosts fly in the air around the castle, outside its silhouette, so they live in their own
 * transparent window: a child of the castle's window (on macOS it moves and hides with it), centred on it, that
 * permanently ignores the mouse. There is no switching click-through on and off as the cursor moves, so nothing can
 * get stuck: a click on the castle always lands on the castle, and a click in the ghosts' air always reaches whatever
 * is beneath.
 */
let ghosts: BrowserWindow | null = null;

function placeGhosts(win: BrowserWindow) {
  if (!ghosts || ghosts.isDestroyed() || win.isDestroyed()) return;
  const b = win.getContentBounds();
  const z = win.webContents.getZoomFactor() || 1;
  ghosts.setBounds({ x: Math.round(b.x - HALO.x * z), y: Math.round(b.y - HALO.top * z), width: Math.round(GHOST_W * z), height: Math.round(GHOST_H * z) });
}

function createGhosts(win: BrowserWindow, zoom: number) {
  ghosts = new BrowserWindow({
    parent: win,
    width: Math.round(GHOST_W * zoom),
    height: Math.round(GHOST_H * zoom),
    useContentSize: true,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: false,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    title: "Trick or Read ghosts",
    show: false,
    webPreferences: { zoomFactor: zoom, preload: join(ROOT, "dist-electron", "preload.cjs"), contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  ghosts.setIgnoreMouseEvents(true);
  ghosts.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("app://trick-or-read/")) event.preventDefault();
  });
  ghosts.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  ghosts.webContents.on("did-finish-load", () => ghosts?.webContents.setZoomFactor(win.webContents.getZoomFactor()));
  for (const e of ["move", "moved", "resize"] as const) win.on(e as "move", () => placeGhosts(win));
  win.on("show", () => (placeGhosts(win), ghosts?.showInactive()));
  win.on("minimize", () => ghosts?.hide());
  win.on("restore", () => (placeGhosts(win), ghosts?.showInactive()));
  win.on("closed", () => {
    if (ghosts && !ghosts.isDestroyed()) ghosts.destroy();
    ghosts = null;
  });
  void ghosts.loadURL("app://trick-or-read/?ghosts");
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
  // the castle's verdict, passed on so the ghosts glow in its colour
  ipcMain.on("castle:verdict", (_e, v: unknown) => {
    const verdict = v === "safe" || v === "ask" || v === "beware" ? v : "none";
    if (ghosts && !ghosts.isDestroyed()) ghosts.webContents.send("castle:verdict", verdict);
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("app://trick-or-read/")) event.preventDefault();
  });
  if (!CAPTURE) createGhosts(win, zoom);
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
