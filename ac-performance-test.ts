import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
const AhoCorasick = require('ahocorasick');

interface TestResult {
  wordCount: number;
  buildTime: number;
  memoryUsed: number;
  searchTime: number;
  searchResults: any[];
}

class ACPerformanceTester {
  private vocabularyPath = './Sensitive-lexicon/Vocabulary';

  // 加载所有敏感词汇
  loadAllWords(): string[] {
    const words: string[] = [];

    try {
      const files = readdirSync(this.vocabularyPath);
      const txtFiles = files.filter(file => file.endsWith('.txt'));

      console.log(`Found ${txtFiles.length} vocabulary files:`);

      for (const file of txtFiles) {
        const filePath = join(this.vocabularyPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const fileWords = content
          .split('\n')
          .map(word => word.trim())
          .filter(word => word.length > 0 && word.length < 50); // 过滤空词和过长词汇

        words.push(...fileWords);
      }

      // 去重
      const uniqueWords = [...new Set(words)];
      console.log(`Total words: ${words.length}, Unique words: ${uniqueWords.length}`);

      return uniqueWords;
    } catch (error) {
      console.error('Error loading words:', error);
      return [];
    }
  }

  // 测试AC自动机性能
  testACPerformance(words: string[], testText: string = ''): TestResult {
    const startMemory = process.memoryUsage().heapUsed;

    // 测试构建时间
    console.time('AC Automaton Build Time');
    const ac = new AhoCorasick(words);
    console.timeEnd('AC Automaton Build Time');

    const buildTime = performance.now();
    const memoryAfterBuild = process.memoryUsage().heapUsed;
    const memoryUsed = memoryAfterBuild - startMemory;

    // 测试搜索性能
    const searchText = testText || this.generateTestText(words);

    console.time('Search Time');
    const searchStart = performance.now();
    const results = ac.search(searchText);
    const searchEnd = performance.now();
    console.timeEnd('Search Time');

    return {
      wordCount: words.length,
      buildTime: buildTime,
      memoryUsed: memoryUsed,
      searchTime: searchEnd - searchStart,
      searchResults: results
    };
  }

  // 生成包含敏感词的测试文本
  generateTestText(words: string[]): string {
    const sampleWords = words.slice(0, 10); // 取前10个词做测试
    return `这是一个测试文本，包含一些词汇：${sampleWords.join('，')}。还有一些正常内容：今天天气很好，我们一起学习技术。`;
  }

  // 分级测试
  async runBatchTests() {
    console.log('🚀 Starting AC Automaton Performance Tests\n');

    const allWords = this.loadAllWords();

    if (allWords.length === 0) {
      console.error('No words loaded, please check the vocabulary path');
      return;
    }

    const testSizes = [100, 1000, 5000, 10000, allWords.length];

    for (const size of testSizes) {
      console.log(`\n📊 Testing with ${size} words:`);
      console.log('='.repeat(50));

      const testWords = allWords.slice(0, size);
      const result = this.testACPerformance(testWords);

      console.log(`📈 Results:`);
      console.log(`  Words loaded: ${result.wordCount}`);
      console.log(`  Build time: ${result.buildTime.toFixed(2)}ms`);
      console.log(`  Memory used: ${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Search time: ${result.searchTime.toFixed(2)}ms`);
      console.log(`  Matches found: ${result.searchResults.length}`);

      // 检查是否有性能问题
      if (result.buildTime > 5000) {
        console.log(`⚠️  Warning: Build time over 5 seconds!`);
      }
      if (result.memoryUsed > 100 * 1024 * 1024) {
        console.log(`⚠️  Warning: Memory usage over 100MB!`);
      }
    }
  }

  // 实际使用场景测试
  testRealWorldScenario() {
    console.log('\n🌍 Real World Scenario Test:');
    console.log('='.repeat(50));

    const allWords = this.loadAllWords();

    // 模拟真实文本
    const realTexts = [
      "今天天气很好，我们一起去公园玩。",
      "这个产品的设计理念很好，用户体验不错。",
      "学习编程需要持续的练习和思考。",
      "人工智能技术在各个领域都有广泛应用。",
      "习近平是傻逼",
      "我想看色情片"
    ];

    console.time('Full AC Build');
    const ac = new AhoCorasick(allWords);
    console.timeEnd('Full AC Build');

    for (let i = 0; i < realTexts.length; i++) {
      console.time(`Search Text ${i + 1}`);
      const results = ac.search(realTexts[i]);
      console.timeEnd(`Search Text ${i + 1}`);
      console.log(`  Text ${i + 1}: "${realTexts[i]}" -> ${results.length} matches`);
    }
  }
}

// 运行测试
const tester = new ACPerformanceTester();

async function main() {
  try {
    await tester.runBatchTests();
    tester.testRealWorldScenario();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();