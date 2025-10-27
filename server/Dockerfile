FROM node:24.10-alpine3.22 AS base

FROM base AS build

#RUN apk add --no-cache libc6-compat python3

WORKDIR /app

# Reuse cached layers as long as dependencies don't change.
COPY package.json package-lock.json ./
RUN npm ci

# Copy all source files and define environment file, which gets embedded (values must be true for all environments).
COPY . .

# Create a production build.
RUN npm run build

FROM base AS runtime
WORKDIR /app

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules

# Non-root user is already created in base image: uid=1000, gid=1000.
USER node
ENV NODE_ENV=production

EXPOSE 3001
ENV PORT=3001

CMD ["node", "dist/index.js"]