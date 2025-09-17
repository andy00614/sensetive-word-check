// TypeScript SDK for Sensitive Word Detection API

export interface DetectRequest {
  text: string;
}

export interface DetectResponse {
  success: boolean;
  result?: {
    level: 'safe' | 'warning' | 'forbidden';
    reason: string;
    confidence: number;
    details: any;
  };
  error?: string;
  meta: {
    timestamp: string;
    processingTime: number;
    version: string;
  };
}

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

export interface ClientConfig {
  baseURL: string;
  timeout?: number;
  apiKey?: string;
}

interface InternalConfig {
  baseURL: string;
  timeout: number;
  apiKey?: string;
}

export class SensitiveWordClient {
  private config: InternalConfig;

  constructor(config: ClientConfig) {
    this.config = {
      baseURL: config.baseURL.replace(/\/$/, ''), // Remove trailing slash
      timeout: config.timeout || 10000,
      apiKey: config.apiKey,
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * 检测敏感词内容
   */
  async detect(text: string): Promise<DetectResponse> {
    const request: DetectRequest = { text };

    return this.makeRequest<DetectResponse>('/api/detect', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * 批量检测
   */
  async detectBatch(texts: string[]): Promise<DetectResponse[]> {
    const promises = texts.map(text => this.detect(text));
    return Promise.all(promises);
  }

  /**
   * 获取 API 健康状态
   */
  async health(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>('/api/health');
  }

  /**
   * 获取 API 信息
   */
  async info(): Promise<any> {
    return this.makeRequest<any>('/api/info');
  }

  /**
   * 获取统计信息
   */
  async stats(): Promise<any> {
    return this.makeRequest<any>('/api/stats');
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.health();
      return response.success && response.status !== 'unhealthy';
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): Readonly<typeof this.config> {
    return this.config;
  }
}

// 便捷创建函数
export function createClient(config: ClientConfig): SensitiveWordClient {
  return new SensitiveWordClient(config);
}

// 默认客户端（开发时使用）
export const defaultClient = createClient({
  baseURL: 'http://localhost:3000',
});

// 批量检测便捷函数
export async function detectTexts(
  texts: string[],
  client: SensitiveWordClient = defaultClient
): Promise<Array<DetectResponse & { text: string; index: number }>> {
  const results = await client.detectBatch(texts);

  return results.map((result, index) => ({
    ...result,
    text: texts[index]!,
    index,
  }));
}

// 错误类
export class SensitiveWordError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'SensitiveWordError';
    this.code = code;
    this.details = details;
  }
}

// 重试工具函数
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError!;
}

// 类型守护函数
export function isDetectResponse(obj: any): obj is DetectResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.success === 'boolean' &&
    typeof obj.meta === 'object'
  );
}

export function isHealthResponse(obj: any): obj is HealthResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.success === 'boolean' &&
    typeof obj.status === 'string' &&
    typeof obj.services === 'object'
  );
}