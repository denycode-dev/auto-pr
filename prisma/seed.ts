import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database 'auto-pr' (v2.0.0 Architecture)...");

  // 1. Seed Repositories
  const repo1 = await prisma.repository.upsert({
    where: {
      projectKey_slug: {
        projectKey: "FIN",
        slug: "billing-service",
      },
    },
    update: {},
    create: {
      projectKey: "FIN",
      slug: "billing-service",
      name: "Billing & Payment Gateway Service",
      isActive: true,
    },
  });

  const repo2 = await prisma.repository.upsert({
    where: {
      projectKey_slug: {
        projectKey: "CORE",
        slug: "identity-service",
      },
    },
    update: {},
    create: {
      projectKey: "CORE",
      slug: "identity-service",
      name: "Enterprise SSO & Identity Management",
      isActive: true,
    },
  });

  const repo3 = await prisma.repository.upsert({
    where: {
      projectKey_slug: {
        projectKey: "INFRA",
        slug: "k8s-operator",
      },
    },
    update: {},
    create: {
      projectKey: "INFRA",
      slug: "k8s-operator",
      name: "Kubernetes GitOps & Infrastructure Operator",
      isActive: true,
    },
  });

  console.log("✓ Repositories seeded");

  // 2. Seed SOP Categories
  const catSecurity = await prisma.sopCategory.upsert({
    where: { slug: "security" },
    update: {},
    create: {
      name: "Keamanan Kode",
      slug: "security",
      description: "Pencegahan injeksi SQL/XSS, autentikasi, manajemen rahasia, dan integritas token",
      colorBadge: "rose",
    },
  });

  const catArchitecture = await prisma.sopCategory.upsert({
    where: { slug: "architecture" },
    update: {},
    create: {
      name: "Kepatuhan Arsitektur",
      slug: "architecture",
      description: "Standar Clean Architecture, batasan layer Controller-Usecase-Repository, dan dependensi",
      colorBadge: "indigo",
    },
  });

  const catErrorHandling = await prisma.sopCategory.upsert({
    where: { slug: "error-handling" },
    update: {},
    create: {
      name: "Penanganan Error & Log",
      slug: "error-handling",
      description: "Penanganan exception terstruktur, tracing ID transaksi, dan pencegahan silent error",
      colorBadge: "amber",
    },
  });

  const catNaming = await prisma.sopCategory.upsert({
    where: { slug: "naming" },
    update: {},
    create: {
      name: "Konvensi Penamaan",
      slug: "naming",
      description: "Standar penamaan file kebab-case, interface domain, tipe entitas, dan kejelasan kode",
      colorBadge: "emerald",
    },
  });

  console.log("✓ SOP Categories seeded");

  // 3. Seed Coding SOPs
  const sops = [
    {
      title: "Mandatory Input Sanitization & Parameterized Query",
      categoryId: catSecurity.id,
      scope: "GLOBAL",
      summary: "Semua input pengguna wajib divalidasi dengan Zod schema. Dilarang konkatenasi string SQL.",
      rulesMarkdown: `
## Aturan Keamanan Input & Database
1. Semua payload input dari pengguna dan query parameter wajib divalidasi dengan Zod schema sebelum diteruskan ke layer domain.
2. Dilarang keras melakukan string concatenation atau template literal pada query SQL/database.
3. Wajib menggunakan parameterized query atau ORM binding (Prisma/TypeORM).

### Contoh Pelanggaran:
\`\`\`ts
// SALAH
await db.query(\`SELECT * FROM users WHERE id = '\${userId}'\`);
\`\`\`

### Rekomendasi yang Benar:
\`\`\`ts
// BENAR
await prisma.user.findUnique({ where: { id: userId } });
\`\`\`
`.trim(),
      isEnabled: true,
      createdBy: "Budi Santoso (Principal Architect)",
    },
    {
      title: "Comprehensive Error Handling & Observability",
      categoryId: catErrorHandling.id,
      scope: "GLOBAL",
      summary: "Dilarang empty catch block. Wajib membungkus error dengan custom Error class dan tracing ID.",
      rulesMarkdown: `
## Standar Penanganan Error
1. Dilarang menelan exception (empty catch block tanpa aksi rethrow atau log terstruktur).
2. Semua pemanggilan layanan eksternal (payment gateway, API perbankan) wajib dibungkus try/catch dan custom Error class.
3. Setiap error log wajib menyertakan transaction/trace ID untuk penelusuran.
`.trim(),
      isEnabled: true,
      createdBy: "Siti Rahma (Tech Lead)",
    },
    {
      title: "Clean Layer Boundary: Controller Dilarang Memanggil Repository",
      categoryId: catArchitecture.id,
      scope: "REPOSITORY",
      repositoryId: repo1.id,
      summary: "Controller hanya boleh memanggil Service/Usecase. Akses langsung ke Repository dilarang.",
      rulesMarkdown: `
## Batasan Layer Arsitektur Billing
1. Route handlers/controllers hanya bertugas menerima HTTP request, validasi parameter, dan serialisasi respons.
2. Logika bisnis murni wajib diisolasi di Service / Usecase layer.
3. Akses database hanya boleh melalui Repository / Data Access layer, tidak boleh langsung dari Controller.
`.trim(),
      isEnabled: true,
      createdBy: "Budi Santoso (Principal Architect)",
    },
    {
      title: "Strict Interface & File Naming Conventions",
      categoryId: catNaming.id,
      scope: "GLOBAL",
      summary: "Nama file komponen wajib kebab-case. Interface domain diawali huruf kapital tanpa prefix 'I'.",
      rulesMarkdown: `
## Konvensi Naming Standar
1. Nama file komponen dan utilitas wajib menggunakan kebab-case (contoh: \`user-profile-card.tsx\`).
2. Interface domain model diawali huruf kapital tanpa prefix 'I' (contoh: \`UserAccount\`, bukan \`IUserAccount\`).
`.trim(),
      isEnabled: true,
      createdBy: "Andi Wijaya (Senior Engineer)",
    },
  ];

  for (const sop of sops) {
    const existing = await prisma.codingSop.findFirst({
      where: { title: sop.title },
    });
    if (!existing) {
      await prisma.codingSop.create({ data: sop });
    }
  }

  console.log("✓ Coding SOPs seeded");

  // Sample unified diffs for caching
  const sampleDiff142 = `diff --git a/src/controllers/paymentController.ts b/src/controllers/paymentController.ts
index 1a2b3c4..5d6e7f8 100644
--- a/src/controllers/paymentController.ts
+++ b/src/controllers/paymentController.ts
@@ -16,6 +16,8 @@ export async function handlePayment(req: Request) {
   const { orderId, amount } = await req.json();
+  // Langsung query database dari controller
+  const rawOrder = await prisma.order.findFirst({ where: { id: orderId } });
   return Response.json({ status: "success" });
 }
diff --git a/src/services/paymentService.ts b/src/services/paymentService.ts
index 8a9b0c1..2d3e4f5 100644
--- a/src/services/paymentService.ts
+++ b/src/services/paymentService.ts
@@ -39,7 +39,8 @@ export class PaymentService {
   async processPayment(orderId: string, amount: number) {
-    const sanitizedId = sanitize(orderId);
+    // Potensi SQL Injection
+    const query = \`SELECT * FROM payments WHERE order_id = '\${orderId}'\`;
     const gatewayResponse = await fetch("https://gateway.bank.internal/pay");
+    // Tidak ada penanganan timeout atau network error
     return gatewayResponse.json();
   }
 }`;

  const sampleDiff42 = `diff --git a/src/features/auth/usecases/token_usecase.go b/src/features/auth/usecases/token_usecase.go
index 4b5c6d7..8e9f0a1 100644
--- a/src/features/auth/usecases/token_usecase.go
+++ b/src/features/auth/usecases/token_usecase.go
@@ -24,8 +24,14 @@ func (u *TokenUsecase) RotateToken(ctx context.Context, refreshToken string) (*T
-    token := jwt.GenerateLegacyToken()
+    // Generate secure token with rotation metadata
+    token, err := u.cryptoService.GenerateSecureToken(ctx)
+    if err != nil {
+        return nil, fmt.Errorf("gagal generate token: %w", err)
+    }
+    u.tokenRepo.SaveActiveToken(ctx, token)
     return token, nil
 }`;

  // 4. Seed Pull Requests
  // PR #42 (NOT_STARTED - Untuk uji coba On-Demand AI Review langsung di UI)
  const pr42 = await prisma.pullRequest.upsert({
    where: {
      repositoryId_bitbucketPrId: {
        repositoryId: repo1.id,
        bitbucketPrId: 42,
      },
    },
    update: {
      cachedDiff: sampleDiff42,
      cachedDiffHash: "e8f9021a4b6c8d7e42",
      filesChangedCount: 1,
      additionsCount: 12,
      deletionsCount: 2,
    },
    create: {
      repositoryId: repo1.id,
      bitbucketPrId: 42,
      title: "feat(auth): implementasi refresh token rotasi & middleware verifikasi",
      authorName: "Ahmad Rizky",
      authorSlug: "ahmad.rizky",
      sourceBranch: "feature/token-rotation",
      targetBranch: "main",
      latestCommitHash: "e8f9021a4b6c8d7e",
      bitbucketVersion: 4,
      prStatus: "OPEN",
      aiReviewStatus: "NOT_STARTED",
      cachedDiff: sampleDiff42,
      cachedDiffHash: "e8f9021a4b6c8d7e42",
      filesChangedCount: 1,
      additionsCount: 12,
      deletionsCount: 2,
    },
  });

  // PR #142 (Needs Work)
  const pr142 = await prisma.pullRequest.upsert({
    where: {
      repositoryId_bitbucketPrId: {
        repositoryId: repo1.id,
        bitbucketPrId: 142,
      },
    },
    update: {
      cachedDiff: sampleDiff142,
      cachedDiffHash: "8f3a92b10492c0d5e1f7",
      filesChangedCount: 2,
      additionsCount: 52,
      deletionsCount: 8,
    },
    create: {
      repositoryId: repo1.id,
      bitbucketPrId: 142,
      title: "feat: integrate payment gateway & order settlement",
      authorName: "Ahmad Junior Dev",
      authorSlug: "ahmad.junior",
      sourceBranch: "feature/payment-integration",
      targetBranch: "main",
      latestCommitHash: "8f3a92b10492c0d5e1f7a2b3c4d5e6f7a8b9c0d1",
      bitbucketVersion: 1,
      prStatus: "OPEN",
      aiReviewStatus: "COMPLETED",
      aiRecommendation: "RECOMMENDED_NEEDS_WORK",
      seniorDecision: "PENDING",
      cachedDiff: sampleDiff142,
      cachedDiffHash: "8f3a92b10492c0d5e1f7",
      filesChangedCount: 2,
      additionsCount: 52,
      deletionsCount: 8,
    },
  });

  const existingRun142 = await prisma.reviewRun.findFirst({
    where: { pullRequestId: pr142.id },
  });

  if (!existingRun142) {
    const run142 = await prisma.reviewRun.create({
      data: {
        pullRequestId: pr142.id,
        commitHash: pr142.latestCommitHash,
        summaryMarkdown: `Hasil evaluasi menemukan 1 kerentanan keamanan KRITIS (SQL Injection) pada modul payment service serta 2 isu tingkat tinggi terkait unhandled error dan ketidakpatuhan SOP arsitektur. Disarankan untuk meminta revisi (Needs Work) sebelum approval.`,
        totalIssues: 3,
        criticalCount: 1,
        highCount: 2,
        mediumCount: 0,
        lowCount: 0,
        sopScore: 75,
      },
    });

    await prisma.reviewIssue.createMany({
      data: [
        {
          reviewRunId: run142.id,
          filePath: "src/services/paymentService.ts",
          lineNumber: 42,
          lineType: "ADDED",
          severity: "CRITICAL",
          category: "SECURITY",
          title: "Injeksi SQL pada Konstruksi Query (SQL Injection)",
          description:
            "📍 Lokasi: src/services/paymentService.ts:42\n⚠️ Masalah: Variabel orderId digabungkan langsung ke string query SQL tanpa sanitasi atau parameter binding.\n⚡ Dampak: Celah SQL Injection kritis memungkinkan penyerang mengekstrak atau memanipulasi data transaksi perbankan.\n💡 Solusi: Gunakan query terparameter atau method ORM prisma.order.findUnique.",
          suggestedFix: "const order = await prisma.order.findUnique({\n  where: { id: orderId }\n});",
          bitbucketCommentId: null,
          isPosted: false,
          isFalsePositive: false,
        },
        {
          reviewRunId: run142.id,
          filePath: "src/services/paymentService.ts",
          lineNumber: 78,
          lineType: "ADDED",
          severity: "HIGH",
          category: "ERROR_HANDLING",
          title: "Unhandled Network Timeout Exception pada Gateway",
          description:
            "📍 Lokasi: src/services/paymentService.ts:78\n⚠️ Masalah: Panggilan HTTP ke payment gateway tidak menangani status kegagalan (response >= 400) atau timeout koneksi.\n⚡ Dampak: Service dapat hang atau melempar unhandled rejection saat koneksi perbankan lambat.\n💡 Solusi: Periksa gatewayResponse.ok dan tetapkan abort signal timeout.",
          suggestedFix:
            "if (!gatewayResponse.ok) {\n  throw new PaymentGatewayError(`Gateway gagal merespon: ${gatewayResponse.statusText}`);\n}",
          bitbucketCommentId: null,
          isPosted: false,
          isFalsePositive: false,
        },
        {
          reviewRunId: run142.id,
          filePath: "src/controllers/paymentController.ts",
          lineNumber: 19,
          lineType: "ADDED",
          severity: "MEDIUM",
          category: "SOP_VIOLATION",
          title: "Pelanggaran SOP: Direct DB Query di Controller",
          description:
            "📍 Lokasi: src/controllers/paymentController.ts:19\n⚠️ Masalah: Controller mengeksekusi query database secara langsung tanpa melewati PaymentService/Repository.\n⚡ Dampak: Melanggar batas arsitektur berlapis, menyulitkan unit test dan pemeliharaan kode.\n💡 Solusi: Pindahkan pemanggilan database ke dalam PaymentService.",
          suggestedFix: "const result = await this.paymentService.processPayment(payload);",
          bitbucketCommentId: BigInt(50283),
          isPosted: true,
          isFalsePositive: false,
        },
        {
          reviewRunId: run142.id,
          filePath: "src/services/paymentService.ts",
          lineNumber: 85,
          lineType: "ADDED",
          severity: "LOW",
          category: "BEST_PRACTICE",
          title: "Format Log Audit Belum Memakai Structured JSON",
          description:
            "📍 Lokasi: src/services/paymentService.ts:85\n⚠️ Masalah: Log transaksi masih menggunakan console.log teks biasa alih-alih logger audit terstruktur.\n⚡ Dampak: Log monitoring sulit diparsing oleh log aggregator seperti Elasticsearch atau Datadog.\n💡 Solusi: Gunakan logger.info({ event: 'payment_settled', orderId }) terstruktur.",
          suggestedFix: "logger.info({ event: 'payment_processed', orderId, status: 'success' });",
          bitbucketCommentId: null,
          isPosted: false,
          isFalsePositive: false,
        },
      ],
    });
  }

  // PR #89 (Approved)
  const pr89 = await prisma.pullRequest.upsert({
    where: {
      repositoryId_bitbucketPrId: {
        repositoryId: repo2.id,
        bitbucketPrId: 89,
      },
    },
    update: {
      cachedDiff: sampleDiff42,
      cachedDiffHash: "2c7d91e345b89a0f",
      filesChangedCount: 1,
      additionsCount: 15,
      deletionsCount: 3,
    },
    create: {
      repositoryId: repo2.id,
      bitbucketPrId: 89,
      title: "fix(auth): prevent timing attack on password verification",
      authorName: "Sarah Putri (Security Analyst)",
      authorSlug: "sarah.putri",
      sourceBranch: "fix/constant-time-compare",
      targetBranch: "main",
      latestCommitHash: "2c7d91e345b89a0f12c3d4e5f6a7b8c9d0e1f2a3",
      bitbucketVersion: 2,
      prStatus: "OPEN",
      aiReviewStatus: "COMPLETED",
      aiRecommendation: "RECOMMENDED_APPROVE",
      seniorDecision: "APPROVED",
      seniorNotes: "Implementasi timingSafeEqual sudah sesuai standar OWASP. Approved.",
      decidedAt: new Date(),
      cachedDiff: sampleDiff42,
      cachedDiffHash: "2c7d91e345b89a0f",
      filesChangedCount: 1,
      additionsCount: 15,
      deletionsCount: 3,
    },
  });

  // PR #204 (Declined)
  const pr204 = await prisma.pullRequest.upsert({
    where: {
      repositoryId_bitbucketPrId: {
        repositoryId: repo3.id,
        bitbucketPrId: 204,
      },
    },
    update: {
      cachedDiff: sampleDiff142,
      cachedDiffHash: "5e4f3a2b1c0d9e8f",
      filesChangedCount: 1,
      additionsCount: 78,
      deletionsCount: 4,
    },
    create: {
      repositoryId: repo3.id,
      bitbucketPrId: 204,
      title: "feat: add unlimited concurrent task executor without backpressure",
      authorName: "Rian Developer",
      authorSlug: "rian.dev",
      sourceBranch: "feat/unlimited-worker",
      targetBranch: "main",
      latestCommitHash: "5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f",
      bitbucketVersion: 3,
      prStatus: "DECLINED",
      aiReviewStatus: "COMPLETED",
      aiRecommendation: "RECOMMENDED_DECLINE",
      seniorDecision: "DECLINED",
      seniorNotes: "Arsitektur executor ini berbahaya untuk pod Kubernetes karena memicu Out-Of-Memory (OOM). Ditolak.",
      decidedAt: new Date(),
      cachedDiff: sampleDiff142,
      cachedDiffHash: "5e4f3a2b1c0d9e8f",
      filesChangedCount: 1,
      additionsCount: 78,
      deletionsCount: 4,
    },
  });

  console.log("✓ Pull requests and review runs seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
