export function getAccessRole(userId, document) {
  if (document.ownerId === userId) return "owner";
  const share = document.shares?.find((entry) => entry.userId === userId);
  if (share?.role === "viewer") return "viewer";
  if (share?.role === "editor") return "editor";
  return "none";
}

export function canRead(role) {
  return role !== "none";
}

export function canEdit(role) {
  return role === "owner" || role === "editor";
}

export function canManageSharing(role) {
  return role === "owner";
}

export function canDeleteDocument(role) {
  return role === "owner";
}

export function canRename(role) {
  return role === "owner" || role === "editor";
}

export function normalizeShareRole(role) {
  return role === "viewer" ? "viewer" : "editor";
}

export function canComment(role) {
  return role !== "none";
}

export function canSuggest(role) {
  return role !== "none";
}

export function canReviewSuggestion(role) {
  return role === "owner" || role === "editor";
}

export function canResolveComment(role) {
  return role === "owner" || role === "editor";
}

export function canDeleteComment(role, authorId, userId) {
  return role === "owner" || String(authorId) === String(userId);
}

export function canRestoreVersion(role) {
  return role === "owner" || role === "editor";
}

export function canAttachFile(role) {
  return role === "owner" || role === "editor";
}

export function canDeleteAttachment(role, uploaderId, userId) {
  return role === "owner" || String(uploaderId) === String(userId);
}
