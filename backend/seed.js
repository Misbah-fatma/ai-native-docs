import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { User } from "./models/User.js";
import { Document } from "./models/Document.js";

const sampleNotes = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Q3 working notes" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This is the shared scratchpad for the Ink prototype. Keep it " },
        { type: "text", marks: [{ type: "bold" }], text: "short" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "italic" }], text: "honest" },
        { type: "text", text: ", and " },
        { type: "text", marks: [{ type: "underline" }], text: "easy to reopen" },
        { type: "text", text: "." },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "What has to work" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Create, rename, edit, and reopen a document" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Import a .txt, .md, or .docx file as a new draft" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Share with another seeded teammate" }],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Reviewer path" }],
    },
    {
      type: "orderedList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Sign in as Alex, edit this note, then share it with Sam." }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Sign in as Sam and confirm it appears under Shared with you." },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export async function seed() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const legacy = await Document.collection.find({ collaborators: { $exists: true } }).toArray();
  for (const row of legacy) {
    if (!row.shares?.length && row.collaborators?.length) {
      await Document.collection.updateOne(
        { _id: row._id },
        {
          $set: {
            shares: row.collaborators.map((id) => ({ user: id, role: "editor" })),
          },
          $unset: { collaborators: "" },
        },
      );
    } else {
      await Document.collection.updateOne({ _id: row._id }, { $unset: { collaborators: "" } });
    }
  }

  const alex = await User.findOneAndUpdate(
    { email: "alex@ajaia.dev" },
    { name: "Alex Rivera", passwordHash },
    { upsert: true, returnDocument: "after" },
  );
  const jordan = await User.findOneAndUpdate(
    { email: "jordan@ajaia.dev" },
    { name: "Jordan Chen", passwordHash },
    { upsert: true, returnDocument: "after" },
  );
  await User.findOneAndUpdate(
    { email: "sam@ajaia.dev" },
    { name: "Sam Okonkwo", passwordHash },
    { upsert: true, returnDocument: "after" },
  );

  const jordanComment = {
    author: jordan._id,
    body: "Keep this list to three bullets so the walkthrough stays short.",
    quote: "Create, rename, edit, and reopen a document",
    resolved: false,
  };
  const jordanSuggestion = {
    author: jordan._id,
    quote: "easy to reopen",
    proposed: "easy to find later",
    note: "A bit more concrete for people opening this cold.",
    status: "pending",
  };
  const createdVersion = (ownerId, title, content) => ({
    title,
    content,
    savedBy: ownerId,
    label: "Created",
  });

  const shared = await Document.findOne({ owner: alex._id, title: "Q3 working notes" });
  if (!shared) {
    await Document.create({
      title: "Q3 working notes",
      content: sampleNotes,
      owner: alex._id,
      shares: [{ user: jordan._id, role: "editor" }],
      comments: [jordanComment],
      suggestions: [jordanSuggestion],
      versions: [createdVersion(alex._id, "Q3 working notes", sampleNotes)],
    });
  } else {
    if (!shared.shares?.length && shared.collaborators?.length) {
      shared.shares = shared.collaborators.map((id) => ({ user: id, role: "editor" }));
      shared.collaborators = undefined;
    }
    if (!shared.comments?.length) shared.comments.push(jordanComment);
    if (!shared.suggestions?.length) shared.suggestions.push(jordanSuggestion);
    if (!shared.versions?.length) {
      shared.versions.push(createdVersion(alex._id, shared.title, shared.content));
    }
    await shared.save();
  }

  const privateDoc = await Document.findOne({ owner: alex._id, title: "Private hiring notes" });
  if (!privateDoc) {
    await Document.create({
      title: "Private hiring notes",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Only Alex can see this unless it is shared. Use it to confirm owned vs shared lists.",
              },
            ],
          },
        ],
      },
      owner: alex._id,
    });
  }

  const jordanDoc = await Document.findOne({ owner: jordan._id, title: "Design critique" });
  if (!jordanDoc) {
    await Document.create({
      title: "Design critique",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Keep the page quiet" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "The editor should feel like paper, not a dashboard. One accent color is enough.",
              },
            ],
          },
        ],
      },
      owner: jordan._id,
    });
  }
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ path: new URL("./.env", import.meta.url) });
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ink");
  await seed();
  await mongoose.disconnect();
  console.log("Seed complete.");
}
