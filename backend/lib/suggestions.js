function replaceInNode(node, needle, insert) {
  if (node.type === "text" && typeof node.text === "string") {
    const index = node.text.indexOf(needle);
    if (index >= 0) {
      node.text = node.text.slice(0, index) + insert + node.text.slice(index + needle.length);
      return true;
    }
  }
  for (const child of node.content || []) {
    if (replaceInNode(child, needle, insert)) return true;
  }
  return false;
}

export function applySuggestionContent(content, quote, proposed) {
  const next = JSON.parse(JSON.stringify(content || { type: "doc", content: [] }));
  const needle = String(quote || "").trim();
  const insert = String(proposed || "").trim();
  if (!insert) return next;
  if (needle && replaceInNode(next, needle, insert)) return next;
  next.content = Array.isArray(next.content) ? next.content : [];
  next.content.push({
    type: "paragraph",
    content: [{ type: "text", text: insert }],
  });
  return next;
}
