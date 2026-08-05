# WhatsApp Personal AI Assistant

An AI assistant that answers WhatsApp on your behalf when you're not available.

It greets people, introduces itself honestly as an AI assistant, and forwards anything real to you on Telegram — so you never lose a lead just because you were offline. When you reply, it remembers your answer for next time.

Speaks **Bangla, English and Banglish**, and always replies in the same language and script the person wrote in.

**Node 22 · Express 5 · Mongoose 9 · Baileys · Google Gemini · Telegraf**

---

## Two modes

The assistant ships in a deliberately quiet mode. Switch with one line in `.env`.

### `AGENT_MODE=greeting` — default

Handles the opening, then steps aside.

```
Someone:  Hi
Assistant: Hello! I'm Kazi Mridul's AI assistant. He's a bit busy right now
           — he'll get back to you personally very soon.

Someone:  kemon achen?
Assistant: Alhamdulillah, ami bhalo achi. Kazi Mridul ekhon byasto achen,
           uni nijei dekhe apnake janaben.

Someone:  apni ki website banan?
Assistant: Eita Kazi Mridul nijei bhalo bolte parben.
           Ami onake janiye diyechi, uni apnake janaben.
           → 🔔 Telegram notification to you
           → assistant goes quiet in that chat for 12 hours
```

It answers greetings and pleasantries. The moment anything real comes up — work,
pricing, a job offer, anything — it escalates to you and stops talking. It never
pitches, never asks qualifying questions, and never pretends to know something.

No knowledge base is even loaded in this mode. The assistant simply doesn't have
the information, so it can't leak it.

### `AGENT_MODE=full` — the complete sales assistant

Everything above, plus: explains your portfolio, collects project requirements
through natural conversation, scores how serious a lead is, offers meeting slots
and books them.

Nothing was deleted to build greeting mode — `toolsForMode()` just filters the
tool list. All six tools are still in the codebase.

---

## Setup

```bash
npm install
cp .env.example .env      # fill in the 5 required values
npm run check             # verifies every key and connection, tells you what's broken
```

### Required environment variables

| Key | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free, no card required |
| `DB_STRING` | [cloud.mongodb.com](https://cloud.mongodb.com) free M0 cluster (allow `0.0.0.0/0` in Network Access) |
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` |
| `TELEGRAM_CHAT_ID` | send `/start` to [@userinfobot](https://t.me/userinfobot) |
| `OWNER_NUMBER` | your WhatsApp number with country code — `8801XXXXXXXXX` |

Send `/start` to your own bot on Telegram once, or it can't message you.

### Behaviour settings

| Key | Default | What it does |
|---|---|---|
| `AGENT_MODE` | `greeting` | `greeting` or `full` |
| `GREETING_PAUSE_HOURS` | `12` | how long the assistant stays quiet after handing a chat to you |
| `DEBOUNCE_MS` | `8000` | wait window before replying, so several quick messages become one answer |
| `MAX_MESSAGES_PER_TURN` | `3` | cap on how many messages one reply is split into |
| `HOURLY_MESSAGE_LIMIT` | `20` | per-contact rate limit |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | `gemini-3.5-flash` is better but free tier allows only 5 req/min |
| `GEMINI_MIN_GAP_MS` | `1200` | minimum gap between Gemini calls, keeps you inside free-tier limits |
| `WA_PAIRING_NUMBER` | empty | only for headless re-linking — see Deploy |

---

## Your own content

`seed/` holds everything the assistant knows. Only used in `full` mode.

| File | What goes in it |
|---|---|
| `profile.md` | who you are, where you work, availability for full-time roles |
| `skills.md` | your stack, what you build, and explicitly what you don't |
| `portfolio.md` | past projects with links |
| `faq.md` | the questions clients actually keep asking |
| `policy.md` | revisions, timelines, ownership, NDA |
| `availability.md` | when you take meetings |
| `sample_chats.md` | **real past conversations** — this is what makes the assistant sound like you rather than like a generic chatbot |
| `rateCard.js` | project types and add-ons. Prices are never spoken by the assistant, but the type list drives lead classification |

```bash
npm run seed          # seed/*.md → embeddings → MongoDB, safe to re-run
```

Re-running removes chunks you deleted or edited. Knowledge the assistant learned
from your replies, and anything added via `/kb`, is never touched.

Meeting hours live in `AVAILABILITY` inside `services/schedulingServices.js`.

---

## Before you go live: blacklist

This runs on your personal number, so it sees messages from friends and family too.

Open `seed/seedBlacklist.js`, add the numbers that should never get an automated
reply, then:

```bash
npm run seed:blacklist
```

You can also type `/bl` in any chat from your own phone to blacklist it instantly.

---

## Test without WhatsApp

```bash
npm run test:chat              # interactive, type and see replies
npm run test:chat -- --script  # runs a scripted conversation that switches
                               # language repeatedly and probes every guardrail
```

This is the right way to tune prompts. Hammering your real WhatsApp increases ban risk.

---

## Run it

```bash
npm run dev     # local, restarts on file change
npm start       # production
```

A QR code appears in the terminal → WhatsApp → **Linked Devices** → **Link a Device** → scan.

The session is stored in MongoDB, not on disk, so you only ever scan once —
restarts and redeploys reuse it.

---

## Commands

### From your own phone, in any WhatsApp chat

| Command | Effect |
|---|---|
| `/off` · `/on` | disable / enable the assistant in this chat |
| `/pause 2h` | stay quiet here for a while (`m` `h` `d`) |
| `/bl` · `/unbl` | blacklist / un-blacklist this contact |
| `/status` | state of this chat, plus lead info |
| `/note <text>` | attach a note to the contact |
| `/kb <text>` | teach the knowledge base something |
| `/botoff` · `/boton` | global kill switch |
| `/stats` · `/pending` | summary / unanswered questions |

### On Telegram

`/pending` · `/ans <ticket> <answer>` · `/leads` · `/meetings` · `/stats` ·
`/kb <text>` · `/say <number> <text>` · `/botoff` · `/boton`

You can also just **reply directly** to any escalation notification — no `/ans` needed.

---

## How it works

```
incoming message
   ↓ whatsapp/listener → messageRouter     blacklisted? group? command? paused?
   ↓ debouncer (8s)                        several quick messages merge into one
   ↓ pipelineServices
      ├── memoryServices      last 20 messages + rolling summary
      ├── languageDetect      bn / banglish / en
      ├── knowledgeServices   embed query → cosine similarity → top 5   (full mode only)
      ├── promptServices      persona, guardrails, language rule
      ├── geminiServices      function-calling loop, throttled + retried
      └── toolServices        escalateToOwner                           (greeting mode)
                              + saveRequirement · qualifyLead
                                proposeMeetingSlots · bookMeeting       (full mode)
      ├── enforceScript       verifies the reply is in the right script, rewrites if not
      └── promise safety net  if it promised to ask you but didn't, escalate anyway
   ↓ humanize                 read receipt → typing → delay → short messages
```

### Two ways it learns

**From Telegram.** You reply to a notification → the answer reaches the client →
`learnServices` turns it into a reusable knowledge entry, embeds it, stores it.
The next person asking something similar gets an instant answer.

**From you, silently.** If you reply by hand in WhatsApp, Baileys sees the outgoing
message, pairs it with the client's last question, and runs the same learning path.
It also detects the handover and goes quiet in that chat for two hours.

### Guardrails

- **Never quotes a price.** Not a number, not a range, not a hint. Requirements go to
  you; pricing is a judgment call, not a lookup.
- **Never discusses payment terms** — advance, instalments, refunds, methods. All
  escalated. (Building a payment gateway *for a client* is a service and is discussed
  normally — the prompt separates the two explicitly.)
- **Never answers personal questions** about the owner: age, education, employment,
  family, income, address. Escalated even when the answer sits in the knowledge base.
- **Never commits to a deadline.** Rough ranges only.
- **Never invents an answer.** When unsure, it escalates.
- **Script consistency is verified, not just requested.** The reply is checked against
  the language the client used, and rewritten if it drifted.
- **A promise to ask you is always backed by a real notification.** If the model says
  "I'll check with him" without calling the tool, the pipeline escalates anyway — so a
  client is never left waiting on a message you never received.
- **Voice notes** are transcribed by Gemini and handled like text (skipped over 2 minutes).
- Ignores groups, broadcasts and status updates entirely.
- Never replies to messages that arrived before it started, so connecting doesn't
  trigger a flood of replies to old chats.
- Never messages anyone first.
- Per-contact hourly rate limit.

---

## Project structure

Flat root, no `src/`. CommonJS.

```
controllers/  models/  routes/  middleware/   admin REST API
whatsapp/     Baileys socket, auth state, router, commands, humanize
services/     gemini · embedding · prompt · tools · pipeline · memory
              knowledge · learn · pricing · scheduling · escalation · telegram
seed/         content files, rate card, seed scripts, test harness
utils/        logger · languageDetect · chunker · rateLimit
dbConfig/     mongoose connection
```

### Admin REST API

`POST /auth/signup` (first user becomes admin, then signup closes) · `POST /auth/signin`

`GET /contact/all` · `GET /lead/all` · `GET /lead/stats` · `GET /knowledge/all` ·
`POST /knowledge/add` · `DELETE /knowledge/:id` · `GET /escalation/all` ·
`POST /escalation/:ticket/answer` · `GET /meeting/all` · `GET /meeting/slots`

All admin routes sit behind `authMiddleware` + `roleCheck('admin')`. Built for a
dashboard that doesn't exist yet — Telegram covers day-to-day use.

---

## Deploy

Baileys needs a **long-running process**. Vercel and Netlify won't work (serverless),
and Render's free tier sleeps after 15 minutes of no HTTP traffic, which kills the
WhatsApp connection.

| Host | Cost | Notes |
|---|---|---|
| **Railway** | ~$5/mo | easiest — push to GitHub and it deploys |
| **Oracle Cloud Always Free** | free forever | 4 vCPU / 24 GB, but you set up Linux and pm2 yourself |
| **Hetzner / DigitalOcean** | ~$5/mo | full control |

### Railway

1. Push to GitHub (`.env` is gitignored)
2. **New Project** → **Deploy from GitHub repo**
3. **Variables** → Raw Editor → paste your entire `.env`
4. ⚠️ **Settings → App Sleeping must be OFF.** This app holds a WebSocket, not an HTTP
   server — if it sleeps, WhatsApp disconnects.
5. ⚠️ **Replicas = 1** (already set in [railway.json](railway.json)). Two replicas means
   two processes sharing one WhatsApp session, and WhatsApp logs both out.

### Linking after deploy

**Usually nothing to do.** The session lives in MongoDB, so a server starting with the
same `DB_STRING` picks up the existing login.

⚠️ Stop your local `npm run dev` first. One session running in two places gets both
disconnected.

If you ever need to re-link, terminal QR codes are unreadable in deployment logs, so
use a pairing code instead:

```
WA_PAIRING_NUMBER=8801XXXXXXXXX
```

Restart, and an 8-character code arrives **on Telegram**. In WhatsApp go to
**Linked Devices** → **Link a Device** → **"Link with phone number instead"** and type
it within 3 minutes. Clear the variable afterwards.

### What Telegram tells you

- 🟢 WhatsApp connected
- 🔴 Logged out — the stored session is cleared automatically, so a restart gives you a fresh pairing code
- ⚠️ Repeated disconnects

So the assistant can't die quietly on you.

### Health check

`GET /` returns:

```json
{ "success": true, "data": { "whatsapp": "connected", "bot": true } }
```

---

## A note on risk

Baileys is an unofficial WhatsApp client and using it goes against WhatsApp's Terms of
Service. The mitigations here are real — human-like delays, typing indicators, rate
limits, never messaging first, ignoring pre-startup messages, persisting the session so
re-logins are rare — but **the risk of a ban is not zero.**

If that risk isn't acceptable, `whatsapp/index.js` is the only file that talks to
WhatsApp. Swapping it for a Meta Cloud API adapter leaves everything else untouched.
