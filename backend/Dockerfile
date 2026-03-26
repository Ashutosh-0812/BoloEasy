FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY backend/ .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "index.js"]
