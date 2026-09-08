import { useEffect, useRef, useState } from "react";
import { api, downloadAuthFile, formatUpdated } from "../api";
import ConfirmDialog from "./ConfirmDialog.jsx";
import ImportDraftDialog from "./ImportDraftDialog.jsx";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPanel({ document, user, role, onChange, onImported, onClose }) {
  const attachRef = useRef(null);
  const importRef = useRef(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingRemove, setPendingRemove] = useState(null);
  const canEdit = role === "owner" || role === "editor";
  const files = document.attachments || [];

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !pendingFile && !pendingRemove) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pendingFile, pendingRemove]);

  async function attach(file) {
    setPending(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      const result = await api(`/api/documents/${document.id}/attachments`, {
        method: "POST",
        body: data,
      });
      onChange(result.document);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function importIntoDraft(mode) {
    if (!pendingFile) return;
    setPending(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", pendingFile);
      data.set("mode", mode);
      const result = await api(`/api/documents/${document.id}/import-content`, {
        method: "POST",
        body: data,
      });
      onImported(result.document);
      setPendingFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!pendingRemove) return;
    setPending(true);
    setError("");
    try {
      const result = await api(`/api/documents/${document.id}/attachments/${pendingRemove.id}`, {
        method: "DELETE",
      });
      onChange(result.document);
      setPendingRemove(null);
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
            <h2 className="font-serif text-xl">Files</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Attach a file to this document, or import .txt / .md / .docx into the draft.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:text-ink">
            Close
          </button>
        </div>

        {canEdit ? (
          <div className="grid gap-2 border-b border-line px-4 py-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => importRef.current?.click()}
              className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-wash hover:text-ink disabled:opacity-50"
            >
              Import into this draft
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => attachRef.current?.click()}
              className="rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:bg-ink-hover hover:text-paper disabled:opacity-50"
            >
              {pending ? "Working…" : "Attach a file"}
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".txt,.md,.markdown,.docx,text/plain,text/markdown"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) setPendingFile(file);
              }}
            />
            <input
              ref={attachRef}
              type="file"
              accept=".txt,.md,.markdown,.docx,.pdf,.png,.jpg,.jpeg,.gif,.webp,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void attach(file);
              }}
            />
          </div>
        ) : (
          <p className="border-b border-line px-4 py-3 text-xs text-ink-soft">
            View only. You can download attachments, but you cannot add files.
          </p>
        )}

        {error ? <p className="px-4 pt-3 text-sm text-accent">{error}</p> : null}

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {files.length === 0 ? (
            <p className="text-sm text-ink-soft">No attachments yet.</p>
          ) : null}
          {files.map((file) => {
            const canRemove = role === "owner" || file.uploadedBy?.id === user.id;
            return (
              <article key={file.id} className="mb-3 rounded-2xl border border-line bg-paper px-3 py-3">
                <p className="truncate text-sm font-medium">{file.filename}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {formatSize(file.size)} · {file.uploadedBy?.name} · {formatUpdated(file.createdAt)}
                </p>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    disabled={pending}
                    className="text-xs font-medium text-shared"
                    onClick={() =>
                      void downloadAuthFile(
                        `/api/documents/${document.id}/attachments/${file.id}/file`,
                        file.filename,
                      ).catch((err) => setError(err.message))
                    }
                  >
                    Download
                  </button>
                  {canRemove ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="text-xs text-accent"
                      onClick={() => setPendingRemove(file)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </aside>
      {pendingFile ? (
        <ImportDraftDialog
          filename={pendingFile.name}
          busy={pending}
          onInsert={() => void importIntoDraft("append")}
          onReplace={() => void importIntoDraft("replace")}
          onClose={() => {
            if (!pending) setPendingFile(null);
          }}
        />
      ) : null}
      {pendingRemove ? (
        <ConfirmDialog
          title="Remove attachment?"
          message={`“${pendingRemove.filename}” will be deleted from this document.`}
          confirmLabel="Remove"
          danger
          busy={pending}
          onConfirm={() => void remove()}
          onClose={() => {
            if (!pending) setPendingRemove(null);
          }}
        />
      ) : null}
    </>
  );
}
