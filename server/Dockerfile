FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-update-notifier
COPY . .
RUN npm run build --no-update-notifier

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
EXPOSE 3000
CMD ["node", "dist/index.js"]
