export default function ImportDraftDialog({ filename, busy, onInsert, onReplace, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-draft-title"
        className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-2xl"
      >
        <h2 id="import-draft-title" className="font-serif text-2xl">
          Import into this draft
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          “{filename}” can be added below the current text, or it can replace the whole page.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full border border-line px-4 py-2 text-sm hover:bg-wash hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReplace}
            className="rounded-full border border-line px-4 py-2 text-sm hover:bg-wash hover:text-ink disabled:opacity-50"
          >
            Replace page
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onInsert}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-hover hover:text-paper disabled:opacity-50"
          >
            {busy ? "Importing…" : "Insert below"}
          </button>
        </div>
      </div>
    </div>
  );
}
