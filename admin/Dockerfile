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

FROM docker.io/nginx:alpine3.22 AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]