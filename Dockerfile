FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run check

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/app/data/autoflow.sqlite
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/server ./server
COPY --from=build /app/src/domain.ts ./src/domain.ts
RUN mkdir /app/data && chown -R node:node /app
USER node
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server/index.mjs"]
