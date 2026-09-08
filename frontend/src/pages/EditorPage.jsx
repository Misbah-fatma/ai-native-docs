import { Link, useParams } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { editorExtensions } from "../editorExtensions";
import AppHeader from "../components/AppHeader.jsx";
import CommentsPanel from "../components/CommentsPanel.jsx";
import EditorToolbar from "../components/EditorToolbar.jsx";
import ExportMenu from "../components/ExportMenu.jsx";
import FilesPanel from "../components/FilesPanel.jsx";
import HistoryPanel from "../components/HistoryPanel.jsx";
import RenameDialog from "../components/RenameDialog.jsx";
import ShareDialog from "../components/ShareDialog.jsx";
import PresenceBar from "../components/PresenceBar.jsx";
import SuggestionsPanel from "../components/SuggestionsPanel.jsx";

export default function EditorPage({ user }) {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api(`/api/documents/${id}`)
      .then((data) => setDoc(data.document))
      .catch((err) => {
        setMissing(true);
        setLoadError(err.message);
      });
  }, [id]);

  if (missing) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
        <h1 className="font-serif text-4xl">No access</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          {loadError || "This document does not exist, or it has not been shared with you."}
        </p>
        <Link to="/dashboard" className="mt-6 text-sm font-medium text-accent">
          Back to documents
        </Link>
      </main>
    );
  }

  if (!doc) {
    return <p className="p-8 text-sm text-ink-soft">Opening document…</p>;
  }

  return <DocumentEditor key={doc.id} user={user} initialDocument={doc} />;
}

function DocumentEditor({ user, initialDocument }) {
  const [document, setDocument] = useState(initialDocument);
  const [title, setTitle] = useState(initialDocument.title);
  const [saveState, setSaveState] = useState("saved");
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [panel, setPanel] = useState(null);
  const [quote, setQuote] = useState("");
  const [openComments, setOpenComments] = useState(initialDocument.openCommentCount || 0);
  const [openSuggestions, setOpenSuggestions] = useState(initialDocument.openSuggestionCount || 0);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(initialDocument.title);
  const saveTimer = useRef(null);
  const contentRef = useRef(initialDocument.content);

  const editable = document.role === "owner" || document.role === "editor";
  const extensions = useMemo(() => editorExtensions, []);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions,
    editable,
    content: initialDocument.content,
    editorProps: {
      attributes: { class: "tiptap" },
    },
    onUpdate: ({ editor: next }) => {
      if (!editable) return;
      contentRef.current = next.getJSON();
      queueContentSave();
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  function queueContentSave() {
    setSaveState("unsaved");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persist({ content: contentRef.current });
    }, 700);
  }

  function startRename() {
    if (!editable) return;
    setDraftTitle(title);
    setRenaming(true);
  }

  function commitRename() {
    const trimmed = draftTitle.trim() || "Untitled";
    setRenaming(false);
    if (trimmed === title) return;
    setTitle(trimmed);
    setSaveState("unsaved");
    void persist({ title: trimmed });
  }

  function cancelRename() {
    setDraftTitle(title);
    setRenaming(false);
  }

  async function persist(patch) {
    setSaveState("saving");
    setError("");
    try {
      const result = await api(`/api/documents/${document.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setDocument(result.document);
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(err.message);
    }
  }

  const wordCount = editor?.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0;

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  function selectedQuote() {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    if (from === to) return "";
    return editor.state.doc.textBetween(from, to, " ").replace(/\s+/g, " ").trim().slice(0, 280);
  }

  function openCommentsWithSelection() {
    const next = selectedQuote();
    if (panel === "comments" && !next) {
      setPanel(null);
      return;
    }
    setQuote(next);
    setPanel("comments");
  }

  function openSuggestionsWithSelection() {
    const next = selectedQuote();
    if (panel === "suggestions" && !next) {
      setPanel(null);
      return;
    }
    setQuote(next);
    setPanel("suggestions");
  }

  function applyRestored(next) {
    setDocument(next);
    setTitle(next.title);
    setDraftTitle(next.title);
    contentRef.current = next.content;
    editor?.commands.setContent(next.content, { emitUpdate: false });
    setSaveState("saved");
  }

  return (
    <div className="min-h-screen">
      <AppHeader user={user} backHref="/dashboard" />
      <div className="border-b border-line/80 bg-card/80 px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 truncate font-serif text-2xl md:text-3xl">{title}</h1>
            {editable ? (
              <button
                type="button"
                aria-label="Rename document"
                onClick={startRename}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-wash hover:text-ink"
              >
                <PencilIcon />
              </button>
            ) : null}
            </div>
            <PresenceBar documentId={document.id} user={user} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editable ? <SaveLabel state={saveState} /> : null}
            {document.role === "viewer" ? (
              <span className="rounded-full bg-shared/10 px-2.5 py-1 text-xs font-medium text-shared">
                View only · {document.owner.name}
              </span>
            ) : document.role === "editor" ? (
              <span className="rounded-full bg-shared/10 px-2.5 py-1 text-xs font-medium text-shared">
                Can edit · {document.owner.name}
              </span>
            ) : (
              <span className="rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest">
                You own this
              </span>
            )}
            <button
              type="button"
              onClick={openCommentsWithSelection}
              className={`rounded-full border px-4 py-2 text-sm ${
                panel === "comments"
                  ? "border-ink bg-ink text-paper hover:bg-ink-hover hover:text-paper"
                  : "border-line hover:bg-wash hover:text-ink"
              }`}
            >
              Comments{openComments ? ` (${openComments})` : ""}
            </button>
            <button
              type="button"
              onClick={openSuggestionsWithSelection}
              className={`rounded-full border px-4 py-2 text-sm ${
                panel === "suggestions"
                  ? "border-ink bg-ink text-paper hover:bg-ink-hover hover:text-paper"
                  : "border-line hover:bg-wash hover:text-ink"
              }`}
            >
              Suggest{openSuggestions ? ` (${openSuggestions})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === "history" ? null : "history")}
              className={`rounded-full border px-4 py-2 text-sm ${
                panel === "history"
                  ? "border-ink bg-ink text-paper hover:bg-ink-hover hover:text-paper"
                  : "border-line hover:bg-wash hover:text-ink"
              }`}
            >
              History
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === "files" ? null : "files")}
              className={`rounded-full border px-4 py-2 text-sm ${
                panel === "files"
                  ? "border-ink bg-ink text-paper hover:bg-ink-hover hover:text-paper"
                  : "border-line hover:bg-wash hover:text-ink"
              }`}
            >
              Files{(document.attachments || []).length ? ` (${document.attachments.length})` : ""}
            </button>
            <ExportMenu title={title} content={editor?.getJSON() || document.content} />
            {document.role === "owner" ? (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-hover hover:text-paper"
              >
                Share
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-8rem)] flex-col md:flex-row">
        <main className="mx-auto min-w-0 w-full max-w-4xl flex-1 px-4 py-6 md:px-8">
          {error ? (
            <p className="mb-4 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-dark">
              {error}
            </p>
          ) : null}
          <EditorToolbar editor={editor} disabled={!editable} />
          <div
            className={`editor-shell mt-4 rounded-[28px] border border-line bg-card px-5 py-8 shadow-[0_24px_60px_rgba(28,22,18,0.05)] md:px-12 md:py-12 ${
              editable ? "" : "opacity-90"
            }`}
          >
            <EditorContent editor={editor} />
          </div>
          <p className="mt-4 text-xs text-ink-soft">
            {wordCount} {wordCount === 1 ? "word" : "words"} ·{" "}
            {document.role === "viewer"
              ? "View only — you can comment and suggest edits"
              : document.collaborators.length === 0
              ? "Only you have access"
              : `Shared with ${document.collaborators.map((person) => person.name).join(", ")}`}
          </p>
        </main>
        {panel === "comments" ? (
          <CommentsPanel
            documentId={document.id}
            user={user}
            role={document.role}
            quote={quote}
            onQuoteClear={() => setQuote("")}
            onCountChange={setOpenComments}
            onClose={() => setPanel(null)}
          />
        ) : null}
        {panel === "suggestions" ? (
          <SuggestionsPanel
            documentId={document.id}
            user={user}
            role={document.role}
            quote={quote}
            onQuoteClear={() => setQuote("")}
            onCountChange={setOpenSuggestions}
            onAccepted={applyRestored}
            onClose={() => setPanel(null)}
          />
        ) : null}
        {panel === "files" ? (
          <FilesPanel
            document={document}
            user={user}
            role={document.role}
            onChange={setDocument}
            onImported={(next) => {
              setDocument(next);
              contentRef.current = next.content;
              editor?.commands.setContent(next.content, { emitUpdate: false });
              setSaveState("saved");
            }}
            onClose={() => setPanel(null)}
          />
        ) : null}
        {panel === "history" ? (
          <HistoryPanel
            documentId={document.id}
            role={document.role}
            onRestore={applyRestored}
            onClose={() => setPanel(null)}
          />
        ) : null}
      </div>

      {renaming ? (
        <RenameDialog
          value={draftTitle}
          onChange={setDraftTitle}
          onConfirm={commitRename}
          onClose={cancelRename}
        />
      ) : null}
      {shareOpen ? (
        <ShareDialog
          document={document}
          onClose={() => setShareOpen(false)}
          onChange={(next) => setDocument(next)}
        />
      ) : null}
    </div>
  );
}

function SaveLabel({ state }) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "unsaved"
        ? "Unsaved"
        : state === "error"
          ? "Save failed"
          : "Saved";
  return <span className="text-xs text-ink-soft">{label}</span>;
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
