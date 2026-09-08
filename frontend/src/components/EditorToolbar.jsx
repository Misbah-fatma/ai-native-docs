import { useEditorState } from "@tiptap/react";

const HEADINGS = [
  { label: "Paragraph", value: "paragraph" },
  { label: "Heading 1", value: "1" },
  { label: "Heading 2", value: "2" },
  { label: "Heading 3", value: "3" },
];

function toggleInline(editor, mark) {
  const { selection } = editor.state;
  const chain = editor.chain().focus();
  if (selection.empty) {
    const { $from } = selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name === "heading" || node.type.name === "paragraph") {
        chain.setTextSelection({ from: $from.start(depth), to: $from.end(depth) });
        break;
      }
    }
  }
  chain.toggleMark(mark).run();
}

export default function EditorToolbar({ editor, disabled = false }) {
  const format = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) {
        return {
          heading: "paragraph",
          bold: false,
          italic: false,
          underline: false,
          bullet: false,
          ordered: false,
        };
      }
      return {
        heading: current.isActive("heading", { level: 1 })
          ? "1"
          : current.isActive("heading", { level: 2 })
            ? "2"
            : current.isActive("heading", { level: 3 })
              ? "3"
              : "paragraph",
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        bullet: current.isActive("bulletList"),
        ordered: current.isActive("orderedList"),
      };
    },
  });

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-card px-2 py-2">
      <select
        aria-label="Text style"
        disabled={disabled}
        className="mr-1 rounded-lg bg-transparent px-2 py-1.5 text-sm outline-none disabled:opacity-40"
        value={format.heading}
        onChange={(event) => {
          const value = event.target.value;
          const chain = editor.chain().focus();
          if (value === "paragraph") chain.setParagraph().run();
          else chain.setHeading({ level: Number(value) }).run();
        }}
      >
        {HEADINGS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ToolButton
        label="Bold"
        pressed={format.bold}
        disabled={disabled}
        onClick={() => toggleInline(editor, "bold")}
      >
        B
      </ToolButton>
      <ToolButton
        label="Italic"
        pressed={format.italic}
        disabled={disabled}
        onClick={() => toggleInline(editor, "italic")}
      >
        <span className="italic">I</span>
      </ToolButton>
      <ToolButton
        label="Underline"
        pressed={format.underline}
        disabled={disabled}
        onClick={() => toggleInline(editor, "underline")}
      >
        <span className="underline">U</span>
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line" />
      <ToolButton
        label="Bulleted list"
        pressed={format.bullet}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </ToolButton>
      <ToolButton
        label="Numbered list"
        pressed={format.ordered}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line" />
      <ToolButton
        label="Undo"
        pressed={false}
        disabled={disabled}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↶
      </ToolButton>
      <ToolButton
        label="Redo"
        pressed={false}
        disabled={disabled}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↷
      </ToolButton>
    </div>
  );
}

function ToolButton({ label, pressed, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="toolbar-btn min-w-8 rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-paper-deep disabled:opacity-40"
    >
      {children}
    </button>
  );
}
