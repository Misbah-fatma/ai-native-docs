import { useEffect, useRef, useState } from "react";
import { downloadMarkdown } from "../exportMarkdown.js";
import { downloadPdf } from "../exportPdf.js";

export default function ExportMenu({ title, content }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    function onPointer(event) {
      if (root.current && !root.current.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function exportAs(kind) {
    if (kind === "pdf") downloadPdf(title, content);
    else downloadMarkdown(title, content);
    setOpen(false);
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-line px-4 py-2 text-sm hover:bg-paper-deep"
      >
        Export
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => exportAs("md")}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-paper-deep"
          >
            Markdown (.md)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => exportAs("pdf")}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-paper-deep"
          >
            PDF (.pdf)
          </button>
        </div>
      ) : null}
    </div>
  );
}
