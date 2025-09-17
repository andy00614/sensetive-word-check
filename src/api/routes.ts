import type { DetectRequest, DetectResponse } from './server';
import { CombinedDetector } from '../core/CombinedDetector';

// 路由处理器类型
export type RouteHandler = (request: Request, params?: Record<string, string>) => Promise<Response>;

// 路由配置
export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
  description: string;
}

// API 路由管理器
export class APIRouter {
  private detector: CombinedDetector;
  private routes: Route[] = [];
  private readonly version = '1.0.0';

  constructor(detector: CombinedDetector) {
    this.detector = detector;
    this.setupRoutes();
  }

  private setupRoutes() {
    this.routes = [
      {
        method: 'POST',
        path: '/api/detect',
        handler: this.handleDetect.bind(this),
        description: 'Detect sensitive content in text',
      },
      {
        method: 'GET',
        path: '/api/health',
        handler: this.handleHealth.bind(this),
        description: 'Health check endpoint',
      },
      {
        method: 'GET',
        path: '/api/info',
        handler: this.handleInfo.bind(this),
        description: 'API information and available endpoints',
      },
      {
        method: 'GET',
        path: '/api/stats',
        handler: this.handleStats.bind(this),
        description: 'Get detection statistics',
      },
    ];
  }

  // 创建标准响应
  private createResponse<T>(data: T, status = 200): Response {
    return new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  private createErrorResponse(error: string, status = 400): Response {
    return this.createResponse({
      success: false,
      error,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.version,
      },
    }, status);
  }

  // 验证请求体
  private async validateDetectRequest(request: Request): Promise<DetectRequest | Response> {
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

      return body;

    } catch (error) {
      return this.createErrorResponse('Invalid JSON body');
    }
  }

  // 组合检测处理器
  private async handleDetect(request: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      const body = await this.validateDetectRequest(request);
      if (body instanceof Response) return body;

      const result = await this.detector.detect(body.text);
      const processingTime = Date.now() - startTime;

      const response: DetectResponse = {
        success: true,
        result,
        meta: {
          timestamp: new Date().toISOString(),
          processingTime,
          version: this.version,
        },
      };

      return this.createResponse(response);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Detection error:', error);

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


  // 健康检查处理器
  private async handleHealth(): Promise<Response> {
    try {
      const healthStatus = await this.detector.healthCheck();

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!healthStatus.local) {
        status = 'unhealthy';
      } else if (!healthStatus.azure && this.detector.getStatus().azureEnabled) {
        status = 'degraded';
      }

      return this.createResponse({
        success: true,
        status,
        services: healthStatus,
        meta: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime() * 1000,
          version: this.version,
        },
      });

    } catch (error) {
      return this.createResponse({
        success: false,
        status: 'unhealthy',
        services: { local: false, azure: false },
        meta: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime() * 1000,
          version: this.version,
        },
      }, 503);
    }
  }

  // API 信息处理器
  private async handleInfo(): Promise<Response> {
    const detectorStatus = this.detector.getStatus();

    return this.createResponse({
      name: 'Sensitive Word Detection API',
      version: this.version,
      description: 'Combined local and Azure Content Moderator detection API',
      status: {
        local: detectorStatus.localEnabled,
        azure: detectorStatus.azureEnabled,
        configured: detectorStatus.azureConfigured,
      },
      endpoints: this.routes.reduce((acc, route) => {
        acc[`${route.method} ${route.path}`] = route.description;
        return acc;
      }, {} as Record<string, string>),
      documentation: 'https://github.com/your-repo/sensitive-word-check',
      usage: {
        detect: 'POST /api/detect',
        example: {
          text: '测试文本',
        },
      },
    });
  }

  // 统计信息处理器
  private async handleStats(): Promise<Response> {
    return this.createResponse({
      success: true,
      stats: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        platform: process.platform,
        version: process.version,
        detectorStatus: this.detector.getStatus(),
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: this.version,
      },
    });
  }

  // 路由匹配
  public matchRoute(method: string, pathname: string): Route | null {
    return this.routes.find(route =>
      route.method === method && route.path === pathname
    ) || null;
  }

  // 获取所有路由
  public getRoutes(): Route[] {
    return [...this.routes];
  }

  // 处理请求
  public async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS 预检请求
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const route = this.matchRoute(method, url.pathname);

    if (route) {
      try {
        return await route.handler(request);
      } catch (error) {
        console.error(`Route handler error for ${method} ${url.pathname}:`, error);
        return this.createErrorResponse('Internal server error', 500);
      }
    }

    // 根路径重定向到信息页面
    if (method === 'GET' && url.pathname === '/') {
      return this.handleInfo();
    }

    // 404 处理
    return this.createErrorResponse('Endpoint not found', 404);
  }
}