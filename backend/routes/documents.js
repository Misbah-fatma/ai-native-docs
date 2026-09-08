import { Router } from "express";
import multer from "multer";
import { Document, emptyDoc } from "../models/Document.js";
import { User } from "../models/User.js";
import {
  canAttachFile,
  canComment,
  canDeleteAttachment,
  canDeleteComment,
  canDeleteDocument,
  canEdit,
  canManageSharing,
  canRename,
  canResolveComment,
  canRestoreVersion,
  canReviewSuggestion,
  canSuggest,
  getAccessRole,
  normalizeShareRole,
} from "../lib/access.js";
import {
  appendTiptapContent,
  fileToDocument,
  isAllowedAttachment,
  isAllowedFilename,
  MAX_ATTACHMENTS,
  MAX_UPLOAD_BYTES,
  safeFilename,
} from "../lib/importFile.js";
import {
  openCommentCount,
  openSuggestionCount,
  publicUser,
  serializeAttachment,
  serializeComment,
  serializeSuggestion,
  serializeVersion,
  shareEntries,
} from "../lib/serialize.js";
import { previewFromContent, recordVersion } from "../lib/versions.js";
import { heartbeat } from "../lib/presence.js";
import { applySuggestionContent } from "../lib/suggestions.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

function receiveFile(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    return res.status(400).json({
      error: tooBig ? "That file is larger than 2 MB." : "Could not upload that file.",
    });
  });
}

export const documentsRouter = Router();

const populate = [
  { path: "owner", select: "name email" },
  { path: "shares.user", select: "name email" },
  { path: "attachments.uploadedBy", select: "name email" },
];

function serialize(doc, userId) {
  const { ownerId, shares } = shareEntries(doc);
  const role = getAccessRole(userId, { ownerId, shares });
  return {
    id: doc._id.toString(),
    title: doc.title,
    content: doc.content,
    role,
    owner: publicUser(doc.owner),
    collaborators: shares.map((entry) => ({
      ...entry.user,
      access: entry.role,
    })),
    openCommentCount: openCommentCount(doc),
    openSuggestionCount: openSuggestionCount(doc),
    attachments: (doc.attachments || []).map(serializeAttachment),
    versionCount: Array.isArray(doc.versions) ? doc.versions.length : undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function shareUserId(entry) {
  return entry.user?._id ? entry.user._id.toString() : String(entry.user);
}

async function loadForUser(id, userId, { versions = false } = {}) {
  if (!id.match(/^[a-f0-9]{24}$/i)) return { doc: null, role: "none" };
  let query = Document.findById(id).populate(populate);
  if (!versions) query = query.select("-versions");
  const doc = await query;
  if (!doc) return { doc: null, role: "none" };
  const role = getAccessRole(userId, shareEntries(doc));
  if (role === "none") return { doc: null, role: "none" };
  return { doc, role };
}

function commentById(doc, commentId) {
  return (doc.comments || []).id(commentId);
}

function versionById(doc, versionId) {
  return (doc.versions || []).id(versionId);
}

function attachmentById(doc, attachmentId) {
  return (doc.attachments || []).id(attachmentId);
}

documentsRouter.get("/", async (req, res) => {
  const userId = req.user._id;
  const [owned, shared] = await Promise.all([
    Document.find({ owner: userId }).select("-versions").populate(populate).sort({ updatedAt: -1 }),
    Document.find({ "shares.user": userId }).select("-versions").populate(populate).sort({ updatedAt: -1 }),
  ]);
  return res.json({
    user: publicUser(req.user),
    owned: owned.map((doc) => serialize(doc, userId.toString())),
    shared: shared.map((doc) => serialize(doc, userId.toString())),
  });
});

documentsRouter.post("/", async (req, res) => {
  const title = String(req.body?.title || "Untitled").trim() || "Untitled";
  const doc = await Document.create({
    title: title.slice(0, 120),
    content: emptyDoc,
    owner: req.user._id,
    versions: [
      {
        title: title.slice(0, 120),
        content: emptyDoc,
        savedBy: req.user._id,
        label: "Created",
      },
    ],
  });
  await doc.populate(populate);
  return res.status(201).json({ document: serialize(doc, req.user._id.toString()) });
});

documentsRouter.post("/import", receiveFile, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Choose a .txt, .md, or .docx file to import." });
  }
  if (!isAllowedFilename(req.file.originalname)) {
    return res.status(400).json({
      error: "Unsupported file type. Ink imports .txt, .md, and .docx files.",
    });
  }
  try {
    const imported = await fileToDocument(req.file.originalname, req.file.buffer);
    const doc = await Document.create({
      title: imported.title,
      content: imported.content,
      owner: req.user._id,
      versions: [
        {
          title: imported.title,
          content: imported.content,
          savedBy: req.user._id,
          label: "Imported",
        },
      ],
    });
    await doc.populate(populate);
    return res.status(201).json({ document: serialize(doc, req.user._id.toString()) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Could not import that file." });
  }
});

documentsRouter.get("/:id", async (req, res) => {
  const { doc } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  return res.json({ document: serialize(doc, req.user._id.toString()) });
});

documentsRouter.patch("/:id", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString(), { versions: true });
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }

  const hasTitle = typeof req.body?.title === "string";
  const hasContent = req.body?.content !== undefined;
  if (!hasTitle && !hasContent) {
    return res.status(400).json({ error: "Provide a title or content to update." });
  }
  if (hasTitle && !canRename(role)) {
    return res.status(403).json({ error: "You cannot rename this document." });
  }
  if (hasContent && !canEdit(role)) {
    return res.status(403).json({ error: "View-only access. Ask the owner for edit permission." });
  }

  const nextTitle = hasTitle ? req.body.title.trim() : doc.title;
  if (hasTitle && !nextTitle) return res.status(400).json({ error: "Title cannot be empty." });
  const nextContent = hasContent ? req.body.content : doc.content;
  const changed =
    (hasTitle && nextTitle.slice(0, 120) !== doc.title) ||
    (hasContent && JSON.stringify(nextContent) !== JSON.stringify(doc.content));

  if (hasTitle) doc.title = nextTitle.slice(0, 120);
  if (hasContent) doc.content = nextContent;
  if (changed) {
    recordVersion(doc, {
      userId: req.user._id,
      title: doc.title,
      content: doc.content,
    });
  }
  await doc.save();
  await doc.populate(populate);
  return res.json({ document: serialize(doc, req.user._id.toString()) });
});

documentsRouter.delete("/:id", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canDeleteDocument(role)) {
    return res.status(403).json({ error: "Only the owner can delete this document." });
  }
  await doc.deleteOne();
  return res.json({ ok: true });
});

documentsRouter.post("/:id/share", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canManageSharing(role)) {
    return res.status(403).json({ error: "Only the owner can share this document." });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  const access = normalizeShareRole(req.body?.role);
  if (!email.includes("@")) {
    return res.status(400).json({ error: "Enter a valid email." });
  }
  const target = await User.findOne({ email });
  if (!target) {
    return res.status(404).json({
      error: "No account exists for that email. Use a seeded reviewer account.",
    });
  }
  if (target._id.equals(doc.owner._id)) {
    return res.status(400).json({ error: "The owner already has access." });
  }
  const existing = doc.shares.find((entry) => shareUserId(entry) === target._id.toString());
  if (existing) {
    existing.role = access;
  } else {
    doc.shares.push({ user: target._id, role: access });
  }
  await doc.save();
  await doc.populate(populate);
  return res.json({ document: serialize(doc, req.user._id.toString()) });
});

documentsRouter.patch("/:id/share", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canManageSharing(role)) {
    return res.status(403).json({ error: "Only the owner can change sharing." });
  }
  const userId = String(req.body?.userId || "");
  const access = normalizeShareRole(req.body?.role);
  if (!userId) {
    return res.status(400).json({ error: "Provide the teammate to update." });
  }
  const existing = doc.shares.find((entry) => shareUserId(entry) === userId);
  if (!existing) {
    return res.status(404).json({ error: "That teammate does not have access." });
  }
  existing.role = access;
  await doc.save();
  await doc.populate(populate);
  return res.json({ document: serialize(doc, req.user._id.toString()) });
});

documentsRouter.delete("/:id/share", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canManageSharing(role)) {
    return res.status(403).json({ error: "Only the owner can change sharing." });
  }
  const userId = String(req.body?.userId || "");
  if (!userId) {
    return res.status(400).json({ error: "Provide the teammate to remove." });
  }
  doc.shares = doc.shares.filter((entry) => shareUserId(entry) !== userId);
  await doc.save();
  await doc.populate(populate);
  return res.json({ document: serialize(doc, req.user._id.toString()) });
});

documentsRouter.get("/:id/comments", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  await doc.populate({ path: "comments.author", select: "name email" });
  return res.json({ comments: (doc.comments || []).map(serializeComment), role });
});

documentsRouter.post("/:id/comments", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canComment(role)) {
    return res.status(403).json({ error: "You cannot comment on this document." });
  }
  const body = String(req.body?.body || "").trim();
  const quote = String(req.body?.quote || "").trim().slice(0, 280);
  if (!body) {
    return res.status(400).json({ error: "Write a comment before posting." });
  }
  doc.comments.push({
    author: req.user._id,
    body: body.slice(0, 2000),
    quote,
  });
  await doc.save();
  await doc.populate({ path: "comments.author", select: "name email" });
  return res.status(201).json({ comments: doc.comments.map(serializeComment) });
});

documentsRouter.patch("/:id/comments/:commentId", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canResolveComment(role)) {
    return res.status(403).json({ error: "Only editors can resolve comments." });
  }
  const comment = commentById(doc, req.params.commentId);
  if (!comment) {
    return res.status(404).json({ error: "Comment not found." });
  }
  comment.resolved = Boolean(req.body?.resolved);
  await doc.save();
  await doc.populate({ path: "comments.author", select: "name email" });
  return res.json({ comments: doc.comments.map(serializeComment) });
});

documentsRouter.delete("/:id/comments/:commentId", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  const comment = commentById(doc, req.params.commentId);
  if (!comment) {
    return res.status(404).json({ error: "Comment not found." });
  }
  const authorId = comment.author?._id ? comment.author._id.toString() : String(comment.author);
  if (!canDeleteComment(role, authorId, req.user._id.toString())) {
    return res.status(403).json({ error: "You can only remove your own comments." });
  }
  comment.deleteOne();
  await doc.save();
  await doc.populate({ path: "comments.author", select: "name email" });
  return res.json({ comments: doc.comments.map(serializeComment) });
});

documentsRouter.post("/:id/presence", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (role === "none") {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  const viewers = heartbeat(req.params.id, publicUser(req.user));
  return res.json({ viewers, role });
});

documentsRouter.get("/:id/suggestions", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  await doc.populate({ path: "suggestions.author", select: "name email" });
  return res.json({ suggestions: (doc.suggestions || []).map(serializeSuggestion), role });
});

documentsRouter.post("/:id/suggestions", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canSuggest(role)) {
    return res.status(403).json({ error: "You cannot suggest edits on this document." });
  }
  const proposed = String(req.body?.proposed || "").trim();
  const quote = String(req.body?.quote || "").trim().slice(0, 280);
  const note = String(req.body?.note || "").trim().slice(0, 2000);
  if (!proposed) {
    return res.status(400).json({ error: "Write the suggested replacement before sending." });
  }
  doc.suggestions.push({
    author: req.user._id,
    quote,
    proposed: proposed.slice(0, 4000),
    note,
  });
  await doc.save();
  await doc.populate({ path: "suggestions.author", select: "name email" });
  return res.status(201).json({ suggestions: doc.suggestions.map(serializeSuggestion) });
});

documentsRouter.patch("/:id/suggestions/:suggestionId", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString(), { versions: true });
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  const suggestion = (doc.suggestions || []).id(req.params.suggestionId);
  if (!suggestion) {
    return res.status(404).json({ error: "Suggestion not found." });
  }
  const status = req.body?.status;
  if (status !== "accepted" && status !== "rejected") {
    return res.status(400).json({ error: "Mark the suggestion as accepted or rejected." });
  }
  if (!canReviewSuggestion(role)) {
    return res.status(403).json({ error: "Only owners and editors can accept or reject suggestions." });
  }
  if (suggestion.status !== "pending") {
    return res.status(400).json({ error: "That suggestion was already reviewed." });
  }
  if (status === "accepted") {
    doc.content = applySuggestionContent(doc.content, suggestion.quote, suggestion.proposed);
    recordVersion(doc, {
      userId: req.user._id,
      title: doc.title,
      content: doc.content,
      label: "Accepted suggestion",
      force: true,
    });
  }
  suggestion.status = status;
  await doc.save();
  await doc.populate(populate);
  await doc.populate({ path: "suggestions.author", select: "name email" });
  return res.json({
    suggestions: doc.suggestions.map(serializeSuggestion),
    document: serialize(doc, req.user._id.toString()),
  });
});

documentsRouter.delete("/:id/suggestions/:suggestionId", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  const suggestion = (doc.suggestions || []).id(req.params.suggestionId);
  if (!suggestion) {
    return res.status(404).json({ error: "Suggestion not found." });
  }
  const authorId = suggestion.author?._id ? suggestion.author._id.toString() : String(suggestion.author);
  if (!canDeleteComment(role, authorId, req.user._id.toString())) {
    return res.status(403).json({ error: "You can only remove your own suggestions." });
  }
  suggestion.deleteOne();
  await doc.save();
  await doc.populate({ path: "suggestions.author", select: "name email" });
  return res.json({ suggestions: doc.suggestions.map(serializeSuggestion) });
});

documentsRouter.get("/:id/versions", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString(), { versions: true });
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  await doc.populate({ path: "versions.savedBy", select: "name email" });
  const versions = [...(doc.versions || [])].reverse().map((version) => ({
    ...serializeVersion(version),
    preview: previewFromContent(version.content),
  }));
  return res.json({ versions, role });
});

documentsRouter.post("/:id/versions", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString(), { versions: true });
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canRestoreVersion(role)) {
    return res.status(403).json({ error: "View-only access cannot save checkpoints." });
  }
  recordVersion(doc, {
    userId: req.user._id,
    title: doc.title,
    content: doc.content,
    label: String(req.body?.label || "Checkpoint").slice(0, 40),
    force: true,
  });
  await doc.save();
  await doc.populate({ path: "versions.savedBy", select: "name email" });
  const versions = [...doc.versions].reverse().map((version) => ({
    ...serializeVersion(version),
    preview: previewFromContent(version.content),
  }));
  return res.status(201).json({ versions });
});

documentsRouter.post("/:id/versions/:versionId/restore", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString(), { versions: true });
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canRestoreVersion(role)) {
    return res.status(403).json({ error: "View-only access cannot restore a version." });
  }
  const version = versionById(doc, req.params.versionId);
  if (!version) {
    return res.status(404).json({ error: "Version not found." });
  }
  recordVersion(doc, {
    userId: req.user._id,
    title: doc.title,
    content: doc.content,
    label: "Before restore",
    force: true,
  });
  doc.title = version.title;
  doc.content = JSON.parse(JSON.stringify(version.content));
  recordVersion(doc, {
    userId: req.user._id,
    title: doc.title,
    content: doc.content,
    label: "Restored",
    force: true,
  });
  await doc.save();
  await doc.populate(populate);
  return res.json({ document: serialize(doc, req.user._id.toString()) });
});

documentsRouter.post("/:id/import-content", receiveFile, async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString(), { versions: true });
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canEdit(role)) {
    return res.status(403).json({ error: "View-only access cannot import into this draft." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Choose a .txt, .md, or .docx file to import." });
  }
  if (!isAllowedFilename(req.file.originalname)) {
    return res.status(400).json({
      error: "Ink can insert .txt, .md, and .docx files into a draft.",
    });
  }
  const mode = req.body?.mode === "replace" ? "replace" : "append";
  try {
    const imported = await fileToDocument(req.file.originalname, req.file.buffer);
    doc.content =
      mode === "replace" ? imported.content : appendTiptapContent(doc.content, imported.content);
    recordVersion(doc, {
      userId: req.user._id,
      title: doc.title,
      content: doc.content,
      label: mode === "replace" ? "Replaced from file" : "Inserted from file",
      force: true,
    });
    await doc.save();
    await doc.populate(populate);
    return res.json({ document: serialize(doc, req.user._id.toString()) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Could not import that file." });
  }
});

documentsRouter.post("/:id/attachments", receiveFile, async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  if (!canAttachFile(role)) {
    return res.status(403).json({ error: "View-only access cannot add attachments." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Choose a file to attach." });
  }
  if (!isAllowedAttachment(req.file.originalname)) {
    return res.status(400).json({
      error: "Attach a .txt, .md, .docx, .pdf, image, or .csv file.",
    });
  }
  if ((doc.attachments || []).length >= MAX_ATTACHMENTS) {
    return res.status(400).json({ error: `A document can have at most ${MAX_ATTACHMENTS} attachments.` });
  }
  doc.attachments.push({
    filename: safeFilename(req.file.originalname),
    mimeType: req.file.mimetype || "application/octet-stream",
    size: req.file.size,
    data: req.file.buffer,
    uploadedBy: req.user._id,
  });
  await doc.save();
  await doc.populate(populate);
  return res.status(201).json({ document: serialize(doc, req.user._id.toString()) });
});

documentsRouter.get("/:id/attachments/:attachmentId/file", async (req, res) => {
  if (!req.params.id.match(/^[a-f0-9]{24}$/i)) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  const doc = await Document.findById(req.params.id)
    .select("+attachments.data")
    .populate(populate);
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  const role = getAccessRole(req.user._id.toString(), shareEntries(doc));
  if (role === "none") {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  const file = attachmentById(doc, req.params.attachmentId);
  if (!file || !file.data) {
    return res.status(404).json({ error: "Attachment not found." });
  }
  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${safeFilename(file.filename)}"`);
  return res.send(file.data);
});

documentsRouter.delete("/:id/attachments/:attachmentId", async (req, res) => {
  const { doc, role } = await loadForUser(req.params.id, req.user._id.toString());
  if (!doc) {
    return res.status(404).json({ error: "Document not found or you do not have access." });
  }
  const file = attachmentById(doc, req.params.attachmentId);
  if (!file) {
    return res.status(404).json({ error: "Attachment not found." });
  }
  const uploaderId = file.uploadedBy?._id ? file.uploadedBy._id.toString() : String(file.uploadedBy);
  if (!canDeleteAttachment(role, uploaderId, req.user._id.toString())) {
    return res.status(403).json({ error: "You can only remove attachments you uploaded." });
  }
  file.deleteOne();
  await doc.save();
  await doc.populate(populate);
  return res.json({ document: serialize(doc, req.user._id.toString()) });
});
