FROM node:14-alpine
MAINTAINER Tadeas Kmenta <tadeas@zel.network>

COPY package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /app && cp -a /tmp/node_modules /app/

WORKDIR /app

COPY . .

EXPOSE 3333

CMD [ "npm", "start" ]