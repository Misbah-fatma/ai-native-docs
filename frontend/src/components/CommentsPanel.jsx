import { useEffect, useState } from "react";
import { api, formatUpdated, initials } from "../api";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default function CommentsPanel({
  documentId,
  user,
  role,
  quote,
  onQuoteClear,
  onCountChange,
  onClose,
}) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const canResolve = role === "owner" || role === "editor";

  async function load() {
    const data = await api(`/api/documents/${documentId}/comments`);
    setComments(data.comments);
    onCountChange?.(data.comments.filter((comment) => !comment.resolved).length);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [documentId]);

  async function post(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await api(`/api/documents/${documentId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body, quote }),
      });
      setComments(data.comments);
      onCountChange?.(data.comments.filter((comment) => !comment.resolved).length);
      setBody("");
      onQuoteClear?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function setResolved(comment, resolved) {
    setPending(true);
    setError("");
    try {
      const data = await api(`/api/documents/${documentId}/comments/${comment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ resolved }),
      });
      setComments(data.comments);
      onCountChange?.(data.comments.filter((item) => !item.resolved).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!pendingRemove) return;
    setPending(true);
    setError("");
    try {
      const data = await api(`/api/documents/${documentId}/comments/${pendingRemove.id}`, {
        method: "DELETE",
      });
      setComments(data.comments);
      onCountChange?.(data.comments.filter((item) => !item.resolved).length);
      setPendingRemove(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  const open = comments.filter((comment) => !comment.resolved);
  const resolved = comments.filter((comment) => comment.resolved);

  return (
    <>
    <aside className="flex h-full w-full flex-col border-t border-line bg-card md:w-[22rem] md:border-l md:border-t-0">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-serif text-xl">Comments</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Select text in the page, then comment. Viewers can leave notes too.
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:text-ink">
          Close
        </button>
      </div>

      <form className="border-b border-line px-4 py-3" onSubmit={(event) => void post(event)}>
        {quote ? (
          <p className="mb-2 rounded-lg bg-paper px-2 py-1.5 text-xs italic text-ink-soft">
            “{quote}”
            <button type="button" className="ml-2 not-italic text-accent" onClick={onQuoteClear}>
              Clear
            </button>
          </p>
        ) : null}
        <textarea
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Leave a note for this page"
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="mt-2 rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
        >
          {pending ? "Posting…" : "Comment"}
        </button>
      </form>

      {error ? <p className="px-4 pt-3 text-sm text-accent">{error}</p> : null}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {open.length === 0 && resolved.length === 0 ? (
          <p className="text-sm text-ink-soft">No comments yet.</p>
        ) : null}
        {open.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            user={user}
            role={role}
            canResolve={canResolve}
            pending={pending}
            onResolve={() => void setResolved(comment, true)}
            onRemove={() => setPendingRemove(comment)}
          />
        ))}
        {resolved.length > 0 ? (
          <p className="mb-2 mt-4 text-xs uppercase tracking-[0.14em] text-ink-soft">Resolved</p>
        ) : null}
        {resolved.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            user={user}
            role={role}
            canResolve={canResolve}
            pending={pending}
            onOpen={() => void setResolved(comment, false)}
            onRemove={() => setPendingRemove(comment)}
          />
        ))}
      </div>
    </aside>
      {pendingRemove ? (
        <ConfirmDialog
          title="Remove comment?"
          message="This note will be deleted for everyone on the document."
          confirmLabel="Remove"
          danger
          busy={pending}
          onConfirm={() => void remove()}
          onClose={() => {
            if (!pending) setPendingRemove(null);
          }}
        />
      ) : null}
    </>
  );
}

function CommentCard({ comment, user, role, canResolve, pending, onResolve, onOpen, onRemove }) {
  const mine = comment.author.id === user.id;
  const canRemove = role === "owner" || mine;
  return (
    <article className="mb-3 rounded-2xl border border-line bg-paper px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-paper-deep text-[10px] font-medium">
          {initials(comment.author.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{comment.author.name}</p>
          <p className="text-xs text-ink-soft">{formatUpdated(comment.createdAt)}</p>
        </div>
      </div>
      {comment.quote ? (
        <p className="mt-2 border-l-2 border-accent/40 pl-2 text-xs italic text-ink-soft">“{comment.quote}”</p>
      ) : null}
      <p className="mt-2 whitespace-pre-wrap text-sm leading-5">{comment.body}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {canResolve && onResolve ? (
          <button type="button" disabled={pending} onClick={onResolve} className="text-xs text-forest">
            Resolve
          </button>
        ) : null}
        {canResolve && onOpen ? (
          <button type="button" disabled={pending} onClick={onOpen} className="text-xs text-ink-soft">
            Reopen
          </button>
        ) : null}
        {canRemove ? (
          <button type="button" disabled={pending} onClick={onRemove} className="text-xs text-accent">
            Remove
          </button>
        ) : null}
      </div>
    </article>
  );
}
