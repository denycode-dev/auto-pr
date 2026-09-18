import prisma from "@/lib/prisma";

export interface AiProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
  isDefault: boolean;
  modelUsage?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface DynamicSystemConfig {
  bitbucket: {
    baseUrl: string;
    token: string;
    seniorUserSlug: string;
  };
  ai: {
    baseUrl: string;
    apiKey: string;
    model: string;
    providerId?: string;
    providerName?: string;
  };
  aiProviders?: AiProvider[];
}

/**
 * Get dynamic AI providers from PostgreSQL system_settings table,
 * automatically migrating legacy single-provider keys if not yet initialized.
 */
export async function getAiProviders(): Promise<AiProvider[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ai_providers" },
    });

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (err) {
        console.warn("[SystemSettings] Failed to parse ai_providers JSON:", err);
      }
    }

    // Auto-migrate from legacy keys or environment variables
    const settingsMap: Record<string, string> = {};
    const rows = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ["openai_base_url", "qodeer_api_key", "openai_model"],
        },
      },
    });
    for (const r of rows) {
      settingsMap[r.key] = r.value;
    }

    const defaultModel = settingsMap.openai_model || process.env.OPENAI_MODEL || "deepseek-flash";
    const initialProvider: AiProvider = {
      id: "provider-default",
      name: "Default AI Gateway",
      baseUrl: (
        settingsMap.openai_base_url ||
        process.env.OPENAI_BASE_URL ||
        "https://organization.api-github.com/v1"
      ).replace(/\/$/, ""),
      apiKey: settingsMap.qodeer_api_key || process.env.QODEER_API_KEY || "",
      models: [defaultModel],
      defaultModel,
      isDefault: true,
      modelUsage: { [defaultModel]: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const initialList = [initialProvider];
    // Persist auto-migrated provider
    await prisma.systemSetting.upsert({
      where: { key: "ai_providers" },
      update: { value: JSON.stringify(initialList) },
      create: { key: "ai_providers", value: JSON.stringify(initialList) },
    });

    return initialList;
  } catch (err) {
    console.warn("[SystemSettings] Error reading ai_providers, returning fallback:", err);
    return [
      {
        id: "provider-default",
        name: "Default AI Gateway",
        baseUrl: (process.env.OPENAI_BASE_URL || "https://organization.api-github.com/v1").replace(/\/$/, ""),
        apiKey: process.env.QODEER_API_KEY || "",
        models: [process.env.OPENAI_MODEL || "deepseek-flash"],
        defaultModel: process.env.OPENAI_MODEL || "deepseek-flash",
        isDefault: true,
        modelUsage: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}

/**
 * Save or update AI providers list in PostgreSQL database,
 * keeping legacy settings in sync with the default provider.
 */
export async function saveAiProviders(providers: AiProvider[]): Promise<AiProvider[]> {
  if (!Array.isArray(providers) || providers.length === 0) {
    throw new Error("Daftar provider AI tidak boleh kosong.");
  }

  // Ensure exactly one default provider
  let hasDefault = false;
  const sanitized = providers.map((p, idx) => {
    const isDef = p.isDefault && !hasDefault;
    if (isDef) hasDefault = true;

    // Ensure models array is valid
    const cleanModels = Array.isArray(p.models) ? p.models.map((m) => m.trim()).filter((m) => m.length > 0) : [];
    if (cleanModels.length === 0) {
      cleanModels.push("deepseek-flash");
    }

    const defaultModel = cleanModels.includes(p.defaultModel) ? p.defaultModel : cleanModels[0];

    return {
      ...p,
      id: p.id || `provider-${Date.now()}-${idx}`,
      name: p.name.trim() || `Provider ${idx + 1}`,
      baseUrl: p.baseUrl.trim().replace(/\/$/, ""),
      apiKey: p.apiKey ? p.apiKey.trim() : "",
      models: cleanModels,
      defaultModel,
      isDefault: isDef,
      modelUsage: p.modelUsage || {},
      updatedAt: new Date().toISOString(),
      createdAt: p.createdAt || new Date().toISOString(),
    };
  });

  // If none was default, make the first one default
  if (!hasDefault && sanitized.length > 0) {
    sanitized[0].isDefault = true;
  }

  const defaultProvider = sanitized.find((p) => p.isDefault) || sanitized[0];

  // Save to system_settings in a single transaction
  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { key: "ai_providers" },
      update: { value: JSON.stringify(sanitized) },
      create: { key: "ai_providers", value: JSON.stringify(sanitized) },
    }),
    // Legacy keys synchronization
    prisma.systemSetting.upsert({
      where: { key: "openai_base_url" },
      update: { value: defaultProvider.baseUrl },
      create: { key: "openai_base_url", value: defaultProvider.baseUrl },
    }),
    prisma.systemSetting.upsert({
      where: { key: "qodeer_api_key" },
      update: { value: defaultProvider.apiKey },
      create: { key: "qodeer_api_key", value: defaultProvider.apiKey },
    }),
    prisma.systemSetting.upsert({
      where: { key: "openai_model" },
      update: { value: defaultProvider.defaultModel },
      create: { key: "openai_model", value: defaultProvider.defaultModel },
    }),
  ]);

  return sanitized;
}

/**
 * Increment the usage counter for a specific model under a provider
 * to allow sorting models by frequency of use.
 */
export async function incrementModelUsage(providerId: string, modelName: string): Promise<void> {
  try {
    const providers = await getAiProviders();
    const target = providers.find((p) => p.id === providerId || (p.isDefault && !providerId));
    if (!target) return;

    if (!target.modelUsage) {
      target.modelUsage = {};
    }
    target.modelUsage[modelName] = (target.modelUsage[modelName] || 0) + 1;
    target.updatedAt = new Date().toISOString();

    await prisma.systemSetting.upsert({
      where: { key: "ai_providers" },
      update: { value: JSON.stringify(providers) },
      create: { key: "ai_providers", value: JSON.stringify(providers) },
    });
  } catch (err) {
    console.warn("[SystemSettings] Failed to increment model usage:", err);
  }
}

/**
 * Get dynamic configuration from PostgreSQL system_settings table,
 * falling back to process.env if not explicitly stored in database.
 */
export async function getDynamicSystemConfig(): Promise<DynamicSystemConfig> {
  const settingsMap: Record<string, string> = {};

  try {
    const rows = await prisma.systemSetting.findMany();
    for (const row of rows) {
      settingsMap[row.key] = row.value;
    }
  } catch (err) {
    console.warn("[SystemSettings] Could not query system_settings from database, using env:", err);
  }

  const providers = await getAiProviders();
  const defaultProvider = providers.find((p) => p.isDefault) || providers[0];

  return {
    bitbucket: {
      baseUrl: (
        settingsMap.bitbucket_base_url ||
        process.env.BITBUCKET_BASE_URL ||
        "https://bitbucket.bri.co.id"
      ).replace(/\/$/, ""),
      token: settingsMap.bitbucket_access_token || process.env.BITBUCKET_ACCESS_TOKEN || "",
      seniorUserSlug: settingsMap.senior_user_slug || process.env.SENIOR_USER_SLUG || "senior.lead",
    },
    ai: {
      baseUrl: (
        defaultProvider?.baseUrl ||
        settingsMap.openai_base_url ||
        process.env.OPENAI_BASE_URL ||
        "https://organization.api-github.com/v1"
      ).replace(/\/$/, ""),
      apiKey: defaultProvider?.apiKey ?? settingsMap.qodeer_api_key ?? process.env.QODEER_API_KEY ?? "",
      model: defaultProvider?.defaultModel || settingsMap.openai_model || process.env.OPENAI_MODEL || "deepseek-flash",
      providerId: defaultProvider?.id,
      providerName: defaultProvider?.name,
    },
    aiProviders: providers,
  };
}

/**
 * Save or update system settings in PostgreSQL database.
 */
export async function saveDynamicSystemSettings(
  settings: Partial<{
    bitbucket_base_url: string;
    bitbucket_access_token: string;
    senior_user_slug: string;
    openai_base_url: string;
    qodeer_api_key: string;
    openai_model: string;
    ai_providers?: AiProvider[];
  }>,
) {
  if (settings.ai_providers && Array.isArray(settings.ai_providers)) {
    await saveAiProviders(settings.ai_providers);
  }

  const operations = Object.entries(settings)
    .filter(([key, value]) => value !== undefined && key !== "ai_providers")
    .map(([key, value]) => {
      let val = String(value).trim();
      if (key === "bitbucket_access_token" && val.startsWith("mBBDC-")) {
        val = val.substring(1);
      }
      return prisma.systemSetting.upsert({
        where: { key },
        update: { value: val },
        create: { key, value: val },
      });
    });

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return await getDynamicSystemConfig();
}
