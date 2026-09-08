# AI workflow note

## Tooling

Cursor (Grok 4.6) was used as a pair-programmer on this assignment: scaffolding the MERN split, iterating on the editor, sharing, comments, history, files, tests, and this submission packet.

## How it was used

Prompts were written as product briefs, not “build Google Docs.” The stack was locked first: **MERN** — MongoDB, Express, React (Vite), Node — two apps, JWT, TipTap JSON. That constraint is what kept the AI from wandering into a framework soup.

1. **Start on MERN.** The first prompt named the stack and the split (`backend/` API, `frontend/` SPA). AI scaffolded Express + Mongoose and Vite + React against that.
2. **Prompt the loop, not the chrome.** Later prompts were specific: owned vs shared dashboard, pencil-to-rename with OK/Cancel, autosave, share by email, in-app confirms instead of `alert` / `confirm`. Vague “make it like Docs” asks were avoided on purpose.
3. **Add stretch only after the loop ran.** Follow-up prompts named the extra, one at a time: roles, Markdown/PDF export, comments, suggestions, history, presence, signup, files.
4. **Ask for checks, not vibes.** Prompts included “write tests for access / import / versions” and “try it as Alex, then Sam.” `npm test` and the seeded accounts were how output was accepted or sent back.
5. **Packet last.** README, architecture, this note, `SUBMISSION.md`, screenshots, and `LIVE_URL.txt` were generated from the assignment checklist, then edited so they matched what actually shipped.

## What AI sped up

- Boilerplate: Express routes, Mongoose models, Vite/React pages, TipTap wiring
- Access-control helpers and tests
- Import parsing (.txt / .md / .docx) and export (Markdown + a small PDF writer)
- Dialogs (rename, share, confirm, import-into-draft)
- Turning a working app into a Drive-ready packet

## Human judgment

The prompts owned the product: MERN, not a clone, viewer can comment/suggest but not edit, pencil-to-rename, three file actions. AI filled in routes and UI; it did not choose the stack or the cuts. Secrets in `backend/.env` stay out of git and out of the Drive upload.
