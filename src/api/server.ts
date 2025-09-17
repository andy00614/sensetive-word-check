import { SensitiveWordLoader } from '../core/SensitiveWordLoader';
import { CombinedDetector } from '../core/CombinedDetector';
import type { CombinedDetectionResult } from '../core/CombinedDetector';

// API 请求和响应类型
export interface DetectRequest {
  text: string;
  debug?: boolean; // 默认false，极简模式
}

// 极简响应格式
export interface SimpleDetectResponse {
  success: boolean;
  level: 'safe' | 'warning' | 'forbidden';
  score: number;
  confidence: number;
  meta: {
    timestamp: string;
    processingTime: number;
    version: string;
  };
}

// 详细响应格式（debug模式）
export interface DetailedDetectResponse {
  success: boolean;
  result?: CombinedDetectionResult;
  error?: string;
  meta: {
    timestamp: string;
    processingTime: number;
    version: string;
  };
}

// 联合类型
export type DetectResponse = SimpleDetectResponse | DetailedDetectResponse;

export interface HealthResponse {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    local: boolean;
    azure: boolean;
  };
  meta: {
    timestamp: string;
    uptime: number;
    version: string;
  };
}

class SensitiveWordAPI {
  private detector!: CombinedDetector;
  private startTime: number;
  private readonly version = '1.0.0';

  constructor() {
    this.startTime = Date.now();
    this.initializeDetector();
  }

  private async initializeDetector() {
    console.log('🚀 Initializing Sensitive Word Detection API...');

    try {
      // 初始化词库加载器
      const loader = new SensitiveWordLoader('./Sensitive-lexicon/Vocabulary');
      const initialized = loader.initialize();

      if (!initialized) {
        throw new Error('Failed to initialize word loader');
      }

      // 从环境变量读取 Azure 配置
      const azureEndpoint = process.env.AZURE_CONTENT_MODERATOR_ENDPOINT;
      const azureKey = process.env.AZURE_CONTENT_MODERATOR_KEY;

      let azureConfig = undefined;
      if (azureEndpoint && azureKey) {
        azureConfig = {
          endpoint: azureEndpoint,
          subscriptionKey: azureKey,
        };
        console.log('✅ Azure Content Safety configured from environment');
      } else {
        console.log('⚠️ Azure Content Safety not configured (missing environment variables)');
      }

      // 初始化组合检测器
      this.detector = new CombinedDetector(loader, azureConfig);
      console.log('✅ Detector initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize detector:', error);
      process.exit(1);
    }
  }

  private corsHeaders() {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
  }

  private createResponse<T>(data: T, status = 200): Response {
    return new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...this.corsHeaders(),
      },
    });
  }

  private createErrorResponse(error: string, status = 400): Response {
    return this.createResponse({
      success: false,
      error,
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: 0,
        version: this.version,
      },
    }, status);
  }

  // 转换为极简格式
  private toSimpleFormat(
    result: CombinedDetectionResult,
    processingTime: number
  ): SimpleDetectResponse {
    // 计算综合风险评分
    let totalScore = 0;

    // 本地检测的风险评分
    if (result.details.local?.analysis?.riskScore) {
      totalScore += result.details.local.analysis.riskScore;
    }

    // Azure检测的风险评分（转换为0-10分制）
    if (result.details.azure?.analysis?.maxSeverity) {
      totalScore += (result.details.azure.analysis.maxSeverity / 6) * 10;
    }

    return {
      success: true,
      level: result.level,
      score: Math.round(totalScore * 10) / 10, // 保留1位小数
      confidence: result.confidence,
      meta: {
        timestamp: new Date().toISOString(),
        processingTime,
        version: this.version,
      },
    };
  }

  // 检测文本内容
  private async handleDetect(request: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      const body = await request.json() as DetectRequest;

      if (!body.text) {
        return this.createErrorResponse('Missing required field: text');
      }

      if (typeof body.text !== 'string') {
        return this.createErrorResponse('Text must be a string');
      }

      if (body.text.length > 10000) {
        return this.createErrorResponse('Text too long (max 10000 characters)');
      }

      // 执行检测（使用初始化时配置的 Azure）
      const result = await this.detector.detect(body.text);
      const processingTime = Date.now() - startTime;

      // 根据debug参数决定返回格式（默认为极简模式）
      const isDebugMode = body.debug === true;

      let response: DetectResponse;

      if (isDebugMode) {
        // 详细模式 - 返回完整信息
        response = {
          success: true,
          result,
          meta: {
            timestamp: new Date().toISOString(),
            processingTime,
            version: this.version,
          },
        } as DetailedDetectResponse;
      } else {
        // 极简模式 - 只返回核心信息
        response = this.toSimpleFormat(result, processingTime);
      }

      return this.createResponse(response);

    } catch (error) {
      console.error('Detection error:', error);
      const processingTime = Date.now() - startTime;

      return this.createResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        meta: {
          timestamp: new Date().toISOString(),
          processingTime,
          version: this.version,
        },
      }, 500);
    }
  }

  // 健康检查
  private async handleHealth(): Promise<Response> {
    try {
      const healthStatus = await this.detector.healthCheck();
      const uptime = Date.now() - this.startTime;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!healthStatus.local) {
        status = 'unhealthy';
      } else if (!healthStatus.azure && this.detector.getStatus().azureEnabled) {
        status = 'degraded';
      }

      const response: HealthResponse = {
        success: true,
        status,
        services: healthStatus,
        meta: {
          timestamp: new Date().toISOString(),
          uptime,
          version: this.version,
        },
      };

      return this.createResponse(response);

    } catch (error) {
      console.error('Health check error:', error);

      return this.createResponse({
        success: false,
        status: 'unhealthy',
        services: { local: false, azure: false },
        meta: {
          timestamp: new Date().toISOString(),
          uptime: Date.now() - this.startTime,
          version: this.version,
        },
      }, 503);
    }
  }

  // API 信息
  private handleInfo(): Response {
    return this.createResponse({
      name: 'Sensitive Word Detection API',
      version: this.version,
      description: 'Combined local and Azure Content Moderator detection API',
      endpoints: {
        'POST /api/detect': 'Detect sensitive content in text',
        'GET /api/health': 'Health check endpoint',
        'GET /api/info': 'API information',
      },
      usage: {
        detect: 'POST /api/detect',
        example: {
          text: '测试文本'
        }
      },
      documentation: 'https://github.com/your-repo/sensitive-word-check',
    });
  }

  // 主要请求处理器
  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS 预检请求
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: this.corsHeaders(),
      });
    }

    console.log(`${method} ${url.pathname}`);

    // 路由处理
    if (method === 'POST' && url.pathname === '/api/detect') {
      return this.handleDetect(request);
    }

    if (method === 'GET' && url.pathname === '/api/health') {
      return this.handleHealth();
    }

    if (method === 'GET' && url.pathname === '/api/info') {
      return this.handleInfo();
    }

    // 根路径重定向到信息页面
    if (method === 'GET' && url.pathname === '/') {
      return this.handleInfo();
    }

    // 404 处理
    return this.createErrorResponse('Endpoint not found', 404);
  }

  // 启动服务器
  public async start(port = 3000): Promise<void> {
    const server = Bun.serve({
      port,
      fetch: (request) => this.handleRequest(request),
      error: (error) => {
        console.error('Server error:', error);
        return new Response('Internal Server Error', { status: 500 });
      },
    });

    console.log(`🌐 Sensitive Word Detection API running on http://localhost:${server.port}`);
    console.log(`📋 Health check: http://localhost:${server.port}/api/health`);
    console.log(`📝 API info: http://localhost:${server.port}/api/info`);
  }
}

// 启动服务器
const api = new SensitiveWordAPI();
const port = parseInt(process.env.PORT || '3000');

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// 启动服务
api.start(port).catch(console.error);

export { SensitiveWordAPI };