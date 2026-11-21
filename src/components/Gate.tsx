import { useEffect, useRef } from "react";
import "../styles/gate.css";

/**
 * The way in: one obvious, focused button (Requirement 1). Pressing it is the gesture browsers need before they let
 * the page use the camera and speak.
 */
export function Gate({ onEnter, problem, busy }: { onEnter: () => void; problem: string | null; busy: boolean }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  return (
    <main className="gate">
      <div className="gate__inner">
        <p className="gate__kicker">A talking mirror for blind and low-vision trick-or-treaters</p>
        <h1 className="gate__title">
          Trick <span>or</span> Read
        </h1>
        <p className="gate__lede">Hold a candy up to the mirror. The spirit names it out loud, warns you about your allergens, and tells you if the wrapper has been opened.</p>
        <button ref={button} type="button" className="gate__enter" onClick={onEnter} disabled={busy} aria-describedby="gate-note">
          <span className="gate__enter-glow" aria-hidden="true" />
          {busy ? "Waking the mirror…" : "Enter the séance"}
        </button>
        <p id="gate-note" className="gate__note">
          Uses your camera and speaks aloud. Press Enter or Space. Nothing you show the mirror is stored.
        </p>
        {problem ? (
          <p className="gate__problem" role="alert">
            {problem}
          </p>
        ) : null}
      </div>
    </main>
  );
}
