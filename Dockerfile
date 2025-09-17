FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY Sensitive-lexicon ./Sensitive-lexicon

# 验证文件是否正确拷贝
RUN ls -la /app/Sensitive-lexicon/ && ls -la /app/Sensitive-lexicon/Vocabulary/ | head -5

EXPOSE 3000

CMD ["bun", "src/api/server.ts"]