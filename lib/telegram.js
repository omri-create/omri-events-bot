const TELEGRAM_API = 'https://api.telegram.org';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function sendMessage(text, chatId) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const targetChatId = chatId || requireEnv('TELEGRAM_CHAT_ID');
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: targetChatId,
      text,
      parse_mode: undefined, // plain text — avoids Markdown/HTML escaping headaches with Hebrew punctuation
      disable_web_page_preview: false,
    }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('Telegram sendMessage failed:', data);
    throw new Error(`Telegram sendMessage failed: ${data.description || res.status}`);
  }
  return data.result;
}

async function setWebhook(url) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const apiUrl = `${TELEGRAM_API}/bot${token}/setWebhook`;
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

module.exports = { sendMessage, setWebhook, requireEnv };
