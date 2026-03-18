import { Router, Request, Response } from "express";
import { supabase } from "../database/supabase";
import { verifyCharge } from "../services/flutterwave";
import { bot } from "../bot";
import crypto from "crypto";

const router = Router();

router.post("/flutterwave", async (req: Request, res: Response) => {
  const secretHash = process.env.FLW_WEBHOOK_SECRET_HASH;
  const signature = req.headers["flutterwave-signature"] as string;

  // Verify Webhook Signature
  if (secretHash) {
    if (!signature) {
      return res.status(401).json({ error: "Missing signature" });
    }

    const payloadBuffer = (req as any).rawBody || "";
    const expectedHash = crypto
      .createHmac("sha256", secretHash)
      .update(payloadBuffer)
      .digest("base64");

    if (signature !== expectedHash) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const payload = req.body;

  // We only care about successful completed charges
  if (payload?.event !== "charge.completed" && payload?.type !== "charge.completed" || payload?.data?.status !== "succeeded") {
    return res.status(200).json({ status: "ok" });
  }

  const { reference, id: chargeId } = payload.data;

  try {
    // Verify the charge really happened via Flw API
    const verification = await verifyCharge(chargeId);
    if (verification.data.status !== "succeeded") {
      return res.status(400).json({ error: "Charge verification failed" });
    }
  } catch (err) {
    console.error("[WEBHOOK] Charge verification API error:", err);
  }

  // Find order by reference and update to paid
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("flw_reference", reference)
    .select("*, users(*), products(*)")
    .single();

  if (orderError || !order) {
    console.error("[WEBHOOK] Order lookup failed or not found:", orderError?.message);
    return res.status(200).json({ status: "ok" }); // Return 200 so Flw doesn't retry
  }

  // Send Telegram confirmation
  const amount = Number(order.amount).toLocaleString();
  const message =
    `✅ *Payment received!*\n\n` +
    `Your order for *${order.products.name}* has been confirmed.\n` +
    `Order ID: \`${order.id}\`\n` +
    `Amount: ₦${amount}`;

  await bot.api.sendMessage(order.users.telegram_id, message, {
    parse_mode: "Markdown",
  });

  return res.status(200).json({ status: "ok" });
});

export default router;
