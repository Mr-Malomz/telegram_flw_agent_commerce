import { Router } from "express";
import { supabase } from "../database/supabase";
import { createFlwCustomer, createDynamicVirtualAccount } from "../services/flutterwave";
import crypto from "crypto";

const router = Router();

router.post("/", async (req, res) => {
  const { order_id } = req.body;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, users(*), products(*)")
    .eq("id", order_id)
    .single();

  if (orderError || !order)
    return res.status(404).json({ error: "Order not found" });

  let customerId = order.users.flw_customer_id;

  if (!customerId) {
    const customerRes = await createFlwCustomer(
      order.users.first_name || "Customer",
      order.users.username || "User",
      `${order.users.telegram_id}@telegram.user`,
      crypto.randomUUID()
    );

    if (customerRes.status !== "success")
      return res.status(500).json({ error: "Failed to create Flutterwave customer" });

    customerId = customerRes.data.id;

    await supabase
      .from("users")
      .update({ flw_customer_id: customerId })
      .eq("id", order.users.id);
  }

  const reference = `ord${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

  const vaRes = await createDynamicVirtualAccount(
    reference,
    customerId,
    order.amount,
    "NGN",
    `Payment for ${order.products.name}`,
    3600,
    crypto.randomUUID()
  );

  if (vaRes.status !== "success")
    return res.status(500).json({ error: "Failed to create virtual account" });

  const va = vaRes.data;

  await supabase
    .from("orders")
    .update({
      flw_reference: reference,
      virtual_account_number: va.account_number,
      virtual_account_bank: va.account_bank_name,
      virtual_account_expiry: va.account_expiration_datetime,
    })
    .eq("id", order_id);

  res.json({
    account_number: va.account_number,
    bank_name: va.account_bank_name,
    amount: order.amount,
    reference,
    expires_at: va.account_expiration_datetime,
  });
});

export default router;
