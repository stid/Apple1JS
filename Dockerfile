FROM node:16.13.1-slim

RUN apt-get update -y
RUN apt-get install apt-transport-https -y --no-install-recommends

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update -y

RUN apt-get install yarn -y --no-install-recommends

WORKDIR /usr/src/6502

COPY package.json ./
COPY yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build

CMD [ "yarn", "start" ]
