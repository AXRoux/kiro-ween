import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/cinzel-decorative/700.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./styles/global.css";
import { App } from "./App";
import { GhostsWindow } from "./components/Ghosts";

const ghostsOnly = Boolean(window.castle?.desktop) && new URLSearchParams(location.search).has("ghosts");
if (window.castle?.desktop) document.documentElement.classList.add("desktop");
// the ghosts' window must be transparent from its very first frame
if (ghostsOnly) document.documentElement.classList.add("ghost-window");

createRoot(document.getElementById("root")!).render(<StrictMode>{ghostsOnly ? <GhostsWindow /> : <App />}</StrictMode>);
