export const VERSION_LIMIT = 20;
export const VERSION_COLLAPSE_MS = 90_000;

export function fingerprint(title, content) {
  return JSON.stringify({ title, content });
}

export function previewFromContent(content, max = 110) {
  const parts = [];
  function walk(node) {
    if (!node || parts.join("").length >= max) return;
    if (node.text) parts.push(node.text);
    (node.content || []).forEach(walk);
  }
  walk(content);
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  if (!text) return "Empty page";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function cloneContent(content) {
  return JSON.parse(JSON.stringify(content));
}

export function recordVersion(doc, { userId, title, content, now = new Date(), label = "Edit", force = false }) {
  if (!Array.isArray(doc.versions)) doc.versions = [];
  const versions = doc.versions;
  const mark = fingerprint(title, content);
  const last = versions[versions.length - 1];
  if (!force && last && fingerprint(last.title, last.content) === mark) return false;

  const lastTime = last?.createdAt ? new Date(last.createdAt).getTime() : 0;
  const sameAuthor = last && String(last.savedBy) === String(userId);
  const recent = Boolean(last) && now.getTime() - lastTime < VERSION_COLLAPSE_MS;
  const snapshot = cloneContent(content);
  if (!force && last && sameAuthor && recent && last.label !== "Restored") {
    last.title = title;
    last.content = snapshot;
    last.createdAt = now;
    last.label = label;
    return true;
  }

  versions.push({
    title,
    content: snapshot,
    savedBy: userId,
    label,
    createdAt: now,
  });
  while (versions.length > VERSION_LIMIT) {
    versions.shift();
  }
  return true;
}
