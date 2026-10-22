
import { json } from '../../../_shared.js';

async function sendTelegram(env, text) {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text
      })
    }
  );

  if (!response.ok) {
    throw new Error('Telegram message failed');
  }
}

export async function onRequestPost({ request, env }) {
  const suppliedSecret = request.headers.get(
    'X-Telegram-Bot-Api-Secret-Token'
  );

  if (
    !env.TELEGRAM_WEBHOOK_SECRET ||
    suppliedSecret !== env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const update = await request.json().catch(() => null);
  const message = update?.message;
  const text = message?.text?.trim();

  if (!message || !text) {
    return json({ ok: true });
  }

  const ownerId = String(env.TELEGRAM_OWNER_ID || '');
  if (
    String(message.from?.id) !== ownerId ||
    String(message.chat?.id) !== ownerId
  ) {
    return json({ ok: true });
  }

  if (text === '/start') {
    await sendTelegram(
      env,
      'Тайгын Түүх бот ажиллаж байна. Төлбөр баталгаажуулах: /paid ORDER_ID'
    );
    return json({ ok: true });
  }

  const match = text.match(/^\/paid(?:@\w+)?\s+([a-f0-9-]{36})$/i);

  if (!match) {
    if (text.startsWith('/paid')) {
      await sendTelegram(
        env,
        'Командын хэлбэр: /paid ORDER_ID\nORDER_ID нь бүтэн захиалгын ID байна.'
      );
    }
    return json({ ok: true });
  }

  const orderId = match[1];

  const order = await env.DB.prepare(
    `SELECT id, user_id, story_id, amount_mnt, status
     FROM orders WHERE id = ?`
  ).bind(orderId).first();

  if (!order) {
    await sendTelegram(env, 'Захиалга олдсонгүй: ' + orderId);
    return json({ ok: true });
  }

  if (order.status === 'PAID') {
    await sendTelegram(env, 'Энэ захиалга өмнө нь баталгаажсан байна.');
    return json({ ok: true });
  }

  if (order.status !== 'PENDING') {
    await sendTelegram(
      env,
      'Захиалгын төлөв PENDING биш байна: ' + order.status
    );
    return json({ ok: true });
  }

  const updated = await env.DB.prepare(
    `UPDATE orders
     SET status = 'PAID',
         qpay_payment_id = 'MANUAL',
         paid_at = datetime('now')
     WHERE id = ? AND status = 'PENDING'
     RETURNING user_id, story_id`
  ).bind(orderId).first();

  if (!updated) {
    await sendTelegram(
      env,
      'Захиалга өөрчлөгдсөн байна. Төлөвийг дахин шалгана уу.'
    );
    return json({ ok: true });
  }

  await env.DB.prepare(
    `INSERT OR IGNORE INTO unlocks (user_id, story_id, order_id)
     VALUES (?, ?, ?)`
  ).bind(updated.user_id, updated.story_id, orderId).run();

  await sendTelegram(
    env,
    `Захиалга баталгаажлаа.\nID: ${orderId}\nДүн: ${order.amount_mnt}₮\nЗохиолын түгжээ тайлагдлаа.`
  );

  return json({ ok: true });
}

