import prisma from "@/lib/prisma";

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
  };
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

  return {
    bitbucket: {
      baseUrl: (
        settingsMap["bitbucket_base_url"] ||
        process.env.BITBUCKET_BASE_URL ||
        "https://bitbucket.bri.co.id"
      ).replace(/\/$/, ""),
      token: settingsMap["bitbucket_access_token"] ?? process.env.BITBUCKET_ACCESS_TOKEN ?? "",
      seniorUserSlug: settingsMap["senior_user_slug"] || process.env.SENIOR_USER_SLUG || "senior.lead",
    },
    ai: {
      baseUrl: (
        settingsMap["openai_base_url"] ||
        process.env.OPENAI_BASE_URL ||
        "https://organization.api-github.com/v1"
      ).replace(/\/$/, ""),
      apiKey: settingsMap["qodeer_api_key"] ?? process.env.QODEER_API_KEY ?? "",
      model: settingsMap["openai_model"] || process.env.OPENAI_MODEL || "deepseek-flash",
    },
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
  }>,
) {
  const operations = Object.entries(settings)
    .map(([key, value]) => {
      if (value === undefined) return null;
      let val = String(value).trim();
      if (key === "bitbucket_access_token" && val.startsWith("mBBDC-")) {
        val = val.substring(1);
      }
      return prisma.systemSetting.upsert({
        where: { key },
        update: { value: val },
        create: { key, value: val },
      });
    })
    .filter(Boolean);

  await prisma.$transaction(operations as any);
  return await getDynamicSystemConfig();
}
