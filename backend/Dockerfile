# Stage 1: Builder
FROM node:24-alpine3.21 AS builder

WORKDIR /app


COPY package*.json ./


RUN npm install

COPY . .

RUN npm run build


# Stage 2: Runtime
FROM node:24-alpine3.21 AS runtime

WORKDIR /app


COPY package*.json ./
RUN npm install --only=production


COPY --from=builder /app/dist ./dist


EXPOSE 3000

CMD ["node", "dist/server.js"]
