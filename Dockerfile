FROM node:16-alpine
WORKDIR /usr/src/app
COPY package*.json /
RUN npm ci --only=production && npm cache clean --force
COPY . .
EXPOSE 8080
CMD [ "node", "app.js" ]