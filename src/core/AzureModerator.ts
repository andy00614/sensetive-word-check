import type { AzureContentSafetyRequest, AzureContentSafetyResponse } from '../types/index';

export interface AzureModeratorConfig {
  endpoint: string;
  subscriptionKey: string;
  timeout?: number;
}

export class AzureModerator {
  private config: AzureModeratorConfig;

  constructor(config: AzureModeratorConfig) {
    this.config = {
      timeout: 5000,
      ...config
    };
  }

  async detect(text: string): Promise<AzureContentSafetyResponse> {
    const trimmedText = text.trim();

    // Azure API不接受空文本，返回安全结果
    if (!trimmedText) {
      return {
        blocklistsMatch: [],
        categoriesAnalysis: [
          { category: "Hate", severity: 0 },
          { category: "SelfHarm", severity: 0 },
          { category: "Sexual", severity: 0 },
          { category: "Violence", severity: 0 }
        ]
      };
    }

    const request: AzureContentSafetyRequest = {
      text: trimmedText
    };

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure API error (${response.status}): ${errorText}`);
      }

      const result = await response.json() as AzureContentSafetyResponse;
      return result;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Azure Moderator error:', error.message);
        throw error;
      }
      throw new Error('Unknown Azure Moderator error');
    }
  }

  async detectWithRetry(text: string, maxRetries: number = 2): Promise<AzureContentSafetyResponse> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.detect(text);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 指数退避
          console.warn(`Azure API attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // 分析结果并判断风险等级
  analyzeResult(result: AzureContentSafetyResponse, options?: {
    highRiskThreshold?: number;
    mediumRiskThreshold?: number;
  }): {
    hasHighRisk: boolean;
    hasMediumRisk: boolean;
    maxSeverity: number;
    riskCategories: string[];
    severityBreakdown: Record<string, number>;
  } {
    // Azure默认返回0,2,4,6等级，也支持0-7完整等级
    const highRiskThreshold = options?.highRiskThreshold ?? 4; // severity >= 4
    const mediumRiskThreshold = options?.mediumRiskThreshold ?? 2; // severity >= 2

    let maxSeverity = 0;
    const riskCategories: string[] = [];
    const severityBreakdown: Record<string, number> = {};

    for (const category of result.categoriesAnalysis) {
      maxSeverity = Math.max(maxSeverity, category.severity);
      severityBreakdown[category.category] = category.severity;

      if (category.severity >= mediumRiskThreshold) {
        riskCategories.push(category.category);
      }
    }

    return {
      hasHighRisk: maxSeverity >= highRiskThreshold,
      hasMediumRisk: maxSeverity >= mediumRiskThreshold,
      maxSeverity,
      riskCategories,
      severityBreakdown
    };
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      await this.detect("Hello world");
      return true;
    } catch (error) {
      console.error('Azure Moderator health check failed:', error);
      return false;
    }
  }
}