# Placeholder — Web Docker build is intentionally deferred to a later phase.
FROM node:22 AS base

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm install

COPY . .

EXPOSE 4000