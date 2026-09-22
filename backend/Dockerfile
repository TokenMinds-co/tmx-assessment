# Backend image for TMX Assessment. The backend is a self-contained pnpm project, so the
# build context is this folder:
#
#   docker build -t tmx-assessment-backend backend/
#
# Two stages: the builder installs everything and compiles to dist/; the
# production stage installs only runtime dependencies and copies dist/ across.
# See docs/operations.md#deployment.

# ---- Build stage ------------------------------------------------------------
FROM node:26-alpine AS builder

# corepack runs the pnpm version that package.json's `packageManager` pins, so
# the image, CI and developers all use the same one.
RUN corepack enable pnpm

WORKDIR /app

# Manifests first, so the install layer stays cached until a dependency changes.
# pnpm-workspace.yaml carries `allowBuilds`, which is what lets prisma and
# @prisma/engines run their postinstall scripts. prisma.config.ts, prisma/ and
# tsconfig.json have to be in place before the install: the root postinstall
# runs `prisma generate`, which reads the first two, and reads tsconfig.json to
# pick the import extension of the generated client. Without it the client
# imports `./x.ts`, which does not exist in dist/, and the app fails to start.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts tsconfig.json ./
COPY prisma ./prisma

# The 60s default fetch timeout is not enough when both stages install at once,
# and a timed-out fetch fails the whole build instead of retrying.
RUN pnpm config set store-dir /tmp/.pnpm-store && \
    pnpm config set fetch-timeout 600000 && \
    pnpm install --frozen-lockfile --prefer-offline

# Everything .dockerignore lets through: src/, seed/assessments/ and seed/media/,
# the tsconfigs. seed/workbooks/ is excluded: the app never reads it.
COPY . .

# Compiles src/ to dist/, including the Prisma Client the install generated into
# src/generated/. Type errors fail the build here.
RUN pnpm build

# ---- Production stage -------------------------------------------------------
FROM node:26-alpine AS production

RUN corepack enable pnpm

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts tsconfig.json ./
COPY prisma ./prisma

# Runtime dependencies only. No --ignore-scripts: @prisma/engines' postinstall
# downloads the schema engine that `prisma migrate deploy` needs, and
# `allowBuilds` already limits which packages may run one. The root postinstall
# (`prisma generate`) runs too; its output in src/ is unused here, since dist/
# carries the compiled client, so it is removed. So are the pnpm store and the
# pnpm and Prisma download caches, which would otherwise sit in this layer at
# about the size of node_modules itself.
RUN pnpm config set store-dir /tmp/.pnpm-store && \
    pnpm config set fetch-timeout 600000 && \
    pnpm install --frozen-lockfile --prefer-offline --prod && \
    rm -rf src /tmp/.pnpm-store /root/.cache/pnpm /root/.cache/prisma

COPY --from=builder /app/dist ./dist
# The prefilled tests and their audio, so `node dist/cli/seed-assessments`
# works inside a container. COPY keeps the host's file modes, and the audio is
# not world-readable there, so the folder is handed to the runtime user.
COPY --chown=node:node seed ./seed

# Uploads go to a volume mounted at STORAGE_DIR. The folder is created now and
# owned by node, so a fresh named volume inherits that ownership on first mount.
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node

# The app listens on PORT (default 4000). This is documentation for `docker
# inspect`; the compose files publish whatever PORT says.
EXPOSE 4000

# Apply pending migrations, then start. A container that cannot migrate never
# serves. `exec` makes Nest PID 1, so `docker stop` reaches its shutdown hooks
# and Prisma disconnects instead of being killed mid-query.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/main"]
