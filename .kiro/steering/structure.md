---
inclusion: always
---
# Structure

```
src/
  main.tsx, App.tsx        entry, the scan state machine
  components/              Castle (the case and the screen slot), StatusBar (island), Arch (camera window, Read button),
                           Gate, Verdict (card), Dock (four tiles), Haul and Settings (sheets), Ghosts (outside the walls)
  lib/                     pure logic first (phrasing, verdict, allergens, motion), then browser adapters
                           (camera, barcode, openfoodfacts, identify, voice, listen, sounds, haptics, wakelock)
  styles/                  global.css (tokens), one CSS module per component
server/index.ts            Bun.serve: /api/identify, /api/health, static dist/
scripts/dev.ts             runs the API and Vite together
tests/                     bun test, for everything in src/lib that has no DOM
```

- Pure logic (what to say, which verdict, which allergens match) lives in `src/lib` with no DOM access and is unit
  tested. Components only render state and call into `lib`.
- One component per file. Names say what the thing is in the costume ("Castle", "Arch"), and the comment at the
  top of each says what it does for the user.
