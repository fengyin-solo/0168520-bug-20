import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore } from '../src/stores/configStore';
import { DEFAULT_CONFIG } from '../src/types';
import { loadConfig } from '../src/services/storage';

const VALID_KEY = 'sk-buouxmhplmkqskzzcpmvixsttjzggzupfrkzpscfpwwqvucp';

describe('configStore —— 两个入口共用的保存口径', () => {
  beforeEach(() => {
    useConfigStore.setState({
      config: DEFAULT_CONFIG,
      isValid: false,
      errors: {},
      initialized: true,
    });
    localStorage.clear();
  });

  it('合法更新会原样保存，不做截断或取整', () => {
    useConfigStore.getState().updateConfig({ apiKey: VALID_KEY });
    useConfigStore.getState().setTemperature(1.35);

    expect(useConfigStore.getState().config.temperature).toBe(1.35);
    expect(loadConfig().temperature).toBe(1.35);
  });

  it('temperature 2.5 拒绝保存：原值与已保存内容都不丢', () => {
    useConfigStore.getState().updateConfig({ apiKey: VALID_KEY });
    useConfigStore.getState().setTemperature(1.2);

    const validation = useConfigStore.getState().setTemperature(2.5);

    expect(validation.isValid).toBe(false);
    expect(validation.errors.temperature).toBeTruthy();
    // 内存中的值没有被覆盖
    expect(useConfigStore.getState().config.temperature).toBe(1.2);
    // localStorage 里也没有落入 2.5
    expect(loadConfig().temperature).toBe(1.2);
  });

  it('maxTokens 负数无论哪个入口都拒绝并给出原因', () => {
    useConfigStore.getState().updateConfig({ apiKey: VALID_KEY });
    const viaSetter = useConfigStore.getState().setMaxTokens(-100);
    expect(viaSetter.isValid).toBe(false);
    expect(viaSetter.errors.maxTokens).toMatch(/Max Tokens/);
    expect(useConfigStore.getState().config.maxTokens).toBe(DEFAULT_CONFIG.maxTokens);
    expect(loadConfig().maxTokens).not.toBe(-100);

    const viaUpdate = useConfigStore.getState().updateConfig({ maxTokens: -5 });
    expect(viaUpdate.errors.maxTokens).toBe(viaSetter.errors.maxTokens);
  });

  it('maxTokens 非整数同样拒绝', () => {
    const result = useConfigStore.getState().setMaxTokens(12.5);
    expect(result.isValid).toBe(false);
    expect(useConfigStore.getState().config.maxTokens).toBe(DEFAULT_CONFIG.maxTokens);
  });

  it('非法更新不会把合法字段的旧错误留住（修正后错误清除）', () => {
    useConfigStore.getState().setTemperature(2.5);
    expect(useConfigStore.getState().errors.temperature).toBeTruthy();

    useConfigStore.getState().setTemperature(1.5);
    expect(useConfigStore.getState().errors.temperature).toBeUndefined();
    expect(useConfigStore.getState().config.temperature).toBe(1.5);
  });

  it('apiKey 长度不足时整体无效（发送入口可据此禁用）', () => {
    useConfigStore.getState().updateConfig({ apiKey: 'short' });
    const validation = useConfigStore.getState().validateCurrentConfig();
    expect(validation.isValid).toBe(false);
    expect(validation.errors.apiKey).toBeTruthy();
  });

  it('发请求前再校验：补全 API Key 后同一份结果转为有效', () => {
    expect(useConfigStore.getState().validateCurrentConfig().isValid).toBe(false);

    useConfigStore.getState().setAPIKey(VALID_KEY);
    const validation = useConfigStore.getState().validateCurrentConfig();
    expect(validation.isValid).toBe(true);
    expect(Object.keys(validation.errors)).toHaveLength(0);
  });

  it('重新保存合法值时数值不变样（1.35 不会被截成 1.3 / 2）', () => {
    useConfigStore.getState().updateConfig({ apiKey: VALID_KEY, temperature: 1.35 });
    useConfigStore.getState().validateCurrentConfig();
    useConfigStore.getState().updateConfig({ model: 'Qwen/Qwen2.5-72B-Instruct' });

    expect(useConfigStore.getState().config.temperature).toBe(1.35);
    expect(loadConfig().temperature).toBe(1.35);
  });

  it('localStorage 中已有的非法旧值加载后原样保留，但标记为不可发送', () => {
    useConfigStore.getState().updateConfig({ apiKey: VALID_KEY, temperature: 1.0 });
    // 模拟历史遗留的脏数据
    const raw = JSON.parse(localStorage.getItem('react-chat-config') as string);
    raw.temperature = 2.5;
    localStorage.setItem('react-chat-config', JSON.stringify(raw));

    useConfigStore.getState().initConfig();

    const state = useConfigStore.getState();
    expect(state.config.temperature).toBe(2.5);
    expect(state.isValid).toBe(false);
    expect(state.errors.temperature).toBeTruthy();
  });

  it('默认值与默认保存行为不变', () => {
    expect(DEFAULT_CONFIG.temperature).toBe(0.7);
    expect(DEFAULT_CONFIG.maxTokens).toBe(2048);
  });
});
