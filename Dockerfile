FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY src ./src
COPY scripts ./scripts

RUN node scripts/build.mjs
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "scripts/dev.mjs"]
