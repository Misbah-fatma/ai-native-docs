import { useEffect, useState } from "react";
import { api, formatUpdated } from "../api";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default function HistoryPanel({ documentId, role, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const canEdit = role === "owner" || role === "editor";

  async function load() {
    const data = await api(`/api/documents/${documentId}/versions`);
    setVersions(data.versions);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [documentId]);

  async function checkpoint() {
    setPending(true);
    setError("");
    try {
      const data = await api(`/api/documents/${documentId}/versions`, {
        method: "POST",
        body: JSON.stringify({ label: "Checkpoint" }),
      });
      setVersions(data.versions);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function restore() {
    if (!restoreTarget) return;
    setPending(true);
    setError("");
    try {
      const data = await api(`/api/documents/${documentId}/versions/${restoreTarget.id}/restore`, {
        method: "POST",
      });
      onRestore(data.document);
      setRestoreTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <aside className="flex h-full w-full flex-col border-t border-line bg-card md:w-[22rem] md:border-l md:border-t-0">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-serif text-xl">Version history</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Edits collapse into a version if they happen close together. Restore replaces the live page.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:text-ink">
            Close
          </button>
        </div>

        {canEdit ? (
          <div className="border-b border-line px-4 py-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => void checkpoint()}
              className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-paper-deep disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save checkpoint"}
            </button>
          </div>
        ) : (
          <p className="border-b border-line px-4 py-3 text-xs text-ink-soft">
            View only. Ask the owner if you need a version restored.
          </p>
        )}

        {error ? <p className="px-4 pt-3 text-sm text-accent">{error}</p> : null}

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {versions.length === 0 ? (
            <p className="text-sm text-ink-soft">No versions yet. Edit the page or save a checkpoint.</p>
          ) : null}
          {versions.map((version) => (
            <article key={version.id} className="mb-3 rounded-2xl border border-line bg-paper px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{version.label}</p>
                <p className="text-xs text-ink-soft">{formatUpdated(version.createdAt)}</p>
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                {version.savedBy.name} · {version.title}
              </p>
              <p className="mt-2 text-sm leading-5 text-ink">{version.preview}</p>
              {canEdit ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setRestoreTarget(version)}
                  className="mt-2 text-xs font-medium text-accent"
                >
                  Restore
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </aside>
      {restoreTarget ? (
        <ConfirmDialog
          title="Restore this version?"
          message={`The live document will be replaced with “${restoreTarget.title}” from ${formatUpdated(restoreTarget.createdAt)}. A copy of the current page is saved first.`}
          confirmLabel="Restore"
          busy={pending}
          onConfirm={() => void restore()}
          onClose={() => {
            if (!pending) setRestoreTarget(null);
          }}
        />
      ) : null}
    </>
  );
}
