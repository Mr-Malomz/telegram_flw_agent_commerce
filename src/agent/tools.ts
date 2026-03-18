import { supabase } from "../database/supabase";
import {
  createFlwCustomer,
  createDynamicVirtualAccount,
} from "../services/flutterwave";
import crypto from "crypto";

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "search_perfumes",
      description:
        "Search the perfume catalog by keyword. Matches against name, brand, category, notes, and description.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (e.g. 'fresh', 'under 20000', 'floral', 'oud')",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_perfume",
      description: "Get detailed information about a specific perfume by its product ID.",
      parameters: {
        type: "object",
        properties: {
          product_id: {
            type: "string",
            description: "The product ID (e.g. 'p1', 'p2')",
          },
        },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_order",
      description:
        "Create a new order for a perfume. Use this when the customer confirms they want to purchase.",
      parameters: {
        type: "object",
        properties: {
          product_id: {
            type: "string",
            description: "The product ID to order",
          },
          user_id: {
            type: "string",
            description: "The user's database UUID",
          },
        },
        required: ["product_id", "user_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_payment",
      description:
        "Generate a virtual bank account for the customer to pay into. Use after create_order. Returns bank account details the customer should transfer to.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "The order UUID",
          },
        },
        required: ["order_id"],
      },
    },
  },
];

export async function executeTool(
  name: string,
  args: Record<string, string>
): Promise<string> {
  switch (name) {
    case "search_perfumes": {
      const query = args.query;
      const priceMatch = query.match(/under\s+[₦]?(\d[\d,]*)/i);

      let supabaseQuery = supabase.from("products").select("*");

      if (priceMatch) {
        const price = parseInt(priceMatch[1].replace(/,/g, ""));
        supabaseQuery = supabaseQuery.lte("price", price);
      }

      const textQuery = query.replace(/under\s+[₦]?\d[\d,]*/i, "").trim();
      if (textQuery) {
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${textQuery}%,brand.ilike.%${textQuery}%,category.ilike.%${textQuery}%,notes.ilike.%${textQuery}%,description.ilike.%${textQuery}%`
        );
      }

      const { data, error } = await supabaseQuery;
      if (error) return JSON.stringify({ error: error.message });
      if (!data || data.length === 0)
        return JSON.stringify({ message: "No perfumes found matching your search." });
      return JSON.stringify(data);
    }

    case "get_perfume": {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", args.product_id)
        .single();
      if (error) return JSON.stringify({ error: "Perfume not found" });
      return JSON.stringify(data);
    }

    case "create_order": {
      const { data: product } = await supabase
        .from("products")
        .select("price")
        .eq("id", args.product_id)
        .single();

      if (!product) return JSON.stringify({ error: "Product not found" });

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          product_id: args.product_id,
          user_id: args.user_id,
          amount: product.price,
          status: "pending",
        })
        .select()
        .single();

      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(order);
    }

    case "create_payment": {
      const { data: order } = await supabase
        .from("orders")
        .select("*, users(*), products(*)")
        .eq("id", args.order_id)
        .single();

      if (!order) return JSON.stringify({ error: "Order not found" });

      let customerId = order.users.flw_customer_id;

      if (!customerId) {
        const customerRes = await createFlwCustomer(
          order.users.first_name || "Customer",
          order.users.username || "User",
          `${order.users.telegram_id}@telegram.user`,
          crypto.randomUUID()
        );

        if (customerRes.status !== "success")
          return JSON.stringify({ error: "Failed to create payment customer" });

        customerId = customerRes.data.id;

        await supabase
          .from("users")
          .update({ flw_customer_id: customerId })
          .eq("id", order.users.id);
      }

      const reference = `ord${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
      console.log("[FLW] Generated reference:", reference, "length:", reference.length);

      const isSandbox = (process.env.FLW_BASE_URL || "").includes("sandbox");

      const vaRes = await createDynamicVirtualAccount(
        reference,
        customerId,
        order.amount,
        "NGN",
        `Payment for ${order.products.name}`,
        3600,
        crypto.randomUUID(),
        isSandbox ? "issuer:approved" : undefined
      );

      if (vaRes.status !== "success")
        return JSON.stringify({ error: "Failed to generate payment account" });

      const va = vaRes.data;

      await supabase
        .from("orders")
        .update({
          flw_reference: reference,
          virtual_account_number: va.account_number,
          virtual_account_bank: va.account_bank_name,
          virtual_account_expiry: va.account_expiration_datetime,
        })
        .eq("id", args.order_id);

      if (isSandbox) {
        // Auto-confirm sandbox payment synchronously before returning to agent
        console.log(`[SANDBOX] Auto-triggering webhook simulation for order: ${args.order_id}`);
        fetch(`http://localhost:${process.env.PORT || 3000}/webhooks/test-payment`)
          .then(res => res.json())
          .then(data => console.log(`[SANDBOX] Auto-confirm result:`, data))
          .catch(err => console.error(`[SANDBOX] Auto-confirm failed:`, err));
      }

      return JSON.stringify({
        account_number: va.account_number,
        bank_name: va.account_bank_name,
        amount: order.amount,
        reference,
        expires_at: va.account_expiration_datetime,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
