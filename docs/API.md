# Sensitive Word Detection API Documentation

## Overview

The Sensitive Word Detection API provides comprehensive content moderation capabilities by combining local Chinese sensitive word detection with Azure Content Moderator. It offers multiple detection endpoints for different use cases.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, the API does not require authentication. This may change in future versions.

## Rate Limiting

No rate limiting is currently implemented. Consider implementing rate limiting for production use.

## Content Types

All API endpoints accept and return JSON data:
- Request: `Content-Type: application/json`
- Response: `Content-Type: application/json`

## Common Response Format

All API responses follow this structure:

```json
{
  "success": true|false,
  "result": {...},     // Present on success
  "error": "string",   // Present on error
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "processingTime": 123,
    "version": "1.0.0"
  }
}
```

## Endpoints

### 1. Combined Detection

**POST** `/api/detect`

Performs combined detection using both local and Azure detection engines.

#### Request Body

```json
{
  "text": "要检测的文本内容",
  "options": {
    "useAzure": true,
    "azureConfig": {
      "endpoint": "https://your-resource.cognitiveservices.azure.com/contentsafety/text:analyze?api-version=2023-10-01",
      "subscriptionKey": "your-subscription-key"
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "result": {
    "level": "safe|warning|forbidden",
    "reason": "检测结果说明",
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
          "blocklistsMatch": [],
          "categoriesAnalysis": [
            {
              "category": "Hate",
              "severity": 0
            }
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
        "reasoning": "本地和 Azure 检测均未发现敏感内容"
      }
    }
  },
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "processingTime": 150,
    "version": "1.0.0"
  }
}
```

### 2. Local Detection Only

**POST** `/api/detect/local`

Uses only the local Chinese sensitive word detection engine.

#### Request Body

```json
{
  "text": "要检测的文本内容"
}
```

#### Response

Same structure as combined detection, but without Azure details.

### 3. Azure Detection Only

**POST** `/api/detect/azure`

Uses only Azure Content Moderator.

#### Request Body

```json
{
  "text": "Text to analyze",
  "options": {
    "azureConfig": {
      "endpoint": "https://your-resource.cognitiveservices.azure.com/contentsafety/text:analyze?api-version=2023-10-01",
      "subscriptionKey": "your-subscription-key"
    }
  }
}
```

### 4. Health Check

**GET** `/api/health`

Returns the health status of all detection services.

#### Response

```json
{
  "success": true,
  "status": "healthy|degraded|unhealthy",
  "services": {
    "local": true,
    "azure": false
  },
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "uptime": 12345678,
    "version": "1.0.0"
  }
}
```

### 5. API Information

**GET** `/api/info`

Returns API information and available endpoints.

#### Response

```json
{
  "name": "Sensitive Word Detection API",
  "version": "1.0.0",
  "description": "Combined local and Azure Content Moderator detection API",
  "status": {
    "local": true,
    "azure": false,
    "configured": false
  },
  "endpoints": {
    "POST /api/detect": "Detect sensitive content in text",
    "POST /api/detect/local": "Detect using local detection only",
    "POST /api/detect/azure": "Detect using Azure Content Moderator only",
    "GET /api/health": "Health check endpoint",
    "GET /api/info": "API information and available endpoints",
    "GET /api/stats": "Get detection statistics"
  },
  "usage": {
    "detect": "POST /api/detect",
    "example": {
      "text": "测试文本",
      "options": {
        "useAzure": true,
        "azureConfig": {
          "endpoint": "your-azure-endpoint",
          "subscriptionKey": "your-key"
        }
      }
    }
  }
}
```

### 6. Statistics

**GET** `/api/stats`

Returns server and detection statistics.

#### Response

```json
{
  "success": true,
  "stats": {
    "uptime": 12345.678,
    "memory": {
      "rss": 25165824,
      "heapTotal": 16842752,
      "heapUsed": 12345678,
      "external": 1234567,
      "arrayBuffers": 123456
    },
    "pid": 12345,
    "platform": "darwin",
    "version": "v20.0.0",
    "detectorStatus": {
      "localEnabled": true,
      "azureEnabled": false,
      "azureConfigured": false
    }
  },
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "version": "1.0.0"
  }
}
```

## Error Responses

### Client Errors (4xx)

```json
{
  "success": false,
  "error": "Missing required field: text",
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### Server Errors (5xx)

```json
{
  "success": false,
  "error": "Internal server error",
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "processingTime": 50,
    "version": "1.0.0"
  }
}
```

## Detection Levels

- **safe**: Content is considered safe
- **warning**: Content may be problematic but not severely harmful
- **forbidden**: Content is severely problematic and should be blocked

## Decision Logic

The combined detection uses an **OR logic**:
- If **local detection** flags as dangerous → Result: dangerous
- If **Azure detection** flags as dangerous → Result: dangerous
- If **both** flag as safe → Result: safe

This ensures maximum coverage and minimal false negatives.

## Content Categories

### Local Detection (Chinese)
- **Political Sensitive**: Government, political figures
- **Violence Threats**: Violence, terrorism, weapons
- **Profanity/Abuse**: Cursing, personal attacks
- **Racial Discrimination**: Racial slurs, hate speech
- **Extreme Statements**: Harmful ideologies

### Azure Content Moderator
- **Hate**: Hateful content
- **Violence**: Violent content
- **Sexual**: Sexual content
- **Self-Harm**: Self-harm content

## Usage Examples

### cURL Examples

#### Basic Detection
```bash
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "今天天气不错"}'
```

#### Azure Detection
```bash
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test content",
    "options": {
      "useAzure": true,
      "azureConfig": {
        "endpoint": "https://your-resource.cognitiveservices.azure.com/contentsafety/text:analyze?api-version=2023-10-01",
        "subscriptionKey": "your-key"
      }
    }
  }'
```

#### Health Check
```bash
curl -X GET http://localhost:3000/api/health
```

### JavaScript Examples

```javascript
// Basic detection
const response = await fetch('http://localhost:3000/api/detect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: '要检测的文本',
  }),
});

const result = await response.json();
console.log(result.result.level); // 'safe', 'warning', or 'forbidden'
```

### Python Examples

```python
import requests

# Basic detection
response = requests.post('http://localhost:3000/api/detect', json={
    'text': '要检测的文本'
})

result = response.json()
print(f"Detection level: {result['result']['level']}")
```

## CORS Support

The API includes CORS headers to support browser-based applications:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Limitations

1. **Text Length**: Maximum 10,000 characters per request
2. **Language**: Local detection optimized for Chinese content
3. **Rate Limiting**: Not implemented (consider for production)
4. **Authentication**: Not required (consider for production)

## Development

To start the development server:

```bash
bun run dev
```

The API will be available at `http://localhost:3000`.