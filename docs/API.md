# Sensitive Word Detection API Documentation

## Base URL

```
http://localhost:3000
```

## Authentication

This API does not require authentication for basic usage. Azure configuration is handled via environment variables.

## Content Types

All API endpoints accept and return JSON data:
- Request: `Content-Type: application/json`
- Response: `Content-Type: application/json`

## Common Response Format

The API supports two response formats:

### 极简模式 (默认)
简洁的响应格式，只包含核心检测信息：

```json
{
  "success": true,
  "level": "safe|warning|forbidden",
  "score": 0,
  "confidence": 0.95,
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "processingTime": 1,
    "version": "1.0.0"
  }
}
```

### 详细模式 (debug: true)
完整的响应格式，包含详细的分析数据：

```json
{
  "success": true,
  "result": {
    "level": "safe|warning|forbidden",
    "reason": "详细检测结果说明",
    "confidence": 0.95,
    "details": { /* 完整分析数据 */ }
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "processingTime": 123,
    "version": "1.0.0"
  }
}
```

## Endpoints

### 1. 敏感词检测

**POST** `/api/detect`

执行敏感词检测，结合本地中文词库和Azure Content Safety进行分析。

#### Request Body

```json
{
  "text": "要检测的文本内容",
  "debug": false
}
```

**参数说明：**
- `text` (string, required): 要检测的文本内容，最大长度10000字符
- `debug` (boolean, optional):
  - `false` (默认): 返回极简格式
  - `true`: 返回详细格式

#### Response Examples

**极简模式响应 (debug: false):**

```json
{
  "success": true,
  "level": "safe",
  "score": 0,
  "confidence": 0.95,
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "processingTime": 1,
    "version": "1.0.0"
  }
}
```

**敏感内容极简模式:**

```json
{
  "success": true,
  "level": "forbidden",
  "score": 21,
  "confidence": 0.9,
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "processingTime": 2,
    "version": "1.0.0"
  }
}
```

**详细模式响应 (debug: true):**

```json
{
  "success": true,
  "result": {
    "level": "safe",
    "reason": "本地和 Azure 检测均未发现敏感内容",
    "confidence": 0.95,
    "details": {
      "local": {
        "level": "safe",
        "reason": "无敏感内容",
        "confidence": 0.95,
        "analysis": {
          "directMatches": [],
          "politicalSensitive": false,
          "violenceThreat": false,
          "curseWords": false,
          "riskScore": 0
        }
      },
      "azure": {
        "result": {
          "categoriesAnalysis": [
            {"category": "Hate", "severity": 0},
            {"category": "SelfHarm", "severity": 0},
            {"category": "Sexual", "severity": 0},
            {"category": "Violence", "severity": 0}
          ]
        },
        "analysis": {
          "hasHighRisk": false,
          "hasMediumRisk": false,
          "maxSeverity": 0,
          "riskCategories": []
        },
        "available": true
      },
      "finalDecision": {
        "triggeredBy": "none",
        "reasoning": "本地检测: 无敏感内容；Azure 检测: 最高严重度 0/6，无风险内容"
      }
    }
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "processingTime": 132,
    "version": "1.0.0"
  }
}
```

#### Response Fields

**极简模式字段：**
- `success`: 请求是否成功
- `level`: 检测级别 (`safe`, `warning`, `forbidden`)
- `score`: 综合风险评分 (0-100+)
- `confidence`: 检测置信度 (0-1)
- `meta`: 请求元数据

**详细模式额外字段：**
- `result.details.local`: 本地检测详细结果
- `result.details.azure`: Azure检测详细结果
- `result.details.finalDecision`: 最终决策逻辑

### 2. 健康检查

**GET** `/api/health`

检查API服务和检测引擎的健康状态。

#### Response

```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "local": true,
    "azure": true,
    "overall": true
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "uptime": 300000,
    "version": "1.0.0"
  }
}
```

### 3. API信息

**GET** `/api/info`

获取API基本信息和可用端点。

#### Response

```json
{
  "name": "Sensitive Word Detection API",
  "version": "1.0.0",
  "description": "Combined local and Azure Content Moderator detection API",
  "status": {
    "local": true,
    "azure": true,
    "configured": true
  },
  "endpoints": {
    "POST /api/detect": "Detect sensitive content in text",
    "GET /api/health": "Health check endpoint",
    "GET /api/info": "API information and available endpoints",
    "GET /api/stats": "Get detection statistics"
  },
  "usage": {
    "detect": "POST /api/detect",
    "example": {
      "text": "测试文本"
    }
  }
}
```

### 4. 统计信息

**GET** `/api/stats`

获取服务器运行状态和检测器统计信息。

#### Response

```json
{
  "success": true,
  "stats": {
    "uptime": 300,
    "memory": {
      "rss": 52428800,
      "heapTotal": 26738688,
      "heapUsed": 18874088
    },
    "pid": 12345,
    "platform": "darwin",
    "version": "v20.0.0",
    "detectorStatus": {
      "localEnabled": true,
      "azureEnabled": true,
      "azureConfigured": true
    }
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "version": "1.0.0"
  }
}
```

## Usage Examples

### cURL Examples

**基本检测（极简模式）:**
```bash
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"text":"测试文本"}'
```

**详细检测:**
```bash
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"text":"测试文本","debug":true}'
```

**健康检查:**
```bash
curl http://localhost:3000/api/health
```

### JavaScript SDK

```javascript
import { SensitiveWordClient } from './sdk/client';

const client = new SensitiveWordClient({
  baseURL: 'http://localhost:3000'
});

// 极简模式
const result = await client.detect('测试文本');
console.log(result.level, result.score);

// 详细模式
const detailedResult = await client.detect('测试文本', true);
console.log(detailedResult.result.details);

// 批量检测
const results = await client.detectBatch(['文本1', '文本2']);
```

## Error Responses

所有错误响应都遵循以下格式：

```json
{
  "success": false,
  "error": "错误描述",
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "processingTime": 0,
    "version": "1.0.0"
  }
}
```

### 常见错误

- `400 Bad Request`: 请求格式错误或缺少必需参数
- `404 Not Found`: 端点不存在
- `500 Internal Server Error`: 服务器内部错误

## Detection Levels

- **safe**: 无敏感内容 (score: 0-0.9)
- **warning**: 可疑或轻度敏感内容 (score: 1-7.9)
- **forbidden**: 严重敏感或违禁内容 (score: 8+)

## Configuration

API通过环境变量配置：

```bash
AZURE_CONTENT_MODERATOR_ENDPOINT=https://your-resource.cognitiveservices.azure.com/contentsafety/text:analyze?api-version=2024-09-01
AZURE_CONTENT_MODERATOR_KEY=your-subscription-key
PORT=3000
```

## Rate Limiting

当前版本暂无速率限制，建议生产环境中实施适当的限制。