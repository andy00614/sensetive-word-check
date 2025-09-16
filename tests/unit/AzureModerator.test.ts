import { test, expect, describe, beforeAll } from "bun:test";
import { AzureModerator } from "../../src/core/AzureModerator";

describe("AzureModerator", () => {
  let moderator: AzureModerator;

  beforeAll(() => {
    const endpoint = process.env.AZURE_CONTENT_MODERATOR_ENDPOINT!
    const subscriptionKey = process.env.AZURE_CONTENT_MODERATOR_KEY!

    moderator = new AzureModerator({
      endpoint,
      subscriptionKey,
      timeout: 10000
    });
  });

  test("should detect safe content", async () => {
    const text = "Hello world, this is a safe message";
    const result = await moderator.detect(text);

    expect(result).toHaveProperty('categoriesAnalysis');
    expect(result).toHaveProperty('blocklistsMatch');
    expect(Array.isArray(result.categoriesAnalysis)).toBe(true);
    expect(Array.isArray(result.blocklistsMatch)).toBe(true);

    // All categories should be safe (severity 0-2)
    result.categoriesAnalysis.forEach(category => {
      expect(category.severity).toBeLessThanOrEqual(2);
    });
  });

  test("should detect violent content", async () => {
    const text = "I want to kill someone with a gun and see blood";
    const result = await moderator.detect(text);
    console.log(result)
    const violenceCategory = result.categoriesAnalysis.find(
      cat => cat.category === "Violence"
    );

    expect(violenceCategory).toBeDefined();
    expect(violenceCategory!.severity).toBeGreaterThan(2);
  });

  test("should analyze result correctly", async () => {
    const text = "I want to hurt myself badly";
    const result = await moderator.detect(text);
    const analysis = moderator.analyzeResult(result);

    expect(analysis).toHaveProperty('hasHighRisk');
    expect(analysis).toHaveProperty('hasMediumRisk');
    expect(analysis).toHaveProperty('maxSeverity');
    expect(analysis).toHaveProperty('riskCategories');

    expect(typeof analysis.hasHighRisk).toBe('boolean');
    expect(typeof analysis.hasMediumRisk).toBe('boolean');
    expect(typeof analysis.maxSeverity).toBe('number');
    expect(Array.isArray(analysis.riskCategories)).toBe(true);
  });

  test("should retry on failure", async () => {
    // 创建一个会失败的配置进行重试测试
    const failingModerator = new AzureModerator({
      endpoint: "https://invalid-endpoint.example.com/",
      subscriptionKey: "invalid-key"
    });

    await expect(
      failingModerator.detectWithRetry("test", 1)
    ).rejects.toThrow();
  });

  test("should handle empty text", async () => {
    const result = await moderator.detect("");
    expect(result.categoriesAnalysis).toBeDefined();

    // Empty text should be safe
    result.categoriesAnalysis.forEach(category => {
      expect(category.severity).toBeLessThanOrEqual(2);
    });
  });

  test("should perform health check", async () => {
    const isHealthy = await moderator.healthCheck();
    expect(typeof isHealthy).toBe('boolean');
    expect(isHealthy).toBe(true);
  });

  test("should handle Chinese text", async () => {
    const text = "你好世界，这是一个测试消息";
    const result = await moderator.detect(text);

    expect(result.categoriesAnalysis).toBeDefined();
    expect(result.categoriesAnalysis).toHaveLength(4);

    // Should contain all 4 categories
    const categories = result.categoriesAnalysis.map(cat => cat.category);
    expect(categories).toContain("Hate");
    expect(categories).toContain("SelfHarm");
    expect(categories).toContain("Sexual");
    expect(categories).toContain("Violence");
  });
});