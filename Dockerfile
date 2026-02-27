# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g npm@latest --quiet

# Copy package files
COPY package*.json ./
RUN npm ci --no-update-notifier

# Copy source and build
COPY . .

# Build args for Vite (baked in at build time)
ARG VITE_API_URL=https://api-kitapantaups.ditpps.com
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --no-update-notifier

# Stage 2: Serve
FROM nginx:alpine
# Copy compiled assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy nginx config
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
