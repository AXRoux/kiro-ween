import { useEffect, useRef } from "react";
import { ALLERGENS } from "../lib/allergens";
import type { Allergen } from "../lib/types";
import type { VoiceStyle } from "../lib/voice";
import "../styles/settings.css";

export interface Prefs {
  allergens: Allergen[];
  /** voice: the spirit speaks (Web Speech). screenreader: everything goes to the live region for the user's own reader. */
  output: "voice" | "screenreader";
  voiceStyle: VoiceStyle;
  rate: number;
  autoScan: boolean;
  sounds: boolean;
  listening: boolean;
}

interface Props {
  open: boolean;
  prefs: Prefs;
  listenSupported: boolean;
  onChange: (p: Prefs) => void;
  onClose: () => void;
}

/** The grimoire: the user's allergens, the voice, and how the mirror behaves. A native dialog, so focus is managed. */
export function Settings({ open, prefs, listenSupported, onChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const toggle = (id: Allergen) =>
    onChange({ ...prefs, allergens: prefs.allergens.includes(id) ? prefs.allergens.filter((a) => a !== id) : [...prefs.allergens, id] });

  return (
    <dialog ref={ref} className="grimoire" aria-labelledby="grimoire-title" onClose={onClose} onCancel={onClose}>
      <form method="dialog" className="grimoire__page">
        <header className="grimoire__head">
          <h2 id="grimoire-title">The grimoire</h2>
          <button type="submit" className="brass" aria-label="Close settings">
            Close <kbd>Esc</kbd>
          </button>
        </header>

        <fieldset className="grimoire__set">
          <legend>Warn me about</legend>
          <p className="grimoire__hint">The mirror warns you, by name, whenever one of these is on the label or likely in the candy.</p>
          <div className="grimoire__allergens">
            {ALLERGENS.map((a) => (
              <label key={a.id} className="ward">
                <input type="checkbox" checked={prefs.allergens.includes(a.id)} onChange={() => toggle(a.id)} />
                <span className="ward__seal" aria-hidden="true" />
                <span>{a.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grimoire__set">
          <legend>The spirit's voice</legend>
          <p className="grimoire__hint">Speak with:</p>
          <div className="grimoire__row">
            {(["voice", "screenreader"] as const).map((o) => (
              <label key={o} className="ward">
                <input type="radio" name="output" checked={prefs.output === o} onChange={() => onChange({ ...prefs, output: o })} />
                <span className="ward__seal ward__seal--round" aria-hidden="true" />
                <span>{o === "voice" ? "The spirit's voice" : "My screen reader (the spirit stays silent, so nothing is said twice)"}</span>
              </label>
            ))}
          </div>
          <p className="grimoire__hint">Voice:</p>
          <div className="grimoire__row">
            {(["clear", "spirit"] as const).map((s) => (
              <label key={s} className="ward">
                <input type="radio" name="voice" checked={prefs.voiceStyle === s} onChange={() => onChange({ ...prefs, voiceStyle: s })} />
                <span className="ward__seal ward__seal--round" aria-hidden="true" />
                <span>{s === "clear" ? "George, a warm storyteller (clearest)" : "Lily, a velvet-voiced medium"}</span>
              </label>
            ))}
          </div>
          <label className="grimoire__slider">
            <span>Speaking speed</span>
            <input type="range" min={0.6} max={1.6} step={0.1} value={prefs.rate} onChange={(e) => onChange({ ...prefs, rate: Number(e.target.value) })} aria-valuetext={`${Math.round(prefs.rate * 100)} percent`} />
            <output>{Math.round(prefs.rate * 100)}%</output>
          </label>
        </fieldset>

        <fieldset className="grimoire__set">
          <legend>The mirror</legend>
          <label className="ward">
            <input type="checkbox" checked={prefs.autoScan} onChange={() => onChange({ ...prefs, autoScan: !prefs.autoScan })} />
            <span className="ward__seal" aria-hidden="true" />
            <span>Read on its own when I hold a candy still</span>
          </label>
          <label className="ward">
            <input type="checkbox" checked={prefs.sounds} onChange={() => onChange({ ...prefs, sounds: !prefs.sounds })} />
            <span className="ward__seal" aria-hidden="true" />
            <span>Sound cues (heartbeat, chime, warning bell)</span>
          </label>
          <label className="ward" aria-disabled={!listenSupported}>
            <input type="checkbox" disabled={!listenSupported} checked={prefs.listening} onChange={() => onChange({ ...prefs, listening: !prefs.listening })} />
            <span className="ward__seal" aria-hidden="true" />
            <span>{listenSupported ? "Listen for voice commands (uses the microphone)" : "Voice commands are not supported in this browser"}</span>
          </label>
        </fieldset>

        <fieldset className="grimoire__set">
          <legend>Keys and words</legend>
          <dl className="grimoire__keys">
            {[
              ["Space", "scan", "Read what I'm holding"],
              ["R", "repeat", "Say it again"],
              ["M", "more", "Ingredients, sugar, calories"],
              ["B", "haul", "Everything I've read"],
              ["S", "settings", "Open this grimoire"],
              ["V", "", "Switch voice"],
              ["L", "", "Voice commands on or off"],
              ["Esc", "hush", "Stop talking"],
              ["H", "help", "Say the keys"],
            ].map(([k, w, d]) => (
              <div key={k}>
                <dt>
                  <kbd>{k}</kbd>
                  {w ? <span className="grimoire__word">“{w}”</span> : null}
                </dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
        </fieldset>
      </form>
    </dialog>
  );
}
