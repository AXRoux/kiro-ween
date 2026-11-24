import { useEffect, useRef } from "react";
import "../styles/gate.css";

/**
 * Getting in (Requirement 1): one obvious, focused button, as wide as the screen, that opens the gate. Pressing it is
 * the gesture that lets the app use the camera and speak. Focus starts here, so a screen reader announces it first
 * and Enter is all it takes.
 */
export function Gate({ onEnter, problem, busy }: { onEnter: () => void; problem: string | null; busy: boolean }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  return (
    <section className="gate" aria-labelledby="gate-title">
      <h2 id="gate-title" className="gate__title">
        I read your treats aloud.
      </h2>
      <p className="gate__lede">I name each one, warn about your allergens, and check the wrapper.</p>
      <button ref={button} type="button" className="gate__enter" onClick={onEnter} disabled={busy} data-busy={busy} aria-describedby={problem ? undefined : "gate-note"}>
        <Key />
        {busy ? "Opening…" : "Open the gate"}
      </button>
      {problem ? (
        <p className="gate__problem" role="alert">
          {problem}
        </p>
      ) : (
        <p id="gate-note" className="gate__note">
          Uses your camera. Nothing is kept.
        </p>
      )}
    </section>
  );
}

/** A skeleton key: it turns when the gate opens. */
function Key() {
  return (
    <svg className="gate__key" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="12" cy="20" r="7" />
      <circle cx="12" cy="20" r="2.5" />
      <path d="M19 20h17M30 20v6M35 20v4" />
    </svg>
  );
}
