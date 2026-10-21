# Placeholder — Web Docker build is intentionally deferred to a later phase.
FROM node:22 as base

WORKDIR /app

COPY package*.json .

RUN npm install

COPY . .

EXPOSE 4000