---
inclusion: fileMatch
fileMatchPattern: ["src/components/**/*.tsx", "src/App.tsx", "src/styles/**/*.css"]
---
# Accessibility rules (apply to every UI change)

- Every state change a sighted user sees is also spoken, or announced through the `Announcer` live region.
  Warnings use `aria-live="assertive"`; everything else `polite`.
- Every action has a key (Space scan, R repeat, M more, B haul, S settings, V voice, Esc stop) and a voice command.
  Keys are listed in Settings and spoken by "help".
- Touch first: the primary action (Read) is the largest target on the screen (the camera window). Other actions are
  tiles at least 64px tall in fixed positions. Sheet rows are at least 56px and the whole row is the target.
  No custom gestures: they fight VoiceOver and TalkBack.
- The visible text of a control is part of its accessible name (WCAG 2.5.3), so voice-control users can say what they see.
- Focus is always visible (a white ring, 3px, on a black halo) and never trapped except inside an open sheet.
- Every word a person needs is Atkinson Hyperlegible, 18px or larger (key caps and field labels may be 16px bold).
  Contrast is at least 7:1 for text on every surface. Cinzel Decorative is only for the carved, `aria-hidden`
  nameplate: decorative capitals are hard to read with low vision.
- The verdict is a solid block of colour with dark ink, an icon, a word and a one-line reason (`reason()` in
  phrasing.ts), never coloured text alone. Beware also carries a striped edge.
- Zoom must work. In the desktop app Cmd + and Cmd − resize the whole window with the page (remembered between runs).
  In a browser the castle scales down to 80% at most; past that, and on any phone, the case comes off and the screen
  fills the page (WCAG 1.4.10).
- Respect `prefers-contrast: more` and `forced-colors`: flatter surfaces, visible edges, system colours.
- Scrollable regions are focusable and labelled. Buttons carry `aria-keyshortcuts`; their key caps are `aria-hidden`.
- Every region has a real heading (Trick or Read, Camera, Reading, Your haul, Settings), in the order that makes sense to hear.
- Decorative layers (the case, bats, candlelight, the island's wave) are `aria-hidden` and stop when `prefers-reduced-motion` is set.
- Colour is never the only signal: the verdict is a word, an icon, a sound, a spoken sentence and (on phones) a vibration.
- Never auto-play speech before the user has pressed "Open the gate" (browsers block it, and it startles).
