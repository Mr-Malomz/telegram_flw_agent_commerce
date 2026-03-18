import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./prompt";
import { toolDefinitions, executeTool } from "./tools";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Message = OpenAI.ChatCompletionMessageParam;

const conversationHistory = new Map<string, Message[]>();

export async function handleAgentMessage(
  userId: string,
  telegramId: string,
  userMessage: string
): Promise<string> {
  const history = conversationHistory.get(telegramId) || [];

  history.push({ role: "user", content: userMessage });

  const messages: Message[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nCurrent user's database ID: ${userId}` },
    ...history,
  ];

  let response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools: toolDefinitions,
  });

  let choice = response.choices[0];

  // Handle tool call loop — agent may chain multiple tools
  while (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
    const assistantMessage = choice.message;
    history.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls!;
    for (const toolCall of toolCalls) {
      const fn = toolCall as { id: string; type: "function"; function: { name: string; arguments: string } };
      const args = JSON.parse(fn.function.arguments);
      const result = await executeTool(fn.function.name, args);

      history.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nCurrent user's database ID: ${userId}` },
        ...history,
      ],
      tools: toolDefinitions,
    });

    choice = response.choices[0];
  }

  const reply = choice.message.content || "I couldn't process that. Please try again.";
  history.push({ role: "assistant", content: reply });

  // Keep history manageable (last 20 messages)
  if (history.length > 20) {
    conversationHistory.set(telegramId, history.slice(-20));
  } else {
    conversationHistory.set(telegramId, history);
  }

  return reply;
}
