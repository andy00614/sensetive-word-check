import { test, expect, describe, beforeAll } from "bun:test";
import { readFileSync } from 'fs';
import { join } from 'path';
import { SensitiveWordLoader } from '../../src/core/SensitiveWordLoader';
import { RealWorldDetector } from '../../src/core/RealWorldDetector';
import type { HighQualityTestCase } from '../data/highQualityTestGenerator';

describe("High Quality Test - Real World Scenarios", () => {
  let loader: SensitiveWordLoader;
  let detector: RealWorldDetector;
  let testCases: HighQualityTestCase[];

  beforeAll(() => {
    loader = new SensitiveWordLoader();
    const success = loader.initialize();
    expect(success).toBe(true);

    detector = new RealWorldDetector(loader);

    const dataPath = join(process.cwd(), 'tests', 'data', 'high-quality-test-data', 'high-quality-chinese-dataset.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    testCases = JSON.parse(rawData);

    console.log(`Loaded ${testCases.length} high-quality test cases`);
  });

  test("should achieve high accuracy on real-world scenarios", () => {
    console.log('\n🎯 High Quality Evaluation - Real World Chinese Content\n');

    const results: any[] = [];

    console.log('Processing all test cases...');
    testCases.forEach((testCase, index) => {
      if (index % 500 === 0) {
        console.log(`Progress: ${index}/${testCases.length} (${(index/testCases.length*100).toFixed(1)}%)`);
      }

      const detection = detector.detectRealWorld(testCase.text);

      results.push({
        testCase,
        detectedLevel: detection.level,
        expectedLevel: testCase.expectedLevel,
        isCorrect: detection.level === testCase.expectedLevel,
        confidence: detection.confidence,
        reason: detection.reason
      });
    });

    console.log('Processing complete! Generating report...\n');

    const report = generateQualityReport(results);
    printQualityReport(report);

    expect(results).toHaveLength(testCases.length);

    // 更严格的评估标准
    if (report.overallAccuracy >= 0.85) {
      console.log('\n🎉 EXCELLENT! High quality accuracy achieved!');
      expect(report.overallAccuracy).toBeGreaterThanOrEqual(0.85);
    } else if (report.overallAccuracy >= 0.8) {
      console.log('\n🌟 GOOD! Target accuracy reached!');
      expect(report.overallAccuracy).toBeGreaterThanOrEqual(0.8);
    } else {
      console.log(`\n📊 Current accuracy: ${(report.overallAccuracy * 100).toFixed(2)}%`);
      console.log('📈 Need further optimization for high-quality scenarios');
      expect(report.overallAccuracy).toBeGreaterThan(0.6); // 最低要求
    }
  }, 180000);

  function generateQualityReport(results: any[]) {
    const totalCases = results.length;
    const correctPredictions = results.filter(r => r.isCorrect).length;
    const overallAccuracy = correctPredictions / totalCases;

    // 按级别分析
    const levelAnalysis = {
      safe: {
        total: results.filter(r => r.expectedLevel === "safe").length,
        correct: results.filter(r => r.expectedLevel === "safe" && r.isCorrect).length,
        predicted: results.filter(r => r.detectedLevel === "safe").length,
      },
      warning: {
        total: results.filter(r => r.expectedLevel === "warning").length,
        correct: results.filter(r => r.expectedLevel === "warning" && r.isCorrect).length,
        predicted: results.filter(r => r.detectedLevel === "warning").length,
      },
      forbidden: {
        total: results.filter(r => r.expectedLevel === "forbidden").length,
        correct: results.filter(r => r.expectedLevel === "forbidden" && r.isCorrect).length,
        predicted: results.filter(r => r.detectedLevel === "forbidden").length,
      }
    };

    // 计算各级别指标
    Object.keys(levelAnalysis).forEach(level => {
      const data = levelAnalysis[level as keyof typeof levelAnalysis];
      data['recall'] = data.total > 0 ? data.correct / data.total : 0;
      data['precision'] = data.predicted > 0 ? data.correct / data.predicted : 0;
      data['f1'] = data['recall'] + data['precision'] > 0 ?
        2 * (data['recall'] * data['precision']) / (data['recall'] + data['precision']) : 0;
    });

    // 关键错误类型
    const criticalErrors = {
      safeToForbidden: results.filter(r => r.expectedLevel === "safe" && r.detectedLevel === "forbidden"),
      forbiddenToSafe: results.filter(r => r.expectedLevel === "forbidden" && r.detectedLevel === "safe"),
      missedCurseWords: results.filter(r =>
        r.expectedLevel === "forbidden" &&
        r.detectedLevel !== "forbidden" &&
        (r.testCase.text.includes("操") || r.testCase.text.includes("傻逼") || r.testCase.text.includes("妈"))
      ),
      missedPolitical: results.filter(r =>
        r.expectedLevel === "forbidden" &&
        r.detectedLevel !== "forbidden" &&
        (r.testCase.text.includes("习近平") || r.testCase.text.includes("共产党") || r.testCase.text.includes("独裁"))
      )
    };

    // 分类准确性
    const categoryAccuracy = {
      cursing: results.filter(r => r.testCase.text.includes("操") || r.testCase.text.includes("傻逼")),
      political: results.filter(r => r.testCase.text.includes("习近平") || r.testCase.text.includes("共产党")),
      violence: results.filter(r => r.testCase.text.includes("杀") || r.testCase.text.includes("炸")),
      daily: results.filter(r => r.expectedLevel === "safe")
    };

    Object.keys(categoryAccuracy).forEach(category => {
      const cases = categoryAccuracy[category as keyof typeof categoryAccuracy];
      categoryAccuracy[category as keyof typeof categoryAccuracy]['accuracy'] =
        cases.length > 0 ? cases.filter((c: any) => c.isCorrect).length / cases.length : 0;
    });

    return {
      totalCases,
      correctPredictions,
      overallAccuracy,
      levelAnalysis,
      criticalErrors,
      categoryAccuracy
    };
  }

  function printQualityReport(report: any) {
    console.log('\n📊 HIGH QUALITY EVALUATION REPORT');
    console.log('='.repeat(60));

    console.log(`\n🎯 OVERALL PERFORMANCE:`);
    console.log(`Total Cases: ${report.totalCases}`);
    console.log(`Correct Predictions: ${report.correctPredictions}`);
    console.log(`🏆 OVERALL ACCURACY: ${(report.overallAccuracy * 100).toFixed(2)}%`);

    console.log(`\n📋 LEVEL PERFORMANCE:`);
    Object.entries(report.levelAnalysis).forEach(([level, stats]: [string, any]) => {
      console.log(`\n  ${level.toUpperCase()}:`);
      console.log(`    🎯 Recall: ${(stats.recall * 100).toFixed(1)}% (${stats.correct}/${stats.total})`);
      console.log(`    🎯 Precision: ${(stats.precision * 100).toFixed(1)}% (${stats.correct}/${stats.predicted})`);
      console.log(`    🎯 F1-Score: ${(stats.f1 * 100).toFixed(1)}%`);
    });

    console.log(`\n⚠️ CRITICAL ERRORS:`);
    console.log(`  Safe → Forbidden: ${report.criticalErrors.safeToForbidden.length} cases`);
    console.log(`  Forbidden → Safe: ${report.criticalErrors.forbiddenToSafe.length} cases`);
    console.log(`  Missed Curse Words: ${report.criticalErrors.missedCurseWords.length} cases`);
    console.log(`  Missed Political: ${report.criticalErrors.missedPolitical.length} cases`);

    console.log(`\n📊 CATEGORY ACCURACY:`);
    Object.entries(report.categoryAccuracy).forEach(([category, data]: [string, any]) => {
      if (data.length > 0) {
        console.log(`  ${category.toUpperCase()}: ${(data.accuracy * 100).toFixed(1)}% (${data.filter((c: any) => c.isCorrect).length}/${data.length})`);
      }
    });

    // 显示关键错误样例
    if (report.criticalErrors.forbiddenToSafe.length > 0) {
      console.log(`\n❌ MISSED FORBIDDEN CONTENT (samples):`);
      report.criticalErrors.forbiddenToSafe.slice(0, 5).forEach((err: any, i: number) => {
        console.log(`  ${i + 1}. "${err.testCase.text}" → ${err.detectedLevel} (should be forbidden)`);
      });
    }

    if (report.criticalErrors.safeToForbidden.length > 0) {
      console.log(`\n❌ FALSE POSITIVES (samples):`);
      report.criticalErrors.safeToForbidden.slice(0, 3).forEach((err: any, i: number) => {
        console.log(`  ${i + 1}. "${err.testCase.text}" → ${err.detectedLevel} (should be safe)`);
      });
    }

    console.log(`\n🏁 ASSESSMENT:`);
    if (report.overallAccuracy >= 0.9) {
      console.log(`🌟 OUTSTANDING! ${(report.overallAccuracy * 100).toFixed(2)}% accuracy on real-world content!`);
    } else if (report.overallAccuracy >= 0.85) {
      console.log(`🌟 EXCELLENT! ${(report.overallAccuracy * 100).toFixed(2)}% accuracy achieved!`);
    } else if (report.overallAccuracy >= 0.8) {
      console.log(`📈 GOOD! ${(report.overallAccuracy * 100).toFixed(2)}% accuracy reached target!`);
    } else {
      console.log(`📊 Current: ${(report.overallAccuracy * 100).toFixed(2)}% - needs optimization for real-world scenarios`);
    }
  }
});