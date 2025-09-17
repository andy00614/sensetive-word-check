FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY src ./src

# 拷贝词库
COPY vocabulary-data ./vocabulary-data

# 验证文件是否正确拷贝
RUN ls -la /app/vocabulary-data/ | head -5

EXPOSE 3000

CMD ["bun", "src/api/server.ts"]