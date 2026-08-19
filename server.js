const express = require('express');
const { sendMessage, requireEnv, setWebhook } = require('./lib/telegram');
const { chat } = require('./lib/claude');

const app = express();
app.use(express.json());

// Simple in-memory rolling conversation history (single user, resets on restart — fine for this use case)
const HISTORY_LIMIT = 20; // messages (user+assistant combined)
let history = [];

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'change-me';

app.get('/', (req, res) => {
  res.send('Omri events bot is running.');
});

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  // Ack immediately so Telegram doesn't retry/timeout while we call Claude
  res.sendStatus(200);

  try {
    const update = req.body;
    const message = update.message;
    if (!message || !message.text) return;

    const chatId = String(message.chat.id);
    const allowedChatId = String(requireEnv('TELEGRAM_CHAT_ID'));
    if (chatId !== allowedChatId) {
      console.warn(`Ignoring message from unauthorized chat_id=${chatId}`);
      return;
    }

    history.push({ role: 'user', content: message.text });
    if (history.length > HISTORY_LIMIT) {
      history = history.slice(history.length - HISTORY_LIMIT);
    }

    const reply = await chat(history);
    history.push({ role: 'assistant', content: reply });

    await sendMessage(reply, chatId);
  } catch (err) {
    console.error('Error handling update:', err);
    try {
      await sendMessage('משהו השתבש אצלי בעיבוד ההודעה — נסה שוב או תבדוק את הלוגים.');
    } catch (_) {
      // swallow — already logged above
    }
  }
});

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Webhook path: /webhook/${WEBHOOK_SECRET}`);

  // Self-register the Telegram webhook on boot using Render's auto-provided public URL.
  // Safe to call repeatedly — Telegram just overwrites the existing webhook with the same value.
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (externalUrl) {
    try {
      const url = `${externalUrl.replace(/\/$/, '')}/webhook/${WEBHOOK_SECRET}`;
      const result = await setWebhook(url);
      console.log('Telegram setWebhook result:', JSON.stringify(result));
    } catch (err) {
      console.error('Failed to auto-register Telegram webhook:', err);
    }
  } else {
    console.log('RENDER_EXTERNAL_URL not set — skipping auto webhook registration (set it manually with scripts/set-webhook.js).');
  }
});
