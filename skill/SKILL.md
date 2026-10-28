---
name: chatty
description: Set up, deploy and run Chatty, a self-hosted "own ManyChat" for Instagram (DM inbox, keyword and comment-to-DM automations, a visual flow builder, contacts, account analytics, a Claude assistant and a mobile app with push alerts) on the user's own Firebase. Use when the user wants Instagram DM automation without a SaaS subscription, says "set up Chatty", "install my own ManyChat", "auto-reply to Instagram comments with a DM", "deploy Chatty", or wants to customize or extend their Chatty install. Walks the user from zero to their first automatic DM, one checked step at a time.
argument-hint: <"install", "deploy", "first automation", or what you want to change>
license: MIT
compatibility: Needs an agent with terminal access, Node.js 20+, git, the Firebase CLI and the Google Cloud CLI. The user needs a Google account with billing (Firebase Blaze, usually cents a month), a professional Instagram account and a Meta developer account. The panel UI and the setup guides in docs/ are in Spanish.
metadata:
  version: "1.0.0"
  author: Bruno Varela (https://vareliuu.com)
---

# chatty

**Your own ManyChat for Instagram, on your own Firebase.** This folder is the whole app (a
Next.js 16 project in `web/`, Firestore rules at the root, guides in `docs/`) plus this file,
which tells you, the agent, how to take the user from nothing to a live panel that answers
Instagram DMs and comments by itself.

Get it free from github.com/brunovareliuu/chatty (MIT). In the repo this file lives at
`skill/SKILL.md`; every path below is relative to the repo root (in the zip, this file sits at
the root).

You do the terminal work. The user does anything that needs their identity: signing in to
Google, Firebase, GCP and Meta, adding a card for billing, clicking through Meta's app
dashboard and approving consent screens. Never type their passwords or card numbers for them.

---

## Contents

0. [What's in this folder](#0-whats-in-this-folder)
1. [Golden rules](#1-golden-rules)
2. [Before you start: ask three things](#2-before-you-start-ask-three-things)
3. [Step 0: open the panel in guided mode (2 minutes)](#3-step-0-guided-mode)
4. [The install, step by step](#4-the-install-step-by-step)
5. [First use: from zero to the first automatic DM](#5-first-use)
6. [Changing or extending Chatty](#6-changing-or-extending-chatty)
7. [Meta's limits (not bugs)](#7-metas-limits-not-bugs)
8. [Troubleshooting](#8-troubleshooting)
9. [What it accesses and why](#9-what-it-accesses-and-why)

---

## 0. What's in this folder

```
SKILL.md                 this file
README.md, README.es.md  what Chatty is, screenshots, limits (English / Spanish)
CLAUDE.md                architecture, file map and the rules that must not break (read before editing code)
docs/01…08-*.md          the install guide, in order (Spanish), each ending in a "Listo si…" checklist
docs/modulos/*.md        how each section works: inbox, automations, flows, analytics, assistant, mobile app, brand
docs/datos.md            every Firestore collection and who writes it
docs/solucion-de-problemas.md   troubleshooting
web/                     the Next.js app (panel, webhook, cron endpoint, assistant, mobile app at /m)
web/.env.example         every environment variable, commented
web/apphosting.yaml      production config for Firebase App Hosting (secrets are only named here)
firestore.rules, firestore.indexes.json   security rules and indexes
firebase.json            Firebase CLI config
scripts/probar-reglas.sh  tests the rules against the emulator
```

The docs are in Spanish. Read them yourself and explain each step to the user in **their**
language. They are the source of truth: if this file and a doc disagree, follow the doc.

## 1. Golden rules

1. **One step at a time, and check it.** Every doc ends with "Listo si…" (done when…). Don't
   move on until each item is true. The panel itself checks most of them (see Step 0).
2. **Secrets never go in git and never reach the browser.** `web/.env.local` is in
   `.gitignore`. Anything starting with `NEXT_PUBLIC_` is shipped to the browser: never put a
   secret there. In production, secrets live in Secret Manager and `apphosting.yaml` only names
   them. Don't print secret values back to the user in chat.
3. **The user signs in, you don't.** `firebase login`, `gcloud auth login`, Meta's dashboard,
   billing: ask the user to run or click those themselves. Suggest they type `! <command>` if
   their agent supports it, so the output lands in the conversation.
4. **Deploy early.** Meta won't accept `localhost` as an OAuth redirect or a webhook. Get a
   public URL (App Hosting, or a tunnel for local testing) before connecting Instagram.
5. **The session cookie is called `__session`.** App Hosting's CDN drops every other cookie.
   Don't rename it.
6. **Nothing tied to one deployment.** Never hard-code a project id, domain, email or brand in
   the code. Everything comes from environment variables and Settings › Brand.
7. **Don't break the port contract.** If you touch the flow engine, read `CLAUDE.md` first:
   `outputHandles()` in `web/src/lib/engine/puertos.ts` and the `case` in
   `web/src/lib/engine/runner.ts` must return the same port ids, or edges stop routing silently.

## 2. Before you start: ask three things

Ask in one message, then go:

1. **Where should the copy live?** A folder name, and whether they already have a GitHub
   account (App Hosting deploys from a GitHub repo; a **private** repo is fine and recommended).
2. **Which Instagram account?** It must be **professional** (Business or Creator). Personal
   accounts can be switched in the Instagram app in a minute.
3. **Do they want the assistant?** It needs a Claude API key (pay per use). Everything else
   works without it.

Then give them their own repo. How depends on where this folder came from (`git remote -v`):

- **Their own repo** (made with **Use this template** on GitHub and cloned): nothing to do.
- **A clone of `brunovareliuu/chatty`:** they can't push there. Easiest is **Use this template**
  on github.com/brunovareliuu/chatty and clone that. Or keep this folder: `git remote remove
  origin`, then `gh repo create <name> --private --source . --push`.
- **No `.git` folder** (a downloaded zip): copy the folder to their chosen location, run
  `git init`, make a first commit, and create the repo with `gh repo create <name> --private
  --source . --push` if they use the GitHub CLI and are signed in.

## 3. Step 0: guided mode

Before configuring anything, show the user the system running:

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

With no Firebase variables, Chatty opens in **guided mode**: the real panel with every section
(inbox, automations, flows, contacts, analytics, assistant, settings), each one showing a
preview with sample data and the checklist of what it still needs. **Primeros pasos** (first
steps) gathers every step, marks the ones it can verify by itself (environment variables,
Firestore documents, the cron heartbeat) and lets the user tick the manual ones. Use it as the
shared progress bar for the rest of the install.

## 4. The install, step by step

Total time with everything at hand: one to two hours, most of it in Meta's dashboard.

| # | Doc | What you do | What the user does |
|---|---|---|---|
| 1 | `docs/01-requisitos.md` | Check `node -v` (20+), install `firebase-tools` and `gcloud` if missing | Confirm they have the accounts listed |
| 2 | `docs/02-firebase.md` | Create the project, Firestore (`nam5` or their region), the web app, print the SDK config, `firebase use --add`, `firebase deploy --only firestore` | `firebase login`; switch the project to **Blaze** in the console; enable Google and/or Email sign-in in Authentication |
| 3 | `docs/03-meta-instagram.md` | Explain each screen; generate `META_WEBHOOK_VERIFY_TOKEN` with `openssl rand -hex 16` | Create the Meta app with the **Instagram API with Instagram login**, copy the Instagram app id and secret, add their account as tester |
| 4 | `docs/04-variables-de-entorno.md` | Write `web/.env.local` from `.env.example`; generate `TOKEN_ENCRYPTION_KEY` and `CRON_SECRET` with `openssl rand -hex 32` | Paste the Meta secret and (optionally) the Claude key themselves if they prefer |
| 5 | `docs/05-correr-en-local.md` | `npm run dev`; check the login screen now appears | `gcloud auth application-default login` |
| 6 | `docs/06-desplegar.md` | Fill `web/apphosting.yaml`, create the secrets, create the backend, roll out, set `APP_URL` to the real URL and redeploy | Approve the GitHub connection in the Firebase console; type secret values when the CLI asks |
| 7 | `docs/07-cron.md` | Enable Cloud Scheduler and create the `chatty-tick` job every minute with the `x-cron-secret` header; run it once and check the heartbeat in Primeros pasos | — |
| 8 | Back to `docs/03` | Give the user the exact redirect URL (`<APP_URL>/api/ig/callback`) and webhook URL (`<APP_URL>/api/webhooks/instagram`) to paste in Meta, plus the verify token | Paste them and subscribe the webhook fields listed in the doc |

Important details that trip people up:

- `APP_URL` has **no trailing slash** and must match what's registered in Meta exactly.
- `ALLOWED_EMAILS` empty means **the first person to sign in becomes the owner** and nobody
  else gets in. Set it before sharing the URL.
- `NEXT_PUBLIC_*` values are baked in at build time; in `apphosting.yaml` they need
  `availability: [BUILD, RUNTIME]`.
- If `apphosting.yaml` names a secret that doesn't exist, the rollout fails. No assistant? Delete
  the `CLAUDE_API_KEY` block instead of creating an empty secret.
- Changing `TOKEN_ENCRYPTION_KEY` later means reconnecting Instagram.

## 5. First use

Follow `docs/08-primer-uso.md` with the user:

1. Sign in at the deployed URL (the first account is the owner if `ALLOWED_EMAILS` is empty).
2. Check **Primeros pasos**: everything should be green except what needs Instagram.
3. **Connect Instagram** from Ajustes › Instagram › Conectar (Settings). Meta's consent screen opens; the user
   approves it.
4. **First automation: "comment GUIDE and I'll DM you the link".** Automations › New, trigger
   *comment on a post*, keyword, a public reply, and the private DM. Then have the user comment
   from a second account and watch the DM arrive and the conversation appear in the inbox live.
5. **Phone:** open the URL on the phone, add it to the home screen, allow notifications.
6. **Analytics** fill in over the next days: the cron collects them every hour, because Meta
   doesn't keep history.
7. **Optional:** the assistant (`/asistente`) builds automations from a sentence; Settings ›
   Brand sets the panel's name, logo and color.

Optional template: `cd web && npm run plantilla` loads a 55-node example flow ("launch of a
repo") to learn the builder.

## 6. Changing or extending Chatty

Read `CLAUDE.md` before writing code: it has the architecture, the file map, the rules that
must not break and the known traps. In short:

- Single deployment on purpose: the webhook, the flow engine, the cron and the assistant all
  live in the Next.js app. There's no `functions/` folder; don't add one without a strong reason.
- Next.js 16 is not the Next you remember: read `web/node_modules/next/dist/docs/` before
  writing Next code.
- New node type: `web/src/lib/types.ts` → a `case` in `runner.ts` (add it to `SENDING_NODES` if
  it sends messages) → `NODE_META` and `nodeSummary` in `components/flow/node-config.tsx` →
  ports in `lib/engine/puertos.ts` → the form in `components/flow/node-inspector.tsx`.
- Colors only from the tokens in `globals.css`; text on the accent color is `text-accent-fg`.
- No `setState` inside an effect (ESLint error); load data and set state inside the `.then`.
- The webhook must answer fast: validate, return 200, do the work inside `after()`.
- New Firestore collection: its rule, its indexes, its row in `docs/datos.md`, and a test in
  `scripts/probar-reglas.sh` if the browser touches it.
- Before handing back: `npm run test`, `npm run typecheck` (run `npx next typegen` first on a
  fresh clone), `npm run lint`, `npm run build`. Production redeploys on every push to the
  connected branch.

## 7. Meta's limits (not bugs)

Tell the user up front, so they don't think it's broken:

- **24-hour window:** you can message freely only within 24 h of the user's last message.
- **One private reply per comment**, within 7 days, **text only**. Buttons become text, and
  typing a button's text counts as tapping it.
- **"Follows you?"** can only be checked after the person has written or tapped a button.
- 1000 bytes per message, 3 buttons, 13 quick replies.
- Tokens last 60 days; the cron renews them.
- Accounts without a role in the Meta app need **App Review** before they can connect.

## 8. Troubleshooting

`docs/solucion-de-problemas.md` covers the usual ones. The top five:

| Symptom | Cause |
|---|---|
| Login works locally, not in production | The cookie isn't named `__session`, or `APP_URL` is wrong |
| Webhook verification fails in Meta | `META_WEBHOOK_VERIFY_TOKEN` differs, or the URL isn't public/deployed yet |
| "Invalid redirect URI" when connecting Instagram | The redirect in Meta doesn't match `APP_URL` + `/api/ig/callback` character for character |
| Waits, timeouts and analytics never move | The cron isn't running: check the heartbeat in Primeros pasos and `gcloud scheduler jobs run chatty-tick` |
| Rollout fails right away | A secret named in `apphosting.yaml` doesn't exist or the backend has no access (`firebase apphosting:secrets:grantaccess`) |

## 9. What it accesses and why

- **Terminal:** install dependencies, run the dev server, and use the Firebase, gcloud and git
  CLIs to create and deploy the user's own project.
- **Files:** writes the user's copy of the app and `web/.env.local` (git-ignored).
- **Network:** npm, Google Cloud/Firebase and Meta's Graph API (`graph.instagram.com`), and
  Anthropic's API only if the user turns on the assistant.
- **Secrets:** generated locally with `openssl` or pasted by the user; stored in `.env.local`
  locally and in Google Secret Manager in production. Instagram tokens are encrypted
  (AES-256-GCM) in a Firestore document that the security rules deny to every client.

Nothing is sent to the author of this skill. Each copy is fully independent.
