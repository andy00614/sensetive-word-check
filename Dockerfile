FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY Sensitive-lexicon ./Sensitive-lexicon

EXPOSE 3000

CMD ["bun", "src/api/server.ts"]