import { useEffect, useState } from "react";
import { api, formatUpdated, initials } from "../api";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default function SuggestionsPanel({
  documentId,
  user,
  role,
  quote,
  onQuoteClear,
  onCountChange,
  onAccepted,
  onClose,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [proposed, setProposed] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const canReview = role === "owner" || role === "editor";

  async function load() {
    const data = await api(`/api/documents/${documentId}/suggestions`);
    setSuggestions(data.suggestions);
    onCountChange?.(data.suggestions.filter((item) => item.status === "pending").length);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [documentId]);

  useEffect(() => {
    if (quote && !proposed) setProposed(quote);
  }, [quote]);

  async function post(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await api(`/api/documents/${documentId}/suggestions`, {
        method: "POST",
        body: JSON.stringify({ proposed, quote, note }),
      });
      setSuggestions(data.suggestions);
      onCountChange?.(data.suggestions.filter((item) => item.status === "pending").length);
      setProposed("");
      setNote("");
      onQuoteClear?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function review(item, status) {
    setPending(true);
    setError("");
    try {
      const data = await api(`/api/documents/${documentId}/suggestions/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSuggestions(data.suggestions);
      onCountChange?.(data.suggestions.filter((entry) => entry.status === "pending").length);
      if (status === "accepted" && data.document) onAccepted?.(data.document);
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
      const data = await api(`/api/documents/${documentId}/suggestions/${pendingRemove.id}`, {
        method: "DELETE",
      });
      setSuggestions(data.suggestions);
      onCountChange?.(data.suggestions.filter((item) => item.status === "pending").length);
      setPendingRemove(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  const pendingItems = suggestions.filter((item) => item.status === "pending");
  const reviewed = suggestions.filter((item) => item.status !== "pending");

  return (
    <>
      <aside className="flex h-full w-full flex-col border-t border-line bg-card md:w-[22rem] md:border-l md:border-t-0">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-serif text-xl">Suggestions</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Select text, propose a replacement, and owners can accept it into the page.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:text-ink">
            Close
          </button>
        </div>

        <form className="border-b border-line px-4 py-3" onSubmit={(event) => void post(event)}>
          {quote ? (
            <p className="mb-2 rounded-lg bg-paper px-2 py-1.5 text-xs italic text-ink-soft">
              Current: “{quote}”
              <button type="button" className="ml-2 not-italic text-accent" onClick={onQuoteClear}>
                Clear
              </button>
            </p>
          ) : (
            <p className="mb-2 text-xs text-ink-soft">Select a phrase first to attach it as the original wording.</p>
          )}
          <textarea
            rows={3}
            value={proposed}
            onChange={(event) => setProposed(event.target.value)}
            placeholder="Suggested replacement"
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why? (optional)"
            className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={pending || !proposed.trim()}
            className="mt-2 rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:bg-ink-hover hover:text-paper disabled:opacity-50"
          >
            {pending ? "Sending…" : "Suggest"}
          </button>
        </form>

        {error ? <p className="px-4 pt-3 text-sm text-accent">{error}</p> : null}

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {pendingItems.length === 0 && reviewed.length === 0 ? (
            <p className="text-sm text-ink-soft">No suggestions yet.</p>
          ) : null}
          {pendingItems.map((item) => (
            <SuggestionCard
              key={item.id}
              item={item}
              user={user}
              role={role}
              canReview={canReview}
              pending={pending}
              onAccept={() => void review(item, "accepted")}
              onReject={() => void review(item, "rejected")}
              onRemove={() => setPendingRemove(item)}
            />
          ))}
          {reviewed.length > 0 ? (
            <p className="mb-2 mt-4 text-xs uppercase tracking-[0.14em] text-ink-soft">Reviewed</p>
          ) : null}
          {reviewed.map((item) => (
            <SuggestionCard
              key={item.id}
              item={item}
              user={user}
              role={role}
              canReview={false}
              pending={pending}
              onRemove={() => setPendingRemove(item)}
            />
          ))}
        </div>
      </aside>
      {pendingRemove ? (
        <ConfirmDialog
          title="Remove suggestion?"
          message="This proposed edit will be deleted for everyone on the document."
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

function SuggestionCard({ item, user, role, canReview, pending, onAccept, onReject, onRemove }) {
  const mine = item.author.id === user.id;
  const canRemove = role === "owner" || mine;
  return (
    <article className="mb-3 rounded-2xl border border-line bg-paper px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-paper-deep text-[10px] font-medium">
          {initials(item.author.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.author.name}</p>
          <p className="text-xs text-ink-soft">{formatUpdated(item.createdAt)}</p>
        </div>
        {item.status !== "pending" ? (
          <span className="rounded-full bg-card px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-soft">
            {item.status}
          </span>
        ) : null}
      </div>
      {item.quote ? (
        <p className="mt-2 border-l-2 border-accent/40 pl-2 text-xs italic text-ink-soft">“{item.quote}”</p>
      ) : null}
      <p className="mt-2 text-sm leading-5">{item.proposed}</p>
      {item.note ? <p className="mt-1 text-xs text-ink-soft">{item.note}</p> : null}
      <div className="mt-2 flex flex-wrap gap-3">
        {canReview && onAccept ? (
          <button type="button" disabled={pending} onClick={onAccept} className="text-xs text-forest">
            Accept
          </button>
        ) : null}
        {canReview && onReject ? (
          <button type="button" disabled={pending} onClick={onReject} className="text-xs text-ink-soft">
            Reject
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
