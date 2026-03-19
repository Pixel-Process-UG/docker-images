FROM node:22-alpine
WORKDIR /app
RUN npm init -y && npm install smtp-server mailparser
COPY server.js .
EXPOSE 587
CMD ["node", "server.js"]
