import { useEffect, useState } from "react";
import { api, initials } from "../api";
import ConfirmDialog from "./ConfirmDialog.jsx";

function roleLabel(role) {
  return role === "viewer" ? "Can view" : "Can edit";
}

export default function ShareDialog({ document, onClose, onChange }) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [pendingRole, setPendingRole] = useState(null);
  const canShare = document.role === "owner";
  const confirmOpen = Boolean(pendingRemove || pendingRole);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !confirmOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, confirmOpen]);

  async function invite(event) {
    event.preventDefault();
    if (!canShare) return;
    const nextEmail = email.trim().toLowerCase();
    if (nextEmail === document.owner.email) {
      setError("The owner already has access.");
      return;
    }
    const existing = document.collaborators.find((person) => person.email === nextEmail);
    if (existing && existing.access === inviteRole) {
      setError(`${existing.name} already has ${roleLabel(inviteRole).toLowerCase()} access.`);
      return;
    }
    if (existing) {
      setPendingRole({ person: existing, role: inviteRole });
      return;
    }
    await applyShare({ email: nextEmail, role: inviteRole });
  }

  async function applyShare(body) {
    setPending(true);
    setError("");
    try {
      const method = body.userId ? "PATCH" : "POST";
      const result = await api(`/api/documents/${document.id}/share`, {
        method,
        body: JSON.stringify(body),
      });
      onChange(result.document);
      if (!body.userId) setEmail("");
      setPendingRole(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function unshare() {
    if (!pendingRemove) return;
    setPending(true);
    setError("");
    try {
      const result = await api(`/api/documents/${document.id}/share`, {
        method: "DELETE",
        body: JSON.stringify({ userId: pendingRemove.id }),
      });
      onChange(result.document);
      setPendingRemove(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  const roleConfirm = pendingRole
    ? pendingRole.role === "viewer"
      ? {
          title: `Make ${pendingRole.person.name} a viewer?`,
          message: `${pendingRole.person.name} will only be able to read “${document.title}”. They will lose the ability to edit, rename, or restore versions.`,
          confirmLabel: "Switch to view only",
          danger: true,
        }
      : {
          title: `Let ${pendingRole.person.name} edit?`,
          message: `${pendingRole.person.name} will be able to change “${document.title}”, including the title and version history.`,
          confirmLabel: "Allow editing",
          danger: false,
        }
    : null;

  return (
    <>
      <div
        className="fixed inset-0 z-20 flex items-center justify-center bg-ink/30 p-4"
        onClick={() => {
          if (!confirmOpen) onClose();
        }}
      >
        <div
          className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl">Share</h2>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {canShare
                  ? "Invite someone, then change Can edit and Can view when you need to."
                  : "Only the owner can change who has access."}
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:text-ink">
              Close
            </button>
          </div>

          {canShare ? (
            <form className="mt-5 grid gap-2" onSubmit={(event) => void invite(event)}>
              <input
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-accent"
                placeholder="sam@ajaia.dev"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError("");
                }}
              />
              <div className="flex gap-2">
                <select
                  aria-label="Access level"
                  className="flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">Can view</option>
                </select>
                <button
                  type="submit"
                  disabled={pending || !email.trim()}
                  className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-hover hover:text-paper disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
            </form>
          ) : null}

          {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}

          <ul className="mt-5 grid gap-2">
            <PersonRow name={document.owner.name} email={document.owner.email} accessLabel="Owner" />
            {document.collaborators.map((person) => (
              <PersonRow
                key={person.id}
                name={person.name}
                email={person.email}
                access={person.access || "editor"}
                canManage={canShare}
                pending={pending}
                onRoleChange={
                  canShare
                    ? (role) => {
                        if (role === (person.access || "editor")) return;
                        setPendingRole({ person, role });
                      }
                    : undefined
                }
                onRemove={canShare ? () => setPendingRemove(person) : undefined}
              />
            ))}
          </ul>
        </div>
      </div>
      {pendingRemove ? (
        <ConfirmDialog
          title="Remove access"
          message={`${pendingRemove.name} will lose access to this document. They can be invited again later.`}
          confirmLabel="Remove"
          danger
          busy={pending}
          onConfirm={() => void unshare()}
          onClose={() => {
            if (!pending) setPendingRemove(null);
          }}
        />
      ) : null}
      {roleConfirm ? (
        <ConfirmDialog
          title={roleConfirm.title}
          message={roleConfirm.message}
          confirmLabel={roleConfirm.confirmLabel}
          danger={roleConfirm.danger}
          busy={pending}
          onConfirm={() => void applyShare({ userId: pendingRole.person.id, role: pendingRole.role })}
          onClose={() => {
            if (!pending) setPendingRole(null);
          }}
        />
      ) : null}
    </>
  );
}

function PersonRow({
  name,
  email,
  access,
  accessLabel,
  canManage,
  pending,
  onRoleChange,
  onRemove,
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-deep text-xs font-medium">
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-ink-soft">{email}</p>
      </div>
      {canManage && onRoleChange ? (
        <div className="flex shrink-0 items-center gap-2">
          <select
            key={`${name}-${access}`}
            aria-label={`Access for ${name}`}
            className="max-w-[7.5rem] rounded-full border border-line bg-card px-2.5 py-1 text-xs outline-none"
            value={access}
            disabled={pending}
            onChange={(event) => onRoleChange(event.target.value)}
          >
            <option value="editor">Can edit</option>
            <option value="viewer">Can view</option>
          </select>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-ink-soft hover:text-accent"
          >
            Remove
          </button>
        </div>
      ) : (
        <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs text-ink-soft">
          {accessLabel || roleLabel(access)}
        </span>
      )}
    </li>
  );
}
