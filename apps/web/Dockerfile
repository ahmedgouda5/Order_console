# Web (React/Vite) container for the Orders Console docker compose stack.
FROM node:22 AS base

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm install

COPY apps/web ./apps/web

EXPOSE 5173

CMD ["npm", "run", "dev", "--workspace=apps/web"]
