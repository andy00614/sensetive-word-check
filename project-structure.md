# 敏感词检测服务项目结构

```
src/
├── core/
│   ├── loaders/
│   │   ├── SensitiveWordLoader.ts     # 敏感词库加载器
│   │   └── VocabularyManager.ts       # 词库管理器
│   ├── detectors/
│   │   ├── LanguageDetector.ts        # 语言检测
│   │   ├── ChineseSensitiveDetector.ts # 中文敏感词检测(AC自动机)
│   │   ├── AzureModerator.ts          # Azure内容审核服务
│   │   └── HybridDetector.ts          # 混合检测器(规则+AI)
│   ├── processors/
│   │   ├── TextProcessor.ts           # 文本预处理
│   │   └── ResultMerger.ts            # 结果合并器
│   └── index.ts                       # 核心模块导出
├── api/
│   ├── routes/
│   │   ├── detect.ts                  # 检测接口路由
│   │   ├── health.ts                  # 健康检查
│   │   └── admin.ts                   # 管理接口(词库更新等)
│   ├── middleware/
│   │   ├── auth.ts                    # 认证中间件
│   │   ├── rateLimit.ts              # 限流中间件
│   │   └── validation.ts             # 参数验证
│   ├── server.ts                      # Bun服务器入口
│   └── types.ts                       # API类型定义
├── sdk/
│   ├── browser/
│   │   ├── client.ts                  # 浏览器端SDK
│   │   └── types.ts                   # 浏览器SDK类型
│   ├── node/
│   │   ├── client.ts                  # Node.js SDK
│   │   └── types.ts                   # Node.js SDK类型
│   └── index.ts                       # SDK统一导出
├── config/
│   ├── database.ts                    # 数据库配置
│   ├── azure.ts                       # Azure服务配置
│   ├── cache.ts                       # 缓存配置
│   └── app.ts                         # 应用配置
├── utils/
│   ├── logger.ts                      # 日志工具
│   ├── cache.ts                       # 缓存工具
│   ├── errors.ts                      # 错误定义
│   └── metrics.ts                     # 性能监控
├── types/
│   ├── detection.ts                   # 检测相关类型
│   ├── azure.ts                       # Azure服务类型
│   ├── config.ts                      # 配置类型
│   └── index.ts                       # 类型统一导出
└── tests/
    ├── unit/
    │   ├── detectors/                 # 检测器单元测试
    │   ├── loaders/                   # 加载器单元测试
    │   └── processors/                # 处理器单元测试
    ├── integration/
    │   ├── api.test.ts               # API集成测试
    │   └── workflow.test.ts          # 完整流程测试
    └── fixtures/
        ├── test-texts.ts             # 测试文本数据
        └── mock-responses.ts         # 模拟响应数据

# 配置文件
├── .env.example                      # 环境变量示例
├── .env                             # 环境变量(git忽略)
├── bun.lockb                        # Bun依赖锁定
├── package.json                     # 项目配置
├── tsconfig.json                    # TypeScript配置
└── README.md                        # 项目说明

# 词库文件
├── Sensitive-lexicon/               # 敏感词库(子模块)
└── ac-performance-test.ts           # 性能测试脚本
```

## 数据流架构图

```
用户请求
    ↓
[API Gateway] → [参数验证] → [限流检查]
    ↓
[语言检测器] → 判断文本主要语言
    ↓
[混合检测器]
    ├── [中文敏感词检测] (AC自动机) → 强制禁止检查
    ├── [Azure Moderator] → AI内容审核
    └── [结果合并器] → 综合判断
    ↓
[响应格式化] → 返回结果
```

## 关键组件说明

- **HybridDetector**: 核心检测器，协调AC自动机和Azure服务
- **AzureModerator**: 封装Azure Content Moderator API调用
- **ResultMerger**: 实现你提到的5层架构判断逻辑
- **VocabularyManager**: 管理敏感词库的加载、更新、缓存