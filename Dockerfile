# syntax=docker/dockerfile:1
FROM node:16-slim as builder

WORKDIR /mikaela-roles
COPY ["package.json", "yarn.lock", "./"]

RUN npm install -g npm@latest
RUN yarn

##### RUNNER #####
FROM node:16-slim

WORKDIR /mikaela-roles

COPY package.json package.json
COPY --from=builder /mikaela-roles/node_modules node_modules

COPY . .

RUN npx tsc

CMD ["yarn", "start"]