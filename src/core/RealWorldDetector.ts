import { SensitiveWordLoader } from './SensitiveWordLoader';

export interface RealWorldDetectionResult {
  level: "safe" | "warning" | "forbidden";
  reason: string;
  confidence: number;
  analysis: {
    directMatches: string[];
    politicalSensitive: boolean;
    violenceThreat: boolean;
    curseWords: boolean;
    riskScore: number;
  };
}

export class RealWorldDetector {
  private loader: SensitiveWordLoader;

  // 高质量安全词汇 - 绝对不会误判的词
  private absolutelySafeWords = new Set([
    "今天", "天气", "不错", "适合", "出去", "走走", "你好", "请问", "产品", "怎么", "使用",
    "谢谢", "帮助", "学到", "很多", "觉得", "电影", "有意思", "晚饭", "想吃", "什么",
    "工作", "顺利", "注意", "休息", "这本", "书", "写得", "真好", "推荐", "周末",
    "一起", "爬山", "怎么样", "孩子们", "学校", "表现", "很好", "祝你", "生日", "快乐",
    "身体", "健康", "项目", "进展", "预计", "下周", "完成", "会议", "安排", "明天",
    "上午", "十点", "技术", "方案", "需要", "优化", "学习", "新", "技能", "个人",
    "发展", "重要", "团队", "合作", "成功", "关键", "客户", "反馈", "积极", "正面",
    "质量", "明显", "提升", "培训", "课程", "内容", "实用", "数据", "分析", "结果",
    "符合", "预期", "创新", "思维", "能够", "带来", "突破", "餐厅", "菜品", "味道",
    "很棒", "音乐会", "演出", "精彩", "旅行", "开阔", "眼界", "运动", "感觉",
    "精力", "充沛", "阅读", "最好", "休闲", "方式", "家人", "最大", "幸福",
    "朋友", "之间", "友谊", "珍贵", "春天", "花园", "格外", "美丽", "购物",
    "理性", "消费", "饮食", "生活", "可以", "应该", "希望", "想要", "认为",
    "大家", "每个人", "自己", "改善", "提高", "支持", "鼓励", "理解", "尊重"
  ]);

  // 直接粗俗辱骂词汇 - 立即forbidden
  private directCurseWords = new Set([
    "操你妈", "我操你妈", "操你", "操", "你妈", "傻逼", "你这个傻逼", "傻b",
    "去你妈的", "你个狗东西", "滚你妈的蛋", "你就是个废物", "狗日的东西",
    "你妈死了", "操你全家", "你个畜生", "草你妈", "干你妈", "日你妈", "尼玛",
    "sb", "cnm", "nmsl", "你妈逼", "傻逼玩意", "智障", "脑残", "废物", "垃圾",
    "贱人", "婊子", "妓女", "臭婊子", "死妈", "去死", "该死", "找死"
  ]);

  // 政治敏感词汇 - 立即forbidden
  private politicalSensitiveWords = new Set([
    "习近平是独裁", "习近平", "推翻共产党", "共产党", "中国政府腐败", "一党专制",
    "共产党是邪恶组织", "毛泽东是暴君", "中共必须下台", "民主自由万岁",
    "反对专制统治", "政治改革刻不容缓", "独裁者", "独裁", "专制", "暴君",
    "邪恶组织", "下台", "推翻", "腐败", "反对", "专制统治"
  ]);

  // 暴力威胁词汇 - 立即forbidden
  private violenceThreatWords = new Set([
    "我要杀了你", "杀了你", "炸掉这个地方", "用刀捅死他", "放火烧了这里",
    "开枪射击目标", "制造爆炸装置", "发动恐怖袭击", "血洗这个地方",
    "暴力解决问题", "武力推翻政权", "杀死", "杀人", "杀害", "捅死", "炸掉",
    "放火", "烧死", "开枪", "射击", "爆炸", "恐怖袭击", "血洗", "武力推翻"
  ]);

  // 种族歧视词汇 - 立即forbidden
  private racialSlurs = new Set([
    "日本鬼子滚出去", "黑鬼都是罪犯", "穆斯林都是恐怖分子", "犹太人控制世界",
    "白人至上主义", "汉族最优秀", "少数民族是劣等人", "外国人都是间谍",
    "种族清洗是对的", "日本鬼子", "黑鬼", "劣等人", "种族清洗", "至上主义"
  ]);

  // 极端言论 - 立即forbidden
  private extremeStatements = new Set([
    "自杀是解脱", "杀人放火很爽", "强奸是男人权利", "儿童应该被虐待",
    "老人都该死", "残疾人没价值", "同性恋是变态", "女人就该被压迫",
    "穷人活该受苦", "精神病人该隔离", "强奸", "虐待", "该死", "没价值",
    "变态", "被压迫", "活该受苦", "该隔离"
  ]);

  // 警告级别关键词
  private warningKeywords = new Set([
    "房价太高", "教育内卷", "医疗费用", "就业竞争", "贫富差距", "食品安全",
    "环境污染", "网络诈骗", "老龄化", "交通拥堵", "政策执行", "官员", "社会风气",
    "管理水平", "服务质量", "有争议", "处理方式", "效率低下", "不公平现象",
    "设计有缺陷", "质量控制", "客服态度", "流程设计", "信息透明度", "沟通效果",
    "资源配置", "执行力度", "监督机制", "改革步伐"
  ]);

  constructor(loader: SensitiveWordLoader) {
    this.loader = loader;
  }

  detectRealWorld(text: string): RealWorldDetectionResult {
    const analysis = {
      directMatches: [] as string[],
      politicalSensitive: false,
      violenceThreat: false,
      curseWords: false,
      riskScore: 0
    };

    // 第一步：检查直接粗俗辱骂 - 最高优先级
    for (const word of this.directCurseWords) {
      if (text.includes(word)) {
        analysis.curseWords = true;
        analysis.directMatches.push(word);
        analysis.riskScore += 10;
      }
    }

    // 第二步：检查政治敏感内容
    for (const word of this.politicalSensitiveWords) {
      if (text.includes(word)) {
        analysis.politicalSensitive = true;
        analysis.directMatches.push(word);
        analysis.riskScore += 8;
      }
    }

    // 第三步：检查暴力威胁
    for (const word of this.violenceThreatWords) {
      if (text.includes(word)) {
        analysis.violenceThreat = true;
        analysis.directMatches.push(word);
        analysis.riskScore += 9;
      }
    }

    // 第四步：检查种族歧视
    for (const word of this.racialSlurs) {
      if (text.includes(word)) {
        analysis.directMatches.push(word);
        analysis.riskScore += 8;
      }
    }

    // 第五步：检查极端言论
    for (const word of this.extremeStatements) {
      if (text.includes(word)) {
        analysis.directMatches.push(word);
        analysis.riskScore += 9;
      }
    }

    // 第六步：检查敏感词库
    const keywordMatches = this.loader.detect(text);
    const filteredKeywords = keywordMatches.filter(match =>
      !this.absolutelySafeWords.has(match.word)
    );

    // 为高风险词汇增加分数，单字符降低权重
    filteredKeywords.forEach(match => {
      if (match.source.includes("政治类型") || match.source.includes("反动词库")) {
        analysis.riskScore += 3;
        analysis.directMatches.push(match.word);
      } else if (match.source.includes("暴恐词库") || match.source.includes("涉枪涉爆")) {
        analysis.riskScore += 3;
        analysis.directMatches.push(match.word);
      } else {
        // 单字符权重降低，多字符正常权重
        const weight = match.word.length === 1 ? 0.2 : 1;
        analysis.riskScore += weight;
        analysis.directMatches.push(match.word);
      }
    });

    // 第七步：检查警告级别内容
    for (const word of this.warningKeywords) {
      if (text.includes(word)) {
        analysis.riskScore += 0.5;
      }
    }

    // 第八步：最终决策
    let level: "safe" | "warning" | "forbidden";
    let reason: string;
    let confidence: number;

    if (analysis.curseWords || analysis.politicalSensitive || analysis.violenceThreat || analysis.riskScore >= 8) {
      level = "forbidden";
      const reasons = [];
      if (analysis.curseWords) reasons.push("粗俗辱骂");
      if (analysis.politicalSensitive) reasons.push("政治敏感");
      if (analysis.violenceThreat) reasons.push("暴力威胁");
      if (analysis.directMatches.length > 0) reasons.push(`敏感词汇: ${analysis.directMatches.slice(0, 3).join(', ')}`);

      reason = `严重违禁内容: ${reasons.join(', ')}`;
      confidence = 0.9;
    } else if (analysis.riskScore >= 2) {
      level = "warning";
      reason = `可疑内容 (风险分数: ${analysis.riskScore}, 匹配词汇: ${analysis.directMatches.length})`;
      confidence = 0.75;
    } else if (analysis.riskScore >= 1) {
      level = "warning";
      reason = "轻度敏感内容";
      confidence = 0.65;
    } else {
      level = "safe";
      reason = "无敏感内容";
      confidence = 0.95;
    }

    return {
      level,
      reason,
      confidence,
      analysis
    };
  }
}