---
inclusion: always
---
# Structure

```
src/
  main.tsx, App.tsx        entry, the scan state machine
  components/              Scene (the painted night and the phone frame), StatusBar (island), Arch (camera window,
                           Read button), Gate, Verdict (card), Dock (four tiles), Haul and Settings (sheets),
                           Ghosts (haunting the air around the phone), sceneLights.ts (light sources found in
                           the painting), ghostShape.ts (the ghost SVG path, traced from the Ghost Army insignia)
  lib/                     pure logic first (phrasing, verdict, allergens, motion, haunt), then browser adapters
                           (camera, barcode, openfoodfacts, identify, voice, listen, sounds, haptics, wakelock)
  styles/                  global.css (tokens), one CSS module per component
electron/                  desktop app: main.ts (one frameless window that is the painting itself), preload.ts
                           (the bridge: window controls only)
server/index.ts            Bun.serve: /api/identify, /api/health, static dist/
scripts/dev.ts             runs the API and Vite together
tests/                     bun test, for everything in src/lib that has no DOM, including haunt
```

- Pure logic (what to say, which verdict, which allergens match) lives in `src/lib` with no DOM access and is unit
  tested. Components only render state and call into `lib`.
- One component per file. Names say what the thing is in the costume ("Scene", "Arch"), and the comment at the
  top of each says what it does for the user.
