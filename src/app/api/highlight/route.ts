import { type NextRequest, NextResponse } from "next/server";

import { codeToHtml } from "shiki";

const SUPPORTED_LANGS = new Set([
  "typescript",
  "ts",
  "javascript",
  "js",
  "tsx",
  "jsx",
  "json",
  "markdown",
  "md",
  "html",
  "css",
  "sql",
  "bash",
  "sh",
  "diff",
  "yaml",
  "yml",
  "python",
  "py",
  "java",
  "go",
  "golang",
  "rust",
  "rs",
  "php",
  "ruby",
  "rb",
  "cpp",
  "c",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, lang = "typescript", theme = "auto" } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ success: false, html: "" }, { status: 400 });
    }

    const cleanLang = typeof lang === "string" ? lang.toLowerCase().trim() : "typescript";
    const selectedLang = SUPPORTED_LANGS.has(cleanLang) ? cleanLang : "text";

    const isExplicitLight = theme === "github-light";
    const isExplicitDark = theme === "github-dark";

    const themeConfig =
      isExplicitLight || isExplicitDark
        ? {
            theme: isExplicitLight ? "github-light" : "github-dark",
          }
        : {
            themes: {
              light: "github-light",
              dark: "github-dark",
            },
            defaultColor: false as const,
          };

    const html = await codeToHtml(code, {
      lang: selectedLang,
      ...themeConfig,
      transformers: [
        {
          line(node) {
            if (selectedLang === "diff") {
              const getText = (n: unknown): string => {
                if (!n || typeof n !== "object") return "";
                const obj = n as Record<string, unknown>;
                if (obj.type === "text" && typeof obj.value === "string") return obj.value;
                if (Array.isArray(obj.children)) return obj.children.map(getText).join("");
                return "";
              };
              const rawText = getText(node);
              node.properties = node.properties || {};
              const currentClass = typeof node.properties.class === "string" ? node.properties.class : "line";

              if (rawText.startsWith("+") && !rawText.startsWith("+++")) {
                node.properties.class = `${currentClass} shiki-diff-add`;
              } else if (rawText.startsWith("-") && !rawText.startsWith("---")) {
                node.properties.class = `${currentClass} shiki-diff-del`;
              } else if (rawText.startsWith("@@")) {
                node.properties.class = `${currentClass} shiki-diff-hunk`;
              } else if (rawText.startsWith("diff ") || rawText.startsWith("---") || rawText.startsWith("+++")) {
                node.properties.class = `${currentClass} shiki-diff-header`;
              }
            }
          },
        },
      ],
    });

    return NextResponse.json({ success: true, html });
  } catch (error) {
    console.error("[Highlight API error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 },
    );
  }
}
