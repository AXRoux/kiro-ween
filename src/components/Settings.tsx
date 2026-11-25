import { useEffect, useRef } from "react";
import { ALLERGENS } from "../lib/allergens";
import type { Allergen } from "../lib/types";
import { VOICE_NAMES, type VoiceStyle } from "../lib/voice";
import "../styles/sheet.css";

export interface Prefs {
  allergens: Allergen[];
  /** voice: the castle speaks (ElevenLabs or Web Speech). screenreader: everything goes to the live region for the user's own reader. */
  output: "voice" | "screenreader";
  voiceStyle: VoiceStyle;
  rate: number;
  autoScan: boolean;
  sounds: boolean;
  haptics: boolean;
  listening: boolean;
  /** Atkinson Hyperlegible, designed for low vision, instead of Geist and Inter. */
  hyperlegible: boolean;
}

interface Props {
  open: boolean;
  prefs: Prefs;
  listenSupported: boolean;
  hapticsSupported: boolean;
  onChange: (p: Prefs) => void;
  onClose: () => void;
}

const VOICE_ABOUT: Record<VoiceStyle, string> = {
  serena: "warm and relaxed, with a Brazilian accent",
  ana: "calm and measured, every word clear",
};

/**
 * Settings, as a sheet laid out like a phone's settings app: grouped rows, each one big enough to find by touch, with
 * switches for things that are on or off. A native dialog, so focus is managed and Esc closes it. Every change is
 * spoken back (Requirement 6.2).
 */
export function Settings({ open, prefs, listenSupported, hapticsSupported, onChange, onClose }: Props) {
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
    <dialog ref={ref} className="sheet" aria-labelledby="settings-title" onClose={onClose} onCancel={onClose}>
      <form method="dialog" className="sheet__page">
        <span className="sheet__grabber" aria-hidden="true" />
        <header className="sheet__head">
          <h2 id="settings-title">Settings</h2>
          <button type="submit" className="btn">
            Done <kbd aria-hidden="true">Esc</kbd>
          </button>
        </header>

        <fieldset className="sheet__set">
          <legend>Warn me about</legend>
          <div className="sheet__group">
            {ALLERGENS.map((a) => (
              <Row key={a.id} type="checkbox" label={a.label} checked={prefs.allergens.includes(a.id)} onChange={() => toggle(a.id)} />
            ))}
          </div>
          <p className="sheet__hint">I warn you by name whenever one of these is on the label, or likely in the treat.</p>
        </fieldset>

        <fieldset className="sheet__set">
          <legend>Voice</legend>
          <div className="sheet__group">
            {(["serena", "ana"] as const).map((s) => (
              <Row key={s} type="radio" name="voice" label={VOICE_NAMES[s]} detail={VOICE_ABOUT[s]} checked={prefs.voiceStyle === s} onChange={() => onChange({ ...prefs, voiceStyle: s })} />
            ))}
          </div>
          <div className="sheet__group">
            <label className="row row--slider">
              <span className="row__label">Speed</span>
              <input type="range" min={0.6} max={1.6} step={0.1} value={prefs.rate} onChange={(e) => onChange({ ...prefs, rate: Number(e.target.value) })} aria-valuetext={`${Math.round(prefs.rate * 100)} percent`} />
              <output>{Math.round(prefs.rate * 100)}%</output>
            </label>
          </div>
          <div className="sheet__group">
            <Row type="checkbox" role="switch" label="Use my screen reader instead" detail="The castle stays silent, so nothing is said twice." checked={prefs.output === "screenreader"} onChange={() => onChange({ ...prefs, output: prefs.output === "voice" ? "screenreader" : "voice" })} />
          </div>
        </fieldset>

        <fieldset className="sheet__set">
          <legend>Reading the screen</legend>
          <div className="sheet__group">
            <Row type="checkbox" role="switch" label="Easier-to-read letters" detail="Atkinson Hyperlegible, designed for low vision." checked={prefs.hyperlegible} onChange={() => onChange({ ...prefs, hyperlegible: !prefs.hyperlegible })} />
          </div>
        </fieldset>

        <fieldset className="sheet__set">
          <legend>The castle</legend>
          <div className="sheet__group">
            <Row type="checkbox" role="switch" label="Read on its own" detail="When I hold a treat still." checked={prefs.autoScan} onChange={() => onChange({ ...prefs, autoScan: !prefs.autoScan })} />
            <Row type="checkbox" role="switch" label="Sound cues" detail="Heartbeat, chime, warning bell." checked={prefs.sounds} onChange={() => onChange({ ...prefs, sounds: !prefs.sounds })} />
            {hapticsSupported ? (
              <Row type="checkbox" role="switch" label="Vibrate" detail="One buzz no warnings, two ask someone, three beware." checked={prefs.haptics} onChange={() => onChange({ ...prefs, haptics: !prefs.haptics })} />
            ) : null}
            <Row
              type="checkbox"
              role="switch"
              label="Voice commands"
              detail={listenSupported ? "Uses the microphone. Say scan, repeat, more, haul or help." : "Not supported in this browser."}
              disabled={!listenSupported}
              checked={prefs.listening}
              onChange={() => onChange({ ...prefs, listening: !prefs.listening })}
            />
          </div>
        </fieldset>

        <fieldset className="sheet__set">
          <legend>Keys and words</legend>
          <dl className="sheet__group keys">
            {[
              ["Space", "scan", "Read what I'm holding"],
              ["R", "repeat", "Say it again"],
              ["M", "more", "Ingredients, sugar, calories"],
              ["B", "haul", "Everything I've read"],
              ["S", "settings", "Open settings"],
              ["V", "", "Switch voice"],
              ["L", "", "Voice commands on or off"],
              ["Esc", "stop", "Stop talking"],
              ["H", "help", "Say the keys"],
            ].map(([k, w, d]) => (
              <div key={k} className="row">
                <dt>
                  <kbd>{k}</kbd>
                  {w ? <span className="keys__word">“{w}”</span> : null}
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

function Row({ type, role, name, label, detail, checked, disabled = false, onChange }: { type: "checkbox" | "radio"; role?: "switch"; name?: string; label: string; detail?: string; checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <label className="row" aria-disabled={disabled || undefined}>
      <span className="row__text">
        <span className="row__label">{label}</span>
        {detail ? <span className="row__detail">{detail}</span> : null}
      </span>
      <input type={type} role={role} name={name} checked={checked} disabled={disabled} onChange={onChange} />
      <span className={role === "switch" ? "switch" : type === "radio" ? "tick tick--round" : "tick"} aria-hidden="true" />
    </label>
  );
}
