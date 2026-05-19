require('dotenv').config();

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { parseMessage } = require('./parser');
const { generateEmail } = require('./email-gen');
const { sendEmail } = require('./gmail');

const app = express();
app.use(express.json());

const token = process.env.TELEGRAM_BOT_TOKEN;
const polling = !!token;
const bot = new TelegramBot(token || 'placeholder', { polling });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

async function handleMessage(msg) {
  const chatId = String(msg.chat?.id);
  const text = msg.text;

  console.log(`[telegram] incoming chat_id=${chatId} expected=${process.env.TELEGRAM_CHAT_ID} text=${JSON.stringify(text)}`);

  if (chatId !== process.env.TELEGRAM_CHAT_ID) return;

  const parsed = parseMessage(text);

  if (!parsed) {
    await bot.sendMessage(chatId, 'Format: email | name | note\n\nExample:\njohn@acme.com | John Doe | signed up from Product Hunt');
    return;
  }

  let generated;
  try {
    generated = await generateEmail(parsed);
  } catch (err) {
    await bot.sendMessage(chatId, `Failed to generate email — ${err.message}`);
    return;
  }

  try {
    await sendEmail(parsed.email, generated.subject, generated.body);
  } catch (err) {
    await bot.sendMessage(chatId, `Email generated but send failed — ${err.message}\n\nSubject: ${generated.subject}`);
    return;
  }

  const preview = generated.body.split('\n').slice(0, 2).join(' ');
  await bot.sendMessage(
    chatId,
    `✓ Email sent to ${parsed.name} (${parsed.email})\n\nSubject: ${generated.subject}\nPreview: ${preview}`
  );
}

if (polling) {
  bot.on('message', handleMessage);
}

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Telegram polling: ${polling ? 'active' : 'disabled (no token)'}`);
  });
}

module.exports = { app, handleMessage, bot };
