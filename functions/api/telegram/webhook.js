
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    throw new Error("Telegram environment variables are missing");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text
      })
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description || "Telegram sendMessage failed"
    );
  }

  return result;
}

export async function onRequestPost({ request, env }) {
  try {
    // 1. Telegram webhook secret шалгах
    const suppliedSecret = request.headers.get(
      "X-Telegram-Bot-Api-Secret-Token"
    );

    if (
      !env.TELEGRAM_WEBHOOK_SECRET ||
      suppliedSecret !== env.TELEGRAM_WEBHOOK_SECRET
    ) {
      console.warn("Telegram webhook unauthorized");
      return json({ error: "Unauthorized" }, 401);
    }

    // 2. Telegram update унших
    const update = await request.json().catch(() => null);

    const message = update?.message;
    const text = message?.text?.trim();

    console.log("Telegram update received", {
      hasMessage: Boolean(message),
      hasText: Boolean(text),
      messageText: text || "",
      fromId: String(message?.from?.id ?? ""),
      chatId: String(message?.chat?.id ?? "")
    });

    if (!message || !text) {
      return json({ ok: true });
    }

    // 3. Зөвхөн бот эзэмшигчийг зөвшөөрөх
    const ownerId = String(env.TELEGRAM_OWNER_ID || "");

    if (
      !ownerId ||
      String(message.from?.id) !== ownerId ||
      String(message.chat?.id) !== ownerId
    ) {
      console.warn("Telegram owner ID mismatch");
      return json({ ok: true });
    }

    // 4. /start команд
    if (text === "/start") {
      await sendTelegram(
        env,
        "Сайн байна уу!\n\n" +
        "Тайгын Түүх төлбөрийн удирдлагын бот ажиллаж байна.\n\n" +
        "Төлбөр баталгаажуулах команд:\n" +
        "/paid ORDER_ID"
      );

      return json({ ok: true });
    }

    // 5. /paid ORDER_ID команд шалгах
    const cleanText = text
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();

    const parts = cleanText.split(/\s+/);
    const command = (parts[0] || "").split("@")[0].toLowerCase();
    const orderId = parts[1] || "";

    if (
      command !== "/paid" ||
      !orderId ||
      parts.length !== 2 ||
      orderId.length > 100
    ) {
      if (command === "/paid") {
        await sendTelegram(
          env,
          "Командын хэлбэр буруу байна.\n\n" +
          "Зөв хэлбэр:\n" +
          "/paid ORDER_ID"
        );
      }

      return json({ ok: true });
    }

    // 6. D1 database шалгах
    if (!env.DB) {
      throw new Error("D1 database binding DB is missing");
    }

    const order = await env.DB.prepare(
      `SELECT id, user_id, story_id, amount_mnt, status
       FROM orders
       WHERE id = ?`
    )
      .bind(orderId)
      .first();

    if (!order) {
      await sendTelegram(
        env,
        "Захиалга олдсонгүй:\n" + orderId
      );

      return json({ ok: true });
    }

    if (order.status === "PAID") {
      await sendTelegram(
        env,
        "Энэ захиалга өмнө нь баталгаажсан байна."
      );

      return json({ ok: true });
    }

    if (order.status !== "PENDING") {
      await sendTelegram(
        env,
        "Захиалгын төлөв PENDING биш байна:\n" +
        String(order.status)
      );

      return json({ ok: true });
    }

    // 7. Төлбөр баталгаажуулах
    const updated = await env.DB.prepare(
      `UPDATE orders
       SET status = 'PAID',
           qpay_payment_id = 'MANUAL',
           paid_at = datetime('now')
       WHERE id = ?
         AND status = 'PENDING'
       RETURNING user_id, story_id`
    )
      .bind(orderId)
      .first();

    if (!updated) {
      await sendTelegram(
        env,
        "Захиалгын төлөв өөрчлөгдсөн байна. Дахин шалгана уу."
      );

      return json({ ok: true });
    }

    // 8. Зохиолын түгжээ тайлах
    await env.DB.prepare(
      `INSERT OR IGNORE INTO unlocks
       (user_id, story_id, order_id)
       VALUES (?, ?, ?)`
    )
      .bind(
        updated.user_id,
        updated.story_id,
        orderId
      )
      .run();

    // 9. Амжилтын мэдэгдэл
    await sendTelegram(
      env,
      "Төлбөр амжилттай баталгаажлаа!\n\n" +
      "Захиалгын ID: " + orderId + "\n" +
      "Дүн: " + order.amount_mnt + "₮\n" +
      "Зохиолын түгжээ тайлагдлаа."
    );

    return json({ ok: true });

  } catch (error) {
    console.error("Telegram webhook error:", error);

    return json(
      { error: "Internal server error" },
      500
    );
  }
}
