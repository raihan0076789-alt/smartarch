FROM node:18-alpine

LABEL maintainer="AI Architect Team"
LABEL description="AI Architect Backend - Production Ready"

WORKDIR /app

RUN apk add --no-cache tini

COPY package*.json ./

RUN npm ci --only=production && \
    npm cache clean --force

COPY . .

RUN mkdir -p logs && \
    chown -R node:node /app

USER node

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "server.js"]
