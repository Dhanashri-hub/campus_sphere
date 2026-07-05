import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!_client) {
    _client = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return _client;
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* streamGeminiResponse(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): AsyncGenerator<string> {
  let client: GoogleGenerativeAI;
  try {
    client = getClient();
  } catch (err) {
    logger.error({ err }, "Gemini client not initialized");
    yield "Gemini AI is not configured. Please set the GEMINI_API_KEY environment variable.";
    return;
  }

  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  const geminiHistory = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history: geminiHistory,
    generationConfig: {
      maxOutputTokens: 8192,
    },
  });

  try {
    const result = await chat.sendMessageStream(userMessage);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  } catch (err) {
    logger.error({ err }, "Gemini stream error");
    yield "\n\n[Error generating response. Please try again.]";
  }
}
