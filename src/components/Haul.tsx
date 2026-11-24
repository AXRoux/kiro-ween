import { useEffect, useRef } from "react";
import type { HaulItem } from "../lib/haul";
import type { Verdict } from "../lib/types";
import "../styles/sheet.css";

const MARK: Record<Verdict, string> = { safe: "No warnings", ask: "Ask someone", beware: "Beware" };
const ORDER = { beware: 0, ask: 1, safe: 2 } as const;

interface Props {
  open: boolean;
  items: HaulItem[];
  onSpeak: () => void;
  onEmpty: () => void;
  onClose: () => void;
}

/**
 * The haul, as a sheet that slides up over the screen: every treat read this session, warnings first, with counts.
 * A native dialog, so focus moves into it, stays there, and Esc closes it. It is also spoken when it opens.
 */
export function Haul({ open, items, onSpeak, onEmpty, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const total = items.reduce((s, i) => s + i.count, 0);
  const sorted = [...items].sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict]);

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="haul-title" onClose={onClose} onCancel={onClose}>
      <form method="dialog" className="sheet__page">
        <span className="sheet__grabber" aria-hidden="true" />
        <header className="sheet__head">
          <h2 id="haul-title">
            Your haul
            {total ? <span className="sheet__count">{`${total} ${total === 1 ? "treat" : "treats"}`}</span> : null}
          </h2>
          <button type="submit" className="btn">
            Done <kbd aria-hidden="true">Esc</kbd>
          </button>
        </header>

        {sorted.length ? (
          <ul className="sheet__group haul" aria-label="Treats read, warnings first">
            {sorted.map((i) => (
              <li key={i.key} className="haul__item" data-verdict={i.verdict}>
                <span className="haul__name">
                  {i.name}
                  {i.count > 1 ? <span className="haul__times"> ×{i.count}</span> : null}
                </span>
                <span className="haul__mark">
                  <Mark verdict={i.verdict} />
                  {MARK[i.verdict]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="sheet__group haul__empty">
            <Pail />
            <p>Your pail is empty. Every treat you read is added here, warnings first.</p>
          </div>
        )}

        <div className="sheet__actions">
          <button type="button" className="btn btn--primary" onClick={onSpeak} disabled={!items.length}>
            Say my haul
          </button>
          <button type="button" className="btn btn--danger" onClick={onEmpty} disabled={!items.length}>
            Empty it
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Mark({ verdict }: { verdict: Verdict }) {
  return (
    <svg className="glyph haul__icon" viewBox="0 0 32 32" aria-hidden="true">
      {verdict === "safe" ? <path d="M6 17l7 7L26 8" /> : verdict === "ask" ? <path d="M11 11a5 5 0 1 1 7 4.6c-1.4.7-2 1.6-2 3V20M16 25.5v.5" /> : <path d="M16 4L2 28h28zM16 13v7M16 24v.5" />}
    </svg>
  );
}

/** An empty jack-o'-lantern pail. */
function Pail() {
  return (
    <svg className="haul__pail" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M14 22c0-12 36-12 36 0" fill="none" stroke="#8a8199" strokeWidth="3" strokeLinecap="round" />
      <path d="M8 30c0-8 10-12 24-12s24 4 24 12-4 26-24 26S8 38 8 30z" fill="#ffa54d" />
      <path d="M20 22c-4 6-4 26 2 32M44 22c4 6 4 26-2 32M32 18v38" stroke="#d9762a" strokeWidth="2" fill="none" />
      <path d="M18 32l6-5 4 6zM46 32l-6-5-4 6zM20 42c6 4 18 4 24 0l-3 5-3-3-3 4-3-4-3 4-3-4-3 3z" fill="#0a0710" />
    </svg>
  );
}
