# CreateOS Email Feedback Agent

Telegram-triggered founder outreach emails from naman@nodeops.xyz, personalized by Claude using CreateOS brand context.

## How it works

Send this to the Telegram bot:

```
john@acme.com | John Doe | signed up from Product Hunt, asked about pricing
```

The agent generates a personalized 150-250 word email using Claude (grounded in CreateOS voice and product context), sends it from naman@nodeops.xyz via Gmail, and confirms back on Telegram.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/naman485/createos-skill-email-agent
cd createos-skill-email-agent
npm install
```

### 2. Get a Telegram bot token

1. Message @BotFather on Telegram → `/newbot`
2. Copy the bot token

### 3. Get your Telegram chat ID

1. Message your new bot anything
2. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Copy the `chat.id` value from the response

### 4. Get Gmail OAuth2 credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable Gmail API
3. Create OAuth2 credentials (Desktop app type)
4. Note the Client ID and Client Secret

Run the one-time token script:

```bash
GMAIL_CLIENT_ID=<your-id> GMAIL_CLIENT_SECRET=<your-secret> node scripts/get-gmail-token.js
```

Follow the browser prompt to authorize naman@nodeops.xyz. Copy the `GMAIL_REFRESH_TOKEN` from the terminal output.

### 5. Set environment variables

```bash
cp .env.example .env
# Fill in all values
```

### 6. Run locally

```bash
npm start
```

### 7. Deploy to CreateOS

Push to GitHub, then create a new project on CreateOS pointing to this repo:

- Runtime: `node:20`
- Run command: `npm start`
- Port: `3000`

After deploy, set all env vars in the CreateOS environment settings including:

```
WEBHOOK_URL=https://<your-createos-url>
```

The service registers the Telegram webhook automatically on startup.

## Running tests

```bash
npm test
```

## Message format

```
email | name | context note
```

Examples:
```
jane@stripe.com | Jane Smith | enterprise signup, asked about compliance
bob@example.com | Bob | signed up from Product Hunt, building an AI agent
```

The agent uses the email domain and note to personalize each email. No two emails are the same.
