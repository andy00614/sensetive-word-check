# Use Bun's official image
FROM oven/bun:1 as build

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build:all

# Production stage
FROM oven/bun:1-slim as runtime

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/Sensitive-lexicon ./Sensitive-lexicon
COPY --from=build /app/package.json ./

# Install only production dependencies
RUN bun install --production --frozen-lockfile

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bun
USER bun

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["bun", "src/api/server.ts"]