FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js ./
COPY aerosync.js ./
COPY db.js ./
COPY openapi.js ./
COPY src/validation.js ./src/validation.js
EXPOSE 3000
CMD ["node", "server.js"]
