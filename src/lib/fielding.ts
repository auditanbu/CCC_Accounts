/**
 * Geometry for the field set planner. Pure functions only — no React — so the
 * position naming can be reasoned about (and reused for the shared image) on
 * its own.
 *
 * The ground is drawn in a 1000×1000 SVG viewBox from the wicket-keeper's
 * point of view: the striker is at the bottom of the pitch facing up towards
 * the bowler. For a right-hander that puts the off side on the right of the
 * screen and the leg side on the left; a left-hander is the mirror image.
 */

export type Hand = "RHB" | "LHB";

export const VIEW = 1000;
export const CENTER = VIEW / 2;
/** Boundary rope radius — roughly a 65-yard ground. */
export const BOUNDARY_R = 470;
/** Half the 22-yard pitch, in the same scale as the boundary. */
const HALF_PITCH = 80;
export const STRIKER_Y = CENTER + HALF_PITCH;
export const BOWLER_END_Y = CENTER - HALF_PITCH;
/** The 30-yard circle: semicircles of this radius around each set of stumps. */
export const RING_R = 217;

export type Point = { x: number; y: number };

/**
 * A named fielding position. `angle` is in degrees from straight down the
 * ground (0) towards the off side (positive) or leg side (negative), with
 * ±180 directly behind the stumps. `r` is how far towards the rope the
 * fielder stands: 0 at the striker's stumps, 1 on the boundary.
 */
type NamedPosition = { name: string; angle: number; r: number };

const POSITIONS: NamedPosition[] = [
  // Off side — close in
  { name: "1st slip", angle: 165, r: 0.38 },
  { name: "2nd slip", angle: 148, r: 0.38 },
  { name: "3rd slip", angle: 131, r: 0.38 },
  { name: "Gully", angle: 118, r: 0.4 },
  { name: "Silly point", angle: 92, r: 0.09 },
  { name: "Silly mid-off", angle: 30, r: 0.11 },
  { name: "Short cover", angle: 62, r: 0.22 },
  // Off side — in the ring
  { name: "Backward point", angle: 106, r: 0.46 },
  { name: "Point", angle: 92, r: 0.4 },
  { name: "Cover point", angle: 78, r: 0.42 },
  { name: "Cover", angle: 60, r: 0.43 },
  { name: "Extra cover", angle: 42, r: 0.45 },
  { name: "Mid-off", angle: 22, r: 0.45 },
  { name: "Short third man", angle: 140, r: 0.52 },
  { name: "Fly slip", angle: 160, r: 0.62 },
  // Off side — on the rope
  { name: "Long-off", angle: 12, r: 0.95 },
  { name: "Deep extra cover", angle: 38, r: 0.95 },
  { name: "Deep cover", angle: 60, r: 0.95 },
  { name: "Deep cover point", angle: 78, r: 0.95 },
  { name: "Deep point", angle: 95, r: 0.95 },
  { name: "Deep backward point", angle: 118, r: 0.95 },
  { name: "Third man", angle: 145, r: 0.95 },
  // Straight, either side
  { name: "Long stop", angle: 180, r: 0.85 },
  // Leg side — close in
  { name: "Leg slip", angle: -162, r: 0.38 },
  { name: "Leg gully", angle: -135, r: 0.42 },
  { name: "Short leg", angle: -95, r: 0.09 },
  { name: "Silly mid-on", angle: -30, r: 0.11 },
  { name: "Short midwicket", angle: -55, r: 0.22 },
  // Leg side — in the ring
  { name: "Mid-on", angle: -22, r: 0.45 },
  { name: "Midwicket", angle: -50, r: 0.43 },
  { name: "Square leg", angle: -92, r: 0.42 },
  { name: "Backward square leg", angle: -118, r: 0.45 },
  { name: "Short fine leg", angle: -150, r: 0.52 },
  // Leg side — on the rope
  { name: "Long-on", angle: -12, r: 0.95 },
  { name: "Cow corner", angle: -35, r: 0.95 },
  { name: "Deep midwicket", angle: -58, r: 0.95 },
  { name: "Deep square leg", angle: -92, r: 0.95 },
  { name: "Deep backward square", angle: -120, r: 0.95 },
  { name: "Fine leg", angle: -155, r: 0.95 },
];

const RAD = Math.PI / 180;

/** +1 when the off side is on the right of the screen, −1 when it's on the left. */
function offSign(hand: Hand): number {
  return hand === "RHB" ? 1 : -1;
}

/** Distance from the striker's stumps to the rope along a screen direction. */
function ropeDistance(ux: number, uy: number): number {
  // Solve |S + t·u − C| = R for t > 0, where S is the striker's stumps.
  const sx = 0;
  const sy = STRIKER_Y - CENTER;
  const b = sx * ux + sy * uy;
  const c = sx * sx + sy * sy - BOUNDARY_R * BOUNDARY_R;
  return -b + Math.sqrt(b * b - c);
}

/** Screen point → angle/distance relative to the striker, for the given batter. */
export function toPolar(p: Point, hand: Hand): { angle: number; r: number } {
  const dx = p.x - CENTER;
  const dy = p.y - STRIKER_Y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { angle: 0, r: 0 };
  const angle = Math.atan2(dx * offSign(hand), -dy) / RAD;
  return { angle, r: len / ropeDistance(dx / len, dy / len) };
}

/** Angle/distance → screen point. Inverse of {@link toPolar}. */
export function fromPolar(angle: number, r: number, hand: Hand): Point {
  const ux = Math.sin(angle * RAD) * offSign(hand);
  const uy = -Math.cos(angle * RAD);
  const d = r * ropeDistance(ux, uy);
  return { x: CENTER + ux * d, y: STRIKER_Y + uy * d };
}

/**
 * Polar → a comparison space where close-in positions get more room. Near the
 * bat a few yards separates slip from gully, while on the rope a fielder can
 * drift a long way and still be "deep midwicket"; the power below 1 stretches
 * the inner field so nearest-match picks the name a captain would use.
 */
function warp(angle: number, r: number): [number, number] {
  const w = Math.pow(Math.max(r, 0), 0.6);
  return [w * Math.sin(angle * RAD), w * Math.cos(angle * RAD)];
}

const WARPED = POSITIONS.map((p) => ({ ...p, w: warp(p.angle, p.r) }));

/** The conventional name of the position nearest to a point on the ground. */
export function positionName(p: Point, hand: Hand): string {
  const { angle, r } = toPolar(p, hand);
  const [x, y] = warp(angle, r);
  let best = WARPED[0];
  let bestD = Infinity;
  for (const pos of WARPED) {
    const d = (pos.w[0] - x) ** 2 + (pos.w[1] - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = pos;
    }
  }
  return best.name;
}

export type Side = "off" | "leg";

export function sideOf(p: Point, hand: Hand): Side {
  return toPolar(p, hand).angle >= 0 ? "off" : "leg";
}

/** Inside the 30-yard circle: within RING_R of the line between the stumps. */
export function insideRing(p: Point): boolean {
  const y = Math.min(Math.max(p.y, BOWLER_END_Y), STRIKER_Y);
  return Math.hypot(p.x - CENTER, p.y - y) <= RING_R;
}

/** Law 28.4 — no more than two fielders behind square on the leg side. */
export function behindSquareLeg(p: Point, hand: Hand): boolean {
  return toPolar(p, hand).angle < -90;
}

/** Keeps a dragged marker on the grass, just inside the rope. */
export function clampToGround(p: Point, margin = 18): Point {
  const dx = p.x - CENTER;
  const dy = p.y - CENTER;
  const len = Math.hypot(dx, dy);
  const max = BOUNDARY_R - margin;
  if (len <= max) return p;
  return { x: CENTER + (dx / len) * max, y: CENTER + (dy / len) * max };
}

export function positionPoint(name: string, hand: Hand): Point {
  const pos = POSITIONS.find((p) => p.name === name);
  if (!pos) throw new Error(`Unknown fielding position: ${name}`);
  return fromPolar(pos.angle, pos.r, hand);
}

export const BOWLER_HOME: Point = { x: CENTER, y: BOWLER_END_Y - 30 };
export const KEEPER_HOME: Point = { x: CENTER, y: STRIKER_Y + 75 };

export type Preset = { id: string; label: string; positions: string[] };

/** Nine fielders each; the bowler and keeper are placed separately. */
export const PRESETS: Preset[] = [
  {
    id: "powerplay",
    label: "Powerplay (2 out)",
    positions: [
      "1st slip", "Point", "Cover", "Mid-off", "Mid-on",
      "Midwicket", "Square leg", "Third man", "Fine leg",
    ],
  },
  {
    id: "middle",
    label: "Middle overs",
    positions: [
      "Point", "Cover", "Mid-off", "Mid-on", "Square leg",
      "Deep point", "Long-on", "Deep midwicket", "Fine leg",
    ],
  },
  {
    id: "death",
    label: "Death overs",
    positions: [
      "Short third man", "Point", "Mid-off", "Short fine leg", "Deep cover",
      "Long-off", "Long-on", "Deep midwicket", "Deep square leg",
    ],
  },
  {
    id: "spin",
    label: "Spin attack",
    positions: [
      "1st slip", "Short leg", "Point", "Cover", "Mid-off",
      "Mid-on", "Midwicket", "Deep square leg", "Long-on",
    ],
  },
  {
    id: "pace",
    label: "New ball pace",
    positions: [
      "1st slip", "2nd slip", "3rd slip", "Gully", "Point",
      "Cover", "Mid-off", "Mid-on", "Fine leg",
    ],
  },
  {
    id: "short",
    label: "Short-ball plan",
    positions: [
      "1st slip", "Third man", "Mid-off", "Leg gully", "Short leg",
      "Midwicket", "Deep square leg", "Deep backward square", "Fine leg",
    ],
  },
];

export type Phase = "powerplay" | "middle" | "death";

export const PHASES: { id: Phase; label: string; short: string }[] = [
  { id: "powerplay", label: "Powerplay", short: "Powerplay" },
  { id: "middle", label: "Middle overs", short: "Middle" },
  { id: "death", label: "Death overs", short: "Death" },
];

export const MATCH_OVERS = [30, 20] as const;
export type MatchOvers = (typeof MATCH_OVERS)[number];

/** First and last over of each phase: [powerplay end, death start]. */
const PHASE_SPLITS: Record<MatchOvers, [number, number]> = {
  20: [6, 16],
  30: [9, 25],
};

export function overRange(phase: Phase, overs: MatchOvers): [number, number] {
  const [ppEnd, deathStart] = PHASE_SPLITS[overs];
  if (phase === "powerplay") return [1, ppEnd];
  if (phase === "middle") return [ppEnd + 1, deathStart - 1];
  return [deathStart, overs];
}

/** "Powerplay · Overs 1–9" */
export function phaseLabel(phase: Phase, overs: MatchOvers): string {
  const [from, to] = overRange(phase, overs);
  const name = PHASES.find((p) => p.id === phase)?.label ?? "";
  return `${name} · Overs ${from}–${to}`;
}
