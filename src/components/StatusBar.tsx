import "../styles/statusbar.css";

interface Props {
  live: boolean;
  speaking: boolean;
  listening: boolean;
  onHush: () => void;
}

/**
 * The top of the screen, laid out like a phone's: the app's name on the left, the camera and microphone indicators on
 * the right (green while the camera is on, orange while listening for voice commands, as on an iPhone), and in the
 * middle a black pill, like the Dynamic Island, that is the castle's mouth. It opens into a moving wave while the
 * voice speaks, with an iridescent glow rising behind it, so a companion knows to listen, and tapping it (its label says Stop) stops the voice, as does Esc.
 */
export function StatusBar({ live, speaking, listening, onHush }: Props) {
  return (
    <header className="statusbar">
      <h1 className="statusbar__name">Trick or Read</h1>
      <button
        type="button"
        className="island"
        data-speaking={speaking}
        onClick={() => speaking && onHush()}
        aria-label="Stop talking"
        aria-disabled={!speaking}
        aria-keyshortcuts="Escape"
        tabIndex={speaking ? 0 : -1}
      >
        <span className="island__glow" aria-hidden="true" />
        <span className="island__lens" aria-hidden="true" />
        <span className="island__wave" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <i key={i} style={{ animationDelay: `${-i * 0.13}s` }} />
          ))}
        </span>
        <span className="island__label">Stop</span>
      </button>
      <div className="statusbar__dots" aria-hidden="true">
        {listening ? <span className="dot dot--mic" title="Listening" /> : null}
        <span className={live ? "dot dot--cam" : "dot"} title={live ? "Camera on" : "Camera off"} />
      </div>
    </header>
  );
}
