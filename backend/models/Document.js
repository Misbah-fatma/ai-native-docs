import mongoose from "mongoose";

const emptyDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const shareSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["editor", "viewer"], default: "editor" },
  },
  { _id: false },
);

const suggestionSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quote: { type: String, default: "" },
    proposed: { type: String, required: true },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    quote: { type: String, default: "" },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const versionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Untitled" },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, default: "Edit" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, required: true },
    data: { type: Buffer, select: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Untitled" },
    content: { type: mongoose.Schema.Types.Mixed, default: emptyDoc },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    shares: { type: [shareSchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    suggestions: { type: [suggestionSchema], default: [] },
    versions: { type: [versionSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true },
);

export const Document = mongoose.model("Document", documentSchema);
export { emptyDoc };
