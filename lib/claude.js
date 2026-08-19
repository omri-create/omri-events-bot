const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

let client;
function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Missing required env var: ANTHROPIC_API_KEY');
    client = new Anthropic({ apiKey });
  }
  return client;
}

function readContext(file) {
  return fs.readFileSync(path.join(__dirname, '..', 'context', file), 'utf8');
}

function buildSystemPrompt() {
  const jobContext = readContext('job_context.md');
  const voiceGuide = readContext('voice_guide.md');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }); // YYYY-MM-DD

  return `You are Omri's personal Telegram assistant for his work as a youth movement instructor \
(Hashomer Hatzair) and community liaison to the Emek Yizrael council's youth department.

Today's date (Asia/Jerusalem): ${today}.

You talk to Omri only — never to kids or parents directly. Your job is to help him stay on top \
of his event schedule and to draft messages he will personally copy/forward into WhatsApp. Reply \
in whichever language Omri writes to you in (default to Hebrew if unclear). Keep your own replies \
to Omri concise and practical — he's usually messaging you in the middle of his day.

When drafting a forwardable message: follow the voice guide exactly for the stated audience \
(kids vs parents). Ask for any concrete fact you don't have (cost, exact time, location, \
registration link/deadline) instead of inventing one. If Omri doesn't say which audience, ask, \
unless it's obvious from context.

Omri can also tell you about things that AREN'T on your known schedule — reschedules, \
cancellations, or brand-new unexpected events. Treat these exactly like scheduled events: help \
him figure out what needs to go out and to whom, and draft it.

=== JOB CONTEXT ===
${jobContext}

=== MESSAGE VOICE GUIDE ===
${voiceGuide}
`;
}

/**
 * messages: array of {role: 'user'|'assistant', content: string}
 */
async function chat(messages) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages,
  });
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/**
 * Draft a short proactive reminder ping (not a forward-ready message — just the heads-up to Omri).
 */
async function draftReminderPing(event, daysUntil) {
  const anthropic = getClient();
  const prompt = `Write a short Telegram message TO OMRI HIMSELF (not to kids or parents) letting \
him know the following event is coming up in about ${daysUntil} day(s), so he can plan whether \
to send anything out. Mention the event name, date, and which world it's from if known (movement \
program / council event / his own recurring item). Keep it brief — 2-4 sentences, in Hebrew, no \
need for a formal greeting since this is a quick heads-up, not a broadcast message. End by asking \
if he wants you to draft the kids/parents versions.

Event: ${event.name_he}
Dates: ${event.date_start}${event.date_end && event.date_end !== event.date_start ? ' to ' + event.date_end : ''}
Category: ${event.category_label}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 400,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

module.exports = { chat, draftReminderPing, buildSystemPrompt };
