FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN apk --no-cache add ca-certificates && \
    update-ca-certificates

# package-lock.json копируем, если он есть: сборка не падает без него
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js server.js

# Российский корневой CA: без него Node не может проверить цепочку platform-api2.max.ru
COPY certs ./certs
ENV NODE_EXTRA_CA_CERTS=/app/certs/russian-trusted.pem

# Container Apps сам задаёт PORT (по умолчанию 8080) и опрашивает /health
EXPOSE 8080

USER node

CMD ["node", "server.js"]

