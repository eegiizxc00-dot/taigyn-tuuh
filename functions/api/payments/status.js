
import { json, bodyJson, currentUser } from '../../_shared.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ error: 'Database тохиргоо дутуу байна.' }, 503);
  }

  const user = await currentUser(request, env);

  if (!user) {
    return json({ error: 'Хэрэглэгчийн сесс олдсонгүй.' }, 401);
  }

  const body = await bodyJson(request);
  const orderId = String(body?.orderId || '').trim();

  if (!orderId) {
    return json({ error: 'Захиалгын дугаар шаардлагатай.' }, 400);
  }

  const order = await env.DB.prepare(
    `SELECT id, status, amount_mnt
     FROM orders
     WHERE id = ? AND user_id = ?`
  ).bind(orderId, user.id).first();

  if (!order) {
    return json({ error: 'Захиалга олдсонгүй.' }, 404);
  }

  const unlocked = await env.DB.prepare(
    `SELECT 1 FROM unlocks
     WHERE user_id = ?
       AND order_id = ?`
  ).bind(user.id, order.id).first();

  return json({
    orderId: order.id,
    status: order.status,
    amount: order.amount_mnt,
    paid: order.status === 'PAID' && Boolean(unlocked),
    unlocked: Boolean(unlocked)
  });
}
