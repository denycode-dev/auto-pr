# Denycode Code Review

**Automated AI Code Review & Senior Decision System for Bitbucket Server 8.19**

> Pull request-driven code quality enforcement — on-demand AI analysis, dual-scope SOP management, inline diff annotations, and structured senior approval workflow. 100% REST API, zero webhooks.

---

## Overview

Denycode Code Review integrates with Bitbucket Server 8.19 via REST API to automate code review for engineering teams. When a pull request is ready, engineers trigger AI review on-demand. The AI analyzes the diff against your organization's **Coding SOPs** (Standard Operating Procedures), produces a structured report with inline issue annotations, and provides a merge recommendation. Senior engineers then make the final approval decision.

```
Bitbucket Server 8.19
       │
       │  REST API (sync-prs)
       ▼
┌─────────────────────┐
│   Denycode Code Review     │  ← Next.js 16 + Prisma + PostgreSQL
│                     │
│  PR Queue           │  List & sync open PRs
│  Code Diff Viewer   │  Side-by-side diff with inline AI findings
│  AI Review Engine   │  OpenAI SDK → analyzes diff vs. SOPs
│  SOP Manager        │  Global + Repository-specific SOP rules
│  Senior Decision    │  Approve / Needs Work / Decline
└─────────────────────┘
       │
       │  Post inline comments back
       ▼
Bitbucket Server 8.19
```

---

## Features

### Core Review Workflow

- **On-demand AI review** — trigger per PR, no auto-run (BR-02)
- **Unified diff viewer** — side-by-side file tree with hunk-level, line-by-line rendering
- **Inline AI findings** — CRITICAL / HIGH / MEDIUM / LOW / INFO issues annotated directly on diff lines
- **AI merge recommendation** — `RECOMMENDED_APPROVE` / `RECOMMENDED_NEEDS_WORK` / `RECOMMENDED_DECLINE`
- **Senior decision bar** — structured Approve / Needs Work / Decline with optional notes
- **Bitbucket comment sync** — AI findings posted as inline comments back to Bitbucket Server

### SOP Management (Dual-Scope Architecture)

- **Global SOPs** — organization-wide rules applied to every repository
- **Repository SOPs** — rules scoped to a specific `projectKey/slug`
- **SOP Categories** — color-coded categories (Security, Performance, Style, etc.)
- **Markdown editor** — dual-pane write + live preview editor
- **Drag-and-drop `.md` import** — bulk-import SOP rules from existing markdown files
- **Enable / Disable toggle** — activate/deactivate individual rules without deleting

### Infrastructure

- **REST API only** — all Bitbucket integration via polling, zero webhooks (BR-01)
- **Diff caching** — raw diff stored in DB, avoids re-fetching on every page load
- **80ms throttle** — comment posting to Bitbucket to prevent socket exhaustion
- **File ignore rules** — `node_modules`, lockfiles, minified assets, and binary files excluded from AI analysis (BR-05)

---

## Tech Stack

| Layer              | Technology                              |
| ------------------ | --------------------------------------- |
| **Framework**      | Next.js 16 (App Router), React 19       |
| **Language**       | TypeScript 5 (strict mode)              |
| **Styling**        | Tailwind CSS v4, shadcn/ui (radix-nova) |
| **Database**       | PostgreSQL via Prisma ORM               |
| **AI Client**      | OpenAI SDK v7                           |
| **Bitbucket**      | Bitbucket Server 8.19 REST API v1       |
| **Linting/Format** | Biome                                   |
| **State (UI)**     | Zustand, React Hook Form                |
| **Tables**         | TanStack Table v9                       |

---

## Project Structure

```
src/
├── app/
│   ├── (main)/dashboard/
│   │   ├── pull-requests/          # PR queue list + detail pages
│   │   │   └── [id]/               # PR detail: diff, issues, SOP compliance, history
│   │   ├── repositories/           # Repository connection management
│   │   ├── sops/                   # SOP manager + create/edit pages
│   │   └── settings/               # Bitbucket & AI connection settings
│   └── api/
│       ├── bitbucket/sync-prs/     # POST: fetch open PRs from Bitbucket
│       ├── pull-requests/[id]/
│       │   ├── diff/               # GET: parse and return unified diff
│       │   ├── trigger-review/     # POST: run AI review for a PR
│       │   └── action/             # POST: senior decision (approve/decline)
│       ├── sops/                   # CRUD: SOPs list + individual SOP
│       │   └── categories/         # CRUD: SOP categories
│       ├── repositories/           # CRUD: repository management
│       └── settings/               # GET/PUT: system settings
├── server/
│   ├── review/
│   │   ├── reviewer.ts             # Core AI review orchestrator
│   │   ├── sop-engine.ts           # Merge global + repo SOPs into prompt context
│   │   └── diff-filter.ts          # Unified diff parser + file ignore rules
│   ├── bitbucket/
│   │   └── client.ts               # Bitbucket Server REST API client
│   ├── ai/
│   │   └── client.ts               # OpenAI SDK client factory
│   └── db/
│       └── settings.ts             # System settings helpers
├── data/code-review/
│   └── types.ts                    # Shared TypeScript types
└── lib/
    ├── prisma.ts                   # Prisma client singleton
    └── api-response.ts             # apiSuccess / apiError response helpers
```

---

## Database Schema

| Model           | Purpose                                                     |
| --------------- | ----------------------------------------------------------- |
| `Repository`    | Registered Bitbucket repos (`projectKey` + `slug`)          |
| `PullRequest`   | Synced PRs with cached diff and AI review status            |
| `ReviewRun`     | Immutable record of each AI analysis run                    |
| `ReviewIssue`   | Individual finding from a review run (file, line, severity) |
| `SopCategory`   | Grouping for SOP rules (name, slug, color badge)            |
| `CodingSop`     | SOP rule with `GLOBAL` or `REPOSITORY` scope                |
| `SystemSetting` | Key-value store for Bitbucket URL, token, AI model, etc.    |

### AI Review Status Flow

```
NOT_STARTED → IN_PROGRESS → COMPLETED
                          ↘ FAILED
```

### Senior Decision Values

```
PENDING → APPROVED | NEEDS_WORK | DECLINED
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ database
- Bitbucket Server 8.19 with a Personal Access Token (read + write PR comments)
- OpenAI API key (or compatible endpoint)

### 1. Clone the repository

```bash
git clone https://github.com/denycode-dev/auto-pr.git
cd auto-pr
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in all values:

```env
# PostgreSQL — Prisma connection string
DATABASE_URL="postgresql://user:password@localhost:5432/qodeer"

# Bitbucket Server 8.19
BITBUCKET_BASE_URL="https://your-bitbucket.company.com"
BITBUCKET_TOKEN="your-personal-access-token"

# OpenAI (or compatible API)
OPENAI_API_KEY="sk-..."
OPENAI_BASE_URL="https://api.openai.com/v1"   # optional override
OPENAI_MODEL="gpt-4o"                          # or your preferred model
```

> [!NOTE]
> Bitbucket credentials and AI model settings can also be configured at runtime via **Settings** → the values are stored in the `system_settings` table and take precedence over env vars.

### 4. Set up the database

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations (creates all tables)
npx prisma migrate deploy

# Or for development (with migration history)
npx prisma migrate dev
```

### 5. Start the development server

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000)

---

## First-Time Setup

1. **Settings** → Enter Bitbucket Server URL and Personal Access Token → Save
2. **Repositories** → "Hubungkan Repositori" → Enter `projectKey`, `slug`, and name
3. **Coding SOPs** → Create Global rules (e.g., Security, Performance) that apply to all repos
4. **Pull Requests** → "Sinkronisasi PR" → Fetches open PRs from Bitbucket
5. Open any PR → "Jalankan AI Review" → Wait for analysis → Senior makes final decision

---

## API Reference

### Sync Pull Requests

```
POST /api/bitbucket/sync-prs
Body: { repositoryId: string }
```

### Trigger AI Review

```
POST /api/pull-requests/:id/trigger-review
```

### Get Diff (parsed)

```
GET /api/pull-requests/:id/diff
Response: { data: { files: ParsedDiffFile[] }, stats: DiffStats }
```

### Senior Decision

```
POST /api/pull-requests/:id/action
Body: { decision: "APPROVED" | "NEEDS_WORK" | "DECLINED", notes?: string }
```

### SOPs

```
GET    /api/sops                        # List all SOPs
POST   /api/sops                        # Create SOP
GET    /api/sops/:id                    # Get single SOP
PUT    /api/sops/:id                    # Update SOP
DELETE /api/sops/:id                    # Delete SOP

GET    /api/sops/categories             # List categories
POST   /api/sops/categories             # Create category
PUT    /api/sops/categories/:id         # Update category
DELETE /api/sops/categories/:id         # Delete category
```

---

## Available Scripts

```bash
npm run dev              # Start development server (Turbopack)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Biome lint
npm run format           # Biome format (write)
npm run check            # Biome check (lint + format)
npm run check:fix        # Biome check + auto-fix
npm run generate:presets # Generate theme preset CSS files
```

---

## Code Quality

This project uses [Biome](https://biomejs.dev/) for linting and formatting with pre-commit hooks via Husky:

```bash
# Check and auto-fix all issues
npm run check:fix
```

**Conventions:**

- Double quotes, semicolons, 2-space indentation, 120-character line width
- Sorted imports
- TypeScript strict mode — `any` is avoided

---

## Colocation Architecture

Feature code is co-located with the route that owns it:

```
dashboard/<screen>/
├── page.tsx              ← Server Component (data fetch only)
└── _components/          ← Screen-specific Client Components
```

Shared code only moves to `src/components/` or `src/lib/` when reused by multiple features.

---

> [!IMPORTANT]
> This system is designed for **internal engineering teams** using **Bitbucket Server 8.19**. It does not support Bitbucket Cloud or GitHub.

> [!CAUTION]
> Never commit `.env` with real credentials. The `BITBUCKET_TOKEN` grants write access to post PR comments — treat it as a secret.
