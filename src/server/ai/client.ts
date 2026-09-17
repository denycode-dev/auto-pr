import OpenAI from "openai";

import { getDynamicSystemConfig } from "@/server/db/settings";

const defaultAiTimeout = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 240000;

/**
 * Get dynamic OpenAI client instance configured with database / env settings
 */
export async function getAiClient(): Promise<{ client: OpenAI; model: string }> {
  const dynamic = await getDynamicSystemConfig();
  const client = new OpenAI({
    baseURL: dynamic.ai.baseUrl,
    apiKey: dynamic.ai.apiKey,
    timeout: defaultAiTimeout,
    maxRetries: 0,
  });
  return { client, model: dynamic.ai.model };
}

// Fallback singleton for sync imports
export const aiClient = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://organization.api-github.com/v1",
  apiKey: process.env.QODEER_API_KEY || "",
  timeout: defaultAiTimeout,
  maxRetries: 0,
});

export const DEFAULT_AI_MODEL = process.env.OPENAI_MODEL || "deepseek-flash";
