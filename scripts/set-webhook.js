// Run once after deploying the web service, to point Telegram at it:
//   RENDER_EXTERNAL_URL=https://your-service.onrender.com node scripts/set-webhook.js
const { setWebhook, requireEnv } = require('../lib/telegram');

async function main() {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || process.argv[2];
  if (!baseUrl) {
    console.error('Usage: RENDER_EXTERNAL_URL=https://your-service.onrender.com node scripts/set-webhook.js');
    process.exit(1);
  }
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || 'change-me';
  const url = `${baseUrl.replace(/\/$/, '')}/webhook/${secret}`;
  const result = await setWebhook(url);
  console.log(JSON.stringify(result, null, 2));
}

main();
