import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore } from '../../src/stores/configStore';
import { DEFAULT_CONFIG } from '../../src/types';
import { loadConfig } from '../../src/services/storage';
import { CONFIG_ERROR_MESSAGES } from '../../src/utils/rules';

describe('configStore 保存闸门：两处入口共用同一口径', () => {
  beforeEach(() => {
    localStorage.clear();
    // 每个用例重置为干净的 store
    useConfigStore.setState({
      config: DEFAULT_CONFIG,
      isValid: false,
      errors: {},
      initialized: false,
    });
  });

  it('temperature 2.5 不会被保存，也不会覆盖之前填好的值', () => {
    // 先给出合法 API Key，使整配置可保存
    useConfigStore.getState().setAPIKey('valid-key-123');

    // 先合法地保存一个温度
    expect(useConfigStore.getState().updateConfig({ temperature: 1.2 })).toBe(true);
    expect(useConfigStore.getState().config.temperature).toBe(1.2);

    // 非法温度被拒绝
    expect(useConfigStore.getState().updateConfig({ temperature: 2.5 })).toBe(false);

    // 内存中的值保持上一次的合法值，没有被截成 2、也没有变成 2.5
    expect(useConfigStore.getState().config.temperature).toBe(1.2);
    // localStorage 中同样保持 1.2
    expect(loadConfig().temperature).toBe(1.2);
    // 且给出原因
    expect(useConfigStore.getState().errors.temperature).toBe(
      CONFIG_ERROR_MESSAGES.temperatureRange,
    );
  });

  it('maxTokens 负数无论从哪个入口都不会被保存，并给出原因', () => {
    // 字段合法时即使整体仍因空 API Key 而 invalid，字段也已写入
    useConfigStore.getState().updateConfig({ maxTokens: 2048 });
    expect(useConfigStore.getState().config.maxTokens).toBe(2048);

    expect(useConfigStore.getState().updateConfig({ maxTokens: -10 })).toBe(false);
    expect(useConfigStore.getState().config.maxTokens).toBe(2048);
    expect(loadConfig().maxTokens).toBe(2048);
    expect(useConfigStore.getState().errors.maxTokens).toBe(
      CONFIG_ERROR_MESSAGES.maxTokensRange,
    );
  });

  it('API Key 长度不足不保存，发送判定与输入面板同源', () => {
    expect(useConfigStore.getState().setAPIKey('short')).toBe(false);
    expect(useConfigStore.getState().config.apiKey).toBe('');
    expect(useConfigStore.getState().isValid).toBe(false);
    expect(useConfigStore.getState().errors.apiKey).toBe(
      CONFIG_ERROR_MESSAGES.apiKeyInvalid,
    );
  });

  it('默认值保持不变：重置恢复 DEFAULT_CONFIG', () => {
    useConfigStore.getState().updateConfig({ temperature: 0.3 });
    useConfigStore.getState().resetConfig();
    expect(useConfigStore.getState().config).toEqual(DEFAULT_CONFIG);
    expect(loadConfig().temperature).toBe(DEFAULT_CONFIG.temperature);
    expect(loadConfig().maxTokens).toBe(DEFAULT_CONFIG.maxTokens);
  });

  it('合法值重复保存不会变样（不做静默截断/取整）', () => {
    const apiKey = 'valid-key-123';
    useConfigStore.getState().updateConfig({
      apiKey,
      temperature: 0.7,
      maxTokens: 2048,
    });

    // 模拟后续操作重新保存同样的值
    useConfigStore.getState().updateConfig({ temperature: 0.7 });
    useConfigStore.getState().updateConfig({ maxTokens: 2048 });

    const config = useConfigStore.getState().config;
    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBe(2048);
    expect(config.apiKey).toBe(apiKey);
    expect(config).toEqual(loadConfig());
    expect(useConfigStore.getState().isValid).toBe(true);
  });

  it('validateCurrentConfig 与更新时的判定结果一致', () => {
    useConfigStore.getState().updateConfig({
      apiKey: 'valid-key-123',
      temperature: 2.5, // 被拒绝，config 仍是默认 0.7
    });
    // config 中 temperature 仍合法，但 apiKey 仍是空 -> 仍非法
    expect(useConfigStore.getState().validateCurrentConfig()).toBe(false);
    expect(useConfigStore.getState().errors.apiKey).toBeDefined();
    expect(useConfigStore.getState().errors.temperature).toBeUndefined();
  });
});
