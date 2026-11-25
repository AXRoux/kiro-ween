import { allergenLabel } from "../lib/allergens";
import { reason } from "../lib/phrasing";
import type { Allergen, Judgement, Reading, Verdict as V } from "../lib/types";
import "../styles/verdict.css";

const WORD: Record<V, string> = { safe: "Safe", ask: "Ask someone", beware: "Beware" };

interface Props {
  reading: Reading | null;
  judgement: Judgement | null;
  mine: Allergen[];
  /** True while the castle reads. */
  busy: boolean;
}

/**
 * The verdict card, like a notification on a phone's lock screen. On top a solid block in the verdict's colour with
 * an icon, the word and the one-line reason ("Contains peanuts."); underneath the treat's name and its facts.
 * Everything here was also said aloud: it is for a low-vision reader, and for the person helping.
 */
export function Verdict({ reading, judgement, mine, busy }: Props) {
  const mineSet = new Set(mine);
  const has = Boolean(reading && judgement) && !busy;
  const state = has ? judgement!.verdict : busy ? "reading" : "none";
  return (
    <section className="card" data-verdict={state} aria-labelledby="card-title">
      <h2 id="card-title" className="sr-only">
        Reading
      </h2>
      <div className="card__inner">
      <div className="card__head">
        <span className="card__icon" aria-hidden="true">
          {state === "safe" ? <Check /> : state === "ask" ? <Question /> : state === "beware" ? <Skull /> : <Eye />}
        </span>
        <p className="card__word">{has ? WORD[judgement!.verdict] : busy ? "Reading…" : "No reading yet"}</p>
        <p className="card__why">{has ? reason(reading!, judgement!, mine) : busy ? "Keep it still while I look." : "Hold a treat up to the window."}</p>
      </div>

      {/* focusable so keyboard users can scroll it (WCAG 2.1.1) */}
      <div className="card__body" tabIndex={0} role="region" aria-label="Treat details">
        {has ? (
          <>
            <h3 className="card__name">{reading!.name || "A treat"}</h3>
            {reading!.brand && !reading!.name.toLowerCase().includes(reading!.brand.toLowerCase()) ? <p className="card__brand">by {reading!.brand}</p> : null}
            <dl className="facts">
              <div>
                <dt>Allergens</dt>
                <dd>
                  {reading!.allergens.length === 0 ? (
                    reading!.allergenListKnown ? "None listed" : "No label to read"
                  ) : (
                    <ul className="chips">
                      {reading!.allergens.map((a) => (
                        <li key={a.allergen} className={mineSet.has(a.allergen) ? "chip chip--mine" : "chip"}>
                          {mineSet.has(a.allergen) ? (
                            <svg className="glyph chip__icon" viewBox="0 0 32 32" aria-hidden="true">
                              <path d="M16 4L2 28h28z" />
                              <path d="M16 13v7M16 24v.5" />
                            </svg>
                          ) : null}
                          {allergenLabel(a.allergen)}
                          {a.certainty === "likely" ? <span className="chip__likely"> (likely)</span> : null}
                          {mineSet.has(a.allergen) ? <span className="sr-only"> (one of yours)</span> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              <div>
                <dt>Wrapper</dt>
                <dd className={judgement!.wrapperProblem ? "is-warn" : undefined}>{reading!.wrapper === "unknown" ? "Can't tell" : reading!.wrapper[0]!.toUpperCase() + reading!.wrapper.slice(1)}</dd>
              </div>
              <div>
                <dt>What</dt>
                <dd>{[reading!.size, reading!.kind].filter(Boolean).join(" ") || "Not sure"}</dd>
              </div>
              <div>
                <dt>From</dt>
                <dd>{reading!.source === "label" ? `Label data, Open Food Facts${reading!.barcode ? ` (${reading!.barcode})` : ""}` : "Read from the wrapper. Ask someone to confirm."}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <p className="card__ward">
              {mine.length ? (
                <>
                  <span className="card__label">Warning you about </span>
                  {mine.map(allergenLabel).join(", ")}
                </>
              ) : (
                "No allergens set yet. Open Settings to choose yours."
              )}
            </p>
            <ol className="howto">
              <li>Hold the treat a hand's width from the camera, front of the wrapper facing it.</li>
              <li>Keep it still. I read it and speak.</li>
              <li>Repeat says it again; More adds ingredients.</li>
            </ol>
          </>
        )}
      </div>
      </div>
    </section>
  );
}

const Check = () => (
  <svg viewBox="0 0 32 32" className="glyph">
    <path d="M6 17l7 7L26 8" />
  </svg>
);
const Question = () => (
  <svg viewBox="0 0 32 32" className="glyph">
    <path d="M11 11a5 5 0 1 1 7 4.6c-1.4.7-2 1.6-2 3V20" />
    <circle cx="16" cy="25.5" r="1.2" />
  </svg>
);
const Skull = () => (
  <svg viewBox="0 0 32 32" className="glyph">
    <path d="M16 3C9 3 5 8 5 14c0 4 2 6 4 7v5h3v-3h2v3h4v-3h2v3h3v-5c2-1 4-3 4-7 0-6-4-11-11-11z" />
    <circle cx="11.5" cy="14.5" r="2.8" />
    <circle cx="20.5" cy="14.5" r="2.8" />
  </svg>
);
const Eye = () => (
  <svg viewBox="0 0 32 32" className="glyph">
    <path d="M3 16s5-9 13-9 13 9 13 9-5 9-13 9S3 16 3 16z" />
    <circle cx="16" cy="16" r="4" />
  </svg>
);
