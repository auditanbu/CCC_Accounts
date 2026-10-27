"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { CheckIcon, DownloadIcon, ShareIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { TEAM_NAME } from "@/lib/constants";
import {
  BOUNDARY_R,
  BOWLER_END_Y,
  BOWLER_HOME,
  CENTER,
  KEEPER_HOME,
  PRESETS,
  RING_R,
  STRIKER_Y,
  VIEW,
  behindSquareLeg,
  clampToGround,
  insideRing,
  positionName,
  positionPoint,
  sideOf,
  type Hand,
  type Point,
} from "@/lib/fielding";
import { avatarLabel, formatDate } from "@/lib/format";

export type SquadPlayer = { id: number; name: string; jerseyNumber: number | null };

type Role = "fielder" | "bowler" | "keeper";

type Marker = Point & {
  id: string;
  role: Role;
  playerId: number | null;
};

type Saved = { hand: Hand; title: string; markers: Marker[] };

const STORAGE_KEY = "field-set:v1";
const DEFAULT_PRESET = PRESETS[0];

/** Below this many screen pixels of movement a press counts as a tap. */
const TAP_SLOP_PX = 6;

const COLORS: Record<Role, string> = {
  fielder: "#0A84FF",
  bowler: "#FF3B30",
  keeper: "#FF9500",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

function mirror(p: Point): Point {
  return { x: VIEW - p.x, y: p.y };
}

function presetMarkers(presetId: string, hand: Hand, previous?: Marker[]): Marker[] {
  const preset = PRESETS.find((p) => p.id === presetId) ?? DEFAULT_PRESET;
  const playerOf = (id: string) => previous?.find((m) => m.id === id)?.playerId ?? null;
  return [
    { id: "WK", role: "keeper", ...KEEPER_HOME, playerId: playerOf("WK") },
    { id: "B", role: "bowler", ...BOWLER_HOME, playerId: playerOf("B") },
    ...preset.positions.map((name, i) => {
      const id = String(i + 1);
      return { id, role: "fielder" as const, ...positionPoint(name, hand), playerId: playerOf(id) };
    }),
  ];
}

function markerPosition(m: Marker, hand: Hand): string {
  if (m.role === "keeper") return "Wicket-keeper";
  if (m.role === "bowler") return "Bowler";
  return positionName(m, hand);
}

function markerBadge(m: Marker): string {
  if (m.role === "keeper") return "WK";
  if (m.role === "bowler") return "B";
  return m.id;
}

function loadSaved(players: SquadPlayer[]): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Saved;
    if (!Array.isArray(data.markers) || data.markers.length !== 11) return null;
    const known = new Set(players.map((p) => p.id));
    return {
      hand: data.hand === "LHB" ? "LHB" : "RHB",
      title: typeof data.title === "string" ? data.title : "",
      markers: data.markers.map((m) => ({
        ...m,
        // A player removed from the squad since is simply unassigned.
        playerId: m.playerId !== null && known.has(m.playerId) ? m.playerId : null,
      })),
    };
  } catch {
    return null;
  }
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Rough text width for sizing label pills — SVG has no layout to ask. */
function textWidth(s: string, size: number, bold: boolean): number {
  return s.length * size * (bold ? 0.58 : 0.54);
}

const MARKER_R = 18;
const POS_SIZE = 22;
const NAME_SIZE = 19;
const LABEL_GAP = 6;

type Box = { x: number; y: number; w: number; h: number };
/** A label pill, positioned relative to its marker's centre. */
type LabelBox = { left: number; top: number; w: number; h: number };

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Places each marker's label below it, or failing that above, right or left —
 * whichever collides least with the labels already placed and with the
 * markers themselves. Close catchers (slips, keeper, gully) would otherwise
 * stack their names on top of one another.
 */
function layoutLabels(items: { marker: Marker; position: string; player: string | null }[]): Map<string, LabelBox> {
  const out = new Map<string, LabelBox>();
  const placed: Box[] = [];
  const dots: Box[] = items.map(({ marker: m }) => ({
    x: m.x - MARKER_R,
    y: m.y - MARKER_R,
    w: MARKER_R * 2,
    h: MARKER_R * 2,
  }));
  const reach = MARKER_R + LABEL_GAP;

  for (const { marker: m, position, player } of items) {
    const w =
      Math.max(textWidth(position, POS_SIZE, true), player ? textWidth(player, NAME_SIZE, false) : 0) + 18;
    const h = player ? 52 : 30;
    const candidates = [
      { left: -w / 2, top: reach },
      { left: -w / 2, top: -(reach + h) },
      { left: reach, top: -h / 2 },
      { left: -(reach + w), top: -h / 2 },
    ].map((c) => ({
      // Keep the pill inside the picture.
      left: Math.min(Math.max(c.left, 4 - m.x), VIEW - 4 - m.x - w),
      top: Math.min(Math.max(c.top, 4 - m.y), VIEW - 4 - m.y - h),
      w,
      h,
    }));

    let best = candidates[0];
    let bestScore = Infinity;
    for (const [i, c] of candidates.entries()) {
      const box = { x: m.x + c.left, y: m.y + c.top, w, h };
      let score = i; // ties go to the earlier, more natural spot
      for (const b of placed) score += overlap(box, b) * 4;
      for (const d of dots) score += overlap(box, d) * 6;
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    out.set(m.id, best);
    placed.push({ x: m.x + best.left, y: m.y + best.top, w, h });
  }
  return out;
}

/**
 * Drag-and-drop field placement on a top-down ground. Every marker is named
 * after the conventional position nearest to where it's dropped, and the
 * whole set can be shared as a PNG to WhatsApp or saved to the phone.
 */
export function FieldPlanner({ players }: { players: SquadPlayer[] }) {
  const [hand, setHand] = useState<Hand>("RHB");
  const [title, setTitle] = useState("");
  const [presetId, setPresetId] = useState(DEFAULT_PRESET.id);
  const [markers, setMarkers] = useState<Marker[]>(() => presetMarkers(DEFAULT_PRESET.id, "RHB"));
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);

  // Restored after mount rather than in the initial state, so the server
  // render and the first client render agree.
  useEffect(() => {
    const saved = loadSaved(players);
    if (saved) {
      setHand(saved.hand);
      setTitle(saved.title);
      setMarkers(saved.markers);
      setPresetId("");
    }
    setLoaded(true);
  }, [players]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ hand, title, markers } satisfies Saved));
    } catch {
      // Private mode or storage full — the planner still works, it just
      // won't remember this layout next time.
    }
  }, [loaded, hand, title, markers]);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const fielders = markers.filter((m) => m.role === "fielder");
  const offCount = fielders.filter((m) => sideOf(m, hand) === "off").length;
  const outsideCount = fielders.filter((m) => !insideRing(m)).length;
  const behindSquare = fielders.filter((m) => behindSquareLeg(m, hand)).length;

  function toSvgPoint(clientX: number, clientY: number): Point | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }

  function onMarkerDown(e: ReactPointerEvent, id: string) {
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    drag.current = { id, startX: e.clientX, startY: e.clientY, moved: false };
    setDragId(id);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < TAP_SLOP_PX) return;
    d.moved = true;
    const p = toSvgPoint(e.clientX, e.clientY);
    if (!p) return;
    const next = clampToGround(p);
    setMarkers((ms) => ms.map((m) => (m.id === d.id ? { ...m, ...next } : m)));
    setPresetId("");
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    setDragId(null);
    if (d && !d.moved) setEditing(d.id);
  }

  function changeHand(next: Hand) {
    if (next === hand) return;
    setHand(next);
    // Flip the field across the pitch so every fielder keeps its position
    // name for the new batter.
    setMarkers((ms) => ms.map((m) => ({ ...m, ...mirror(m) })));
  }

  function applyPreset(id: string) {
    setPresetId(id);
    if (id) setMarkers((ms) => presetMarkers(id, hand, ms));
  }

  function reset() {
    setTitle("");
    setPresetId(DEFAULT_PRESET.id);
    setMarkers(presetMarkers(DEFAULT_PRESET.id, hand));
  }

  function assign(markerId: string, playerId: number | null) {
    setMarkers((ms) => {
      const current = ms.find((m) => m.id === markerId)?.playerId ?? null;
      return ms.map((m) => {
        if (m.id === markerId) return { ...m, playerId };
        // Picking someone already placed elsewhere swaps the two.
        if (playerId !== null && m.playerId === playerId) return { ...m, playerId: current };
        return m;
      });
    });
    setEditing(null);
  }

  const editingMarker = markers.find((m) => m.id === editing) ?? null;
  const items = markers.map((m) => ({
    marker: m,
    position: markerPosition(m, hand),
    player: m.playerId !== null ? playerById.get(m.playerId)?.name ?? null : null,
  }));
  const labels = layoutLabels(items);
  // Draw the marker being dragged last so it sits above the rest.
  const drawOrder = dragId
    ? [...items.filter((i) => i.marker.id !== dragId), ...items.filter((i) => i.marker.id === dragId)]
    : items;

  return (
    <div className="space-y-5">
      <div className="card-pad space-y-3">
        <div>
          <label htmlFor="field-title" className="label">
            Title
          </label>
          <input
            id="field-title"
            className="input"
            placeholder="e.g. Death overs vs Royal XI"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="label">Batter</span>
            <div className="flex rounded-xl bg-black/[0.05] p-1" role="group" aria-label="Batter">
              {(["RHB", "LHB"] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => changeHand(h)}
                  aria-pressed={hand === h}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-[14px] font-semibold transition-colors",
                    hand === h ? "bg-surface text-label shadow-sm" : "text-label-secondary",
                  )}
                >
                  {h === "RHB" ? "Right" : "Left"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="field-preset" className="label">
              Preset
            </label>
            <select
              id="field-preset"
              className="select"
              value={presetId}
              onChange={(e) => applyPreset(e.target.value)}
            >
              <option value="">Custom</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-[#2f6f2c] shadow-card">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="block h-auto w-full select-none"
          style={{ touchAction: "none" }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="img"
          aria-label="Cricket ground with fielding positions"
        >
          <Ground hand={hand} />
          <g fontFamily={FONT}>
            {drawOrder.map(({ marker: m, position, player }) => (
              <MarkerView
                key={m.id}
                marker={m}
                position={position}
                player={player}
                label={labels.get(m.id)!}
                active={m.id === dragId}
                onPointerDown={(e) => onMarkerDown(e, m.id)}
              />
            ))}
          </g>
        </svg>
      </div>

      <p className="-mt-2 px-1 text-[13px] text-label-secondary">
        Drag a fielder to move them. Tap one to pick the player.
      </p>

      <div className="flex flex-wrap gap-2">
        <span className="badge bg-ios-blue/10 text-ios-blue">Off side · {offCount}</span>
        <span className="badge bg-ios-purple/10 text-ios-purple">Leg side · {fielders.length - offCount}</span>
        <span className="badge bg-ios-green/12 text-ios-green">
          Inside circle · {fielders.length - outsideCount}
        </span>
        <span
          className={cn(
            "badge",
            outsideCount > 5 ? "bg-ios-red/10 text-ios-red" : "bg-ios-orange/12 text-ios-orange",
          )}
        >
          Outside circle · {outsideCount}
        </span>
      </div>
      {behindSquare > 2 || outsideCount > 5 ? (
        <p role="alert" className="-mt-2 px-1 text-[13px] font-medium text-ios-red">
          {behindSquare > 2 ? "Only 2 fielders are allowed behind square on the leg side. " : ""}
          {outsideCount > 5 ? "T20 and ODI allow at most 5 outside the circle." : ""}
        </p>
      ) : null}

      <ExportButtons svgRef={svgRef} title={title} hand={hand} markers={markers} playerById={playerById} />

      <section className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <h2 className="section-title">Positions</h2>
          <button type="button" onClick={reset} className="text-[14px] font-medium text-ios-blue">
            Reset
          </button>
        </div>
        <ul className="list-group">
          {markers.map((m) => {
            const player = m.playerId !== null ? playerById.get(m.playerId) : undefined;
            return (
              <li key={m.id}>
                <button type="button" onClick={() => setEditing(m.id)} className="list-row-link w-full text-left">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
                    style={{ background: COLORS[m.role] }}
                  >
                    {markerBadge(m)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                    {markerPosition(m, hand)}
                  </span>
                  <span
                    className={cn(
                      "max-w-[45%] truncate text-[14px]",
                      player ? "text-label" : "text-label-tertiary",
                    )}
                  >
                    {player?.name ?? "Pick player"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Sheet
        open={editingMarker !== null}
        onClose={() => setEditing(null)}
        title={editingMarker ? markerPosition(editingMarker, hand) : ""}
      >
        {editingMarker ? (
          <ul className="list-group">
            <li>
              <button
                type="button"
                onClick={() => assign(editingMarker.id, null)}
                className="list-row-link w-full text-left"
              >
                <span className="flex-1 text-[15px] text-label-secondary">No player</span>
                {editingMarker.playerId === null ? <CheckIcon className="text-ios-blue" /> : null}
              </button>
            </li>
            {players.map((p) => {
              const placedAt = markers.find((m) => m.playerId === p.id && m.id !== editingMarker.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => assign(editingMarker.id, p.id)}
                    className="list-row-link w-full text-left"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ios-blue/10 text-[12px] font-semibold text-ios-blue">
                      {avatarLabel(p.name, p.jerseyNumber)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{p.name}</span>
                      {placedAt ? (
                        <span className="block text-[12px] text-label-secondary">
                          At {markerPosition(placedAt, hand)} — will swap
                        </span>
                      ) : null}
                    </span>
                    {editingMarker.playerId === p.id ? <CheckIcon className="text-ios-blue" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Sheet>
    </div>
  );
}

/** The grass, rope, 30-yard circle and pitch. Plain SVG attributes only, so
 * the same nodes can be serialised straight into the shared image. */
function Ground({ hand }: { hand: Hand }) {
  const stripes = [];
  const stripeW = 70;
  for (let x = CENTER - BOUNDARY_R, i = 0; x < CENTER + BOUNDARY_R; x += stripeW, i++) {
    if (i % 2 === 0) {
      stripes.push(<rect key={x} x={x} y={0} width={stripeW} height={VIEW} fill="#4c9a45" />);
    }
  }
  const ring =
    `M ${CENTER - RING_R} ${STRIKER_Y} L ${CENTER - RING_R} ${BOWLER_END_Y} ` +
    `A ${RING_R} ${RING_R} 0 0 1 ${CENTER + RING_R} ${BOWLER_END_Y} ` +
    `L ${CENTER + RING_R} ${STRIKER_Y} A ${RING_R} ${RING_R} 0 0 1 ${CENTER - RING_R} ${STRIKER_Y} Z`;
  const offX = hand === "RHB" ? VIEW - 70 : 70;
  const legX = VIEW - offX;
  const pitchW = 44;

  return (
    <g>
      <rect x={0} y={0} width={VIEW} height={VIEW} fill="#2f6f2c" />
      <clipPath id="field-grass">
        <circle cx={CENTER} cy={CENTER} r={BOUNDARY_R} />
      </clipPath>
      <circle cx={CENTER} cy={CENTER} r={BOUNDARY_R} fill="#43903d" />
      <g clipPath="url(#field-grass)">{stripes}</g>
      <circle cx={CENTER} cy={CENTER} r={BOUNDARY_R} fill="none" stroke="#ffffff" strokeWidth={6} />
      <path d={ring} fill="none" stroke="#ffffff" strokeOpacity={0.75} strokeWidth={3} strokeDasharray="14 12" />
      <rect
        x={CENTER - pitchW / 2}
        y={BOWLER_END_Y - 18}
        width={pitchW}
        height={STRIKER_Y - BOWLER_END_Y + 36}
        rx={4}
        fill="#d9c48f"
      />
      {[BOWLER_END_Y, STRIKER_Y].map((y) => (
        <g key={y}>
          <line x1={CENTER - pitchW / 2 - 6} x2={CENTER + pitchW / 2 + 6} y1={y} y2={y} stroke="#ffffff" strokeWidth={2} />
          <rect x={CENTER - 7} y={y - 2} width={14} height={4} fill="#7a4b21" />
        </g>
      ))}
      <g fontFamily={FONT} fontWeight={700} fontSize={30} fill="#ffffff" fillOpacity={0.5} textAnchor="middle">
        <text x={offX} y={CENTER + 10}>OFF</text>
        <text x={legX} y={CENTER + 10}>LEG</text>
      </g>
    </g>
  );
}

function MarkerView({
  marker,
  position,
  player,
  label: { left, top, w, h },
  active,
  onPointerDown,
}: {
  marker: Marker;
  position: string;
  player: string | null;
  label: LabelBox;
  active: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
}) {
  const r = MARKER_R;

  return (
    <g
      transform={`translate(${marker.x} ${marker.y})`}
      onPointerDown={onPointerDown}
      style={{ cursor: active ? "grabbing" : "grab" }}
    >
      {/* Generous invisible hit area for fingers. */}
      <circle r={r + 16} fill="transparent" />
      <circle r={active ? r + 4 : r} fill={COLORS[marker.role]} stroke="#ffffff" strokeWidth={3} />
      <text
        y={7}
        textAnchor="middle"
        fontSize={marker.role === "keeper" ? 17 : 20}
        fontWeight={700}
        fill="#ffffff"
      >
        {markerBadge(marker)}
      </text>
      <rect x={left} y={top} width={w} height={h} rx={10} fill="#ffffff" fillOpacity={0.92} />
      <text x={left + w / 2} y={top + 22} textAnchor="middle" fontSize={POS_SIZE} fontWeight={700} fill="#1c1c1e">
        {position}
      </text>
      {player ? (
        <text x={left + w / 2} y={top + 44} textAnchor="middle" fontSize={NAME_SIZE} fill="#3a3a3c">
          {player}
        </text>
      ) : null}
    </g>
  );
}

type ExportStatus = "idle" | "working" | "retry" | "done" | "error";

/**
 * Turns the ground into a 1080px-wide PNG with a header and a key, then hands
 * it to the phone's share sheet (WhatsApp, Save Image…) or downloads it.
 */
function ExportButtons({
  svgRef,
  title,
  hand,
  markers,
  playerById,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  title: string;
  hand: Hand;
  markers: Marker[];
  playerById: Map<number, SquadPlayer>;
}) {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [pending, setPending] = useState<File | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    try {
      const probe = new File([""], "probe.png", { type: "image/png" });
      setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  // A prepared image goes stale the moment the field changes.
  useEffect(() => {
    setPending(null);
    setStatus((s) => (s === "retry" ? "idle" : s));
  }, [title, hand, markers]);

  const fileName = `field-set${title ? `-${title.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase()}` : ""}.png`;

  async function makeFile(): Promise<File> {
    const svg = svgRef.current;
    if (!svg) throw new Error("ground not rendered");
    const blob = await renderPng(svg, { title, hand, markers, playerById });
    return new File([blob], fileName, { type: "image/png" });
  }

  async function share() {
    setStatus("working");
    try {
      const file = pending ?? (await makeFile());
      try {
        await navigator.share({ files: [file], title: title || "Field set" });
        setPending(null);
        setStatus("done");
      } catch (err) {
        const name = (err as DOMException)?.name;
        if (name === "AbortError") {
          setStatus("idle");
        } else if (name === "NotAllowedError") {
          // Safari wants share() straight from a tap; building the image took
          // too long. The file is ready now, so a second tap goes through.
          setPending(file);
          setStatus("retry");
        } else {
          throw err;
        }
      }
    } catch {
      setStatus("error");
    }
  }

  async function save() {
    setStatus("working");
    try {
      const file = await makeFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {canShareFiles ? (
          <button type="button" onClick={share} disabled={status === "working"} className="btn-primary flex-1">
            <ShareIcon width={17} height={17} />
            {status === "retry" ? "Tap again to share" : "Share image"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={status === "working"}
          className={cn(canShareFiles ? "btn-secondary" : "btn-primary flex-1")}
        >
          <DownloadIcon width={17} height={17} />
          Save image
        </button>
      </div>
      {status === "error" ? (
        <p role="alert" className="text-[13px] font-medium text-ios-red">
          Couldn&apos;t create the image — please try again.
        </p>
      ) : (
        <p className="px-1 text-[12px] text-label-secondary">
          {canShareFiles
            ? "Share opens WhatsApp or “Save Image” to put it in your Photos."
            : "Downloads a PNG you can send on WhatsApp."}
        </p>
      )}
    </div>
  );
}

async function renderPng(
  ground: SVGSVGElement,
  {
    title,
    hand,
    markers,
    playerById,
  }: { title: string; hand: Hand; markers: Marker[]; playerById: Map<number, SquadPlayer> },
): Promise<Blob> {
  const W = 1080;
  const groundTop = 170;
  const keyTop = groundTop + VIEW + 30;
  const rowH = 36;
  const rows = Math.ceil(markers.length / 2);
  const H = keyTop + 40 + rows * rowH + 40;

  const serializer = new XMLSerializer();
  const groundMarkup = Array.from(ground.childNodes)
    .map((n) => serializer.serializeToString(n))
    .join("");

  const sub = `${hand === "RHB" ? "Right" : "Left"}-hand batter · ${formatDate(new Date())}`;
  const key = markers
    .map((m, i) => {
      const col = i < rows ? 0 : 1;
      const row = i < rows ? i : i - rows;
      const x = 60 + col * 500;
      const y = keyTop + 40 + row * rowH;
      const player = m.playerId !== null ? playerById.get(m.playerId)?.name : undefined;
      return (
        `<circle cx="${x + 14}" cy="${y - 8}" r="14" fill="${COLORS[m.role]}"/>` +
        `<text x="${x + 14}" y="${y - 2}" text-anchor="middle" font-size="${m.role === "keeper" ? 12 : 15}" font-weight="700" fill="#fff">${markerBadge(m)}</text>` +
        `<text x="${x + 38}" y="${y}" font-size="23" fill="#1c1c1e"><tspan font-weight="700">${escapeXml(markerPosition(m, hand))}</tspan>` +
        (player ? `<tspan fill="#6e6e73"> — ${escapeXml(player)}</tspan>` : "") +
        `</text>`
      );
    })
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">` +
    `<rect width="${W}" height="${H}" fill="#F2F2F7"/>` +
    `<text x="40" y="58" font-size="26" font-weight="600" fill="#6e6e73">${escapeXml(TEAM_NAME)}</text>` +
    `<text x="40" y="112" font-size="44" font-weight="800" fill="#1c1c1e">${escapeXml(title || "Field set")}</text>` +
    `<text x="40" y="150" font-size="24" fill="#6e6e73">${escapeXml(sub)}</text>` +
    `<svg x="40" y="${groundTop}" width="${VIEW}" height="${VIEW}" viewBox="0 0 ${VIEW} ${VIEW}">${groundMarkup}</svg>` +
    `<text x="40" y="${keyTop + 6}" font-size="22" font-weight="700" fill="#6e6e73" letter-spacing="1.5">FIELD</text>` +
    key +
    `</svg>`;

  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, W, H);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}
