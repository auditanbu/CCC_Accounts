"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { SavedFields, type SavedFieldSet } from "@/app/field/SavedFields";
import { Sheet } from "@/components/ui/Sheet";
import {
  CheckIcon,
  ChevronRightIcon,
  CollapseIcon,
  DownloadIcon,
  ExpandIcon,
  ShareIcon,
} from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { TEAM_NAME } from "@/lib/constants";
import {
  BOUNDARY_R,
  BOWLER_HOME,
  CENTER,
  KEEPER_HOME,
  MATCH_OVERS,
  PHASES,
  PRESETS,
  PITCH_BOTTOM_Y,
  PITCH_TOP_Y,
  RING_R,
  VIEW,
  behindSquareLeg,
  clampToGround,
  insideRing,
  offSideOnRight,
  overRange,
  phaseLabel,
  positionName,
  positionPoint,
  sideOf,
  type Hand,
  type MatchOvers,
  type Phase,
  type Point,
} from "@/lib/fielding";
import { avatarLabel, formatDate } from "@/lib/format";
import { jpegToPdf } from "@/lib/pdf";

export type SquadPlayer = { id: number; name: string; jerseyNumber: number | null };

type Role = "fielder" | "bowler" | "keeper";

type Marker = Point & {
  id: string;
  role: Role;
  playerId: number | null;
};

/** What the dots show: each player's jersey number, or slot numbers with
 * the player's name in the label. */
type LabelMode = "jersey" | "name";

/** Everything besides the markers that the shared image is headed with. */
type Settings = {
  hand: Hand;
  title: string;
  labelMode: LabelMode;
  phase: Phase;
  overs: MatchOvers;
};

const DEFAULT_SETTINGS: Settings = {
  hand: "RHB",
  title: "",
  labelMode: "name",
  phase: "powerplay",
  overs: 30,
};

/** `v` 2 is the bowler-at-the-bottom ground; older layouts were drawn the
 * other way up. */
type Saved = Settings & { markers: Marker[]; v?: number };

const SAVED_VERSION = 2;

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

function leaveBrowserFullScreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

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

/** Text inside a dot: the player's jersey number (or initials) in jersey
 * mode, otherwise — or with nobody assigned — the slot badge. */
function dotText(m: Marker, player: SquadPlayer | undefined, mode: LabelMode): string {
  if (mode === "jersey" && player) return avatarLabel(player.name, player.jerseyNumber);
  return markerBadge(m);
}

function dotFontSize(text: string): number {
  return text.length <= 1 ? 20 : text.length === 2 ? 17 : 13;
}

function loadSaved(players: SquadPlayer[]): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeSaved(JSON.parse(raw), players) : null;
  } catch {
    return null;
  }
}

/** Checks a layout from this phone's storage or the team's saved fields and
 * brings it up to date with the current planner. */
function normalizeSaved(raw: unknown, players: SquadPlayer[]): Saved | null {
  try {
    const data = (raw ?? {}) as Partial<Saved>;
    if (!Array.isArray(data.markers) || data.markers.length !== 11) return null;
    const known = new Set(players.map((p) => p.id));
    // Layouts saved before a setting existed simply get its default.
    return {
      hand: data.hand === "LHB" ? "LHB" : "RHB",
      title: typeof data.title === "string" ? data.title : "",
      labelMode: data.labelMode === "jersey" ? "jersey" : "name",
      phase: PHASES.some((p) => p.id === data.phase) ? (data.phase as Phase) : DEFAULT_SETTINGS.phase,
      overs: MATCH_OVERS.includes(data.overs as MatchOvers) ? (data.overs as MatchOvers) : DEFAULT_SETTINGS.overs,
      markers: data.markers.map((m) => ({
        ...m,
        // Turning an old layout round keeps every fielder's position name.
        ...(data.v === SAVED_VERSION ? {} : { x: VIEW - m.x, y: VIEW - m.y }),
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
export function FieldPlanner({
  players,
  savedSets,
  admin,
  myCount,
}: {
  players: SquadPlayer[];
  savedSets: SavedFieldSet[];
  admin: boolean;
  /** Field sets this phone has saved, towards its limit. */
  myCount: number;
}) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const { hand, title, labelMode, phase, overs } = settings;
  const [presetId, setPresetId] = useState(DEFAULT_PRESET.id);
  const [markers, setMarkers] = useState<Marker[]>(() => presetMarkers(DEFAULT_PRESET.id, "RHB"));
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  /** The team field set last loaded or saved, which Save can update. */
  const [loadedSetId, setLoadedSetId] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);

  // Restored after mount rather than in the initial state, so the server
  // render and the first client render agree.
  useEffect(() => {
    const saved = loadSaved(players);
    if (saved) {
      const { markers: savedMarkers, ...savedSettings } = saved;
      setSettings(savedSettings);
      setMarkers(savedMarkers);
      setPresetId("");
    }
    setLoaded(true);
  }, [players]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, markers, v: SAVED_VERSION } satisfies Saved));
    } catch {
      // Private mode or storage full — the planner still works, it just
      // won't remember this layout next time.
    }
  }, [loaded, settings, markers]);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const playerOf = (m: Marker) => (m.playerId !== null ? playerById.get(m.playerId) : undefined);

  function update(patch: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...patch }));
  }

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
    update({ hand: next });
    // Flip the field across the pitch so every fielder keeps its position
    // name for the new batter.
    setMarkers((ms) => ms.map((m) => ({ ...m, ...mirror(m) })));
  }

  function applyPreset(id: string) {
    setPresetId(id);
    if (id) setMarkers((ms) => presetMarkers(id, hand, ms));
  }

  // Full screen is the ground laid over the whole page. The browser's own
  // full-screen mode is asked for on top of that to hide its toolbars, but
  // iPhone Safari doesn't offer it for pages, so the overlay works without it.
  // It goes on the whole document rather than the ground so the player
  // picker sheet, which opens on <body>, still shows.
  const fullScreenRef = useRef(false);

  function enterFullScreen() {
    fullScreenRef.current = true;
    setFullScreen(true);
    document.documentElement
      .requestFullscreen?.()
      // Closed again before the browser got there — don't strand it full screen.
      .then(() => {
        if (!fullScreenRef.current) leaveBrowserFullScreen();
      })
      .catch(() => {});
  }

  function exitFullScreen() {
    fullScreenRef.current = false;
    setFullScreen(false);
    leaveBrowserFullScreen();
  }

  useEffect(() => {
    if (!fullScreen) return;
    // Leaving the browser's full screen (Esc, back gesture) leaves ours too.
    const onChange = () => {
      if (!document.fullscreenElement) {
        fullScreenRef.current = false;
        setFullScreen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editing) exitFullScreen();
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullScreen, editing]);

  function loadSet(set: SavedFieldSet) {
    const saved = normalizeSaved(set.data, players);
    if (!saved) return;
    const { markers: savedMarkers, ...savedSettings } = saved;
    setSettings(savedSettings);
    setMarkers(savedMarkers);
    setPresetId("");
    setLoadedSetId(set.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setLoadedSetId(null);
    update({ title: "" });
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

  const bowlerId = markers.find((m) => m.role === "bowler")?.playerId ?? null;
  const bowlerName = bowlerId !== null ? playerById.get(bowlerId)?.name : undefined;
  // What the folded settings card shows, so the choices are visible closed.
  const summary = [
    phaseLabel(phase, overs),
    `${hand === "RHB" ? "Right" : "Left"}-hand`,
    bowlerName ? `Bowler: ${bowlerName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const editingMarker = markers.find((m) => m.id === editing) ?? null;
  const items = markers.map((m) => ({
    marker: m,
    position: markerPosition(m, hand),
    // Jersey mode puts the player in the dot, so the label is position only.
    player: labelMode === "name" ? playerOf(m)?.name ?? null : null,
    dot: dotText(m, playerOf(m), labelMode),
  }));
  const labels = layoutLabels(items);
  // Draw the marker being dragged last so it sits above the rest.
  const drawOrder = dragId
    ? [...items.filter((i) => i.marker.id !== dragId), ...items.filter((i) => i.marker.id === dragId)]
    : items;

  return (
    <div className="space-y-5">
      <div className="card">
        <button
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          aria-expanded={settingsOpen}
          aria-controls="field-settings"
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{title || "Field settings"}</span>
            <span className="block truncate text-[12px] text-label-secondary">{summary}</span>
          </span>
          <ChevronRightIcon
            className={cn(
              "shrink-0 text-label-tertiary transition-transform duration-200",
              settingsOpen && "rotate-90",
            )}
          />
        </button>

        {settingsOpen ? (
          <div id="field-settings" className="space-y-3 border-t border-separator/70 px-4 pb-4 pt-3 sm:px-5">
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
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="field-bowler" className="label">
                  Bowler
                </label>
                <select
                  id="field-bowler"
                  className="select"
                  value={bowlerId ?? ""}
                  onChange={(e) => assign("B", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Not set</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="field-overs" className="label">
                  Match
                </label>
                <select
                  id="field-overs"
                  className="select"
                  value={overs}
                  onChange={(e) => update({ overs: Number(e.target.value) as MatchOvers })}
                >
                  {MATCH_OVERS.map((o) => (
                    <option key={o} value={o}>
                      {o} overs
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="label">Over range · Overs {overRange(phase, overs).join("–")}</span>
              <Segmented
                label="Over range"
                value={phase}
                options={PHASES.map((p) => ({ value: p.id, label: p.short }))}
                onChange={(v) => update({ phase: v })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="label">Batter</span>
                <Segmented
                  label="Batter"
                  value={hand}
                  options={[
                    { value: "RHB", label: "Right" },
                    { value: "LHB", label: "Left" },
                  ]}
                  onChange={changeHand}
                />
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

            <div>
              <span className="label">Dots show</span>
              <Segmented
                label="Dots show"
                value={labelMode}
                options={[
                  { value: "name", label: "Name" },
                  { value: "jersey", label: "Jersey no." },
                ]}
                onChange={(v) => update({ labelMode: v })}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "bg-[#2f6f2c]",
          fullScreen
            ? // !mt-0: the parent's space-y margin would otherwise push the overlay down.
              "fixed inset-0 z-[45] !mt-0 flex flex-col"
            : "relative overflow-hidden rounded-2xl shadow-card",
        )}
      >
        {fullScreen ? (
          <div
            className="flex items-center gap-3 px-4 pb-2 text-white"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{title || "Field set"}</span>
              <span className="block truncate text-[12px] text-white/75">{summary}</span>
            </span>
            <button
              type="button"
              onClick={exitFullScreen}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[14px] font-semibold active:bg-white/25"
            >
              <CollapseIcon width={18} height={18} strokeWidth={2} />
              Exit
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={enterFullScreen}
            aria-label="Full screen"
            title="Full screen"
            className="absolute right-2.5 top-2.5 z-10 grid h-9 w-9 place-items-center rounded-xl bg-[#000]/30 text-white backdrop-blur-sm active:bg-[#000]/45"
          >
            <ExpandIcon width={19} height={19} strokeWidth={2} />
          </button>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className={cn("select-none", fullScreen ? "min-h-0 w-full flex-1" : "block h-auto w-full")}
          style={{ touchAction: "none" }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="img"
          aria-label="Cricket ground with fielding positions"
        >
          <Ground hand={hand} />
          <g fontFamily={FONT}>
            {drawOrder.map(({ marker: m, position, player, dot }) => (
              <MarkerView
                key={m.id}
                marker={m}
                position={position}
                player={player}
                dot={dot}
                label={labels.get(m.id)!}
                active={m.id === dragId}
                onPointerDown={(e) => onMarkerDown(e, m.id)}
              />
            ))}
          </g>
        </svg>
        {fullScreen ? (
          <p
            className="px-4 pt-2 text-center text-[12px] text-white/75"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            Drag to move · tap a fielder to pick the player
          </p>
        ) : null}
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

      <ExportButtons svgRef={svgRef} settings={settings} markers={markers} playerById={playerById} />

      <SavedFields
        sets={savedSets}
        admin={admin}
        myCount={myCount}
        current={{ ...settings, markers, v: SAVED_VERSION }}
        defaultName={title || PRESETS.find((p) => p.id === presetId)?.label || "Field set"}
        loadedId={loadedSetId}
        onLoad={loadSet}
        onSaved={setLoadedSetId}
      />

      <section className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <h2 className="section-title">Positions</h2>
          <button type="button" onClick={reset} className="text-[14px] font-medium text-ios-blue">
            Reset
          </button>
        </div>
        <ul className="list-group">
          {markers.map((m) => {
            const player = playerOf(m);
            const dot = dotText(m, player, labelMode);
            return (
              <li key={m.id}>
                <button type="button" onClick={() => setEditing(m.id)} className="list-row-link w-full text-left">
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold text-white",
                      dot.length > 2 ? "text-[10px]" : "text-[12px]",
                    )}
                    style={{ background: COLORS[m.role] }}
                  >
                    {dot}
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

/** iOS-style segmented control. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-xl bg-black/[0.05] p-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-[14px] font-semibold transition-colors",
            value === o.value ? "bg-surface text-label shadow-sm" : "text-label-secondary",
          )}
        >
          {o.label}
        </button>
      ))}
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
    `M ${CENTER - RING_R} ${PITCH_BOTTOM_Y} L ${CENTER - RING_R} ${PITCH_TOP_Y} ` +
    `A ${RING_R} ${RING_R} 0 0 1 ${CENTER + RING_R} ${PITCH_TOP_Y} ` +
    `L ${CENTER + RING_R} ${PITCH_BOTTOM_Y} A ${RING_R} ${RING_R} 0 0 1 ${CENTER - RING_R} ${PITCH_BOTTOM_Y} Z`;
  const offX = offSideOnRight(hand) ? VIEW - 70 : 70;
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
        y={PITCH_TOP_Y - 18}
        width={pitchW}
        height={PITCH_BOTTOM_Y - PITCH_TOP_Y + 36}
        rx={4}
        fill="#d9c48f"
      />
      {[PITCH_TOP_Y, PITCH_BOTTOM_Y].map((y) => (
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
  dot,
  label: { left, top, w, h },
  active,
  onPointerDown,
}: {
  marker: Marker;
  position: string;
  player: string | null;
  dot: string;
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
      <text y={dotFontSize(dot) * 0.35} textAnchor="middle" fontSize={dotFontSize(dot)} fontWeight={700} fill="#ffffff">
        {dot}
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
type ExportKind = "png" | "pdf";

/** The PDF page, in points: 9:16 like the image, 7.5 × 13.3 inches. */
const PDF_PAGE = { width: 540, height: 960 };

/**
 * Turns the ground into a 1080px-wide PNG with a header and a key, then hands
 * it to the phone's share sheet (WhatsApp, Save Image…) or downloads it.
 */
function ExportButtons({
  svgRef,
  settings,
  markers,
  playerById,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  settings: Settings;
  markers: Marker[];
  playerById: Map<number, SquadPlayer>;
}) {
  const { title } = settings;
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
  }, [settings, markers]);

  const baseName = `field-set${title ? `-${title.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase()}` : ""}`;

  async function makeFile(kind: ExportKind = "png"): Promise<File> {
    const svg = svgRef.current;
    if (!svg) throw new Error("ground not rendered");
    const canvas = await renderCanvas(svg, settings, markers, playerById);
    if (kind === "png") {
      return new File([await canvasBlob(canvas, "image/png")], `${baseName}.png`, { type: "image/png" });
    }
    const jpeg = new Uint8Array(await (await canvasBlob(canvas, "image/jpeg", 0.92)).arrayBuffer());
    const pdf = jpegToPdf(jpeg, canvas, PDF_PAGE);
    return new File([pdf], `${baseName}.pdf`, { type: "application/pdf" });
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

  async function save(kind: ExportKind) {
    setStatus("working");
    try {
      const file = await makeFile(kind);
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
      {/* One row; short labels so three fit across a phone. */}
      <div className="flex gap-2">
        {canShareFiles ? (
          <button type="button" onClick={share} disabled={status === "working"} className="btn-primary flex-1 px-2">
            <ShareIcon width={17} height={17} className="shrink-0" />
            {status === "retry" ? "Tap again" : "Share"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => save("png")}
          disabled={status === "working"}
          className={cn("flex-1 px-2", canShareFiles ? "btn-secondary" : "btn-primary")}
        >
          <DownloadIcon width={17} height={17} className="shrink-0" />
          Image
        </button>
        <button
          type="button"
          onClick={() => save("pdf")}
          disabled={status === "working"}
          className="btn-secondary flex-1 px-2"
        >
          <DownloadIcon width={17} height={17} className="shrink-0" />
          PDF
        </button>
      </div>
      {status === "error" ? (
        <p role="alert" className="text-[13px] font-medium text-ios-red">
          Couldn&apos;t create the file — please try again.
        </p>
      ) : (
        <p className="px-1 text-[12px] text-label-secondary">
          {canShareFiles
            ? "Share opens WhatsApp or “Save Image” for your Photos. Image and PDF download a file."
            : "Image and PDF download a file you can send on WhatsApp."}
        </p>
      )}
    </div>
  );
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality),
  );
}

/** Draws the shareable page — heading, ground and key — onto a canvas. */
async function renderCanvas(
  ground: SVGSVGElement,
  { title, hand, phase, overs, labelMode }: Settings,
  markers: Marker[],
  playerById: Map<number, SquadPlayer>,
): Promise<HTMLCanvasElement> {
  // 9:16, so it fills a phone screen and a WhatsApp status.
  const W = 1080;
  const H = 1920;
  const groundTop = 230;
  const keyTop = groundTop + VIEW + 60;
  const rowH = 50;

  const serializer = new XMLSerializer();
  const groundMarkup = Array.from(ground.childNodes)
    .map((n) => serializer.serializeToString(n))
    .join("");

  const bowlerId = markers.find((m) => m.role === "bowler")?.playerId ?? null;
  const bowler = bowlerId !== null ? playerById.get(bowlerId)?.name : undefined;
  const phaseLine = `${phaseLabel(phase, overs)}${bowler ? ` · Bowler: ${bowler}` : ""}`;
  const sub = `${hand === "RHB" ? "Right" : "Left"}-hand batter · ${overs}-over match · ${formatDate(new Date())}`;
  const key = markers
    .map((m, i) => {
      const x = 60;
      const y = keyTop + 55 + i * rowH;
      const player = m.playerId !== null ? playerById.get(m.playerId) : undefined;
      // The key always names the player, whichever way the dots are showing.
      const who = player
        ? `${player.name}${player.jerseyNumber !== null ? ` (#${player.jerseyNumber})` : ""}`
        : "";
      const dot = dotText(m, player, labelMode);
      const dotSize = Math.round(dotFontSize(dot) * 0.85);
      return (
        `<circle cx="${x + 17}" cy="${y - 9}" r="17" fill="${COLORS[m.role]}"/>` +
        `<text x="${x + 17}" y="${y - 9 + dotSize * 0.35}" text-anchor="middle" font-size="${dotSize}" font-weight="700" fill="#fff">${escapeXml(dot)}</text>` +
        `<text x="${x + 48}" y="${y}" font-size="28" fill="#1c1c1e"><tspan font-weight="700">${escapeXml(markerPosition(m, hand))}</tspan>` +
        (who ? `<tspan fill="#6e6e73"> — ${escapeXml(who)}</tspan>` : "") +
        `</text>`
      );
    })
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">` +
    `<rect width="${W}" height="${H}" fill="#F2F2F7"/>` +
    `<text x="40" y="62" font-size="28" font-weight="600" fill="#6e6e73">${escapeXml(TEAM_NAME)}</text>` +
    `<text x="40" y="120" font-size="48" font-weight="800" fill="#1c1c1e">${escapeXml(title || "Field set")}</text>` +
    `<text x="40" y="164" font-size="28" font-weight="700" fill="#0A84FF">${escapeXml(phaseLine)}</text>` +
    `<text x="40" y="202" font-size="25" fill="#6e6e73">${escapeXml(sub)}</text>` +
    `<svg x="40" y="${groundTop}" width="${VIEW}" height="${VIEW}" viewBox="0 0 ${VIEW} ${VIEW}">${groundMarkup}</svg>` +
    `<text x="40" y="${keyTop + 6}" font-size="24" font-weight="700" fill="#6e6e73" letter-spacing="1.5">FIELD</text>` +
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
  return canvas;
}
