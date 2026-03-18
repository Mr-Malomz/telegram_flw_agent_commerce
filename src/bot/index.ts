import { Bot } from "grammy";
import { supabase } from "../database/supabase";
import { handleAgentMessage } from "../agent";

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.command("start", async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await supabase.from("users").upsert(
    {
      telegram_id: telegramId,
      first_name: ctx.from?.first_name || null,
      username: ctx.from?.username || null,
    },
    { onConflict: "telegram_id" }
  );

  await ctx.reply(
    "Welcome to *Scent House of Aromas* 🌸\n\n" +
      "I can help you discover perfumes and place orders.\n\n" +
      "Try asking:\n" +
      '• "Show me fresh perfumes"\n' +
      '• "What do you have under ₦20,000?"\n' +
      '• "Tell me about Velvet Rose"',
    { parse_mode: "Markdown" }
  );
});

bot.on("message:text", async (ctx) => {
  const telegramId = ctx.from.id;
  const userMessage = ctx.message.text;

  let { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();

  if (!user) {
    const { data: newUser } = await supabase
      .from("users")
      .insert({
        telegram_id: telegramId,
        first_name: ctx.from.first_name || null,
        username: ctx.from.username || null,
      })
      .select("id")
      .single();
    user = newUser;
  }

  if (!user) {
    await ctx.reply("Something went wrong. Please try /start again.");
    return;
  }

  const response = await handleAgentMessage(
    user.id,
    telegramId.toString(),
    userMessage
  );

  const imageMatch = response.match(/\[IMAGE:(https?:\/\/[^\]]+)\]/);

  if (imageMatch) {
    const imageUrl = imageMatch[1];
    const textWithoutImage = response.replace(/\[IMAGE:https?:\/\/[^\]]+\]\n?/, "").trim();

    await ctx.replyWithPhoto(imageUrl, {
      caption: textWithoutImage,
      parse_mode: "Markdown",
    });
  } else {
    await ctx.reply(response, { parse_mode: "Markdown" });
  }
});

bot.catch((err) => {
  console.error("Bot error:", err);
});
