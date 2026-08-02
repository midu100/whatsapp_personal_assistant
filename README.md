# WhatsApp Personal AI Assistant

তোমার হয়ে WhatsApp এ client দের সাথে কথা বলে — portfolio বোঝায়, requirement নেয়, client qualify করে, price estimate দেয়, meeting ঠিক করে। যা জানে না সেটা তোমার কাছে পাঠায়, আর **তোমার উত্তর থেকে শিখে রাখে**।

Node 22 · Express 5 · Mongoose 9 · Baileys · Gemini · Telegraf

---

## ১. Setup

```bash
npm install               # হয়ে গেছে
# .env ফাইল বানানো আছে — শুধু উপরের ৫টা ফাঁকা জায়গা ভরো
npm run check             # সব ঠিক আছে কিনা যাচাই করে বলে দিবে
```

`.env` এ যা লাগবে:

| Key | কোথায় পাবে |
|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free, card লাগে না |
| `DB_STRING` | [cloud.mongodb.com](https://cloud.mongodb.com) M0 cluster (Network Access এ `0.0.0.0/0`) |
| `TELEGRAM_BOT_TOKEN` | Telegram এ [@BotFather](https://t.me/BotFather) → `/newbot` |
| `TELEGRAM_CHAT_ID` | [@userinfobot](https://t.me/userinfobot) কে `/start` |
| `OWNER_NUMBER` | তোমার WA নম্বর, country code সহ — `8801XXXXXXXXX` |
| `JWT_SECRET` | যেকোনো random string (শুধু admin dashboard এর জন্য) |

## ২. নিজের তথ্য বসাও

`seed/` ফোল্ডারের ফাইলগুলো আমি ভরে রেখেছি, কিন্তু **দুটো তোমাকে অবশ্যই বদলাতে হবে**:

| ফাইল | কেন |
|---|---|
| 🔴 `seed/rateCard.js` | সব দাম placeholder। Bot **শুধু এখান থেকেই** দাম বলে — ভুল থাকলে ভুল দাম বলবে |
| 🔴 `seed/sample_chats.md` | তোমার আসল client conversation বসাও। এটাই ঠিক করে bot "তোমার মতো" শোনাবে নাকি generic ChatGPT এর মতো |

বাকিগুলো (`profile.md`, `skills.md`, `portfolio.md`, `faq.md`, `policy.md`, `availability.md`) দরকারমতো ঠিক করে নিও।

Meeting এর আসল সময় `services/schedulingServices.js` এর `AVAILABILITY` array এ।

```bash
npm run seed          # seed/*.md → embed → MongoDB (বারবার চালানো যায়)
```

## ৩. ⚠️ Blacklist (bot চালু করার আগে)

Bot তোমার personal নম্বরে চলবে — মানে বন্ধু আর পরিবারের chat এও ঢুকবে।

`seed/seedBlacklist.js` খুলে চেনা নম্বরগুলো বসাও, তারপর:

```bash
npm run seed:blacklist
```

পরে যেকোনো chat এ WhatsApp থেকেই `/bl` লিখলেও blacklist হয়ে যাবে।

## ৪. WhatsApp ছাড়াই test করো

```bash
npm run test:chat              # নিজে টাইপ করে কথা বলো
npm run test:chat -- --script  # ২০টা বাঁধা প্রশ্ন একসাথে
```

Prompt tune করার সবচেয়ে ভালো উপায় এটাই — WhatsApp এ বারবার message পাঠালে ban এর ঝুঁকি বাড়ে।

## ৫. চালু করো

```bash
npm run dev     # local এ (file বদলালে auto restart)
npm start       # production / server এ
```

Terminal এ QR আসবে → WhatsApp → **Linked Devices** → **Link a Device** → scan।

একবার scan করলেই session MongoDB তে চলে যায় — এরপর restart বা deploy করলে আর scan করতে হবে না।

---

## Command

### WhatsApp এ (যেকোনো chat এ, শুধু তুমিই লিখতে পারবে)

| Command | কাজ |
|---|---|
| `/off` · `/on` | এই chat এ bot বন্ধ / চালু |
| `/pause 2h` | এই chat এ ২ ঘন্টা চুপ (`m` `h` `d`) |
| `/bl` · `/unbl` | Blacklist করা / বের করা |
| `/status` | এই chat এর অবস্থা + lead info |
| `/note <text>` | Contact এ নোট |
| `/kb <text>` | Knowledge base এ যোগ |
| `/botoff` · `/boton` | সব chat এ bot বন্ধ / চালু |
| `/stats` · `/pending` | হিসাব / pending প্রশ্ন |

### Telegram এ

`/pending` · `/ans <ticket> <উত্তর>` · `/leads` · `/meetings` · `/stats` · `/kb <text>` · `/say <number> <text>` · `/botoff` · `/boton`

Escalation notification এ **সরাসরি reply দিলেও** উত্তর চলে যাবে — `/ans` লেখা লাগবে না।

---

## কীভাবে কাজ করে

```
Client message
   ↓ whatsapp/listener → messageRouter        blacklist? group? command? paused?
   ↓ debouncer (৮ সেকেন্ড)                    ৪টা message একসাথে merge
   ↓ pipelineServices
      ├── memoryServices     শেষ ২০ message + rolling summary
      ├── languageDetect     bn / banglish / en
      ├── knowledgeServices  embed → cosine top-5
      ├── promptServices     persona + KB + tone + guardrails
      ├── geminiServices     function calling loop
      └── toolServices       saveRequirement · qualifyLead · estimatePrice
                             proposeMeetingSlots · bookMeeting · escalateToOwner
   ↓ humanize                read → typing → delay → ছোট ছোট message
```

### শেখার দুটো পথ

1. **Telegram** — notification আসে → তুমি উত্তর দাও → client এর কাছে যায় → `learnServices` সেটাকে reusable knowledge বানিয়ে KB তে রাখে
2. **তুমি নিজে WhatsApp app এ reply দিলে** — Baileys সেই `fromMe` message দেখে, শেষ প্রশ্নের সাথে জোড়া লাগিয়ে একই pipeline এ পাঠায়। সাথে ওই chat এ bot ২ ঘন্টা চুপ হয়ে যায় (handover)

### যেসব guardrail আছে

- **Voice note** — Gemini সরাসরি audio বোঝে, তাই voice note লেখায় রূপান্তর হয়ে একই pipeline এ যায় (২ মিনিটের বেশি হলে বাদ)
- **দাম কখনো LLM বলে না** — `estimatePrice` tool `seed/rateCard.js` থেকে হিসাব করে দেয়
- Deadline commit করে না, personal তথ্য দেয় না, না জানলে বানায় না
- Group, broadcast, status — কখনো নয়
- Bot চালু হওয়ার আগের পুরনো message এ কখনো reply যায় না
- নিজে থেকে কাউকে প্রথম message পাঠায় না
- Per-contact ঘন্টায় message limit

---

## Folder

```
controllers/  models/  routes/  middleware/     # admin REST (dashboard এর জন্য)
whatsapp/     Baileys socket, router, commands, humanize
services/     gemini, embedding, prompt, tools, pipeline, memory,
              knowledge, learn, pricing, scheduling, escalation, telegram
seed/         *.md + rateCard.js + seed script + test script
utils/        logger, languageDetect, chunker, rateLimit
dbConfig/     mongoose connect
```

## Admin REST

`POST /auth/signup` (প্রথম user টাই admin, তারপর বন্ধ) · `POST /auth/signin`
`GET /contact/all` · `GET /lead/all` · `GET /lead/stats` · `GET /knowledge/all` · `POST /knowledge/add` · `DELETE /knowledge/:id` · `GET /escalation/all` · `POST /escalation/:ticket/answer` · `GET /meeting/all` · `GET /meeting/slots`

সব admin route এ `authMiddleware` + `roleCheck('admin')`।

---

## Deploy

Baileys এর জন্য **always-on process** লাগে। **Vercel/Netlify চলবে না** (serverless), **Render free tier ও অচল** (১৫ মিনিট চুপ থাকলে ঘুমিয়ে যায়)।

| কোথায় | খরচ | কেমন |
|---|---|---|
| **Railway** | ~$5/মাস | সবচেয়ে সহজ, GitHub push করলেই deploy |
| **Oracle Cloud Always Free** | ৳0 চিরকাল | 4 vCPU / 24GB, কিন্তু Linux + pm2 নিজে setup করতে হবে |
| **Hetzner / DigitalOcean** | ~$5/মাস | পূর্ণ নিয়ন্ত্রণ |

### Railway এ deploy

1. Code GitHub এ push করো (`.env` push হবে না, `.gitignore` এ আছে)
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. **Variables** ট্যাবে `.env` এর সব লাইন paste করো (Railway এ "Raw Editor" আছে, একসাথে সব বসানো যায়)
4. ⚠️ **Settings → App Sleeping অবশ্যই OFF রাখো** — এটা on থাকলে HTTP request না এলে service ঘুমিয়ে যাবে, আর WhatsApp connection মরে যাবে
5. ⚠️ **Replicas = 1** রাখো ([railway.json](railway.json) এ সেট করা আছে)। ২টা replica মানে একই WhatsApp session দুই জায়গা থেকে ব্যবহার — WhatsApp তখন দুটোকেই logout করে দেয়

### Deploy এর পর link করবে কীভাবে

**সাধারণত কিছুই করতে হবে না।** Session MongoDB Atlas এ থাকে (file এ নয়), তাই local এ একবার scan করা থাকলে Railway একই `DB_STRING` দিয়ে চালু হয়েই ওই session তুলে নেয়।

⚠️ শুধু একটা শর্ত: **local এর `npm run dev` বন্ধ করো**। এক session দুই জায়গা থেকে চললে WhatsApp দুটোকেই কেটে দেয়।

নতুন করে link করতে হলে (logout হয়ে গেলে) — server এর log এ QR পড়া যায় না, তাই **pairing code** ব্যবহার করো:

```
Railway Variables এ যোগ করো:  WA_PAIRING_NUMBER=8801767982982
```

Restart করলে ৮ অক্ষরের একটা code **তোমার Telegram এ** চলে আসবে। WhatsApp → **Linked Devices** → **Link a Device** → **"Link with phone number instead"** → code টা টাইপ করো (৩ মিনিটের মধ্যে)।

Link হয়ে গেলে `WA_PAIRING_NUMBER` খালি করে দিও।

### Deploy এর পর যা Telegram এ পাবে

- 🟢 WhatsApp connected — চালু হলে
- 🔴 Logged out — session মরলে (তখন session নিজে থেকেই মুছে যায়, restart করলে নতুন pairing code আসবে)
- ⚠️ বারবার disconnect হলে

মানে server এ bot চুপচাপ মরে গেলেও তুমি জানতে পারবে।

## ⚠️ ঝুঁকি

Baileys unofficial — WhatsApp এর ToS violate করে। Anti-ban measure (human delay, typing, rate limit, পুরনো message skip, কখনো first message নয়) রাখা আছে, কিন্তু **ban এর ঝুঁকি শূন্য নয়**। ঝুঁকি নিতে না চাইলে `whatsapp/index.js` এর জায়গায় একটা Meta Cloud API adapter লিখতে হবে — বাকি কোনো ফাইল বদলাতে হবে না।
