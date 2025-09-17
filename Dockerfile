FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY src ./src

# 拷贝词库（两种方式备用）
COPY vocabulary-data ./vocabulary-data
COPY Sensitive-lexicon/Vocabulary ./Sensitive-lexicon/Vocabulary 2>/dev/null || true

# 验证文件是否正确拷贝
RUN ls -la /app/vocabulary-data/ | head -5 || echo "vocabulary-data not found"
RUN ls -la /app/Sensitive-lexicon/Vocabulary/ | head -5 || echo "Sensitive-lexicon/Vocabulary not found"

EXPOSE 3000

CMD ["bun", "src/api/server.ts"]