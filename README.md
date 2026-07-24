# CreatorForge

CreatorForge is an AI-assisted content studio for writers. You build an article or newsletter
block by block (intro, tips, key facts, references, CTA, etc.), pick a writing style, and the app
generates each block with Claude, optionally grounded in facts you've pasted in or pulled from a
live web search. Finished pieces can be exported, previewed as a newsletter, and optionally pushed
directly to a Sanity content lake — set `VITE_SANITY_PROJECT_ID` (and optionally
`VITE_SANITY_DATASET`) in `frontend/.env` to point that at your own Sanity project; the push
feature stays cleanly disabled until you do.

## Architecture

Two independent services:

| Service | Stack | Location |
|---|---|---|
| **Frontend** | Vite + React + TypeScript | `frontend/` |
| **Backend** | FastAPI (Python) | `backend/` |

The frontend is a single-page app that talks to the backend over HTTP (see `VITE_BACKEND_URL`
below). The backend wraps the Anthropic (Claude) API for all content generation, Tavily for
sourced-fact web search, and Resend for sending newsletter emails. There is no database — see
[Known limitations](#known-limitations).

## Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API key used for all article/newsletter generation. |
| `TAVILY_API_KEY` | For fact search | Powers "Search for facts" in the brief builder. Without it, that feature is disabled but everything else still works. |
| `RESEND_API_KEY` | For sending email | Needed to send newsletter test/preview emails. |
| `SENDER_EMAIL` | For sending email | The "from" address used when sending via Resend. |
| `CLAUDE_MODEL` | No | Overrides the Claude model used (defaults to `claude-sonnet-4-6`). |
| `CORS_ORIGINS` | No | Comma-separated allowed origins for the API (defaults to `*`). Set this to your frontend's URL in production. |

The frontend reads one variable from `frontend/.env`:

| Variable | What it does |
|---|---|
| `VITE_BACKEND_URL` | Base URL of the running backend, e.g. `http://localhost:8000` locally. |

## Running locally

Requires Node 20+ and Python 3.10+.

**Backend:**

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # then fill in your keys
python -m uvicorn server:app --reload --port 8000
```

**Frontend** (in a second terminal):

```bash
cd frontend
npm install
npm start
```

The frontend dev server runs on `http://localhost:3000` and expects the backend at whatever
`VITE_BACKEND_URL` points to (`http://localhost:8000` by default).

## Known limitations

- **localStorage-only persistence.** Drafts, styles, and settings are stored in the browser's
  localStorage, not a database. There's no multi-device sync or account system — work done on
  one browser/device isn't visible on another.
- **Header images are paste-URL only.** You paste an image URL rather than uploading a file;
  there's no image upload/hosting pipeline yet.

## Deployment

Both of these are genuinely supported and configured in this repo:

- **Frontend → Vercel**, via [`vercel.json`](vercel.json). Builds `frontend/` and serves it as a
  static SPA (with an `index.html` rewrite for client-side routing).
- **Backend → Render**, via [`render.yaml`](render.yaml). Runs the FastAPI app with `uvicorn`.
  Set the env vars from the table above as secrets in the Render dashboard (`render.yaml`
  declares them with `sync: false`, so Render will prompt for values rather than reading them
  from the repo).

When deploying both, point the frontend's `VITE_BACKEND_URL` at the deployed Render URL, and set
the backend's `CORS_ORIGINS` to the deployed Vercel URL.
