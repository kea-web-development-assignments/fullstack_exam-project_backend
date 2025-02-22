FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
EXPOSE 3131
CMD [ "node", "start.js" ]
