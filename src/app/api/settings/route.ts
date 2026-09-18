import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { getDynamicSystemConfig, saveDynamicSystemSettings } from "@/server/db/settings";

export async function GET() {
  try {
    const dynamicConfig = await getDynamicSystemConfig();
    const providers = dynamicConfig.aiProviders ?? [];
    const defaultProvider = providers.find((p) => p.isDefault) ?? providers[0];

    const settingsConfig = {
      bitbucket: {
        baseUrl: dynamicConfig.bitbucket.baseUrl,
        token: dynamicConfig.bitbucket.token,
        hasToken: Boolean(dynamicConfig.bitbucket.token),
        seniorUserSlug: dynamicConfig.bitbucket.seniorUserSlug,
      },
      ai: {
        baseUrl: dynamicConfig.ai.baseUrl,
        apiKey: dynamicConfig.ai.apiKey,
        model: dynamicConfig.ai.model,
        hasApiKey: Boolean(dynamicConfig.ai.apiKey),
        providerId: defaultProvider?.id,
        providerName: defaultProvider?.name,
      },
      aiProviders: providers,
      defaultProviderId: defaultProvider?.id,
    };

    return apiSuccess(settingsConfig, "Pengaturan sistem dinamis berhasil dimuat");
  } catch (error) {
    console.error("[API GET /settings error]:", error);
    return apiError("Gagal mengambil pengaturan sistem", "DATABASE_ERROR", String(error), 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      ai_providers: body.aiProviders ?? body.ai_providers,
    };
    const updated = await saveDynamicSystemSettings(payload);
    return apiSuccess(updated, "Pengaturan sistem berhasil disimpan ke database");
  } catch (error) {
    console.error("[API PUT /settings error]:", error);
    return apiError("Gagal menyimpan pengaturan ke database", "DATABASE_ERROR", String(error), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, action } = body; // target: 'bitbucket' | 'ai'

    if (action === "save" || body.bitbucket_base_url !== undefined || body.openai_base_url !== undefined) {
      const updated = await saveDynamicSystemSettings(body);
      return apiSuccess(updated, "Pengaturan berhasil disimpan ke database");
    }

    const dynamicConfig = await getDynamicSystemConfig();

    if (target === "bitbucket") {
      const baseUrl = (body.baseUrl || dynamicConfig.bitbucket.baseUrl).replace(/\/$/, "");
      let token = (body.token !== undefined ? body.token : dynamicConfig.bitbucket.token).trim();
      if (token.startsWith("mBBDC-")) {
        token = token.substring(1);
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        // 1. Check server properties (version check)
        const propRes = await fetch(`${baseUrl}/rest/api/1.0/application-properties`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Atlassian-Token": "no-check",
          },
        }).finally(() => clearTimeout(timeout));

        if (!propRes.ok) {
          return apiSuccess({
            target,
            status: "FAILED",
            message: `Bitbucket Server ${baseUrl} merespons HTTP ${propRes.status} (${propRes.statusText})`,
          });
        }

        const info = await propRes.json().catch(() => ({}));

        // 2. Verify token authorization using authenticated endpoint
        const authRes = await fetch(`${baseUrl}/rest/api/1.0/users?limit=1`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Atlassian-Token": "no-check",
            Accept: "application/json",
          },
        });

        if (!authRes.ok) {
          return apiSuccess({
            target,
            status: "FAILED",
            info,
            message: `Koneksi ke Bitbucket Server (${baseUrl}) aktif, namun Token tidak valid atau ditolak (HTTP ${authRes.status} Unauthorized). Pastikan Personal Access Token (PAT) diawali 'BBDC-' dan memiliki izin baca.`,
          });
        }

        // 3. Get whoami username
        const whoamiRes = await fetch(`${baseUrl}/plugins/servlet/applinks/whoami`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const username = whoamiRes.ok ? (await whoamiRes.text()).trim() : "";

        return apiSuccess({
          target,
          status: "OK",
          info,
          message: `Terhubung ke Bitbucket Server (${baseUrl}) v${info.version || "8.x"} sebagai akun '${username || "Authenticated"}'`,
        });
      } catch (err) {
        return apiSuccess({
          target,
          status: "FAILED",
          message: `Gagal terhubung ke Bitbucket Server di ${baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    if (target === "ai") {
      const baseUrl = body.baseUrl || dynamicConfig.ai.baseUrl;
      const apiKey = body.apiKey !== undefined ? body.apiKey : dynamicConfig.ai.apiKey;
      const model = body.model || dynamicConfig.ai.model;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        // Test connectivity to AI Gateway
        const res = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }).finally(() => clearTimeout(timeout));

        if (res.ok) {
          return apiSuccess({
            target,
            status: "OK",
            message: `Terhubung ke AI Gateway (${baseUrl}) dengan model '${model}'.`,
          });
        }

        // If /models returned 404 or 405, some OpenAI proxies only expose /chat/completions
        if (res.status === 404 || res.status === 405) {
          try {
            const chatRes = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                messages: [{ role: "user", content: "ping" }],
                max_tokens: 1,
              }),
            });
            if (chatRes.ok || chatRes.status === 400) {
              return apiSuccess({
                target,
                status: "OK",
                message: `Terhubung ke AI Gateway (${baseUrl}) dengan model '${model}'.`,
              });
            }
          } catch {
            // Ignore fallback error and use original error response
          }
        }

        const errText = await res.text().catch(() => "");
        return apiSuccess({
          target,
          status: "FAILED",
          message: `AI Gateway ${baseUrl} merespons HTTP ${res.status} (${res.statusText}): ${errText || "Autentikasi gagal"}`,
        });
      } catch (err) {
        return apiSuccess({
          target,
          status: "FAILED",
          message: `Gagal terhubung ke AI Gateway di ${baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    return apiError("Target pengujian atau payload tidak valid", "VALIDATION_ERROR", [], 400);
  } catch (error) {
    console.error("[API POST /settings error]:", error);
    return apiError("Operasi pengaturan gagal", "SETTINGS_ERROR", String(error), 500);
  }
}
