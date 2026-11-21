---
inclusion: fileMatch
fileMatchPattern: ["src/components/**/*.tsx", "src/App.tsx", "src/styles/**/*.css"]
---
# Accessibility rules (apply to every UI change)

- Every state change a sighted user sees is also spoken, or announced through the `Announcer` live region.
  Warnings use `aria-live="assertive"`; everything else `polite`.
- Every action has a key (Space scan, R repeat, M more, B haul, S settings, V voice, Esc hush) and a voice command.
  Keys are listed in the Settings panel and spoken by "help".
- Focus is always visible (a candle-gold ring, 3px) and never trapped except inside the open Settings dialog.
- Body text is Atkinson Hyperlegible at 18px or larger. Contrast is at least 7:1 for text on the dark background.
- Decorative layers (fog, embers, bats, trees) are `aria-hidden` and stop when `prefers-reduced-motion` is set.
- Colour is never the only signal: the verdict is a word, an icon, a sound and a spoken sentence.
- Never auto-play speech before the user has pressed "Enter the séance" (browsers block it, and it startles).
