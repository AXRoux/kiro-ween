import type { HaulItem } from "../lib/haul";
import "../styles/haul.css";

const MARK = { safe: "No warnings", ask: "Ask someone", beware: "Beware" } as const;

/** The haul: every candy read this session in a bubbling cauldron, warnings first, with counts. */
export function Haul({ items, onSpeak, onEmpty }: { items: HaulItem[]; onSpeak: () => void; onEmpty: () => void }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  const order = { beware: 0, ask: 1, safe: 2 } as const;
  const sorted = [...items].sort((a, b) => order[a.verdict] - order[b.verdict]);
  return (
    <section className="haul" aria-labelledby="haul-title">
      <div className="haul__head">
        <Cauldron count={total} />
        <div>
          <h2 id="haul-title" className="haul__title">
            The haul
          </h2>
          <p className="haul__count">{total === 0 ? "Empty so far" : `${total} ${total === 1 ? "treat" : "treats"} read`}</p>
        </div>
      </div>
      {sorted.length ? (
        <ul className="haul__list">
          {sorted.map((i) => (
            <li key={i.key} className="haul__item" data-verdict={i.verdict}>
              <span className="haul__dot" aria-hidden="true" />
              <span className="haul__name">{i.name}</span>
              {i.count > 1 ? <span className="haul__times">×{i.count}</span> : null}
              <span className="haul__mark">{MARK[i.verdict]}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="haul__actions">
        <button type="button" className="brass" onClick={onSpeak}>
          Speak the haul <kbd>B</kbd>
        </button>
        {items.length ? (
          <button type="button" className="brass brass--quiet" onClick={onEmpty}>
            Empty
          </button>
        ) : null}
      </div>
    </section>
  );
}

function Cauldron({ count }: { count: number }) {
  return (
    <svg className="cauldron" viewBox="0 0 96 80" aria-hidden="true">
      <defs>
        <radialGradient id="brew" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#d2ffe2" />
          <stop offset="1" stopColor="#3fd17c" />
        </radialGradient>
        <linearGradient id="pot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3346" />
          <stop offset="1" stopColor="#0d0a12" />
        </linearGradient>
      </defs>
      <g className="cauldron__bubbles">
        <circle cx="38" cy="18" r="4" />
        <circle cx="56" cy="12" r="3" />
        <circle cx="48" cy="6" r="2.2" />
      </g>
      <ellipse cx="48" cy="28" rx="38" ry="8" fill="url(#brew)" />
      <path d="M10 28c0 26 16 40 38 40s38-14 38-40c-6 6-20 9-38 9S16 34 10 28z" fill="url(#pot)" stroke="#000" strokeWidth="1.5" />
      <path d="M8 28c0-3 18-8 40-8s40 5 40 8" fill="none" stroke="#5a5266" strokeWidth="5" strokeLinecap="round" />
      <path d="M24 66l-6 10M72 66l6 10" stroke="#0d0a12" strokeWidth="6" strokeLinecap="round" />
      <text x="48" y="56" textAnchor="middle" className="cauldron__num">
        {count}
      </text>
    </svg>
  );
}
