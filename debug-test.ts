import { RealWorldDetector } from './src/core/RealWorldDetector';
import { SensitiveWordLoader } from './src/core/SensitiveWordLoader';

async function debugTest() {
  console.log('🔍 调试测试特定案例...');

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

  // 测试具体案例
  const testCases = [
    "团队合作是成功的关键",
    "今天天气真不错，适合出去走走",
    "这本书写得真好，推荐给你",
    "祝你生日快乐，身体健康"
  ];

  console.log('\n📋 测试具体案例:');

  for (const text of testCases) {
    console.log(`\n🔸 测试文本: "${text}"`);

    // 先测试敏感词库检测
    const keywordMatches = loader.detect(text);
    console.log(`敏感词库匹配结果: ${keywordMatches.length} 个匹配`);
    keywordMatches.forEach(match => {
      console.log(`  - "${match.word}" (位置: ${match.position[0]}-${match.position[1]}, 来源: ${match.source})`);
    });

    // 再测试RealWorldDetector
    const result = detector.detectRealWorld(text);
    console.log(`RealWorld检测结果:`);
    console.log(`  - 级别: ${result.level}`);
    console.log(`  - 原因: ${result.reason}`);
    console.log(`  - 置信度: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`  - 分析详情:`);
    console.log(`    - 直接匹配: ${result.analysis.directMatches.join(', ') || '无'}`);
    console.log(`    - 政治敏感: ${result.analysis.politicalSensitive}`);
    console.log(`    - 暴力威胁: ${result.analysis.violenceThreat}`);
    console.log(`    - 粗俗辱骂: ${result.analysis.curseWords}`);
    console.log(`    - 风险分数: ${result.analysis.riskScore}`);
  }
}

debugTest().catch(console.error);