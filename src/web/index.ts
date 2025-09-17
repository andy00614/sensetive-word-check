// Web-compatible exports for browser usage
import { SensitiveWordLoader } from '../core/SensitiveWordLoader';
import { AzureModerator, type AzureModeratorConfig } from '../core/AzureModerator';
import { RealWorldDetector, type RealWorldDetectionResult } from '../core/RealWorldDetector';
import { CombinedDetector, type CombinedDetectionResult } from '../core/CombinedDetector';

// Export for global window object
declare global {
  interface Window {
    SensitiveWordDetectors: {
      SensitiveWordLoader: typeof SensitiveWordLoader;
      AzureModerator: typeof AzureModerator;
      RealWorldDetector: typeof RealWorldDetector;
      CombinedDetector: typeof CombinedDetector;
    };
  }
}

// Attach to window for browser usage
if (typeof window !== 'undefined') {
  window.SensitiveWordDetectors = {
    SensitiveWordLoader,
    AzureModerator,
    RealWorldDetector,
    CombinedDetector
  };
}

export {
  SensitiveWordLoader,
  AzureModerator,
  RealWorldDetector,
  CombinedDetector,
  type AzureModeratorConfig,
  type RealWorldDetectionResult,
  type CombinedDetectionResult
};