import OpenAI from "openai";

import { getAiProviders, getDynamicSystemConfig } from "@/server/db/settings";

const defaultAiTimeout = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 240000;

export interface GetAiClientOptions {
  providerId?: string;
  model?: string;
}

/**
 * Get dynamic OpenAI client instance configured with chosen or default provider
 */
export async function getAiClient(options?: GetAiClientOptions): Promise<{
  client: OpenAI;
  model: string;
  providerId: string;
  providerName: string;
}> {
  const providers = await getAiProviders();
  let targetProvider = options?.providerId ? providers.find((p) => p.id === options.providerId) : undefined;

  if (!targetProvider) {
    targetProvider = providers.find((p) => p.isDefault) || providers[0];
  }

  const dynamic = await getDynamicSystemConfig();
  const baseUrl = targetProvider?.baseUrl ?? dynamic.ai.baseUrl;
  const apiKey = targetProvider?.apiKey ?? dynamic.ai.apiKey;
  const model = options?.model ?? targetProvider?.defaultModel ?? dynamic.ai.model ?? "deepseek-flash";
  const providerId = targetProvider?.id ?? dynamic.ai.providerId ?? "provider-default";
  const providerName = targetProvider?.name ?? dynamic.ai.providerName ?? "Default AI Gateway";

  const client = new OpenAI({
    baseURL: baseUrl,
    apiKey: apiKey,
    timeout: defaultAiTimeout,
    maxRetries: 0,
  });

  return { client, model, providerId, providerName };
}

// Fallback singleton for sync imports
export const aiClient = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://organization.api-github.com/v1",
  apiKey: process.env.QODEER_API_KEY || "",
  timeout: defaultAiTimeout,
  maxRetries: 0,
});

export const DEFAULT_AI_MODEL = process.env.OPENAI_MODEL || "deepseek-flash";
