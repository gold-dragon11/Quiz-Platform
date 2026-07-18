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

CMD ["node", "dist/main"]
