# ==============================================================================
# Stage 1: Base image with Bun runtime
# ==============================================================================
FROM oven/bun:1 AS base
WORKDIR /app

# ==============================================================================
# Stage 2: Install dependencies
# ==============================================================================
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN bun install --frozen-lockfile || bun install

# ==============================================================================
# Stage 3: Builder (Generate Prisma Client & Build Next.js)
# ==============================================================================
FROM base AS builder
WORKDIR /app

# Build arguments for environment variables (no hardcoded secrets)
ARG DATABASE_URL="postgresql://postgres:postgres@postgres:5432/auto-pr?schema=public"
ARG OPENAI_BASE_URL="https://api.openai.com/v1"
ARG QODEER_API_KEY=""
ARG OPENAI_MODEL="deepseek-flash"
ARG AI_REQUEST_TIMEOUT_MS="240000"
ARG BITBUCKET_BASE_URL=""
ARG BITBUCKET_ACCESS_TOKEN=""
ARG SENIOR_USER_SLUG="senior.lead"

# Export environment variables for the build phase
ENV DATABASE_URL=$DATABASE_URL \
    OPENAI_BASE_URL=$OPENAI_BASE_URL \
    QODEER_API_KEY=$QODEER_API_KEY \
    OPENAI_MODEL=$OPENAI_MODEL \
    AI_REQUEST_TIMEOUT_MS=$AI_REQUEST_TIMEOUT_MS \
    BITBUCKET_BASE_URL=$BITBUCKET_BASE_URL \
    BITBUCKET_ACCESS_TOKEN=$BITBUCKET_ACCESS_TOKEN \
    SENIOR_USER_SLUG=$SENIOR_USER_SLUG \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client with native Linux engine
RUN bunx prisma generate

# Build production assets (use webpack to prevent Turbopack Google Font resolution error in container)
RUN bun run build -- --webpack

# ==============================================================================
# Stage 4: Production Runner
# ==============================================================================
FROM base AS runner
WORKDIR /app

# Build arguments to persist as image environment variables (no hardcoded secrets)
ARG DATABASE_URL="postgresql://postgres:postgres@postgres:5432/auto-pr?schema=public"
ARG OPENAI_BASE_URL="https://api.openai.com/v1"
ARG QODEER_API_KEY=""
ARG OPENAI_MODEL="deepseek-flash"
ARG AI_REQUEST_TIMEOUT_MS="240000"
ARG BITBUCKET_BASE_URL=""
ARG BITBUCKET_ACCESS_TOKEN=""
ARG SENIOR_USER_SLUG="senior.lead"

# Persist all environment variables inside the Docker image
ENV DATABASE_URL=$DATABASE_URL \
    OPENAI_BASE_URL=$OPENAI_BASE_URL \
    QODEER_API_KEY=$QODEER_API_KEY \
    OPENAI_MODEL=$OPENAI_MODEL \
    AI_REQUEST_TIMEOUT_MS=$AI_REQUEST_TIMEOUT_MS \
    BITBUCKET_BASE_URL=$BITBUCKET_BASE_URL \
    BITBUCKET_ACCESS_TOKEN=$BITBUCKET_ACCESS_TOKEN \
    SENIOR_USER_SLUG=$SENIOR_USER_SLUG \
    NODE_ENV=production \
    PORT=2000 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

# Copy build artifacts and dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma

# Ensure public folder exists
RUN mkdir -p ./public

# Use standard bun non-root user
USER bun

EXPOSE 2000

CMD ["bun", "run", "start", "--", "-H", "0.0.0.0", "-p", "2000"]
