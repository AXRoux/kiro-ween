import { allergenLabel } from "../lib/allergens";
import type { Allergen, Judgement, Reading } from "../lib/types";
import { Ghost } from "./Ghost";
import "../styles/board.css";

const VERDICT_WORD = { safe: "Safe", ask: "Ask someone", beware: "Beware" } as const;
/** Where the planchette rests: its window over the word it points to. */
const SPOT = { safe: { x: 13, y: 26 }, ask: { x: 50, y: 118 }, beware: { x: 87, y: 26 }, idle: { x: 50, y: 118 } } as const;

interface Props {
  reading: Reading | null;
  judgement: Judgement | null;
  mine: Allergen[];
  speaking: boolean;
  onMore: () => void;
  onRepeat: () => void;
}

/**
 * The spirit board: the planchette glides to the verdict (Safe, Ask, Beware), the candy's name is spelled out below,
 * and its facts are engraved in plain, large type. Everything here was also spoken.
 */
export function SpiritBoard({ reading, judgement, mine, speaking, onMore, onRepeat }: Props) {
  const verdict = judgement?.verdict;
  const mineSet = new Set(mine);
  return (
    <section className="board" aria-labelledby="board-title" data-verdict={verdict}>
      <h2 id="board-title" className="sr-only">
        The reading
      </h2>
      <div className="board__wood">
        <svg className="board__arc" viewBox="0 0 600 170" aria-hidden="true">
          <path id="board-arc" d="M70 160 A 250 132 0 0 1 530 160" fill="none" />
          <path id="board-arc-inner" d="M150 168 A 160 84 0 0 1 450 168" fill="none" />
          <text className="board__letters">
            <textPath href="#board-arc" startOffset="50%" textAnchor="middle">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
            </textPath>
          </text>
          <text className="board__numbers">
            <textPath href="#board-arc-inner" startOffset="50%" textAnchor="middle">
              1234567890
            </textPath>
          </text>
        </svg>

        <div className="board__corners" aria-hidden="true">
          <span className="board__corner board__corner--safe">
            <Sun /> Safe
          </span>
          <span className="board__corner board__corner--ask">
            <Eye /> Ask
          </span>
          <span className="board__corner board__corner--beware">
            <Skull /> Beware
          </span>
        </div>

        <div className="board__track" aria-hidden="true">
          <div className="planchette" style={{ left: `${SPOT[verdict ?? "idle"].x}%`, top: `${SPOT[verdict ?? "idle"].y}px` }} data-idle={!verdict}>
            <svg viewBox="0 0 120 130">
              <defs>
                <radialGradient id="planGlass" cx="0.4" cy="0.35" r="0.7">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0.05" />
                </radialGradient>
                <linearGradient id="planWood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f1e2bd" />
                  <stop offset="1" stopColor="#b89a63" />
                </linearGradient>
              </defs>
              <path d="M60 4C30 4 8 30 8 60c0 26 18 46 40 62 4 3 8 5 12 5s8-2 12-5c22-16 40-36 40-62C112 30 90 4 60 4z" fill="url(#planWood)" stroke="#3b2410" strokeWidth="3" />
              <circle cx="60" cy="56" r="22" fill="#20122c" stroke="#3b2410" strokeWidth="3" />
              <circle cx="60" cy="56" r="22" fill="url(#planGlass)" />
              <circle cx="60" cy="56" r="7" fill="var(--verdict)" className="planchette__eye" />
            </svg>
          </div>
        </div>

        <div className="board__reading" aria-live="off">
          {reading && judgement ? (
            <>
              <p className="board__verdict">
                <span className="board__verdict-icon" aria-hidden="true">
                  {judgement.verdict === "safe" ? <Sun /> : judgement.verdict === "ask" ? <Eye /> : <Skull />}
                </span>
                {VERDICT_WORD[judgement.verdict]}
              </p>
              <h3 className="board__name">{reading.name || "Something sweet"}</h3>
              {reading.brand && !reading.name.toLowerCase().includes(reading.brand.toLowerCase()) ? <p className="board__brand">by {reading.brand}</p> : null}
              <dl className="board__facts">
                <div>
                  <dt>What</dt>
                  <dd>{[reading.size, reading.kind].filter(Boolean).join(" ") || "Not sure"}</dd>
                </div>
                <div>
                  <dt>Wrapper</dt>
                  <dd className={judgement.wrapperProblem ? "is-warn" : undefined}>{reading.wrapper === "unknown" ? "Can't tell" : reading.wrapper[0]!.toUpperCase() + reading.wrapper.slice(1)}</dd>
                </div>
                <div className="board__facts-wide">
                  <dt>Allergens</dt>
                  <dd>
                    {reading.allergens.length === 0 ? (
                      reading.allergenListKnown ? "None listed" : "No label to read"
                    ) : (
                      <ul className="chips">
                        {reading.allergens.map((a) => (
                          <li key={a.allergen} className={mineSet.has(a.allergen) ? "chip chip--mine" : "chip"}>
                            {allergenLabel(a.allergen)}
                            {a.certainty === "likely" ? <em> (likely)</em> : null}
                            {mineSet.has(a.allergen) ? <span className="sr-only"> (one of yours)</span> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
                <div className="board__facts-wide">
                  <dt>Source</dt>
                  <dd>{reading.source === "label" ? `Label data (Open Food Facts${reading.barcode ? `, ${reading.barcode}` : ""})` : "Read from the wrapper: ask someone to confirm"}</dd>
                </div>
              </dl>
              <div className="board__actions">
                <button type="button" className="brass" onClick={onMore}>
                  Say more <kbd>M</kbd>
                </button>
                <button type="button" className="brass" onClick={onRepeat}>
                  Repeat <kbd>R</kbd>
                </button>
              </div>
            </>
          ) : (
            <div className="board__empty">
              <p className="board__empty-title">The board is waiting</p>
              <p>Hold a candy up to the mirror, a hand's width away. Keep it still and the spirit will read it aloud.</p>
            </div>
          )}
        </div>
        <Ghost speaking={speaking} />
      </div>
    </section>
  );
}

const Sun = () => (
  <svg viewBox="0 0 32 32" className="glyph">
    <circle cx="16" cy="16" r="6" />
    <path d="M16 2v5M16 25v5M2 16h5M25 16h5M6 6l3.5 3.5M22.5 22.5 26 26M6 26l3.5-3.5M22.5 9.5 26 6" />
  </svg>
);
const Eye = () => (
  <svg viewBox="0 0 32 32" className="glyph">
    <path d="M2 16c4-7 9-10 14-10s10 3 14 10c-4 7-9 10-14 10S6 23 2 16z" />
    <circle cx="16" cy="16" r="4.5" />
  </svg>
);
const Skull = () => (
  <svg viewBox="0 0 32 32" className="glyph">
    <path d="M16 3C9 3 5 8 5 14c0 4 2 6 4 7v5h3v-3h2v3h4v-3h2v3h3v-5c2-1 4-3 4-7 0-6-4-11-11-11z" />
    <circle cx="11.5" cy="14.5" r="2.8" />
    <circle cx="20.5" cy="14.5" r="2.8" />
  </svg>
);
