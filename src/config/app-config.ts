import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Qodeer Review",
  version: packageJson.version,
  copyright: `© ${currentYear}, Qodeer Review. Bitbucket Server 8.19 Decision System.`,
  meta: {
    title: "Qodeer Review — Automated Code Review & Decision System for Bitbucket Server 8.19",
    description:
      "Sistem Otomasi Code Review & Asisten Pengambilan Keputusan Senior Engineer untuk Bitbucket Server 8.19 dengan integrasi OpenAI SDK dan Hybrid SOP.",
  },
};
