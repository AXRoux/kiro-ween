/**
 * When to say "Too dark. Turn on a light." Once when it gets dark, then at most once a minute while it stays dark,
 * and never while the app is hidden (minimised, or the tab is in the background): a warning nobody can act on is
 * just noise. Pure, so it is unit tested.
 */
export const DARK_REMIND_MS = 60_000;

export interface DarkState {
  /** Was the last frame dark? */
  dark: boolean;
  /** When the warning was last said (ms), or null. */
  saidAt: number | null;
}

export function darkWarning(state: DarkState, now: number, dark: boolean, hidden: boolean): { say: boolean; next: DarkState } {
  if (!dark) return { say: false, next: { dark: false, saidAt: state.saidAt } };
  const justGotDark = !state.dark;
  const due = state.saidAt === null || now - state.saidAt >= DARK_REMIND_MS;
  const say = !hidden && (justGotDark ? due || state.saidAt === null || now - state.saidAt >= 5_000 : due);
  return { say, next: { dark: true, saidAt: say ? now : state.saidAt } };
}
