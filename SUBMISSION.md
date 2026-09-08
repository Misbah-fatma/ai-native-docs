# Submission

This is the Drive packet for **Ink** (Ajaia assignment). Upload **this folder** as one Google Drive folder. Do **not** upload `node_modules`, `.git`, or any `.env` file (those contain secrets).

## Checklist (assignment deliverables)

| Required item | Where it is |
| --- | --- |
| Source code | `backend/` (Express + MongoDB API) and `frontend/` (Vite + React) |
| README.md with local setup and run instructions | `README.md` |
| Short architecture note (Markdown) | `ARCHITECTURE.md` |
| AI workflow note (Markdown) | `AI_WORKFLOW.md` |
| SUBMISSION.md listing exactly what is included | this file |
| Live product URL | `LIVE_URL.txt` |
| Walkthrough video URL (text file) | `WALKTHROUGH.txt` |
| Screenshots (extra setup is MongoDB via Docker) | `docs/screenshots/` |

## Also in this folder

| Item | Path |
| --- | --- |
| MongoDB for local run | `docker-compose.yml` |
| Backend env template | `backend/.env.example` |
| Frontend env template | `frontend/.env.example` |
| Import samples | `frontend/public/examples/` |
| Backend tests | `backend/tests/` and `cd backend && npm test` |
| Live-demo proxy | `scripts/live-proxy.mjs` |
| Screenshot recapture | `scripts/capture-screenshots.mjs` |

## Live product

See `LIVE_URL.txt`.

Local (if you run it yourself):

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Reviewer accounts

Password: `demo1234`

- `alex@ajaia.dev` — owns Q3 working notes (Jordan is an editor) and Private hiring notes
- `jordan@ajaia.dev` — can edit Q3; owns Design critique
- `sam@ajaia.dev` — starts with nothing shared

## Screenshots

| File | What it shows |
| --- | --- |
| `docs/screenshots/01-sign-in.png` | Sign in + reviewer shortcuts |
| `docs/screenshots/02-create-account.png` | Create account |
| `docs/screenshots/03-dashboard.png` | Owned vs shared |
| `docs/screenshots/04-editor.png` | Editor, Suggest, presence |
| `docs/screenshots/05-rename.png` | Rename dialog (OK / Cancel) |
| `docs/screenshots/06-share.png` | Share with Can edit / Can view |
| `docs/screenshots/07-comments.png` | Comments sidebar |
| `docs/screenshots/08-suggestions.png` | Suggestion accept / reject |
| `docs/screenshots/09-history.png` | Version history |
| `docs/screenshots/10-files.png` | Attach / import into draft |
| `docs/screenshots/11-export.png` | Markdown and PDF export |
| `docs/screenshots/12-delete-confirm.png` | In-app delete confirmation |

MongoDB (Docker or a URI in `backend/.env`) is the only extra local setup step. These screenshots are the visual stand-in for that step.

## Stack

MERN. Two apps. JWT auth. MongoDB. TipTap JSON.

## Stretch included

- Role-based sharing: owner, editor, viewer
- Export to Markdown or PDF from the editor
- Comments with optional selected-text quotes
- Suggestion mode: propose a replacement, accept or reject
- Who is viewing (presence heartbeat)
- Public signup in addition to seeded reviewer accounts
- Document version history and restore
- Attachments on a document
- Import a file into an existing draft

## Do not include in Drive

- `**/node_modules/`
- `backend/.env` / `frontend/.env`
- `.git/`
- `frontend/dist/`
