import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    underline: false,
  }),
  Underline,
  Placeholder.configure({
    placeholder: "Start writing…",
  }),
];
