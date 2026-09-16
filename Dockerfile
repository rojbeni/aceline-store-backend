# syntax=docker/dockerfile:1

# --- STAGE 1: Build ---
FROM node:20-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

RUN corepack enable && apk add --no-cache python3 make g++ gcc

WORKDIR /app

# Install dependencies first so this layer stays cached until the lockfile changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Bring in the rest of the source and build the server + admin dashboard
COPY . .
RUN pnpm build

# `medusa build` emits a self-contained deployable app under .medusa/server
# (its own package.json, compiled src, public/admin assets). Install only its
# production dependencies there so the runner image doesn't ship devDependencies.
# --ignore-workspace keeps this install isolated from the root pnpm-workspace.yaml.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    cd .medusa/server && pnpm install --prod

# --- STAGE 2: Runner ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy only the built, self-contained server output - not the source tree,
# tests, devDependencies, or anything else from the build context.
COPY --from=builder /app/.medusa/server .

EXPOSE 9000

# Execute database migrations and boot the framework
CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
