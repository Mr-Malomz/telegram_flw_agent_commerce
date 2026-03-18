# Scent House of Aromas

An AI-powered perfume shop that lives entirely inside Telegram. Customers browse, ask questions, place orders, and pay — all without leaving a chat window.

Built with **OpenAI GPT-4o** (AI agent), **grammY** (Telegram bot), **Flutterwave** (payments via dynamic virtual accounts), and **Supabase** (database).

## How It Works

1. Customer messages the Telegram bot in natural language
2. The AI agent searches products, answers questions, and handles purchases using tool-calling
3. When the customer wants to buy, Flutterwave generates a temporary virtual bank account
4. Customer transfers the amount from their banking app
5. Flutterwave confirms payment via webhook → customer gets a confirmation in the chat

No frontend. No checkout pages. No redirects. Just a conversation.

## Tech Stack

- **TypeScript + Express** — Server and API
- **grammY** — Telegram bot framework
- **OpenAI** — GPT-4o with tool-calling for the conversational agent
- **Supabase** — PostgreSQL for users, products, and orders
- **Flutterwave** — Dynamic virtual accounts for payment collection

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

You'll need:
- A Telegram bot token from [@BotFather](https://t.me/botfather)
- An OpenAI API key
- Supabase project URL and service role key
- Flutterwave client ID, client secret, and webhook secret hash

### 3. Set up the database

Run `src/database/schema.sql` and `src/database/seed.sql` in your Supabase SQL Editor.

### 4. Run

```bash
npm run dev
```

Open Telegram, find your bot, and send `/start`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |

## Project Structure

```
src/
├── agent/          # AI agent — prompt, tool definitions, tool-calling loop
├── bot/            # Telegram bot handlers
├── database/       # Schema, seed data, Supabase client
├── routes/         # REST API + Flutterwave webhook
├── services/       # Flutterwave API wrapper
└── server.ts       # Express entry point
```

