# Ink

Lightweight collaborative documents for a small team. Not a Google Docs clone.

Two apps:

```
assignemnt/
  backend/     Express + MongoDB API   http://localhost:4000
  frontend/    React (Vite)            http://localhost:5173
```

## Local setup

You need **Node 20+** and **MongoDB**. Mongo is the only extra service. Docker is the easiest way to run it.

### 1. Start MongoDB

```bash
docker compose up -d mongo
```

If you already have `mongod` on `127.0.0.1:27017`, skip Docker. Any URI works in `backend/.env` as `MONGO_URI`.

### 2. Backend (terminal 1)

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Defaults: `PORT=4000`, `MONGO_URI=mongodb://127.0.0.1:27017/ink`. CORS allows any frontend origin.

The API seeds three reviewer accounts on boot. Health check: http://localhost:4000/api/health

### 3. Frontend (terminal 2)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173**. The React app sends `Authorization: Bearer` to `VITE_API_URL` (default `http://localhost:4000`).

Do not copy `backend/.env` if it already has a real database URI. `.env` files are secrets and are gitignored.

### Seeded accounts

Password for all three: `demo1234`

| Person | Email | Starting documents |
| --- | --- | --- |
| Alex Rivera | `alex@ajaia.dev` | Owns **Q3 working notes** (shared with Jordan as editor) and **Private hiring notes** |
| Jordan Chen | `jordan@ajaia.dev` | Can edit Q3. Owns **Design critique** |
| Sam Okonkwo | `sam@ajaia.dev` | Nothing shared yet |

There is no email verification. Reviewers can still use the seeded accounts or **Switch user**. Create account is for testing a fresh empty workspace.

## What it does

**Auth and workspace**
- Seeded sign-in, plus **Create account** for a new empty workspace
- Dashboard splits **Owned by you** and **Shared with you**
- Create a blank document
- Delete owned documents (with confirmation)

**Editing**
- Click the pencil beside the title. A dialog asks for the new name; **OK** saves, **Cancel** keeps the old one.
- Rich text: headings, bold, italic, underline, lists, undo/redo
- Autosave (debounced). Refresh to prove it persisted
- Viewers cannot type; the toolbar is disabled

**Import and files**
- Dashboard **Import file**: `.txt`, `.md`, `.docx` (up to 2 MB) become a **new** document
- Editor **Files**: attach a file to the current document (download later). Allowed: txt, md, docx, pdf, images, csv. Max 8, 2 MB each
- Editor **Files → Import into this draft**: insert a .txt / .md / .docx below the current text, or replace the page
- Samples: `frontend/public/examples/`

**Sharing**
- Owner invites by email (**Can edit** or **Can view**)
- Owner can later change that role (confirmation) or remove access (confirmation)
- Roles:
  - **Owner** — edit, share, delete, restore versions
  - **Editor** — edit, rename, comment, restore — cannot share or delete
  - **Viewer** — read, comment, export — cannot edit, share, delete, or restore
- People without access get a 404, not a leak of the title

**Comments**
- Anyone with access can comment, including viewers
- Select text first to attach a quote
- Owners and editors can resolve / reopen
- Author or owner can remove a comment (confirmation)
- Q3 ships with a seeded note from Jordan

**Suggestions**
- Select a phrase, open **Suggest**, and propose a replacement (optional note)
- Viewers can suggest; they still cannot type in the page
- Owners and editors **Accept** (writes into the document) or **Reject**
- Q3 ships with a seeded suggestion from Jordan on “easy to reopen”

**Presence**
- Anyone currently in the document shows under the title (“Jordan Chen is viewing”)
- Heartbeat every few seconds; people drop off after about 20 seconds idle

**Version history**
- Edits are snapshotted. Rapid saves from the same person collapse into one version (cap 20)
- **Save checkpoint** pins a named version
- **Restore** replaces the live page after confirmation and keeps a copy of what you had

**Export**
- **Export → Markdown (.md)** or **PDF (.pdf)**
- Available to anyone who can open the document

**Confirmations** (no browser `alert` / `confirm`)
- Delete document
- Change Can edit / Can view
- Remove access
- Restore a version
- Remove a comment
- Remove an attachment

## Stretch (included)

The assignment called these optional. All of these are in the product:

- Role-based sharing (owner / editor / viewer)
- Export to PDF and Markdown
- Commenting
- Suggestion / track-changes (propose, accept, reject)
- Document version history
- Real-time presence (who is viewing this document)
- Public signup

Also included: attachments on a document, and importing a file into an existing draft.

Not a Google Docs clone: no CRDT co-editing (two people typing the same paragraph at once still last-write-wins on autosave).

## Tests

```bash
cd backend && npm test
```

Covers access roles, file-import helpers, Markdown export, and version collapsing.

## Extra setup note

The only extra local step is MongoDB. Use Docker as above, or point `MONGO_URI` at Atlas / a local `mongod`. Product screenshots of the running UI are in `docs/screenshots/` so reviewers can see the app without that step.

## Live demo

The public URL is in `LIVE_URL.txt`.

On **Render** (static frontend):
- Build: `npm install && npm run build` in `frontend/`
- Publish directory: `dist`
- Node version: **22** (Vite 8 needs Node 20.12+)
- Environment: `VITE_API_URL` = your Express API URL (another Render web service in `backend/`), e.g. `https://your-api.onrender.com`
- The app uses hash routes (`/#/dashboard`) so Render does not 404 on refresh. Optional: in the static site, Settings → Redirects/Rewrites, add Rewrite `/*` → `/index.html`.

Do not bake `VITE_API_URL=http://localhost:4000` into the production build. That only works on your machine.

## Layout

| Path | What |
| --- | --- |
| `backend/` | Express, Mongoose, JWT, seed, tests |
| `frontend/` | Vite + React + TipTap |
| `ARCHITECTURE.md` | Data model and cuts |
| `AI_WORKFLOW.md` | How the AI was used |
| `SUBMISSION.md` | Exact packet list for Drive |
| `WALKTHROUGH.txt` | Video URL + script |
| `LIVE_URL.txt` | Deployed URL |
| `docs/screenshots/` | UI captures |
| `docker-compose.yml` | MongoDB only |
