const fs = require('fs');
const path = require('path');

const OFFSET_DAYS = {
  '3_days': 3,
  '1_week': 7,
  '2_weeks': 14,
  '1_month': 30,
  '45_days': 45,
};

function loadSchedule() {
  const p = path.join(__dirname, '..', 'schedule.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function toDate(iso) {
  // Parse as a plain calendar date (no timezone shift)
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Returns events whose reminder is due "today" (an ISO date string, Asia/Jerusalem-local).
 * An event is due for a given offset if (event.date_start - offsetDays) === today.
 */
function getDueReminders(todayIso) {
  const schedule = loadSchedule();
  const today = toDate(todayIso);
  const due = [];
  for (const ev of schedule) {
    if (!ev.date_start) continue;
    const start = toDate(ev.date_start);
    for (const offsetKey of ev.reminder_offsets || []) {
      const offsetDays = OFFSET_DAYS[offsetKey];
      if (offsetDays == null) continue;
      const diff = daysBetween(today, start);
      if (diff === offsetDays) {
        due.push({ event: ev, offsetKey, daysUntil: offsetDays });
      }
    }
  }
  return due;
}

module.exports = { loadSchedule, getDueReminders, OFFSET_DAYS };
