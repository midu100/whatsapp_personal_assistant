# Deploy Checklist — Internal

**Not for clients.** Steps to run once a client's answers arrive.
Client-facing docs: [REQUIRED_FROM_CLIENT.md](REQUIRED_FROM_CLIENT.md) · [CLIENT_SETUP.md](CLIENT_SETUP.md)

---

## 1. Check the submission is complete

Against [REQUIRED_FROM_CLIENT.md](REQUIRED_FROM_CLIENT.md):

- [ ] Gemini key present (required even if they also sent a Claude key)
- [ ] Telegram token + chat ID
- [ ] WhatsApp number — country code, digits only
- [ ] Display name
- [ ] Mode chosen
- [ ] `full` mode → business content, especially past conversations

Chase the past conversations if they're missing. Everything else can be filled in with defaults; that one can't.

## 2. Fill `.env`

Ours: `DB_STRING`, `JWT_SECRET`. Theirs: the rest.

```
GEMINI_API_KEY=          # theirs
CLAUDE_API_KEY=          # only if they sent one
AI_PROVIDER=             # claude only if they sent a Claude key
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
OWNER_NUMBER=
OWNER_NAME=
TIMEZONE=                # Asia/Dhaka unless stated
AGENT_MODE=              # greeting | full
```

Use a **separate MongoDB database per client** — one client's contacts, conversations and WhatsApp session must never be visible to another.

## 3. Content (`full` mode only)

- [ ] Their content into `seed/*.md`
- [ ] Past conversations into `seed/sample_chats.md` — strip the template block
- [ ] Meeting hours into `AVAILABILITY` in `services/schedulingServices.js`
- [ ] `seed/rateCard.js` project types match their business (prices unused — the assistant never quotes)

## 4. Verify

```bash
npm install
npm run check              # every key + connection, says what's broken
npm run seed               # greeting mode: still run it, harmless
npm run seed:blacklist     # after adding their numbers
```

`npm run check` sends a test message to their Telegram. **If it says "chat not found", they haven't pressed Start on their own bot** — send them back to Step 3 of CLIENT_SETUP. Nothing else will work until they do.

```bash
npm run test:chat -- --script
```

Read the output properly — language switching, no prices quoted, escalations firing. Fix prompts here, not after it's live.

## 5. Deploy

- [ ] Push to a **private** repo — `seed/` holds their business content
- [ ] Railway → New Project → Deploy from GitHub
- [ ] Variables → Raw Editor → paste the whole `.env`
- [ ] ⚠️ **App Sleeping OFF** — this holds a WebSocket, not an HTTP server
- [ ] ⚠️ **Replicas = 1** — two replicas share one WhatsApp session and WhatsApp logs both out
- [ ] MongoDB Atlas → Network Access → `0.0.0.0/0`

**Two traps already hit on this project:**

1. **Stop every other running instance before linking.** One session in two places gets both disconnected.
2. **New env vars go in the host's Variables too** — not just the local `.env`. Easy to add a setting locally, test it, deploy, and watch it fall back to the default.

## 6. Link the device

Session lives in MongoDB, so this is once per client.

- **Local first (easiest):** run locally, they scan the QR, then deploy — the server picks up the session with no scan.
- **Straight to server:** set `WA_PAIRING_NUMBER` to their number, restart, an 8-character code arrives on **their** Telegram. Clear the variable afterwards.

Confirm: `GET /` returns `{"whatsapp":"connected","bot":true}` and 🟢 lands on their Telegram.

## 7. Live smoke test

From a number that isn't theirs and isn't blacklisted:

| Send | Expect |
|---|---|
| `Hi` | Greeting + "I'm ___'s AI assistant", no pitch |
| `কেমন আছেন?` | Bangla script back |
| `koto porbe?` | No number quoted, escalates |
| a real question | 🔔 on their Telegram |
| reply to that notification | Answer reaches the customer |
| same question again | Assistant answers it itself |

Last two rows are the learning loop — worth demoing to them.

Then from their own phone: `/status`, `/botoff`, `/boton`. Make sure they know `/botoff` is the emergency brake before you hand over.

## 8. Hand over

- [ ] Command tables from CLIENT_SETUP, or the doc itself
- [ ] They've tested `/botoff` themselves
- [ ] They know to reply directly to Telegram notifications — no `/ans` needed
- [ ] They know it learns from their answers
- [ ] Ban risk stated in writing, before go-live, not after

## Notes

**Claude clients.** `AI_PROVIDER=claude` swaps only reply generation. Embeddings (knowledge search) and voice-note transcription stay on Gemini — Anthropic has no embeddings API and can't read audio. A Claude-only key breaks `full` mode and voice notes, so the Gemini key is mandatory either way. Default model is `claude-opus-5`; set `CLAUDE_MODEL` to change it.

**Re-seeding after content edits.** `npm run seed` deletes stale chunks, so editing an `.md` and re-running is safe. Knowledge learned from their replies and anything added via `/kb` is never touched.
