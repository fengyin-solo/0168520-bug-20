import { describe, it, expect } from 'vitest';
import {
  validateAPIKey,
  validateAPIKeyReason,
  validateTemperature,
  validateTemperatureReason,
  validateMaxTokens,
  validateMaxTokensReason,
  validateConfigField,
  validateConfig,
} from '../../src/utils/validators';
import {
  TEMPERATURE_RULE,
  MAX_TOKENS_RULE,
  API_KEY_MIN_LENGTH,
  CONFIG_ERROR_MESSAGES,
} from '../../src/utils/rules';
import { DEFAULT_CONFIG } from '../../src/types';

describe('统一判定口径：边界与规则常量一致', () => {
  it('temperature 边界值合法，越界即非法', () => {
    expect(validateTemperature(TEMPERATURE_RULE.min)).toBe(true);
    expect(validateTemperature(TEMPERATURE_RULE.max)).toBe(true);
    expect(validateTemperature(TEMPERATURE_RULE.max + 0.01)).toBe(false);
    expect(validateTemperature(TEMPERATURE_RULE.min - 0.01)).toBe(false);
  });

  it('temperature 2.5 被两个入口共用的判定判为越界，并给出原因', () => {
    expect(validateTemperature(2.5)).toBe(false);
    expect(validateTemperatureReason(2.5)).toBe(
      CONFIG_ERROR_MESSAGES.temperatureRange,
    );
  });

  it('temperature 非有限数值一律非法', () => {
    expect(validateTemperature(NaN)).toBe(false);
    expect(validateTemperature(Infinity)).toBe(false);
    expect(validateTemperature('0.7' as unknown)).toBe(false);
    expect(validateTemperatureReason(NaN)).toBe(CONFIG_ERROR_MESSAGES.temperatureType);
  });

  it('maxTokens 负数与非整数都非法，且原因不同', () => {
    expect(validateMaxTokens(-1)).toBe(false);
    expect(validateMaxTokens(0)).toBe(false);
    expect(validateMaxTokensReason(-1)).toBe(CONFIG_ERROR_MESSAGES.maxTokensRange);
    expect(validateMaxTokens(100.5)).toBe(false);
    expect(validateMaxTokensReason(100.5)).toBe(
      CONFIG_ERROR_MESSAGES.maxTokensInteger,
    );
  });

  it('maxTokens 边界值合法，越过上限非法', () => {
    expect(validateMaxTokens(MAX_TOKENS_RULE.min)).toBe(true);
    expect(validateMaxTokens(MAX_TOKENS_RULE.max)).toBe(true);
    expect(validateMaxTokens(MAX_TOKENS_RULE.max + 1)).toBe(false);
  });

  it('API Key 长度不足或含非法字符都非法，原因相同', () => {
    expect(validateAPIKey('short')).toBe(false);
    expect(validateAPIKey('')).toBe(false);
    expect(validateAPIKey('  ')).toBe(false);
    const longEnoughButBad = 'a'.repeat(API_KEY_MIN_LENGTH) + '!!!';
    expect(validateAPIKey(longEnoughButBad)).toBe(false);
    expect(validateAPIKeyReason(longEnoughButBad)).toBe(
      CONFIG_ERROR_MESSAGES.apiKeyInvalid,
    );
    expect(validateAPIKey('a'.repeat(API_KEY_MIN_LENGTH))).toBe(true);
  });
});

describe('validateConfigField 与单字段校验函数给出同一份结论', () => {
  it('temperature / maxTokens / apiKey 字段级判定一致', () => {
    expect(validateConfigField('temperature', 2.5)).toBe(
      validateTemperatureReason(2.5),
    );
    expect(validateConfigField('maxTokens', -5)).toBe(
      validateMaxTokensReason(-5),
    );
    expect(validateConfigField('apiKey', 'short')).toBe(
      validateAPIKeyReason('short'),
    );
    expect(validateConfigField('temperature', 0.7)).toBeUndefined();
    expect(validateConfigField('maxTokens', 2048)).toBeUndefined();
    expect(
      validateConfigField('apiKey', 'a'.repeat(API_KEY_MIN_LENGTH)),
    ).toBeUndefined();
  });
});

describe('validateConfig 是整配置的唯一判定', () => {
  it('默认配置仅因空 API Key 非法（默认数值参数合法）', () => {
    const result = validateConfig(DEFAULT_CONFIG);
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['apiKey']);
  });

  it('任一参数越界都会在同一结果中给出对应原因', () => {
    const result = validateConfig({
      apiKey: 'a'.repeat(API_KEY_MIN_LENGTH),
      temperature: 2.5,
      maxTokens: -1,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.temperature).toBe(CONFIG_ERROR_MESSAGES.temperatureRange);
    expect(result.errors.maxTokens).toBe(CONFIG_ERROR_MESSAGES.maxTokensRange);
    expect(result.errors.apiKey).toBeUndefined();
  });

  it('完全合法的配置 isValid 为 true 且无错误', () => {
    const result = validateConfig({
      apiKey: 'a'.repeat(API_KEY_MIN_LENGTH),
      temperature: 1,
      maxTokens: 2048,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });
});
