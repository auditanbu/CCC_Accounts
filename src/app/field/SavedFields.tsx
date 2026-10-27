"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteFieldSetAction, saveFieldSetAction, type FieldSetInput } from "@/app/actions/fieldSets";
import { Sheet } from "@/components/ui/Sheet";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { FIELD_SETS_PER_PHONE } from "@/lib/fielding";
import { formatDate } from "@/lib/format";

/** A saved field as the page hands it over — never with the owner's phone id. */
export type SavedFieldSet = {
  id: number;
  name: string;
  savedBy: string;
  byAdmin: boolean;
  updatedAt: string;
  /** This viewer may update or delete it: the admin, or the phone that saved it. */
  canEdit: boolean;
  data: unknown;
};

const SAVER_KEY = "field-set:saver";

/**
 * The team's saved fields: anyone can load one, a phone can keep up to five
 * of its own, and the admin can save without limit and tidy up any of them.
 */
export function SavedFields({
  sets,
  admin,
  myCount,
  current,
  defaultName,
  loadedId,
  onLoad,
  onSaved,
}: {
  sets: SavedFieldSet[];
  admin: boolean;
  myCount: number;
  /** The planner's state right now, as it would be saved. */
  current: FieldSetInput["data"];
  defaultName: string;
  loadedId: number | null;
  onLoad: (set: SavedFieldSet) => void;
  onSaved: (id: number | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [savedBy, setSavedBy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSavedBy(localStorage.getItem(SAVER_KEY) ?? "");
    } catch {
      // No storage — they'll just type their name each time.
    }
  }, []);

  const loaded = sets.find((s) => s.id === loadedId) ?? null;
  const canUpdate = loaded?.canEdit ?? false;
  const atLimit = !admin && myCount >= FIELD_SETS_PER_PHONE;

  function openSheet() {
    setName(canUpdate && loaded ? loaded.name : defaultName);
    setError(null);
    setOpen(true);
  }

  function save(asNew: boolean) {
    setError(null);
    const id = asNew ? undefined : loaded?.id;
    startTransition(async () => {
      const res = await saveFieldSetAction({ id, name, savedBy, data: current });
      if (!res.ok) {
        setError(res.error ?? "Couldn't save the field.");
        return;
      }
      try {
        if (savedBy.trim()) localStorage.setItem(SAVER_KEY, savedBy.trim());
      } catch {
        // Not remembering the name is fine.
      }
      onSaved(res.created?.id ?? null);
      setNotice(res.message ?? "Saved.");
      setOpen(false);
      router.refresh();
    });
  }

  function remove(set: SavedFieldSet) {
    if (!window.confirm(`Delete “${set.name}”?`)) return;
    setNotice(null);
    startTransition(async () => {
      const res = await deleteFieldSetAction(set.id);
      if (!res.ok) {
        setNotice(res.error ?? "Couldn't delete it.");
        return;
      }
      if (set.id === loadedId) onSaved(null);
      setNotice(res.message ?? "Deleted.");
      router.refresh();
    });
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-end justify-between gap-3">
        <h2 className="section-title">Saved fields · {sets.length}</h2>
        <button type="button" onClick={openSheet} className="btn-tinted btn-sm">
          <PlusIcon width={15} height={15} strokeWidth={2.2} />
          Save field
        </button>
      </div>

      {notice ? <p className="px-1 text-[13px] font-medium text-label-secondary">{notice}</p> : null}

      {sets.length === 0 ? (
        <div className="card px-4 py-6 text-center text-[13px] text-label-secondary">
          No saved fields yet. Set one up and tap Save field.
        </div>
      ) : (
        <ul className="list-group">
          {sets.map((s) => (
            <li key={s.id} className="list-row gap-2 py-2.5">
              <button
                type="button"
                onClick={() => {
                  onLoad(s);
                  setNotice(`Loaded “${s.name}”.`);
                }}
                className="min-w-0 flex-1 text-left active:opacity-60"
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-medium">{s.name}</span>
                  {s.id === loadedId ? <CheckIcon width={16} height={16} className="shrink-0 text-ios-blue" /> : null}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-label-secondary">
                  {s.byAdmin ? (
                    <span className="rounded bg-ios-blue/10 px-1.5 py-px text-[11px] font-semibold text-ios-blue">
                      Admin
                    </span>
                  ) : (
                    <span className="truncate">by {s.savedBy}</span>
                  )}
                  <span className="shrink-0">· {formatDate(s.updatedAt)}</span>
                </span>
              </button>
              {s.canEdit ? (
                <button
                  type="button"
                  onClick={() => remove(s)}
                  disabled={pending}
                  aria-label={`Delete ${s.name}`}
                  className="rounded-lg p-2 text-ios-red active:bg-ios-red/10 disabled:opacity-40"
                >
                  <TrashIcon width={18} height={18} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!admin ? (
        <p className="px-1 text-[12px] text-label-secondary">
          {myCount} of {FIELD_SETS_PER_PHONE} saved on this phone. Everyone in the team can see saved fields.
        </p>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title="Save field">
        <div className="space-y-4">
          <div>
            <label htmlFor="field-set-name" className="label">
              Name
            </label>
            <input
              id="field-set-name"
              className="input"
              value={name}
              maxLength={40}
              placeholder="e.g. Death overs vs Royal XI"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {!admin ? (
            <div>
              <label htmlFor="field-set-saver" className="label">
                Your name
              </label>
              <input
                id="field-set-saver"
                className="input"
                value={savedBy}
                maxLength={30}
                placeholder="Shown to the team"
                onChange={(e) => setSavedBy(e.target.value)}
              />
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-[13px] font-medium text-ios-red">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            {canUpdate && loaded ? (
              <button type="button" onClick={() => save(false)} disabled={pending} className="btn-primary w-full">
                Update “{loaded.name}”
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => save(true)}
              disabled={pending || atLimit}
              className={cn("w-full", canUpdate ? "btn-secondary" : "btn-primary")}
            >
              {canUpdate ? "Save as new" : "Save"}
            </button>
            {atLimit ? (
              <p className="text-[12px] text-label-secondary">
                This phone already has {FIELD_SETS_PER_PHONE} saved fields. Delete one to save a new one
                {canUpdate ? ", or update the one you loaded" : ""}.
              </p>
            ) : null}
          </div>
        </div>
      </Sheet>
    </section>
  );
}
