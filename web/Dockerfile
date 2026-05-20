FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY web/package.json ./
RUN pnpm install

COPY web/. .

EXPOSE 3000
CMD ["pnpm", "dev"]
