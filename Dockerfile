FROM node:18-alpine
WORKDIR /app
COPY package.json worker.js ./
RUN npm install
CMD ["node", "worker.js"]
