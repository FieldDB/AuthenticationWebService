FROM node:12

# Create app directory
WORKDIR /usr/src/app

COPY . .
RUN NODE_ENV=production npm ci

RUN ls -alt

ENV DEBUG="*"
EXPOSE 3183

CMD [ "node", "bin/www" ]
