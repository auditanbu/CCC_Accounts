/**
 * A tournament is done once every scheduled fixture has been recorded.
 *
 * Tournaments with no fixture count set are never treated as complete —
 * there's nothing to measure progress against, so they stay open.
 */
export function isTournamentCompleted(t: {
  totalMatches: number | null;
  matchCount: number;
}): boolean {
  return t.totalMatches != null && t.totalMatches > 0 && t.matchCount >= t.totalMatches;
}
