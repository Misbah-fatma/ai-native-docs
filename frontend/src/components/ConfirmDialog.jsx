import { useEffect } from "react";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className="font-serif text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full border border-line px-4 py-2 text-sm hover:bg-wash hover:text-ink disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={
              danger
                ? "rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-ink-hover hover:text-paper disabled:opacity-50"
                : "rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-hover hover:text-paper disabled:opacity-50"
            }
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
