import { RealWorldDetector, RealWorldDetectionResult } from './RealWorldDetector';
import { AzureModerator, AzureModeratorConfig } from './AzureModerator';
import { SensitiveWordLoader } from './SensitiveWordLoader';
import type { AzureContentSafetyResponse } from '../types/index';

export interface AzureDetails {
  result?: AzureContentSafetyResponse;
  analysis?: {
    hasHighRisk: boolean;
    hasMediumRisk: boolean;
    maxSeverity: number;
    riskCategories: string[];
  };
  available: boolean;
  error?: string;
}

export interface CombinedDetectionResult {
  level: "safe" | "warning" | "forbidden";
  reason: string;
  confidence: number;
  details: {
    local: RealWorldDetectionResult;
    azure: AzureDetails;
    finalDecision: {
      triggeredBy: 'local' | 'azure' | 'both' | 'none';
      reasoning: string;
    };
  };
}

export class CombinedDetector {
  private realWorldDetector: RealWorldDetector;
  private azureModerator: AzureModerator | undefined;
  private azureEnabled: boolean = false;

  constructor(
    loader: SensitiveWordLoader,
    azureConfig?: AzureModeratorConfig
  ) {
    this.realWorldDetector = new RealWorldDetector(loader);

    if (azureConfig) {
      this.azureModerator = new AzureModerator(azureConfig);
      this.azureEnabled = true;
    }
  }

  async detect(text: string): Promise<CombinedDetectionResult> {
    // 首先执行本地检测
    const localResult = this.realWorldDetector.detectRealWorld(text);

    let azureDetails: AzureDetails = {
      available: false
    };

    // 如果启用了 Azure，执行 Azure 检测
    if (this.azureEnabled && this.azureModerator) {
      try {
        const azureResult = await this.azureModerator.detect(text);
        const azureAnalysis = this.azureModerator.analyzeResult(azureResult);

        azureDetails = {
          result: azureResult,
          analysis: azureAnalysis,
          available: true
        };
      } catch (error) {
        azureDetails = {
          available: true,
          error: error instanceof Error ? error.message : 'Unknown Azure error'
        };
      }
    }

    // 综合决策逻辑
    const finalDecision = this.makeFinalDecision(localResult, azureDetails);

    return {
      level: finalDecision.level,
      reason: finalDecision.reason,
      confidence: finalDecision.confidence,
      details: {
        local: localResult,
        azure: azureDetails,
        finalDecision: finalDecision.decision
      }
    };
  }

  private makeFinalDecision(
    localResult: RealWorldDetectionResult,
    azureDetails: AzureDetails
  ): {
    level: "safe" | "warning" | "forbidden";
    reason: string;
    confidence: number;
    decision: {
      triggeredBy: 'local' | 'azure' | 'both' | 'none';
      reasoning: string;
    };
  } {
    // 如果 Azure 不可用，仅使用本地结果
    if (!azureDetails.available || azureDetails.error) {
      return {
        level: localResult.level,
        reason: localResult.reason,
        confidence: localResult.confidence,
        decision: {
          triggeredBy: 'local',
          reasoning: azureDetails.error
            ? `Azure 检测失败，使用本地检测结果: ${azureDetails.error}`
            : 'Azure 检测未启用，使用本地检测结果'
        }
      };
    }

    const azureAnalysis = azureDetails.analysis;
    if (!azureAnalysis) {
      return {
        level: localResult.level,
        reason: localResult.reason,
        confidence: localResult.confidence,
        decision: {
          triggeredBy: 'local',
          reasoning: 'Azure 分析不可用，使用本地检测结果'
        }
      };
    }
    const localForbidden = localResult.level === 'forbidden';
    const localWarning = localResult.level === 'warning';
    const azureForbidden = azureAnalysis.hasHighRisk;
    const azureWarning = azureAnalysis.hasMediumRisk;

    // 决策优先级：任何一方判定为 forbidden，最终结果就是 forbidden
    if (localForbidden || azureForbidden) {
      let triggeredBy: 'local' | 'azure' | 'both' = 'local';
      let reasoning = '';

      if (localForbidden && azureForbidden) {
        triggeredBy = 'both';
        reasoning = `本地和 Azure 都检测到高风险内容。本地: ${localResult.reason}；Azure: 最高严重度 ${azureAnalysis.maxSeverity}/6`;
      } else if (localForbidden) {
        triggeredBy = 'local';
        reasoning = `本地检测到高风险内容: ${localResult.reason}`;
      } else {
        triggeredBy = 'azure';
        reasoning = `Azure 检测到高风险内容: 最高严重度 ${azureAnalysis.maxSeverity}/6，风险类别: ${azureAnalysis.riskCategories.join(', ')}`;
      }

      return {
        level: 'forbidden',
        reason: `高风险内容 (${triggeredBy === 'both' ? '本地+Azure' : triggeredBy === 'local' ? '本地检测' : 'Azure检测'})`,
        confidence: Math.max(localResult.confidence, 0.9),
        decision: {
          triggeredBy,
          reasoning
        }
      };
    }

    // 如果有任何一方判定为 warning，最终结果就是 warning
    if (localWarning || azureWarning) {
      let triggeredBy: 'local' | 'azure' | 'both' = 'local';
      let reasoning = '';

      if (localWarning && azureWarning) {
        triggeredBy = 'both';
        reasoning = `本地和 Azure 都检测到中等风险。本地: ${localResult.reason}；Azure: 最高严重度 ${azureAnalysis.maxSeverity}/6`;
      } else if (localWarning) {
        triggeredBy = 'local';
        reasoning = `本地检测到中等风险: ${localResult.reason}`;
      } else {
        triggeredBy = 'azure';
        reasoning = `Azure 检测到中等风险: 最高严重度 ${azureAnalysis.maxSeverity}/6`;
      }

      return {
        level: 'warning',
        reason: `中等风险内容 (${triggeredBy === 'both' ? '本地+Azure' : triggeredBy === 'local' ? '本地检测' : 'Azure检测'})`,
        confidence: Math.max(localResult.confidence, 0.8),
        decision: {
          triggeredBy,
          reasoning
        }
      };
    }

    // 两者都认为安全
    return {
      level: 'safe',
      reason: '本地和 Azure 检测均未发现敏感内容',
      confidence: Math.min(localResult.confidence, 0.95),
      decision: {
        triggeredBy: 'none',
        reasoning: `本地检测: ${localResult.reason}；Azure 检测: 最高严重度 ${azureAnalysis.maxSeverity}/6，无风险内容`
      }
    };
  }

  // 健康检查
  async healthCheck(): Promise<{
    local: boolean;
    azure: boolean;
    overall: boolean;
  }> {
    const local = true; // 本地检测总是可用

    let azure = false;
    if (this.azureEnabled && this.azureModerator) {
      try {
        azure = await this.azureModerator.healthCheck();
      } catch {
        azure = false;
      }
    }

    return {
      local,
      azure,
      overall: local // 只要本地可用就认为整体可用
    };
  }

  // 设置 Azure 配置
  setAzureConfig(config: AzureModeratorConfig) {
    this.azureModerator = new AzureModerator(config);
    this.azureEnabled = true;
  }

  // 禁用 Azure
  disableAzure() {
    this.azureEnabled = false;
    this.azureModerator = undefined;
  }

  // 获取配置状态
  getStatus() {
    return {
      localEnabled: true,
      azureEnabled: this.azureEnabled,
      azureConfigured: !!this.azureModerator
    };
  }
}