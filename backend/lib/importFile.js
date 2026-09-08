import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { generateJSON } from "@tiptap/html";
import mammoth from "mammoth";
import { marked } from "marked";

const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    underline: false,
  }),
  Underline,
];

export const ALLOWED_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"];
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const MAX_ATTACHMENTS = 8;
export const ATTACHMENT_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".docx",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".csv",
];

export function isAllowedFilename(name) {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function titleFromFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!base) return "Imported document";
  return base.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function textToHtml(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "<p></p>";
  return normalized
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function markdownToHtml(markdown) {
  const html = await marked.parse(markdown, { async: true, gfm: true });
  return html.trim() || "<p></p>";
}

export function htmlToTiptapJSON(html) {
  return generateJSON(html || "<p></p>", editorExtensions);
}

export function isAllowedAttachment(name) {
  const lower = String(name || "").toLowerCase();
  return ATTACHMENT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function safeFilename(name) {
  const base = String(name || "file")
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/[^\w.\- ()]+/g, "-")
    .slice(0, 120);
  return base || "file";
}

export function appendTiptapContent(current, incoming) {
  const existing = Array.isArray(current?.content) ? current.content : [];
  const added = Array.isArray(incoming?.content) ? incoming.content : [];
  const usable = existing.filter((block) => {
    if (block?.type !== "paragraph") return true;
    return Boolean(block.content?.length);
  });
  return { type: "doc", content: [...usable, ...added] };
}

export async function fileToDocument(filename, bytes) {
  if (!isAllowedFilename(filename)) {
    throw new Error("Unsupported file type. Upload a .txt, .md, or .docx file.");
  }

  const lower = filename.toLowerCase();
  let html = "";

  if (lower.endsWith(".docx")) {
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
    html = result.value || "<p></p>";
  } else {
    const text = Buffer.from(bytes).toString("utf8");
    if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
      html = await markdownToHtml(text);
    } else {
      html = textToHtml(text);
    }
  }

  return {
    title: titleFromFilename(filename),
    content: htmlToTiptapJSON(html),
  };
}
