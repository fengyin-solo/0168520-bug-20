import { describe, it, expect } from 'vitest';
import {
  PARAM_LIMITS,
  validateAPIKey,
  validateTemperature,
  validateMaxTokens,
  validateField,
  validateConfig,
  VALIDATION_MESSAGES,
} from '../src/utils/validators';
import { DEFAULT_CONFIG } from '../src/types';

describe('validateTemperature —— 唯一口径', () => {
  it.each([0, 0.7, 1, 2, 1.35])('接受合法值 %s', (value) => {
    expect(validateTemperature(value)).toBe(true);
  });

  it.each([
    ['越上界 2.5', 2.5],
    ['越下界 -0.1', -0.1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('拒绝非法值：%s', (_name, value) => {
    expect(validateTemperature(value)).toBe(false);
  });
});

describe('validateMaxTokens —— 两个入口同一份标准', () => {
  it.each([1, 100, 2048, 8192])('接受合法正整数 %s', (value) => {
    expect(validateMaxTokens(value)).toBe(true);
  });

  it.each([
    ['负数 -1（滑块与手动输入都不得放行）', -1],
    ['0', 0],
    ['小数 1.5', 1.5],
    ['越上界 8193', 8193],
    ['NaN', Number.NaN],
  ])('拒绝非法值：%s', (_name, value) => {
    expect(validateMaxTokens(value)).toBe(false);
  });
});

describe('validateAPIKey', () => {
  it('长度不足即非法（发送入口与输入面板口径一致）', () => {
    expect(validateAPIKey('short')).toBe(false);
    expect(validateAPIKey('')).toBe(false);
  });

  it('合法字符且长度足够', () => {
    expect(
      validateAPIKey('sk-buouxmhplmkqskzzcpmvixsttjzggzupfrkzpscfpwwqvucp')
    ).toBe(true);
  });

  it('含非法字符', () => {
    expect(validateAPIKey('sk-1234567890 中国')).toBe(false);
  });
});

describe('validateField —— 单项判定的唯一入口', () => {
  it('temperature 越界时返回原因', () => {
    expect(validateField('temperature', 2.5)).toBe(VALIDATION_MESSAGES.temperature);
    expect(validateField('temperature', 1)).toBeUndefined();
  });

  it('maxTokens 负数时两个入口得到同一条原因', () => {
    expect(validateField('maxTokens', -5)).toBe(VALIDATION_MESSAGES.maxTokens);
  });

  it('apiKey 长度不足时返回原因', () => {
    expect(validateField('apiKey', 'short')).toBe(VALIDATION_MESSAGES.apiKey);
  });
});

describe('validateConfig', () => {
  it('默认配置仅因 apiKey 为空而无效，数值参数默认值不动', () => {
    const result = validateConfig(DEFAULT_CONFIG);
    expect(result.errors.temperature).toBeUndefined();
    expect(result.errors.maxTokens).toBeUndefined();
    expect(DEFAULT_CONFIG.temperature).toBe(0.7);
    expect(DEFAULT_CONFIG.maxTokens).toBe(2048);
  });

  it('完整合法配置', () => {
    const result = validateConfig({
      ...DEFAULT_CONFIG,
      apiKey: 'sk-1234567890',
    });
    expect(result.isValid).toBe(true);
  });

  it('边界常量被所有校验共用', () => {
    expect(validateTemperature(PARAM_LIMITS.temperature.max)).toBe(true);
    expect(validateMaxTokens(PARAM_LIMITS.maxTokens.max)).toBe(true);
  });
});
