import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { api, formatUpdated, initials } from "../api";
import AppHeader from "../components/AppHeader.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

export default function DashboardPage({ user, onSignOut }) {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [owned, setOwned] = useState([]);
  const [shared, setShared] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    const data = await api("/api/documents");
    setOwned(data.owned);
    setShared(data.shared);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function createDocument() {
    setBusy("create");
    setError("");
    try {
      const result = await api("/api/documents", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled" }),
      });
      navigate(`/docs/${result.document.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  }

  async function importFile(file) {
    setBusy("import");
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      const result = await api("/api/documents/import", { method: "POST", body: data });
      navigate(`/docs/${result.document.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  }

  async function removeDocument() {
    if (!pendingDelete) return;
    setBusy(pendingDelete.id);
    setError("");
    try {
      await api(`/api/documents/${pendingDelete.id}`, { method: "DELETE" });
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader user={user} onSignOut={onSignOut} />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-ink-soft">Workspace</p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight">Your documents</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">
              Create a blank page, import a file, or open something already shared with you.
              Supported imports: <span className="text-ink">.txt, .md, .docx</span> up to 2 MB.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy !== null}
              className="rounded-full border border-line bg-card px-4 py-2.5 text-sm font-medium hover:bg-wash hover:text-ink disabled:opacity-60"
            >
              {busy === "import" ? "Importing…" : "Import file"}
            </button>
            <button
              type="button"
              onClick={() => void createDocument()}
              disabled={busy !== null}
              className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-hover hover:text-paper disabled:opacity-60"
            >
              {busy === "create" ? "Creating…" : "New document"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.markdown,.docx,text/plain,text/markdown"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importFile(file);
              }}
            />
          </div>
        </div>

        {error ? (
          <p className="mt-6 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-dark">
            {error}
          </p>
        ) : null}

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Owned by you</h2>
            <span className="text-sm text-ink-soft">{owned.length}</span>
          </div>
          {owned.length === 0 ? (
            <EmptyState text="No owned documents yet. Create one or import a file." />
          ) : (
            <div className="grid gap-3">
              {owned.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  document={doc}
                  busy={busy === doc.id}
                  onDelete={() => setPendingDelete(doc)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Shared with you</h2>
            <span className="text-sm text-ink-soft">{shared.length}</span>
          </div>
          {shared.length === 0 ? (
            <EmptyState text="Nothing has been shared with this account yet." />
          ) : (
            <div className="grid gap-3">
              {shared.map((doc) => (
                <DocumentRow key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </section>
      </main>
      {pendingDelete ? (
        <ConfirmDialog
          title="Delete document"
          message={`“${pendingDelete.title}” will be removed for you and anyone it is shared with. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          busy={busy === pendingDelete.id}
          onConfirm={() => void removeDocument()}
          onClose={() => {
            if (busy !== pendingDelete.id) setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card/70 px-5 py-8 text-sm text-ink-soft">
      {text}
    </div>
  );
}

function DocumentRow({ document, onDelete, busy }) {
  const sharedCount = document.collaborators.length;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-4 shadow-[0_8px_24px_rgba(28,22,18,0.03)]">
      <Link to={`/docs/${document.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-medium">{document.title}</h3>
          {document.role === "owner" ? (
            <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs font-medium text-forest">
              Owner
            </span>
          ) : document.role === "viewer" ? (
            <span className="rounded-full bg-shared/10 px-2 py-0.5 text-xs font-medium text-shared">
              View only · {document.owner.name}
            </span>
          ) : (
            <span className="rounded-full bg-shared/10 px-2 py-0.5 text-xs font-medium text-shared">
              Can edit · {document.owner.name}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Updated {formatUpdated(document.updatedAt)}
          {document.role === "owner" && sharedCount > 0
            ? ` · Shared with ${sharedCount} ${sharedCount === 1 ? "person" : "people"}`
            : null}
        </p>
      </Link>
      <div className="hidden items-center -space-x-2 sm:flex">
        {[document.owner, ...document.collaborators].slice(0, 4).map((person) => (
          <span
            key={person.id}
            title={person.name}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-card bg-paper-deep text-xs font-medium"
          >
            {initials(person.name)}
          </span>
        ))}
      </div>
      {onDelete ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          disabled={busy}
          className="text-sm text-ink-soft hover:text-accent disabled:opacity-50"
        >
          {busy ? "…" : "Delete"}
        </button>
      ) : null}
    </div>
  );
}
