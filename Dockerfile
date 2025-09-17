FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY src ./src

# 创建目录并拷贝词库
RUN mkdir -p /app/Sensitive-lexicon
COPY Sensitive-lexicon/Vocabulary /app/Sensitive-lexicon/Vocabulary

# 验证文件是否正确拷贝
RUN ls -la /app/Sensitive-lexicon/ && ls -la /app/Sensitive-lexicon/Vocabulary/ | head -5

EXPOSE 3000

CMD ["bun", "src/api/server.ts"]