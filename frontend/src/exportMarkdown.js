function marksOf(node) {
  return new Set((node.marks || []).map((mark) => mark.type));
}

function inlineToMarkdown(nodes = []) {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";
      if (node.type !== "text") return inlineToMarkdown(node.content);
      let text = node.text || "";
      const marks = marksOf(node);
      if (marks.has("bold")) text = `**${text}**`;
      if (marks.has("italic")) text = `*${text}*`;
      if (marks.has("underline")) text = `<u>${text}</u>`;
      return text;
    })
    .join("");
}

function blockToMarkdown(node, orderedIndex) {
  if (!node) return "";
  if (node.type === "heading") {
    const level = Math.min(Math.max(node.attrs?.level || 1, 1), 3);
    return `${"#".repeat(level)} ${inlineToMarkdown(node.content)}`;
  }
  if (node.type === "paragraph") {
    return inlineToMarkdown(node.content);
  }
  if (node.type === "bulletList") {
    return (node.content || [])
      .map((item) => `- ${listItemText(item)}`)
      .join("\n");
  }
  if (node.type === "orderedList") {
    return (node.content || [])
      .map((item, index) => `${(orderedIndex || 0) + index + 1}. ${listItemText(item)}`)
      .join("\n");
  }
  if (node.content) {
    return node.content.map((child) => blockToMarkdown(child)).filter(Boolean).join("\n\n");
  }
  return "";
}

function listItemText(item) {
  const first = item.content?.[0];
  if (first?.type === "paragraph") return inlineToMarkdown(first.content);
  return inlineToMarkdown(item.content);
}

export function tiptapToMarkdown(doc) {
  const blocks = doc?.content || [];
  return `${blocks.map((block) => blockToMarkdown(block)).filter(Boolean).join("\n\n")}\n`;
}

export function fileSlug(title) {
  return (title || "document").replace(/[^\w\-]+/g, "-").replace(/^-|-$/g, "") || "document";
}

export function downloadMarkdown(title, content) {
  const markdown = tiptapToMarkdown(content);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${fileSlug(title)}.md`;
  link.click();
  URL.revokeObjectURL(href);
}
