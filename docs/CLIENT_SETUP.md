# Setting Up Your WhatsApp AI Assistant

This guide walks you through everything we need from you. No technical background required — just follow the steps in order. It should take about 30 minutes.

If you only want the checklist without the explanations, see **[REQUIRED_FROM_CLIENT.md](REQUIRED_FROM_CLIENT.md)**.

---

## What this assistant does

When someone messages your WhatsApp and you're not available, the assistant answers. It introduces itself honestly as your AI assistant, handles the greeting, and forwards anything that actually needs you — to your Telegram, instantly.

Here's a real conversation:

```
Customer:   Hi
Assistant:  Hello! I'm Rahim Traders' AI assistant. He's a bit busy right now
            — he'll get back to you personally very soon.

Customer:   kemon achen?
Assistant:  Alhamdulillah, ami bhalo achi. Uni ekhon byasto achen,
            nijei dekhe apnake janaben.

Customer:   apnara ki home delivery koren?
Assistant:  Eita uni nijei bhalo bolte parben.
            Ami onake janiye diyechi, uni apnake janaben.
                                            ↓
                          🔔 You get this on Telegram, with the
                             full conversation. You reply there,
                             and your answer goes to the customer.
```

It replies in whatever language the customer wrote in — Bangla, English, or Banglish — and never mixes them.

---

## Choose your mode

**`greeting`** — what you saw above. The assistant handles greetings and small talk, then hands everything real to you.

> Choose this if you want customers to feel acknowledged immediately, but you want to handle every real question yourself.

**`full`** — everything above, plus the assistant explains your services, collects project details through conversation, judges how serious an enquiry is, and books meetings.

> Choose this if you want the assistant to handle the whole first conversation.
> This requires the extra content in **Step 7**.

You can switch modes later — it's a single setting.

---

## Step 1 — Get your AI key

The assistant needs an AI service to think. **Google Gemini is required** and free.

1. Go to **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**
2. Sign in with any Google account
3. Click **Create API key**
4. Copy the key (starts with `AIza...`)

No credit card. No billing setup. The free allowance is enough for normal use.

### Optional: a Claude key as well

If you want slightly more natural conversation, you can also provide a key from **[console.anthropic.com](https://console.anthropic.com)**.

Two honest caveats:

- **Claude is paid** — you'd be billed per message by Anthropic.
- **It does not replace the Gemini key.** Claude cannot do two things the assistant needs: searching your business information, and understanding voice notes. Those stay on Gemini regardless. Claude only writes the replies.

Most clients skip this. Gemini alone works well.

---

## Step 2 — Create your Telegram bot

This is how the assistant reaches you when it needs an answer. Telegram is free.

1. Install **Telegram** on your phone if you don't have it
2. Search for **`@BotFather`** (it has a blue verified checkmark) and open it
3. Tap **Start**
4. Send: `/newbot`
5. It asks for a name — type anything you like, e.g. `Rahim Traders Assistant`
6. It asks for a username — this must **end in `bot`**, e.g. `rahim_traders_bot`
   (if the name is taken, try another)
7. BotFather replies with a message containing your token:

```
Use this token to access the HTTP API:
8123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Copy that whole line of numbers and letters.** That's your bot token.

> ⚠️ **Treat this token like a password.** Anyone who has it can control your bot. Don't post it publicly. If it ever leaks, send `/revoke` to BotFather and it becomes useless.

---

## Step 3 — Get your Telegram chat ID

The bot needs to know *which* Telegram account to message — yours.

1. In Telegram, search for **`@userinfobot`** and open it
2. Tap **Start**
3. It immediately replies with your details. Copy the **Id** number:

```
Id: 5777934190
First: Rahim
```

That number is your chat ID.

### 🚨 Now do this — it's the step everyone forgets

**Go back to the bot you created in Step 2, open it, and press Start.**

Search for your bot's username (`@rahim_traders_bot`), open the chat, tap **Start**.

Telegram will not deliver a single message to you until you've started a chat with your own bot. Skip this and everything will look correctly configured while you silently receive nothing. This is the single most common setup mistake.

---

## Step 4 — Your WhatsApp number

Send us the number the assistant will run on, with the country code and no spaces or symbols:

```
✅ 8801712345678
❌ +880 1712-345678
```

### How we connect it

We link the assistant as a **Linked Device** — the same mechanism as WhatsApp Web. You'll do this once:

1. Open **WhatsApp** on your phone
2. Go to **Settings** → **Linked Devices**
3. Tap **Link a Device**
4. Either scan the QR code we show you, or tap **"Link with phone number instead"** and enter the 8-character code we send to your Telegram

Then you're done.

### What this means — please read

**The assistant can see every message that arrives on that number.** That includes messages from friends and family, not just customers. This is unavoidable — it's one WhatsApp account. Step 5 is how you control it.

Things that might worry you, and shouldn't:

- **Your phone does not need to stay online.** Once linked, the assistant runs independently.
- **You can disconnect anytime.** Settings → Linked Devices → tap our device → Log Out. Instant.
- **You keep using WhatsApp normally.** Your phone still works exactly as before.
- **WhatsApp Business works too** — either app is fine.

One rule: don't let us link the same number from two places at once. If you're moving to a new server, tell us so we can disconnect the old one first.

---

## Step 5 — Numbers that should never get an automatic reply

Send us the numbers of people who should never receive an automated message. Typically:

- Family
- Close friends
- Customers you're already in the middle of a conversation with

Format them like your own number: `8801712345678`

The assistant will stay completely silent in those chats — as though it doesn't exist.

**You can also do this yourself later.** From your own phone, type `/bl` in any WhatsApp chat and that person is blocked from the assistant immediately. Type `/unbl` to undo it.

---

## Step 6 — Tell us your mode

Just say `greeting` or `full` (see the top of this guide).

Also send:

- **Display name** — what the assistant calls you. It says "I'm ___'s AI assistant." Use your name or your business name.
- **Timezone** — only if you're outside Bangladesh.

---

## Step 7 — Your business content

> **Skip this whole section if you chose `greeting` mode.** None of it gets used — the assistant deliberately isn't given any business information in that mode, so it can't get anything wrong.

For `full` mode, the assistant needs to know your business. Send whatever you have for each of these — bullet points are fine, it doesn't need to be polished.

**About your business**
Who you are, what you do, where you're based, how long you've been running.

**What you offer**
Your services or products, in plain language.

**What you *don't* offer**
Just as important. This stops the assistant from promising something you can't deliver. E.g. *"we don't do same-day delivery outside Dhaka"*.

**Past work**
Projects, clients, photos, links — whatever shows what you've done.

**Questions customers keep asking**
The five or ten questions you answer every week, **with your actual answers**. This is where most of the assistant's usefulness comes from.

**Your policies**
Delivery times, revisions, guarantees, returns.

**Meeting hours**
Which days and times you're available for calls, if you want the assistant booking meetings.

### 🔴 And the one that matters most

**20–30 real WhatsApp conversations you've had with customers.** Open WhatsApp, copy the text, paste it into a document, send it over.

This single input does more than everything else combined. It's what makes the assistant sound like *you* rather than a generic chatbot — your phrasing, your tone, how long your messages are, whether you say "ভাই" or "আপনি". Without it, the assistant is correct but characterless.

Remove names and phone numbers before sending. We only need the way you talk.

### A note on pricing

**The assistant never quotes a price** — in either mode, no matter what content you send. If a customer asks what something costs, it collects the details and sends them to you. Pricing is a judgment call, and a wrong number sent automatically is worse than a short wait.

---

## After launch: staying in control

### From your own phone, in any WhatsApp chat

Just type the command as a normal message. Only you can use these — they're invisible to customers.

| Type this | What happens |
|---|---|
| `/off` | Assistant stops replying in this chat |
| `/on` | Assistant starts replying in this chat |
| `/pause 2h` | Silent here for 2 hours (`30m`, `2h`, `1d`) |
| `/bl` | Block this contact permanently |
| `/unbl` | Unblock them |
| `/status` | See what's happening in this chat |
| `/note <text>` | Save a note about this contact |
| `/kb <text>` | Teach the assistant something new |
| `/botoff` | **Stop everything, everywhere, immediately** |
| `/boton` | Start again |
| `/stats` | Quick summary |
| `/pending` | Questions waiting for your answer |
| `/help` | The full list |

`/botoff` is your emergency brake. If anything feels wrong, type it and the assistant goes completely silent until you type `/boton`.

### On Telegram

| Command | What it does |
|---|---|
| `/pending` | Questions waiting for you |
| `/ans <number> <your answer>` | Send an answer to a customer |
| `/leads` | Recent enquiries (`full` mode) |
| `/meetings` | Upcoming meetings (`full` mode) |
| `/stats` | Summary |
| `/kb <text>` | Teach the assistant something |
| `/say <number> <message>` | Send a WhatsApp message to someone |
| `/botoff` · `/boton` | Emergency stop / restart |

**You usually won't type any of these.** When a notification arrives, just **reply to it** like a normal Telegram message — your reply goes straight to the customer.

### It learns from you

Every time you answer a forwarded question, the assistant remembers. The next customer who asks something similar gets your answer immediately, without involving you.

It also learns quietly: if you reply to a customer by hand on WhatsApp, the assistant notices, steps back from that conversation for two hours, and still learns from what you wrote.

Over a few weeks, it needs you less and less.

---

## Privacy — what's stored and where

- **Messages, contacts, and forwarded questions** are stored in a private database we manage for you.
- **Your WhatsApp session** is stored so the assistant doesn't need re-linking after every restart.
- **Message content is sent to Google** (Gemini) to generate replies — and to Anthropic as well, if you chose to add a Claude key.
- **Your Telegram token and any API keys** are stored as private server settings, never in the code, never shared.

If you ever want everything deleted, tell us and we'll remove it.

---

## ⚠️ One thing you should know before we link your number

This assistant connects to WhatsApp in a way WhatsApp doesn't officially support. It behaves like a linked device, which is why no special business account or approval is needed — and why it works with the number you already use.

We've built in real safeguards:

- Human-like typing delays before every reply
- Limits on how many messages go to one person per hour
- It never messages anyone first — only ever replies
- It ignores every message that arrived before it started, so connecting doesn't trigger a flood of replies to old chats
- It never posts in groups, broadcasts, or status

But we won't pretend the risk is zero: **WhatsApp could restrict the number.** We haven't seen it happen with these safeguards in place, and it's a genuine possibility rather than a certainty.

If that risk isn't acceptable for your business, tell us. There's an official Meta WhatsApp Business API route with no such risk — it costs more, needs a separate phone number, and takes longer to set up, but it's fully sanctioned. We're happy to go that way instead.

---

## Send everything back

Copy this, fill it in, and send it in one message.

```
Gemini API key    :
Telegram token    :
Telegram chat ID  :
WhatsApp number   :
Display name      :
Mode              :  greeting / full

--- optional ---
Claude API key    :
Timezone          :
Quiet hours       :
Never auto-reply to:
  1.
  2.
  3.

--- full mode only ---
About your business:
Services you offer:
Services you DON'T offer:
Past work / links :
Common questions + your answers:
Policies          :
Meeting hours     :
Past conversations: (attach as a text file)
```

Once we have this, setup takes about a day. We'll send you a message on Telegram when the assistant is live — and you can test it yourself before any real customer sees it.
