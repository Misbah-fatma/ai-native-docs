# Architecture note

Ink is a small MERN split: a React SPA and an Express API. They do not share a process, a cookie jar, or a build.

```
Browser (Vite + React + TipTap)
        |
        |  JSON over HTTP
        |  Authorization: Bearer <jwt>
        v
Express API  (:4000)
        |
        v
MongoDB (document store)
```

Locally the frontend origin is `http://localhost:5173` and the API origin is `http://localhost:4000`. CORS allows that client origin only. For the live URL, a tiny proxy (`scripts/live-proxy.mjs`) puts both behind one public origin so the browser can call `/api` same-origin.

## Auth

- Seeded users plus public signup (`POST /api/auth/signup`).
- Login returns a JWT. The SPA stores it in `localStorage` (`ink_token`) and sends it on every API request.
- `SESSION_SECRET` in `backend/.env` is the signing key (name leftover from an earlier cookie session).

## Data

**User** — email, name, password hash.

**Document**

- `title`
- `content` — TipTap JSON (not HTML)
- `owner`
- `shares: [{ user, role }]` where role is `editor` or `viewer`
- `comments[]` — author, body, optional quote, resolved flag
- `suggestions[]` — quote, proposed replacement, optional note, pending/accepted/rejected
- `versions[]` — title, content snapshot, savedBy, label
- `attachments[]` — filename, mime, size, binary, uploadedBy

Access is computed in `backend/lib/access.js`. The owner is not stored in `shares`. Unknown users get a generic 404 so titles do not leak.

| Role | Read | Edit / rename | Share / delete | Comment | Suggest | Restore | Attach | Export |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Owner | yes | yes | yes | yes | yes | yes | yes | yes |
| Editor | yes | yes | no | yes | yes | yes | yes | yes |
| Viewer | yes | no | no | yes | yes | no | no | yes |

Confirmations for delete, role change, unshare, restore, comment remove, and attachment remove are in-app dialogs. No `window.alert` / `window.confirm`.

## Important request paths

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | JWT |
| POST | `/api/auth/signup` | Create account |
| GET | `/api/documents` | Owned vs shared lists |
| POST | `/api/documents` | Create |
| POST | `/api/documents/import` | New doc from .txt / .md / .docx |
| GET/PATCH/DELETE | `/api/documents/:id` | Open, autosave, delete |
| POST/PATCH/DELETE | `/api/documents/:id/share` | Invite, change role, remove |
| GET/POST | `/api/documents/:id/comments` | Thread |
| GET/POST | `/api/documents/:id/suggestions` | Propose / list edits |
| PATCH | `/api/documents/:id/suggestions/:id` | Accept (writes into the page) or reject |
| POST | `/api/documents/:id/presence` | Who is viewing |
| GET/POST | `/api/documents/:id/versions` | History / checkpoint
| POST | `/api/documents/:id/import-content` | Insert or replace draft |
| POST | `/api/documents/:id/attachments` | Attach a file |

Autosave is debounced on the client (~700ms). The API collapses rapid edits from the same person into one version (cap 20).

## Frontend

- Vite + React Router
- TipTap for the editor (JSON persisted as-is)
- Export: Markdown from the JSON tree; PDF from a small custom generator (not jspdf)
- Dashboard import vs editor attach vs editor “import into this draft” are three different actions on purpose

## Stretch vs cuts

Shipped: role-based sharing, Markdown/PDF export, comments, suggestion mode, version history, presence indicators, public signup, attachments, draft import.

Not a clone: no CRDT / simultaneous typing merge. Autosave is last-write-wins.
