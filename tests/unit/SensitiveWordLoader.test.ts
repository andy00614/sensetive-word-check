import { test, expect, describe, beforeAll } from "bun:test";
import { SensitiveWordLoader } from "../../src/core/SensitiveWordLoader";

describe("SensitiveWordLoader", () => {
  let loader: SensitiveWordLoader;

  beforeAll(() => {
    loader = new SensitiveWordLoader();
    const success = loader.initialize();
    expect(success).toBe(true);
  });

  test("should initialize successfully", () => {
    expect(loader.isInitialized()).toBe(true);
  });

  test("should load words and provide stats", () => {
    const stats = loader.getStats();
    expect(stats.totalWords).toBeGreaterThan(0);
    expect(stats.categories).toBeGreaterThan(0);
    expect(stats.isInitialized).toBe(true);
    expect(stats.categoryBreakdown).toBeDefined();
  });

  test("should detect no sensitive words in normal text", () => {
    const text = "今天天气很好，我们一起去公园玩。";
    const matches = loader.detect(text);
    expect(matches).toHaveLength(0);
  });

  test("should detect sensitive words in problematic text", () => {
    const text = "习近平是傻逼";
    const matches = loader.detect(text);
    expect(matches.length).toBeGreaterThan(2);

    const hasTargetWord = matches.some(match =>
      match.word === "习近平" || match.word === "傻逼"
    );
    expect(hasTargetWord).toBe(true);

    // Check match structure
    matches.forEach(match => {
      expect(match).toHaveProperty('word');
      expect(match).toHaveProperty('position');
      expect(match).toHaveProperty('category');
      expect(match).toHaveProperty('source');
      expect(Array.isArray(match.position)).toBe(true);
      expect(match.position).toHaveLength(2);
    });
  });

  test("should detect multiple categories", () => {
    const text = "我想看色情片";
    const matches = loader.detect(text);
    expect(matches.length).toBeGreaterThan(0);

    const hasColorContent = matches.some(match =>
      match.word.includes("色情")
    );
    expect(hasColorContent).toBe(true);
  });

  test("should handle empty text", () => {
    const matches = loader.detect("");
    expect(matches).toHaveLength(0);
  });

  test("should handle text without sensitive words", () => {
    const text = "普通的技术讨论内容，关于编程和软件开发。";
    const matches = loader.detect(text);
    expect(matches).toHaveLength(0);
  });

  test("should throw error when not initialized", () => {
    const uninitializedLoader = new SensitiveWordLoader();
    expect(() => {
      uninitializedLoader.detect("test");
    }).toThrow("AC automaton not initialized");
  });
});