// Best-effort failure alerting for the cron pipeline. Configure either (or
// both) webhook — if neither is set, this is a silent no-op so local/dev
// setups without alerting still work.

async function notifySlack(message: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) return
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  })
}

async function notifyTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message })
  })
}

// Fires alerts in parallel and swallows errors — a broken webhook must never
// take down the cron run itself.
export async function notifyFailure(message: string): Promise<void> {
  const results = await Promise.allSettled([notifySlack(message), notifyTelegram(message)])
  for (const r of results) {
    if (r.status === 'rejected') console.error('[notify] failed to send alert:', r.reason)
  }
}
