import type { GenerateAdInput } from "@/src/ad-schema";
import { buildAdPrompt } from "@/src/ad-prompt";
import { getGeminiConfig } from "@/src/config";

type GeminiPart = {
  text?: string;
  inlineData?: {
    data?: string;
    mimeType?: string;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  error?: { code?: number; message?: string; status?: string };
};

export type GeneratedAd = {
  data: string;
  mimeType: string;
  model: string;
  prompt: string;
  notes?: string;
};

const MAX_IMAGE_BASE64_CHARS = 3_500_000;

export async function generateAdImage(
  input: GenerateAdInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<GeneratedAd> {
  const config = getGeminiConfig();
  const prompt = buildAdPrompt(input);
  const endpoint = `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`;

  const response = await fetchImplementation(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: input.format },
      },
    }),
    signal: AbortSignal.timeout(110_000),
  });

  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    const detail = payload.error?.message || `HTTP ${response.status}`;
    throw new Error(`Gemini image generation failed: ${detail}`);
  }

  const parts = payload.candidates?.flatMap(
    (candidate) => candidate.content?.parts || [],
  );
  const imagePart = parts?.find((part) => part.inlineData?.data)?.inlineData;
  const notes = parts
    ?.filter((part) => part.text)
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!imagePart?.data) {
    const finishReason = payload.candidates?.[0]?.finishReason || "unknown";
    throw new Error(
      `Gemini returned no image. Finish reason: ${finishReason}.${notes ? ` Detail: ${notes}` : ""}`,
    );
  }

  if (imagePart.data.length > MAX_IMAGE_BASE64_CHARS) {
    throw new Error(
      "Generated image exceeded the safe inline MCP response size. Configure object storage before retrying this output size.",
    );
  }

  return {
    data: imagePart.data,
    mimeType: imagePart.mimeType || "image/png",
    model: config.model,
    prompt,
    notes: notes || undefined,
  };
}
