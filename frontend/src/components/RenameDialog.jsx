import { useEffect, useRef } from "react";

export default function RenameDialog({ value, onChange, onConfirm, onClose }) {
  const input = useRef(null);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-title"
        className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-2xl"
      >
        <h2 id="rename-title" className="font-serif text-2xl">
          Rename document
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">Type the new name, then save.</p>
        <input
          ref={input}
          aria-label="Document title"
          className="mt-5 w-full rounded-xl border border-line bg-paper px-3 py-2.5 font-serif text-lg outline-none focus:border-accent"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onConfirm();
            }
          }}
        />
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-4 py-2 text-sm hover:bg-wash hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-hover hover:text-paper"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
