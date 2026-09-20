import { create } from 'zustand';
import type { AppConfig, ConfigValidation } from '../types';
import { DEFAULT_CONFIG } from '../types';
import { saveConfig, loadConfig } from '../services/storage';
import { validateConfig, validateField } from '../utils/validators';

/** 保存时需要强校验、非法即拒绝落库的字段 */
const STRICT_FIELDS = ['temperature', 'maxTokens'] as const;
type StrictField = (typeof STRICT_FIELDS)[number];

interface ConfigState {
  /** 当前配置 */
  config: AppConfig;
  /** 配置是否有效（与 errors 同一份校验结果） */
  isValid: boolean;
  /** 验证错误信息 */
  errors: ConfigValidation['errors'];
  /** 是否已初始化 */
  initialized: boolean;
}

interface ConfigActions {
  /** 初始化配置（从 localStorage 加载） */
  initConfig: () => void;
  /**
   * 更新配置
   * 越界/非法的数值字段不会被写入，也不会覆盖原值，更不会落库；
   * 返回值与 validateConfig 同源，调用方可直接据此写出原因。
   */
  updateConfig: (updates: Partial<AppConfig>) => ConfigValidation;
  /** 用同一份口径重新校验当前配置 */
  validateCurrentConfig: () => ConfigValidation;
  /** 重置为默认配置 */
  resetConfig: () => void;
  /** 设置 API Key */
  setAPIKey: (apiKey: string) => void;
  /** 设置模型 */
  setModel: (model: string) => void;
  /** 设置 temperature（非法值拒绝保存） */
  setTemperature: (temperature: number) => ConfigValidation;
  /** 设置 maxTokens（非法值拒绝保存） */
  setMaxTokens: (maxTokens: number) => ConfigValidation;
}

type ConfigStore = ConfigState & ConfigActions;

export const useConfigStore = create<ConfigStore>((set, get) => ({
  // Initial state
  config: DEFAULT_CONFIG,
  isValid: false,
  errors: {},
  initialized: false,

  // Actions
  initConfig: () => {
    const loadedConfig = loadConfig();
    const validation = validateConfig(loadedConfig);

    // 加载到的值原样保留（含非法旧值），由同一份校验结果决定能否发送，
    // 用户重新保存合法值后才会更新，绝不静默改写。
    set({
      config: loadedConfig,
      isValid: validation.isValid,
      errors: validation.errors,
      initialized: true,
    });
  },

  updateConfig: (updates) => {
    const { config, errors: currentErrors } = get();

    // 先按唯一口径逐字段判定本次提交
    const rejectedErrors: ConfigValidation['errors'] = {};
    const acceptedUpdates: Partial<AppConfig> = {};

    (Object.keys(updates) as (keyof AppConfig)[]).forEach((field) => {
      const value = updates[field];
      const error = validateField(field as keyof ConfigValidation['errors'], value);

      if (error && (STRICT_FIELDS as readonly string[]).includes(field)) {
        // 越界/非法的数值：拒绝写入、拒绝落库、保留之前的值
        rejectedErrors[field as StrictField] = error;
        return;
      }

      acceptedUpdates[field] = value as never;
    });

    const hasRejected = Object.keys(rejectedErrors).length > 0;

    if (hasRejected) {
      // 不合并、不保存，只把原因写到状态里供两个入口展示
      const errors = { ...currentErrors, ...rejectedErrors };
      const validation: ConfigValidation = {
        isValid: Object.keys(errors).length === 0,
        errors,
      };
      set({ isValid: validation.isValid, errors: validation.errors });
      return validation;
    }

    const newConfig = { ...config, ...acceptedUpdates };
    // 以当前实际配置的校验结果为唯一状态（自动清掉已修正字段的旧错误）
    const validation = validateConfig(newConfig);

    // 只有合法的配置才写入 localStorage，默认的保存时机与行为不变
    if (validation.isValid) {
      try {
        saveConfig(newConfig);
      } catch (error) {
        console.error('Failed to save config:', error);
      }
    }

    set({
      config: newConfig,
      isValid: validation.isValid,
      errors: validation.errors,
    });
    return validation;
  },

  validateCurrentConfig: () => {
    const { config } = get();
    const validation = validateConfig(config);

    set({
      isValid: validation.isValid,
      errors: validation.errors,
    });

    return validation;
  },

  resetConfig: () => {
    try {
      saveConfig(DEFAULT_CONFIG);
    } catch (error) {
      console.error('Failed to save default config:', error);
    }

    const validation = validateConfig(DEFAULT_CONFIG);

    set({
      config: DEFAULT_CONFIG,
      isValid: validation.isValid,
      errors: validation.errors,
    });
  },

  setAPIKey: (apiKey) => {
    const { updateConfig } = get();
    return updateConfig({ apiKey });
  },

  setModel: (model) => {
    const { updateConfig } = get();
    return updateConfig({ model });
  },

  setTemperature: (temperature) => {
    const { updateConfig } = get();
    return updateConfig({ temperature });
  },

  setMaxTokens: (maxTokens) => {
    const { updateConfig } = get();
    return updateConfig({ maxTokens });
  },
}));
