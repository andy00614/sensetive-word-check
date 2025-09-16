import { RealWorldDetector } from './src/core/RealWorldDetector';
import { SensitiveWordLoader } from './src/core/SensitiveWordLoader';
import { readFileSync, writeFileSync } from 'fs';

interface TestCase {
  text: string;
  expectedLevel: "safe" | "warning" | "forbidden";
  category: string;
  reason: string;
}

interface MismatchResult {
  text: string;
  expected: string;
  actual: string;
  expectedCategory: string;
  actualReason: string;
  confidence: number;
  analysis: any;
}

async function testRealWorldDetector() {
  console.log('🚀 开始测试 RealWorldDetector...');

  // 初始化
  const loader = new SensitiveWordLoader('./Sensitive-lexicon/Vocabulary');
  const detector = new RealWorldDetector(loader);

  // 加载敏感词库
  const initSuccess = loader.initialize();
  if (!initSuccess) {
    console.error('❌ 敏感词库初始化失败');
    return;
  }

  console.log('✅ 敏感词库初始化成功');

  // 读取测试数据
  const testDataPath = './tests/data/high-quality-test-data/high-quality-chinese-dataset.json';
  const testData: TestCase[] = JSON.parse(readFileSync(testDataPath, 'utf-8'));

  console.log(`📊 共加载 ${testData.length} 条测试数据`);

  // 统计变量
  let totalTests = 0;
  let correctPredictions = 0;
  const mismatches: MismatchResult[] = [];
  const stats = {
    safe: { total: 0, correct: 0 },
    warning: { total: 0, correct: 0 },
    forbidden: { total: 0, correct: 0 }
  };

  // 执行测试
  console.log('🧪 开始执行测试...');

  for (const testCase of testData) {
    totalTests++;
    stats[testCase.expectedLevel].total++;

    // 执行检测
    const result = detector.detectRealWorld(testCase.text);
    const actualLevel = result.level;

    if (actualLevel === testCase.expectedLevel) {
      correctPredictions++;
      stats[testCase.expectedLevel].correct++;
    } else {
      // 记录不匹配的结果
      mismatches.push({
        text: testCase.text,
        expected: testCase.expectedLevel,
        actual: actualLevel,
        expectedCategory: testCase.category,
        actualReason: result.reason,
        confidence: result.confidence,
        analysis: result.analysis
      });
    }

    // 进度显示
    if (totalTests % 100 === 0) {
      console.log(`⏳ 已测试 ${totalTests}/${testData.length} 条数据...`);
    }
  }

  // 计算准确率
  const overallAccuracy = (correctPredictions / totalTests * 100).toFixed(2);

  console.log('\n📈 测试结果统计:');
  console.log(`总测试数量: ${totalTests}`);
  console.log(`正确预测: ${correctPredictions}`);
  console.log(`总体准确率: ${overallAccuracy}%`);
  console.log('\n各级别准确率:');

  for (const [level, stat] of Object.entries(stats)) {
    const accuracy = stat.total > 0 ? (stat.correct / stat.total * 100).toFixed(2) : '0.00';
    console.log(`${level}: ${stat.correct}/${stat.total} (${accuracy}%)`);
  }

  console.log(`\n❌ 不符合预期的结果数量: ${mismatches.length}`);

  // 保存不匹配的结果
  if (mismatches.length > 0) {
    const mismatchReport = generateMismatchReport(mismatches, stats, overallAccuracy);
    writeFileSync('./test-mismatches-report.md', mismatchReport, 'utf-8');
    console.log('📄 不符合预期的结果已保存到 test-mismatches-report.md');
  }

  console.log('✅ 测试完成!');
}

function generateMismatchReport(mismatches: MismatchResult[], stats: any, overallAccuracy: string): string {
  let report = `# RealWorldDetector 测试结果报告\n\n`;
  report += `## 总体统计\n\n`;
  report += `- **总体准确率**: ${overallAccuracy}%\n`;
  report += `- **不符合预期数量**: ${mismatches.length}\n\n`;

  report += `## 各级别准确率\n\n`;
  for (const [level, stat] of Object.entries(stats)) {
    const accuracy = stat.total > 0 ? (stat.correct / stat.total * 100).toFixed(2) : '0.00';
    report += `- **${level}**: ${stat.correct}/${stat.total} (${accuracy}%)\n`;
  }

  report += `\n## 不符合预期的测试案例\n\n`;

  // 按预期级别分组
  const groupedMismatches = {
    safe: [] as MismatchResult[],
    warning: [] as MismatchResult[],
    forbidden: [] as MismatchResult[]
  };

  mismatches.forEach(mismatch => {
    groupedMismatches[mismatch.expected as keyof typeof groupedMismatches].push(mismatch);
  });

  for (const [expectedLevel, cases] of Object.entries(groupedMismatches)) {
    if (cases.length === 0) continue;

    report += `### 预期为 ${expectedLevel.toUpperCase()}，但检测结果不符 (${cases.length} 条)\n\n`;

    cases.forEach((mismatch, index) => {
      report += `#### ${index + 1}. "${mismatch.text}"\n\n`;
      report += `- **预期级别**: ${mismatch.expected}\n`;
      report += `- **实际级别**: ${mismatch.actual}\n`;
      report += `- **预期分类**: ${mismatch.expectedCategory}\n`;
      report += `- **检测原因**: ${mismatch.actualReason}\n`;
      report += `- **置信度**: ${(mismatch.confidence * 100).toFixed(1)}%\n`;
      report += `- **分析详情**:\n`;
      report += `  - 直接匹配词汇: ${mismatch.analysis.directMatches.join(', ') || '无'}\n`;
      report += `  - 政治敏感: ${mismatch.analysis.politicalSensitive ? '是' : '否'}\n`;
      report += `  - 暴力威胁: ${mismatch.analysis.violenceThreat ? '是' : '否'}\n`;
      report += `  - 粗俗辱骂: ${mismatch.analysis.curseWords ? '是' : '否'}\n`;
      report += `  - 风险分数: ${mismatch.analysis.riskScore}\n\n`;
      report += `---\n\n`;
    });
  }

  return report;
}

// 运行测试
testRealWorldDetector().catch(console.error);