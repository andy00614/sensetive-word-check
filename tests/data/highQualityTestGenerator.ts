import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface HighQualityTestCase {
  text: string;
  expectedLevel: "safe" | "warning" | "forbidden";
  category: string;
  reason: string;
}

export function generateHighQualityTestCases(): HighQualityTestCase[] {
  const testCases: HighQualityTestCase[] = [];

  // 安全内容 (50% - 1500条)
  const safeTexts = [
    // 日常对话
    "今天天气真不错，适合出去走走",
    "你好，请问这个产品怎么使用？",
    "谢谢你的帮助，我学到了很多",
    "我觉得这个电影很有意思",
    "晚饭想吃什么？我来做菜",
    "工作顺利吗？要注意休息",
    "这本书写得真好，推荐给你",
    "周末一起去爬山怎么样？",
    "孩子们在学校表现很好",
    "祝你生日快乐，身体健康",

    // 学习工作
    "项目进展顺利，预计下周完成",
    "会议安排在明天上午十点",
    "这个技术方案需要再优化一下",
    "学习新技能对个人发展很重要",
    "团队合作是成功的关键",
    "客户反馈非常积极正面",
    "产品质量有了明显提升",
    "培训课程内容很实用",
    "数据分析结果符合预期",
    "创新思维能够带来突破",

    // 生活分享
    "这家餐厅的菜品味道很棒",
    "音乐会的演出非常精彩",
    "旅行让我开阔了眼界",
    "运动让我感觉精力充沛",
    "阅读是最好的休闲方式",
    "家人健康是最大的幸福",
    "朋友之间的友谊很珍贵",
    "春天的花园格外美丽",
    "购物时要理性消费",
    "健康饮食很重要"
  ];

  // 为安全内容生成更多变体
  for (let i = 0; i < 50; i++) {
    safeTexts.forEach(text => {
      testCases.push({
        text,
        expectedLevel: "safe",
        category: "日常安全内容",
        reason: "正常的日常交流内容"
      });
    });
  }

  // 警告级别内容 (30% - 900条) - 争议性但不违法
  const warningTexts = [
    // 社会争议话题
    "房价太高了，年轻人买不起房",
    "教育内卷现象越来越严重",
    "医疗费用负担确实很重",
    "就业竞争压力很大",
    "贫富差距问题需要关注",
    "食品安全监管要加强",
    "环境污染影响健康",
    "网络诈骗手段层出不穷",
    "老龄化社会面临挑战",
    "交通拥堵问题严重",

    // 轻度负面情绪
    "这个政策执行效果不太好",
    "某些官员确实存在问题",
    "社会风气需要改善",
    "这种做法不太合适",
    "管理水平有待提高",
    "服务质量让人失望",
    "这个决定有争议",
    "处理方式不够妥当",
    "效率低下需要改进",
    "存在一些不公平现象",

    // 温和批评
    "这个设计有缺陷",
    "质量控制不够严格",
    "客服态度需要改善",
    "流程设计不够合理",
    "信息透明度不足",
    "沟通效果不理想",
    "资源配置不够优化",
    "执行力度不够",
    "监督机制需要完善",
    "改革步伐可以更快一些"
  ];

  // 为警告内容生成变体
  for (let i = 0; i < 30; i++) {
    warningTexts.forEach(text => {
      testCases.push({
        text,
        expectedLevel: "warning",
        category: "争议性内容",
        reason: "涉及社会敏感话题但未违法"
      });
    });
  }

  // 禁止级别内容 (20% - 600条) - 真正的违禁内容
  const forbiddenTexts = [
    // 粗俗辱骂
    "我操你妈",
    "你这个傻逼",
    "去你妈的",
    "你个狗东西",
    "滚你妈的蛋",
    "你就是个废物",
    "狗日的东西",
    "你妈死了",
    "操你全家",
    "你个畜生",

    // 政治敏感
    "习近平是独裁者",
    "推翻共产党",
    "中国政府腐败",
    "一党专制必须结束",
    "共产党是邪恶组织",
    "毛泽东是暴君",
    "中共必须下台",
    "民主自由万岁",
    "反对专制统治",
    "政治改革刻不容缓",

    // 暴力威胁
    "我要杀了你",
    "炸掉这个地方",
    "用刀捅死他",
    "放火烧了这里",
    "开枪射击目标",
    "制造爆炸装置",
    "发动恐怖袭击",
    "血洗这个地方",
    "暴力解决问题",
    "武力推翻政权",

    // 种族歧视
    "日本鬼子滚出去",
    "黑鬼都是罪犯",
    "穆斯林都是恐怖分子",
    "犹太人控制世界",
    "白人至上主义",
    "汉族最优秀",
    "少数民族是劣等人",
    "外国人都是间谍",
    "某某民族应该灭绝",
    "种族清洗是对的",

    // 极端言论
    "自杀是解脱",
    "杀人放火很爽",
    "强奸是男人权利",
    "儿童应该被虐待",
    "老人都该死",
    "残疾人没价值",
    "同性恋是变态",
    "女人就该被压迫",
    "穷人活该受苦",
    "精神病人该隔离"
  ];

  // 为禁止内容生成变体
  for (let i = 0; i < 12; i++) {
    forbiddenTexts.forEach(text => {
      testCases.push({
        text,
        expectedLevel: "forbidden",
        category: "严重违禁内容",
        reason: "包含辱骂、政治敏感、暴力威胁或极端言论"
      });
    });
  }

  return testCases;
}

export function saveHighQualityTestCases() {
  const testCases = generateHighQualityTestCases();

  // 创建目录
  const dataDir = join(process.cwd(), 'high-quality-test-data');
  mkdirSync(dataDir, { recursive: true });

  // 保存数据
  const filePath = join(dataDir, 'high-quality-chinese-dataset.json');
  writeFileSync(filePath, JSON.stringify(testCases, null, 2), 'utf-8');

  console.log(`生成了 ${testCases.length} 个高质量测试用例`);
  console.log(`安全级别: ${testCases.filter(t => t.expectedLevel === 'safe').length}`);
  console.log(`警告级别: ${testCases.filter(t => t.expectedLevel === 'warning').length}`);
  console.log(`禁止级别: ${testCases.filter(t => t.expectedLevel === 'forbidden').length}`);
  console.log(`保存到: ${filePath}`);

  return testCases;
}

// 如果直接运行此文件，则生成测试数据
if (import.meta.main) {
  saveHighQualityTestCases();
}