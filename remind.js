// Entry point for the Render Cron Job — run once daily.
// Checks schedule.json for anything due a reminder today and pings Omri on Telegram.
const { sendMessage } = require('./lib/telegram');
const { getDueReminders } = require('./lib/schedule');
const { draftReminderPing } = require('./lib/claude');

async function main() {
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const due = getDueReminders(todayIso);

  if (due.length === 0) {
    console.log(`[${todayIso}] No reminders due today.`);
    return;
  }

  console.log(`[${todayIso}] ${due.length} reminder(s) due.`);
  for (const { event, daysUntil } of due) {
    try {
      const text = await draftReminderPing(event, daysUntil);
      await sendMessage(text);
      console.log(`Sent reminder for: ${event.name_he} (${event.date_start})`);
    } catch (err) {
      console.error(`Failed to send reminder for ${event.name_he}:`, err);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error in remind.js:', err);
    process.exit(1);
  });
