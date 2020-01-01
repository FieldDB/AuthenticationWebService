FROM node:10

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN ls -alt

EXPOSE 3183

CMD [ "node", "auth_service.js" ]
