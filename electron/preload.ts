import { contextBridge, ipcRenderer } from "electron";

// The only bridge between the page and the desktop: window controls, and the verdict passed to the ghosts' window.
contextBridge.exposeInMainWorld("castle", {
  desktop: true,
  close: () => ipcRenderer.send("castle:close"),
  minimize: () => ipcRenderer.send("castle:minimize"),
  setVerdict: (verdict: string) => ipcRenderer.send("castle:verdict", String(verdict)),
  onVerdict: (listener: (verdict: string) => void) => {
    ipcRenderer.on("castle:verdict", (_e, v: unknown) => listener(String(v)));
  },
});
