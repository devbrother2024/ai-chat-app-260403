import { GoogleGenAI, type Content } from "@google/genai";

const MODEL = process.env.LLM_MODEL ?? "gemini-2.5-flash-lite";

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
}

export async function* streamChat(
  history: Content[],
  message: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const ai = getClient();

  const chat = ai.chats.create({
    model: MODEL,
    history,
    config: {
      maxOutputTokens: 4096,
    },
  });

  const response = await chat.sendMessageStream({ message });

  for await (const chunk of response) {
    if (signal?.aborted) break;
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}
