require('dotenv').config();

const crypto = require('crypto');
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

const DRAFT_TTL_MS = 60 * 60 * 1000;
const pendingDrafts = new Map();

function newDraftId() {
  return crypto.randomBytes(6).toString('hex');
}

function expireOldDrafts() {
  const now = Date.now();
  for (const [id, draft] of pendingDrafts) {
    if (now - draft.createdAt > DRAFT_TTL_MS) pendingDrafts.delete(id);
  }
}

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

  await bot.sendMessage(chatId, `Drafting email for ${parsed.name} (${parsed.email})...`);

  let generated;
  try {
    generated = await generateEmail(parsed);
  } catch (err) {
    await bot.sendMessage(chatId, `Failed to generate email — ${err.message}`);
    return;
  }

  expireOldDrafts();
  const draftId = newDraftId();
  pendingDrafts.set(draftId, {
    email: parsed.email,
    name: parsed.name,
    subject: generated.subject,
    body: generated.body,
    createdAt: Date.now(),
  });

  const previewText = `📝 Draft for ${parsed.name} (${parsed.email})\n\nSubject: ${generated.subject}\n\n${generated.body}`;
  await bot.sendMessage(chatId, previewText, {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Send', callback_data: `send:${draftId}` },
        { text: '❌ Cancel', callback_data: `cancel:${draftId}` },
      ]],
    },
  });
}

async function handleCallbackQuery(query) {
  const chatId = String(query.message?.chat?.id);
  const data = query.data || '';

  if (chatId !== process.env.TELEGRAM_CHAT_ID) {
    await bot.answerCallbackQuery(query.id);
    return;
  }

  const [action, draftId] = data.split(':');
  const draft = pendingDrafts.get(draftId);

  if (!draft) {
    await bot.answerCallbackQuery(query.id, { text: 'Draft expired or not found' });
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id,
    }).catch(() => {});
    return;
  }

  if (action === 'cancel') {
    pendingDrafts.delete(draftId);
    await bot.answerCallbackQuery(query.id, { text: 'Cancelled' });
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id,
    }).catch(() => {});
    await bot.sendMessage(chatId, `❌ Draft for ${draft.name} cancelled. Not sent.`);
    return;
  }

  if (action === 'send') {
    await bot.answerCallbackQuery(query.id, { text: 'Sending...' });
    try {
      await sendEmail(draft.email, draft.subject, draft.body);
    } catch (err) {
      await bot.sendMessage(chatId, `Email approved but send failed — ${err.message}\n\nSubject: ${draft.subject}`);
      return;
    }
    pendingDrafts.delete(draftId);
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id,
    }).catch(() => {});
    await bot.sendMessage(chatId, `✅ Email sent to ${draft.name} (${draft.email})\nSubject: ${draft.subject}`);
    return;
  }

  await bot.answerCallbackQuery(query.id);
}

if (polling) {
  bot.on('message', handleMessage);
  bot.on('callback_query', handleCallbackQuery);
}

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Telegram polling: ${polling ? 'active' : 'disabled (no token)'}`);
  });
}

module.exports = { app, handleMessage, handleCallbackQuery, bot, pendingDrafts };
