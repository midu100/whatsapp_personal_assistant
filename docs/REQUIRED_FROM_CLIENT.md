# What We Need From You

A quick checklist of everything required to set up your WhatsApp AI Assistant.

If you're not sure how to get any of these, see **[CLIENT_SETUP.md](CLIENT_SETUP.md)** — it walks through every step with exact buttons to tap.

---

## Required

| # | What | Where it comes from | Looks like |
|---|---|---|---|
| 1 | **Google Gemini API key** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free, no credit card | `AIzaSy...` |
| 2 | **Telegram bot token** | [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` | `8123456789:AAH...` |
| 3 | **Telegram chat ID** | [@userinfobot](https://t.me/userinfobot) on Telegram → `/start` | `5777934190` |
| 4 | **WhatsApp number** | the number the assistant will run on | `8801712345678` |
| 5 | **Display name** | what the assistant calls you | `Rahim Traders` |
| 6 | **Mode** | `greeting` or `full` — see below | `greeting` |

> ⚠️ **After creating your Telegram bot, open it and press Start.** Telegram will not deliver a single message to you until you do. This is the most common setup mistake.

---

## Optional

| What | Why you might want it | Default if you skip it |
|---|---|---|
| **Claude API key** — [console.anthropic.com](https://console.anthropic.com) | Slightly more natural conversation. **Paid**, and it does *not* replace the Gemini key | Gemini handles everything |
| **Timezone** | Only if you're outside Bangladesh | `Asia/Dhaka` |
| **Quiet period** | Hours the assistant stays silent in a chat after handing it to you | `12` |
| **Numbers to never auto-reply to** | Family, close friends, customers you're already talking to | nobody blocked |

> **About the Claude key:** Claude cannot create embeddings or understand voice notes, so the Gemini key is still required even if you provide one. Claude is used only for writing replies.

---

## Choose your mode

**`greeting`** — the assistant answers greetings and small talk, introduces itself as your AI assistant, and forwards anything real to you on Telegram. Then it goes quiet in that chat.

> Pick this if you want a polite "we've seen your message" and nothing more.

**`full`** — everything above, plus it explains your services, collects project requirements, judges how serious a lead is, and books meetings.

> Pick this if you want the assistant to actually handle the first conversation.
> **Requires the extra content below.**

---

## Extra, for `full` mode only

Skip this entire section if you chose `greeting` — none of it gets used.

| What | Detail |
|---|---|
| **About your business** | What you do, where you're based, how long you've been running |
| **Services** | What you offer — and what you *don't*, so the assistant never over-promises |
| **Past work** | Projects, clients, links, photos |
| **Common questions** | The questions customers keep asking, with your real answers |
| **Policies** | Delivery, revisions, guarantees, returns |
| **Meeting hours** | Which days and times you take calls |
| 🔴 **Past conversations** | 20–30 real WhatsApp chats with customers, copied as text |

> The past conversations matter more than everything else combined. They're what make the assistant sound like *you* instead of a generic chatbot. Remove names and phone numbers before sending.

**Note:** the assistant never quotes a price, in either mode. Pricing questions always come to you.

---

## Send this back

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

---

## What we handle

You don't need to provide these — they're on us:

- Database and where your data is stored
- Hosting and keeping the assistant online 24/7
- Connecting your WhatsApp number
- All configuration and tuning

---

## Two things to know before you commit

**The assistant reads every message that arrives on that number.** That includes messages from friends and family. Tell us the numbers to exclude, and you can block any chat later by typing `/bl` in it from your own phone.

**This connects to WhatsApp in a way WhatsApp doesn't officially support.** We've built in safeguards — human-like delays, rate limits, never messaging anyone first — but there is a real, non-zero chance of the number being restricted. If that's not acceptable, tell us: there's an official Meta API route that costs more but carries no such risk.
