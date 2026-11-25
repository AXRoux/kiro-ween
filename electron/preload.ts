import { contextBridge, ipcRenderer } from "electron";

// The only bridge between the page and the desktop: the window controls.
contextBridge.exposeInMainWorld("castle", {
  desktop: true,
  close: () => ipcRenderer.send("castle:close"),
  minimize: () => ipcRenderer.send("castle:minimize"),
});
