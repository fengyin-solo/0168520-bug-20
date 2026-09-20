import { create } from 'zustand';
import type { AppConfig, ConfigValidation } from '../types';
import { DEFAULT_CONFIG } from '../types';
import { saveConfig, loadConfig } from '../services/storage';
import { validateConfig } from '../utils/validators';

interface ConfigState {
  /** 当前配置 */
  config: AppConfig;
  /** 配置是否有效 */
  isValid: boolean;
  /** 验证错误信息 */
  errors: ConfigValidation['errors'];
  /** 是否已初始化 */
  initialized: boolean;
}

interface ConfigActions {
  /** 初始化配置（从 localStorage 加载） */
  initConfig: () => void;
  /** 更新配置（非法字段不会被保存，返回是否全部通过） */
  updateConfig: (updates: Partial<AppConfig>) => boolean;
  /** 使用同一份判定结果重新校验当前配置 */
  validateCurrentConfig: () => boolean;
  /** 重置为默认配置 */
  resetConfig: () => void;
  /** 设置 API Key */
  setAPIKey: (apiKey: string) => void;
  /** 设置模型 */
  setModel: (model: string) => void;
  /** 设置 temperature */
  setTemperature: (temperature: number) => void;
  /** 设置 maxTokens */
  setMaxTokens: (maxTokens: number) => void;
}

type ConfigStore = ConfigState & ConfigActions;

/**
 * 用唯一的整配置判定函数得到统一结果
 */
function evaluate(config: AppConfig): Pick<ConfigState, 'isValid' | 'errors'> {
  const validation = validateConfig(config);
  return { isValid: validation.isValid, errors: validation.errors };
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  // Initial state
  config: DEFAULT_CONFIG,
  isValid: false,
  errors: {},
  initialized: false,

  // Actions
  initConfig: () => {
    const loadedConfig = loadConfig();

    set({
      config: loadedConfig,
      ...evaluate(loadedConfig),
      initialized: true,
    });
  },

  updateConfig: (updates) => {
    const { config } = get();

    // 候选配置：所有字段都套用同一份判定
    const candidate = { ...config, ...updates };
    const result = evaluate(candidate);

    if (!result.isValid) {
      // 存在非法字段：配置与 localStorage 都保持不变，
      // 只暴露同一份判定结果（isValid / 每个字段的原因）
      set({ isValid: result.isValid, errors: result.errors });
      return false;
    }

    // 全部合法才写入存储并更新状态
    try {
      saveConfig(candidate);
    } catch (error) {
      console.error('Failed to save config:', error);
    }

    set({ config: candidate, ...result });
    return true;
  },

  validateCurrentConfig: () => {
    const { config } = get();
    const result = evaluate(config);

    set(result);

    return result.isValid;
  },

  resetConfig: () => {
    try {
      saveConfig(DEFAULT_CONFIG);
    } catch (error) {
      console.error('Failed to save default config:', error);
    }

    set({
      config: DEFAULT_CONFIG,
      ...evaluate(DEFAULT_CONFIG),
    });
  },

  setAPIKey: (apiKey) => get().updateConfig({ apiKey }),

  setModel: (model) => get().updateConfig({ model }),

  setTemperature: (temperature) => get().updateConfig({ temperature }),

  setMaxTokens: (maxTokens) => get().updateConfig({ maxTokens }),
}));
