# --- Dependencies -----------------------------------------------------------
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

# --- Build --------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# --- Production -----------------------------------------------------------
FROM node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 3000

# Pending migrations are applied before the server accepts traffic. Without
# this the container starts against whatever shape the database happens to
# have and fails on the first query that needs a new column.
#
# `migrate deploy` only replays committed migration files — it never generates
# one and never drops data, which is what makes it safe to run unattended on
# every boot. It is a no-op once the database is current.
#
# This assumes a single instance. Two containers booting at once would race
# for the migration lock; Prisma serialises them, but a multi-instance
# deployment should move this into a dedicated release step instead.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
