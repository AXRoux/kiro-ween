import type { ReactNode } from "react";
import "../styles/dock.css";

interface Props {
  live: boolean;
  hasReading: boolean;
  haulCount: number;
  onRepeat: () => void;
  onMore: () => void;
  onHaul: () => void;
  onSettings: () => void;
}

/**
 * Four big tiles along the bottom edge, like a phone's control centre. They never move, so they can be found by touch
 * and memory: Repeat top left, More top right, Haul bottom left, Settings bottom right. Each is 64px tall, with a
 * word as well as an icon, and the same action is on a key and a spoken word.
 */
export function Dock({ live, hasReading, haulCount, onRepeat, onMore, onHaul, onSettings }: Props) {
  return (
    <nav className="dock" aria-label="Actions">
      <Tile label="Repeat" keyCap="R" onClick={onRepeat} disabled={!live} icon={<path d="M8 13a9 9 0 0 1 15.5-3.5L26 12M26 5v7h-7M24 19a9 9 0 0 1-15.5 3.5L6 20M6 27v-7h7" />} />
      <Tile
        label="More"
        keyCap="M"
        onClick={onMore}
        disabled={!hasReading}
        icon={
          <>
            <path d="M16 9c-3-2-7-3-11-2v17c4-1 8 0 11 2 3-2 7-3 11-2V7c-4-1-8 0-11 2z" />
            <path d="M16 9v18" />
          </>
        }
      />
      <Tile
        label="Haul"
        keyCap="B"
        onClick={onHaul}
        badge={haulCount}
        icon={
          <>
            <path d="M6 13h20l-2 12c-.4 2-2 3-4 3h-8c-2 0-3.6-1-4-3z" />
            <path d="M9 13c0-5 3-8 7-8s7 3 7 8" />
            <path d="M12 19l2 2 2-2 2 2 2-2" />
          </>
        }
      />
      <Tile
        label="Settings"
        keyCap="S"
        onClick={onSettings}
        icon={
          <>
            <path d="M5 9h12M23 9h4M5 23h4M15 23h12M5 16h6M17 16h10" />
            <circle cx="20" cy="9" r="3" />
            <circle cx="12" cy="23" r="3" />
            <circle cx="14" cy="16" r="3" />
          </>
        }
      />
    </nav>
  );
}

function Tile({ label, keyCap, icon, onClick, disabled = false, badge = 0 }: { label: string; keyCap: string; icon: ReactNode; onClick: () => void; disabled?: boolean; badge?: number }) {
  return (
    <button type="button" className="tile" onClick={onClick} disabled={disabled} aria-keyshortcuts={keyCap}>
      <span className="tile__inner">
        <span className="tile__icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" className="glyph">
            {icon}
          </svg>
        </span>
        <span className="tile__text">
          <span className="tile__label">
            {label}
            {badge ? (
              <span className="tile__badge">
                {badge}
                <span className="sr-only"> {badge === 1 ? "treat" : "treats"}</span>
              </span>
            ) : null}
          </span>
          <kbd aria-hidden="true">{keyCap}</kbd>
        </span>
      </span>
    </button>
  );
}
