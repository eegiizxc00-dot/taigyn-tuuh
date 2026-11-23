
import {
  json,
  bodyJson,
  currentUser,
  randomId,
  signSession,
  sessionCookie
} from '../../_shared.js';

function response(data, status = 200, cookie = null) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  };

  if (cookie) headers['Set-Cookie'] = cookie;

  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

async function notifyAdmin(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;

  const result = await fetch(
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

  if (!result.ok) throw new Error('Telegram notification failed');
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.SESSION_SECRET) {
    return json({ error: 'Серверийн тохиргоо дутуу байна.' }, 503);
  }

  const body = await bodyJson(request);
  const slug = String(body?.slug || '').trim();

  if (!slug) {
    return json({ error: 'Зохиол сонгоно уу.' }, 400);
  }

  const story = await env.DB.prepare(
    `SELECT id, title, price_mnt
     FROM stories
     WHERE slug = ? AND published = 1`
  ).bind(slug).first();

  if (!story) {
    return json({ error: 'Зохиол олдсонгүй.' }, 404);
  }

  let user = await currentUser(request, env);
  let cookie = null;

  // Нэвтрэлтгүй уншигчид дотоод зочин эрх үүсгэнэ.
  if (!user) {
    const id = randomId();
    const email = `guest-${id}@guest.invalid`;

    await env.DB.prepare(
      `INSERT INTO users
       (id, email, password_hash, password_salt)
       VALUES (?, ?, ?, ?)`
    ).bind(
      id,
      email,
      randomId() + randomId(),
      randomId()
    ).run();

    user = { id, email };

    const token = await signSession(user, env.SESSION_SECRET);
    cookie = sessionCookie(
      token,
      new URL(request.url).protocol === 'https:'
    );
  }

  const unlocked = await env.DB.prepare(
    `SELECT 1 FROM unlocks u JOIN orders o ON o.id=u.order_id AND o.user_id=u.user_id AND o.story_id=u.story_id
     WHERE u.user_id = ? AND u.story_id = ? AND o.status='PAID'
     AND datetime(COALESCE(o.paid_at,u.unlocked_at), '+48 hours')>datetime('now')`
  ).bind(user.id, story.id).first();

  if (unlocked) {
    return response({ alreadyUnlocked: true }, 200, cookie);
  }

  // Өмнөх хүлээгдэж буй захиалгыг дахин ашиглана.
  const pending = await env.DB.prepare(
    `SELECT id FROM orders
     WHERE user_id = ?
       AND story_id = ?
       AND status = 'PENDING'
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(user.id, story.id).first();

  if (pending) {
    return response({
      orderId: pending.id,
      amount: story.price_mnt,
      currency: 'MNT',
      bank: 'ХААН Банк',
      accountNumber: '5622631514',
      iban: '47000500',
      accountName: 'NERGUI ENKHBAT',
      message: 'Шилжүүлэг хийсний дараа төлбөр баталгаажихыг хүлээнэ үү.'
    }, 200, cookie);
  }

  const orderId = randomId();
  const sender = `TT-${orderId.replaceAll('-', '').slice(0, 24)}`;

  await env.DB.prepare(
    `INSERT INTO orders
     (id, user_id, story_id, amount_mnt, status, qpay_sender_invoice_no)
     VALUES (?, ?, ?, ?, 'PENDING', ?)`
  ).bind(
    orderId,
    user.id,
    story.id,
    story.price_mnt,
    sender
  ).run();

  try {
    await notifyAdmin(
      env,
      '📚 Тайгын Түүх — Шинэ захиалга\n\n' +
      `Зохиол: ${story.title}\n` +
      `Дүн: ${story.price_mnt}₮\n` +
      `Захиалгын ID: ${orderId}\n\n` +
      `Баталгаажуулах команд:\n/paid ${orderId}`
    );
  } catch (error) {
    console.error('Telegram notification error:', error);
  }

  return response({
    orderId,
    amount: story.price_mnt,
    currency: 'MNT',
    bank: 'ХААН Банк',
    accountNumber: '5622631514',
    iban: '47000500',
    accountName: 'NERGUI ENKHBAT',
    message: 'Шилжүүлэг хийсний дараа төлбөр баталгаажихыг хүлээнэ үү.'
  }, 200, cookie);
}
